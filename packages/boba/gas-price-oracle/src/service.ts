/* Imports: External */
import { Contract, Wallet, BigNumber, providers, utils } from 'ethers'
import fs, { promises as fsPromise } from 'fs'
import path from 'path'
import { orderBy } from 'lodash'
import fetch from 'node-fetch'

/* Imports: Internal */
import { sleep } from '@eth-optimism/core-utils'
import { BaseService } from '@eth-optimism/common-ts'
import { loadContract } from '@eth-optimism/contracts'

import L1StandardBridgeJson from '@eth-optimism/contracts/artifacts/contracts/L1/messaging/L1StandardBridge.sol/L1StandardBridge.json'
import L2GovernanceERC20Json from '@eth-optimism/contracts/artifacts/contracts/standards/L2GovernanceERC20.sol/L2GovernanceERC20.json'
import Boba_GasPriceOracleJson from '@eth-optimism/contracts/artifacts/contracts/L2/predeploys/Boba_GasPriceOracle.sol/Boba_GasPriceOracle.json'
import DiscretionaryExitBurnJson from '@boba/contracts/artifacts/contracts/DiscretionaryExitBurn.sol/DiscretionaryExitBurn.json'
import L1LiquidityPoolJson from '@boba/contracts/artifacts/contracts/LP/L1LiquidityPool.sol/L1LiquidityPool.json'
import L2LiquidityPoolJson from '@boba/contracts/artifacts/contracts/LP/L2LiquidityPool.sol/L2LiquidityPool.json'
import L1NFTBridgeJson from '@boba/contracts/artifacts/contracts/bridges/L1NFTBridge.sol/L1NFTBridge.json'
import L2NFTBridgeJson from '@boba/contracts/artifacts/contracts/bridges/L2NFTBridge.sol/L2NFTBridge.json'

interface GasPriceOracleOptions {
  // Providers for interacting with L1 and L2.
  l1RpcProvider: providers.StaticJsonRpcProvider
  l2RpcProvider: providers.StaticJsonRpcProvider

  // Address Manager address
  addressManagerAddress: string

  // Address of the gasPrice contract
  gasPriceOracleAddress: string
  OVM_SequencerFeeVault: string

  // Wallet
  gasPriceOracleOwnerWallet: Wallet

  // monitor accounts
  sequencerAddress: string
  proposerAddress: string
  relayerAddress: string
  fastRelayerAddress: string

  // Interval in seconds to wait between loops
  pollingInterval: number

  // Burned gas fee ratio
  burnedGasFeeRatio100X: number

  // max burned gas
  maxBurnedGas: string

  // overhead ratio
  overheadRatio1000X: number

  // Min percent change
  overheadMinPercentChange: number

  // Min overhead
  minOverhead: number

  // Min L1 base fee
  minL1BaseFee: number

  // Max L1 base fee
  maxL1BaseFee: number

  // Polygon.io API key
  polygonAPIKey: string

  // boba fee / eth fee
  bobaFeeRatio100X: number

  // minimum percentage change for boba fee / eth fee
  bobaFeeRatioMinPercentChange: number
}

const optionSettings = {}

export class GasPriceOracleService extends BaseService<GasPriceOracleOptions> {
  constructor(options: GasPriceOracleOptions) {
    super('GasPriceOracle', options, optionSettings)
  }

  private state: {
    Lib_AddressManager: Contract
    OVM_GasPriceOracle: Contract
    Proxy__L1StandardBridge: Contract
    DiscretionaryExitBurn: Contract
    Proxy__L1LiquidityPool: Contract
    Proxy__L2LiquidityPool: Contract
    CanonicalTransactionChain: Contract
    StateCommitmentChain: Contract
    Proxy__L1NFTBridge: Contract
    Proxy__L2NFTBridge: Contract
    Boba_GasPriceOracle: Contract
    L2BOBA: Contract
    L1ETHBalance: BigNumber
    L1ETHCostFee: BigNumber
    L2ETHVaultBalance: BigNumber
    L2ETHCollectFee: BigNumber
    L2BOBAVaultBalance: BigNumber
    L2BOBACollectFee: BigNumber
    BOBAUSDPrice: number
    ETHUSDPrice: number
  }

  protected async _init(): Promise<void> {
    this.logger.info('Initializing gas price oracle', {
      gasPriceOracleAddress: this.options.gasPriceOracleAddress,
      OVM_SequencerFeeVault: this.options.OVM_SequencerFeeVault,
      gasOracleOwnerAddress: this.options.gasPriceOracleOwnerWallet.address,
      sequencerWallet: this.options.sequencerAddress,
      proposerWallet: this.options.proposerAddress,
      relayerWallet: this.options.relayerAddress,
      fastRelayerWallet: this.options.fastRelayerAddress,
      pollingInterval: this.options.pollingInterval,
      burnedGasFeeRatio100X: this.options.burnedGasFeeRatio100X,
      maxBurnedGas: this.options.maxBurnedGas,
      overheadRatio1000X: this.options.overheadRatio1000X,
      overheadMinPercentChange: this.options.overheadMinPercentChange,
      minOverhead: this.options.minOverhead,
      minL1BaseFee: this.options.minL1BaseFee,
      bobaFeeRatio100X: this.options.bobaFeeRatio100X,
      bobaFeeRatioMinPercentChange: this.options.bobaFeeRatioMinPercentChange,
    })

    this.state = {} as any

    this.logger.info('Connecting to Lib_AddressManager...')
    this.state.Lib_AddressManager = loadContract(
      'Lib_AddressManager',
      this.options.addressManagerAddress,
      this.options.l1RpcProvider
    )
    this.logger.info('Connected to Lib_AddressManager', {
      address: this.state.Lib_AddressManager.address,
    })

    this.logger.info('Connecting to Proxy__L1StandardBridge...')
    const Proxy__L1StandardBridgeAddress =
      await this.state.Lib_AddressManager.getAddress('Proxy__L1StandardBridge')
    this.state.Proxy__L1StandardBridge = new Contract(
      Proxy__L1StandardBridgeAddress,
      L1StandardBridgeJson.abi,
      this.options.l1RpcProvider
    )
    this.logger.info('Connected to Proxy__L1StandardBridge', {
      address: this.state.Proxy__L1StandardBridge.address,
    })

    this.logger.info('Connecting to DiscretionaryExitBurn...')
    const DiscretionaryExitBurnAddress =
      await this.state.Lib_AddressManager.getAddress('DiscretionaryExitBurn')
    this.state.DiscretionaryExitBurn = new Contract(
      DiscretionaryExitBurnAddress,
      DiscretionaryExitBurnJson.abi,
      this.options.gasPriceOracleOwnerWallet
    )
    this.logger.info('Connected to DiscretionaryExitBurn', {
      address: this.state.DiscretionaryExitBurn.address,
    })

    this.logger.info('Connecting to Proxy__L1LiquidityPool...')
    const Proxy__L1LiquidityPoolAddress =
      await this.state.Lib_AddressManager.getAddress('Proxy__L1LiquidityPool')
    this.state.Proxy__L1LiquidityPool = new Contract(
      Proxy__L1LiquidityPoolAddress,
      L1LiquidityPoolJson.abi,
      this.options.l1RpcProvider
    )
    this.logger.info('Connected to Proxy__L1LiquidityPool', {
      address: this.state.Proxy__L1LiquidityPool.address,
    })

    this.logger.info('Connecting to Proxy__L2LiquidityPool...')
    const Proxy__L2LiquidityPoolAddress =
      await this.state.Lib_AddressManager.getAddress('Proxy__L2LiquidityPool')
    this.state.Proxy__L2LiquidityPool = new Contract(
      Proxy__L2LiquidityPoolAddress,
      L2LiquidityPoolJson.abi,
      this.options.gasPriceOracleOwnerWallet
    )
    this.logger.info('Connected to Proxy__L2LiquidityPool', {
      address: this.state.Proxy__L2LiquidityPool.address,
    })

    this.logger.info('Connecting to Proxy__L1NFTBridge...')
    const Proxy__L1NFTBridgeAddress =
      await this.state.Lib_AddressManager.getAddress('Proxy__L1NFTBridge')
    this.state.Proxy__L1NFTBridge = new Contract(
      Proxy__L1NFTBridgeAddress,
      L1NFTBridgeJson.abi,
      this.options.gasPriceOracleOwnerWallet
    )
    this.logger.info('Connected to Proxy__L1NFTBridge', {
      address: this.state.Proxy__L1NFTBridge.address,
    })

    const Proxy__L2NFTBridgeAddress =
      await this.state.Lib_AddressManager.getAddress('Proxy__L2NFTBridge')
    this.state.Proxy__L2NFTBridge = new Contract(
      Proxy__L2NFTBridgeAddress,
      L2NFTBridgeJson.abi,
      this.options.gasPriceOracleOwnerWallet
    )
    this.logger.info('Connected to Proxy__L2NFTBridge', {
      address: this.state.Proxy__L2NFTBridge.address,
    })

    this.logger.info('Connecting to CanonicalTransactionChain...')
    const CanonicalTransactionChainAddress =
      await this.state.Lib_AddressManager.getAddress(
        'CanonicalTransactionChain'
      )
    this.state.CanonicalTransactionChain = loadContract(
      'CanonicalTransactionChain',
      CanonicalTransactionChainAddress,
      this.options.l1RpcProvider
    )
    this.logger.info('Connected to CanonicalTransactionChain', {
      address: this.state.CanonicalTransactionChain.address,
    })

    this.logger.info('Connecting to StateCommitmentChain...')
    const StateCommitmentChainAddress =
      await this.state.Lib_AddressManager.getAddress('StateCommitmentChain')
    this.state.StateCommitmentChain = loadContract(
      'StateCommitmentChain',
      StateCommitmentChainAddress,
      this.options.l1RpcProvider
    )
    this.logger.info('Connected to StateCommitmentChain', {
      address: this.state.StateCommitmentChain.address,
    })

    this.logger.info('Connecting to OVM_GasPriceOracle...')
    this.state.OVM_GasPriceOracle = loadContract(
      'OVM_GasPriceOracle',
      this.options.gasPriceOracleAddress,
      this.options.l2RpcProvider
    ).connect(this.options.gasPriceOracleOwnerWallet)
    this.logger.info('Connected to OVM_GasPriceOracle', {
      address: this.state.OVM_GasPriceOracle.address,
    })

    this.logger.info('Connecting to Boba_GasPriceOracle...')
    const Boba_GasPriceOracleAddress =
      await this.state.Lib_AddressManager.getAddress(
        'Proxy__Boba_GasPriceOracle'
      )
    this.state.Boba_GasPriceOracle = new Contract(
      Boba_GasPriceOracleAddress,
      Boba_GasPriceOracleJson.abi,
      this.options.l2RpcProvider
    ).connect(this.options.gasPriceOracleOwnerWallet)
    this.logger.info('Connected to Boba_GasPriceOracle', {
      address: this.state.Boba_GasPriceOracle.address,
    })

    this.logger.info('Connecting to L2BOBA...')
    const L2BOBAAddress = await this.state.Lib_AddressManager.getAddress(
      'TK_L2BOBA'
    )
    this.state.L2BOBA = new Contract(
      L2BOBAAddress,
      L2GovernanceERC20Json.abi,
      this.options.l2RpcProvider
    )
    this.logger.info('Connected to L2BOBA', {
      address: this.state.L2BOBA.address,
    })

    this.state.L1ETHBalance = BigNumber.from('0')
    this.state.L1ETHCostFee = BigNumber.from('0')
    this.state.L2ETHCollectFee = BigNumber.from('0')
    this.state.L2ETHVaultBalance = BigNumber.from('0')

    // Load history
    await this._loadL1ETHFee()
    await this._loadL2FeeCost()
  }

  protected async _start(): Promise<void> {
    while (this.running) {
      await sleep(this.options.pollingInterval)
      // token price
      await this._queryTokenPrice('BOBA/USD')
      await this._queryTokenPrice('ETH/USD')
      // l2 gas price
      await this._getL1Balance()
      await this._getL2GasCost()
      await this._updatePriceRatio()
      // extra burn gas
      await this._updateFastExitGasBurnFee()
      await this._updateClassicalExitGasBurnFee()
      await this._updateNFTBridgeGasBurnFee()
      // l1 gas price and overhead fee
      await this._updateOverhead()
      await this._upateL1BaseFee()
    }
  }

  private async _loadL1ETHFee(): Promise<void> {
    const dumpsPath = path.resolve(__dirname, '../data/l1History.json')
    if (fs.existsSync(dumpsPath)) {
      this.logger.warn('Loading L1 cost history...')
      const historyJsonRaw = await fsPromise.readFile(dumpsPath)
      const historyJSON = JSON.parse(historyJsonRaw.toString())
      if (historyJSON.L1ETHCostFee) {
        this.state.L1ETHBalance = BigNumber.from(historyJSON.L1ETHBalance)
        this.state.L1ETHCostFee = BigNumber.from(historyJSON.L1ETHCostFee)
      } else {
        this.logger.warn('Invalid L1 cost history!')
      }
    } else {
      this.logger.warn('No L1 cost history Found!')
    }
  }

  private async _loadL2FeeCost(): Promise<void> {
    const ETHVaultBalance = BigNumber.from(
      (
        await this.options.l2RpcProvider.getBalance(
          this.options.OVM_SequencerFeeVault
        )
      ).toString()
    )
    const BOBAVaultBalance = await this.state.L2BOBA.balanceOf(
      this.state.Boba_GasPriceOracle.address
    )
    // load data
    const dumpsPath = path.resolve(__dirname, '../data/l2History.json')
    if (fs.existsSync(dumpsPath)) {
      this.logger.warn('Loading L2 cost history...')
      const historyJsonRaw = await fsPromise.readFile(dumpsPath)
      const historyJSON = JSON.parse(historyJsonRaw.toString())
      // Load ETH
      if (historyJSON.L2ETHCollectFee) {
        this.state.L2ETHCollectFee = BigNumber.from(historyJSON.L2ETHCollectFee)
      } else {
        this.logger.warn('Invalid L2 ETH cost history!')
        this.state.L2ETHCollectFee = ETHVaultBalance
      }
      // Load Boba
      if (historyJSON.L2BOBACollectFee) {
        this.state.L2BOBACollectFee = BigNumber.from(
          historyJSON.L2BOBACollectFee
        )
      } else {
        this.logger.warn('Invalid L2 BOBA cost history!')
        this.state.L2BOBACollectFee = BOBAVaultBalance
      }
    } else {
      this.logger.warn('No L2 cost history Found!')
      this.state.L2ETHCollectFee = ETHVaultBalance
      this.state.L2BOBACollectFee = BOBAVaultBalance
    }
    // adjust the L2ETHCollectFee if it is not correct
    if (this.state.L2ETHCollectFee.lt(ETHVaultBalance)) {
      this.state.L2ETHCollectFee = ETHVaultBalance
    }
    // adjust the L2BOBACollectFee if it is not correct
    if (this.state.L2BOBACollectFee.lt(BOBAVaultBalance)) {
      this.state.L2BOBACollectFee = BOBAVaultBalance
    }
    this.state.L2ETHVaultBalance = ETHVaultBalance
    this.state.L2BOBAVaultBalance = BOBAVaultBalance
    this.logger.info('Loaded L2 Cost Data', {
      L2ETHVaultBalance: this.state.L2ETHVaultBalance.toString(),
      L2ETHCollectFee: this.state.L2ETHCollectFee.toString(),
      L2BOBAVaultBalance: this.state.L2BOBAVaultBalance.toString(),
      L2BOBACollectFee: this.state.L2BOBACollectFee.toString(),
    })
  }

  private async _writeL1ETHFee(): Promise<void> {
    const dumpsPath = path.resolve(__dirname, '../data')
    if (!fs.existsSync(dumpsPath)) {
      fs.mkdirSync(dumpsPath)
    }
    try {
      const addrsPath = path.resolve(dumpsPath, 'l1History.json')
      await fsPromise.writeFile(
        addrsPath,
        JSON.stringify({
          L1ETHBalance: this.state.L1ETHBalance.toString(),
          L1ETHCostFee: this.state.L1ETHCostFee.toString(),
        })
      )
    } catch (error) {
      console.log(error)
      this.logger.error('Failed to write L1 cost history!')
    }
  }

  private async _writeL2FeeCollect(): Promise<void> {
    const dumpsPath = path.resolve(__dirname, '../data')
    if (!fs.existsSync(dumpsPath)) {
      fs.mkdirSync(dumpsPath)
    }
    try {
      const addrsPath = path.resolve(dumpsPath, 'l2History.json')
      await fsPromise.writeFile(
        addrsPath,
        JSON.stringify({
          L2ETHCollectFee: this.state.L2ETHCollectFee.toString(),
          L2BOBACollectFee: this.state.L2BOBACollectFee.toString(),
        })
      )
    } catch (error) {
      console.log(error)
      this.logger.error('Failed to write L1 cost history!')
    }
  }

  private async _getL1Balance(): Promise<void> {
    try {
      const balances = await Promise.all([
        this.options.l1RpcProvider.getBalance(this.options.sequencerAddress),
        this.options.l1RpcProvider.getBalance(this.options.proposerAddress),
        this.options.l1RpcProvider.getBalance(this.options.relayerAddress),
        this.options.l1RpcProvider.getBalance(this.options.fastRelayerAddress),
      ])

      this.logger.info('L1 addresses balance', {
        sequencerBalance: Number(
          Number(utils.formatUnits(balances[0], 18)).toFixed(2)
        ),
        proposerBalance: Number(
          Number(utils.formatUnits(balances[1], 18)).toFixed(2)
        ),
        relayerBalance: Number(
          Number(utils.formatUnits(balances[2], 18)).toFixed(2)
        ),
        fastRelayerBalance: Number(
          Number(utils.formatUnits(balances[3], 18)).toFixed(2)
        ),
      })

      const L1ETHBalanceLatest = balances.reduce((acc, cur) => {
        return acc.add(cur)
      }, BigNumber.from('0'))

      if (!this.state.L1ETHBalance.eq(BigNumber.from('0'))) {
        // condition 1 - L1ETHBalance <= L1ETHBalanceLatest -- do nothing
        // condition 2 - L1ETHBalance > L1ETHBalanceLatest
        if (this.state.L1ETHBalance.gt(L1ETHBalanceLatest)) {
          this.state.L1ETHCostFee = this.state.L1ETHCostFee.add(
            this.state.L1ETHBalance.sub(L1ETHBalanceLatest)
          )
        }
      } else {
        // start from the point that L1ETHCost = L2ETHCollect
        this.state.L1ETHCostFee = BigNumber.from(
          (
            await this.options.l2RpcProvider.getBalance(
              this.options.OVM_SequencerFeeVault
            )
          ).toString()
        )
      }

      this.state.L1ETHBalance = L1ETHBalanceLatest

      // write history
      this._writeL1ETHFee()

      this.logger.info('Got L1 ETH balances', {
        network: 'L1',
        data: {
          L1ETHBalance: this.state.L1ETHBalance.toString(),
          L1ETHCostFee: Number(
            Number(
              utils.formatEther(this.state.L1ETHCostFee.toString())
            ).toFixed(6)
          ),
          L1ETHCostFee10X: Number(
            (
              Number(utils.formatEther(this.state.L1ETHCostFee.toString())) * 10
            ).toFixed(6)
          ),
          L1ETHCostFeeUSD: Number(
            (
              Number(
                Number(utils.formatEther(this.state.L1ETHCostFee.toString()))
              ) * this.state.ETHUSDPrice
            ).toFixed(2)
          ),
        },
      })
    } catch (error) {
      this.logger.warn(`CAN\'T GET L1 GAS COST ${error}`)
    }
  }

  private async _getL2GasCost(): Promise<void> {
    try {
      // Get L2 ETH Fee from contract
      const L2ETHCollectFee = BigNumber.from(
        (
          await this.options.l2RpcProvider.getBalance(
            this.options.OVM_SequencerFeeVault
          )
        ).toString()
      )
      // The oETH in OVM_SequencerFeeVault is zero after withdrawing it
      let L2ETHCollectFeeIncreased = BigNumber.from('0')

      if (L2ETHCollectFee.lt(this.state.L2ETHVaultBalance)) {
        this.state.L2ETHVaultBalance = L2ETHCollectFee
      }
      L2ETHCollectFeeIncreased = L2ETHCollectFee.sub(
        this.state.L2ETHVaultBalance
      )
      this.state.L2ETHVaultBalance = L2ETHCollectFee

      this.state.L2ETHCollectFee = this.state.L2ETHCollectFee.add(
        L2ETHCollectFeeIncreased
      )

      // Get L2 BOBA Fee from contract
      const L2BOBACollectFee = await this.state.L2BOBA.balanceOf(
        this.state.Boba_GasPriceOracle.address
      )
      // The BOBA in Boba_GasPriceOracle is zero after withdrawing it
      let L2BOBACollectFeeIncreased = BigNumber.from('0')

      if (L2BOBACollectFee.lt(this.state.L2BOBAVaultBalance)) {
        this.state.L2BOBAVaultBalance = L2BOBACollectFee
      }
      L2BOBACollectFeeIncreased = L2BOBACollectFee.sub(
        this.state.L2BOBAVaultBalance
      )
      this.state.L2BOBAVaultBalance = L2BOBACollectFee

      this.state.L2BOBACollectFee = this.state.L2BOBACollectFee.add(
        L2BOBACollectFeeIncreased
      )

      await this._writeL2FeeCollect()

      this.logger.info('Got L2 Gas Collect', {
        network: 'L2',
        data: {
          L2ETHCollectFee: Number(
            Number(
              utils.formatEther(this.state.L2ETHCollectFee.toString())
            ).toFixed(6)
          ),
          L2ETHCollectFee10X: Number(
            (
              Number(utils.formatEther(this.state.L2ETHCollectFee.toString())) *
              10
            ).toFixed(6)
          ),
          L2BOBACollectFee: Number(
            Number(
              utils.formatEther(this.state.L2BOBACollectFee.toString())
            ).toFixed(6)
          ),
          L2BOBACollectFee10X: Number(
            (
              Number(
                utils.formatEther(this.state.L2BOBACollectFee.toString())
              ) * 10
            ).toFixed(6)
          ),
          L2ETHCollectFeeUSD: Number(
            (
              Number(utils.formatEther(this.state.L2ETHCollectFee.toString())) *
              this.state.ETHUSDPrice
            ).toFixed(2)
          ),
          L2BOBACollectFeeUSD: Number(
            (
              Number(
                utils.formatEther(this.state.L2BOBACollectFee.toString())
              ) * this.state.BOBAUSDPrice
            ).toFixed(2)
          ),
        },
      })
    } catch (error) {
      this.logger.warn(`CAN\'T GET L2 GAS COST ${error}`)
    }
  }

  private async _updatePriceRatio(): Promise<void> {
    const priceRatio = await this.state.Boba_GasPriceOracle.priceRatio()
    const priceRatioInt = priceRatio.toNumber()
    this.logger.info('Got Boba and ETH price ratio', {
      priceRatio: priceRatioInt,
    })
    try {
      const targetPriceRatio = Math.floor(
        ((this.state.ETHUSDPrice / this.state.BOBAUSDPrice) *
          this.options.bobaFeeRatio100X) /
          100
      )
      const targetMarketPriceRatio = Math.floor(
        this.state.ETHUSDPrice / this.state.BOBAUSDPrice
      )
      if (targetPriceRatio !== priceRatioInt) {
        let targetUpdatedPriceRatio = targetPriceRatio
        if (targetPriceRatio > priceRatio) {
          targetUpdatedPriceRatio = Math.min(
            Math.floor(
              (1 + this.options.bobaFeeRatioMinPercentChange) * priceRatioInt
            ),
            targetPriceRatio
          )
        } else {
          targetUpdatedPriceRatio = Math.max(
            Math.floor(
              (1 - this.options.bobaFeeRatioMinPercentChange) * priceRatioInt
            ),
            targetPriceRatio
          )
        }
        this.logger.info('Updating price ratio...')
        const gasPriceTx =
          await this.state.Boba_GasPriceOracle.updatePriceRatio(
            targetUpdatedPriceRatio,
            targetMarketPriceRatio,
            { gasPrice: 0 }
          )
        await gasPriceTx.wait()
        this.logger.info('Updated price ratio', {
          priceRatio: targetUpdatedPriceRatio,
          targetMarketPriceRatio,
        })
      } else {
        this.logger.info('No need to update price ratio', {
          priceRatio: priceRatioInt,
          targetPriceRatio,
        })
      }
    } catch (error) {
      this.logger.info('Failed to update price ratio', {
        error,
      })
    }
  }

  private async _updateFastExitGasBurnFee(): Promise<void> {
    try {
      const latestL1Block = await this.options.l1RpcProvider.getBlockNumber()
      const L1LiquidityPoolLog =
        await this.state.Proxy__L1LiquidityPool.queryFilter(
          this.state.Proxy__L1LiquidityPool.filters.ClientPayL1(),
          Number(latestL1Block) - 10000,
          Number(latestL1Block)
        )
      const orderedL1LiquidityPoolLog = orderBy(
        L1LiquidityPoolLog,
        'blockNumber',
        'desc'
      )

      // Calculate the average fee of last 50 relayed messages
      let L1FastRelayerCost = BigNumber.from(0)
      const transactionHashList = orderedL1LiquidityPoolLog.reduce(
        (acc, cur, index) => {
          if (
            index < 50 &&
            acc.length < 10 &&
            !acc.includes(cur.transactionHash)
          ) {
            acc.push(cur.transactionHash)
          }
          return acc
        },
        []
      )
      const numberOfMessages = orderedL1LiquidityPoolLog.filter((i) =>
        transactionHashList.includes(i.transactionHash)
      ).length

      if (numberOfMessages) {
        for (const hash of transactionHashList) {
          const txReceipt =
            await this.options.l1RpcProvider.getTransactionReceipt(hash)
          L1FastRelayerCost = L1FastRelayerCost.add(
            txReceipt.effectiveGasPrice.mul(txReceipt.gasUsed)
          )
        }

        const messageFee = L1FastRelayerCost.div(
          BigNumber.from(numberOfMessages)
        )
        const extraChargeFee = messageFee
          .mul(BigNumber.from(this.options.burnedGasFeeRatio100X))
          .div(BigNumber.from(100))
        const L2GasPrice = await this.options.l2RpcProvider.getGasPrice()
        const targetExtraGasRelay = extraChargeFee
          .div(L2GasPrice)
          .gt(BigNumber.from(this.options.maxBurnedGas))
          ? BigNumber.from(this.options.maxBurnedGas)
          : extraChargeFee.div(L2GasPrice)

        const extraGasRelay =
          await this.state.Proxy__L2LiquidityPool.extraGasRelay()

        if (targetExtraGasRelay.toString() === extraGasRelay.toString()) {
          this.logger.info('No need to update extra gas', {
            targetExtraGasRelay: targetExtraGasRelay.toNumber(),
            extraGasRelay: extraGasRelay.toNumber(),
          })
        } else {
          this.logger.debug('Updating extra gas for Proxy__L2LiquidityPool...')
          const tx =
            await this.state.Proxy__L2LiquidityPool.configureExtraGasRelay(
              targetExtraGasRelay,
              { gasPrice: 0 }
            )
          await tx.wait()
          this.logger.info('Updated Proxy__L2LiquidityPool extra gas', {
            extraGasRelay: targetExtraGasRelay.toNumber(),
          })
        }
      } else {
        this.logger.info('No need to update extra gas for fast exit')
      }
    } catch (error) {
      this.logger.warn(`CAN\'T UPDATE FAST EXIT BURNED RATIO ${error}`)
    }
  }

  private async _updateClassicalExitGasBurnFee(): Promise<void> {
    try {
      const latestL1Block = await this.options.l1RpcProvider.getBlockNumber()
      const L1StandardBridgeERC20Log =
        await this.state.Proxy__L1StandardBridge.queryFilter(
          this.state.Proxy__L1StandardBridge.filters.ERC20WithdrawalFinalized(),
          Number(latestL1Block) - 10000,
          Number(latestL1Block)
        )
      const L1StandardBridgeETHLog =
        await this.state.Proxy__L1StandardBridge.queryFilter(
          this.state.Proxy__L1StandardBridge.filters.ETHWithdrawalFinalized(),
          Number(latestL1Block) - 10000,
          Number(latestL1Block)
        )

      const orderedL1StandardBridgeLog = orderBy(
        [...L1StandardBridgeERC20Log, ...L1StandardBridgeETHLog],
        'blockNumber',
        'desc'
      )

      // Calculate the average fee of last 50 relayed messages
      let L1ClassicalRelayerCost = BigNumber.from(0)
      const transactionHashList = orderedL1StandardBridgeLog.reduce(
        (acc, cur, index) => {
          if (
            index < 50 &&
            acc.length < 10 &&
            !acc.includes(cur.transactionHash)
          ) {
            acc.push(cur.transactionHash)
          }
          return acc
        },
        []
      )
      const numberOfMessages = [
        ...L1StandardBridgeERC20Log,
        ...L1StandardBridgeETHLog,
      ].filter((i) => transactionHashList.includes(i.transactionHash)).length

      if (numberOfMessages) {
        for (const hash of transactionHashList) {
          const txReceipt =
            await this.options.l1RpcProvider.getTransactionReceipt(hash)
          L1ClassicalRelayerCost = L1ClassicalRelayerCost.add(
            txReceipt.effectiveGasPrice.mul(txReceipt.gasUsed)
          )
        }

        const messageFee = L1ClassicalRelayerCost.div(
          BigNumber.from(numberOfMessages)
        )
        const extraChargeFee = messageFee
          .mul(BigNumber.from(this.options.burnedGasFeeRatio100X))
          .div(BigNumber.from(100))
        const L2GasPrice = await this.options.l2RpcProvider.getGasPrice()
        const targetExtraGasRelay = extraChargeFee
          .div(L2GasPrice)
          .gt(BigNumber.from(this.options.maxBurnedGas))
          ? BigNumber.from(this.options.maxBurnedGas)
          : extraChargeFee.div(L2GasPrice)

        const extraGasRelay =
          await this.state.DiscretionaryExitBurn.extraGasRelay()

        if (targetExtraGasRelay.toString() === extraGasRelay.toString()) {
          this.logger.info('No need to update extra gas', {
            targetExtraGasRelay: targetExtraGasRelay.toNumber(),
            extraGasRelay: extraGasRelay.toNumber(),
          })
        } else {
          this.logger.debug('Updating extra gas for DiscretionaryExitBurn...')
          const tx =
            await this.state.DiscretionaryExitBurn.configureExtraGasRelay(
              targetExtraGasRelay,
              { gasPrice: 0 }
            )
          await tx.wait()
          this.logger.info('Updated DiscretionaryExitBurn extra gas', {
            extraGasRelay: targetExtraGasRelay.toNumber(),
          })
        }
      } else {
        this.logger.info('No need to update extra gas for classical exit')
      }
    } catch (error) {
      this.logger.warn(`CAN\'T UPDATE CLASSICAL EXIT BURNED RATIO ${error}`)
    }
  }

  private async _updateOverhead(): Promise<void> {
    try {
      const latestL1Block = await this.options.l1RpcProvider.getBlockNumber()
      const CanonicalTransactionChainLog =
        await this.state.CanonicalTransactionChain.queryFilter(
          this.state.CanonicalTransactionChain.filters.SequencerBatchAppended(),
          Number(latestL1Block) - 1000,
          Number(latestL1Block)
        )
      const StateCommitmentChainLog =
        await this.state.StateCommitmentChain.queryFilter(
          this.state.StateCommitmentChain.filters.StateBatchAppended(),
          Number(latestL1Block) - 1000,
          Number(latestL1Block)
        )

      const orderedOverheadLog = orderBy(
        [...CanonicalTransactionChainLog, ...StateCommitmentChainLog],
        'blockNumber',
        'desc'
      )

      // Calculate the batch size
      let L1BatchSubmissionGasUsage = BigNumber.from(0)
      const transactionHashList = orderedOverheadLog.reduce(
        (acc, cur, index) => {
          if (!acc.includes(cur.transactionHash)) {
            acc.push(cur.transactionHash)
          }
          return acc
        },
        []
      )

      const batchSize = StateCommitmentChainLog.reduce((acc, cur) => {
        acc += cur.args._batchSize.toNumber()
        return acc
      }, 0)

      for (const hash of transactionHashList) {
        const txReceipt =
          await this.options.l1RpcProvider.getTransactionReceipt(hash)
        L1BatchSubmissionGasUsage = L1BatchSubmissionGasUsage.add(
          txReceipt.gasUsed
        )
      }

      const batchFee = L1BatchSubmissionGasUsage.div(BigNumber.from(batchSize))
      const targetOverheadGas = batchFee
        .mul(BigNumber.from(this.options.overheadRatio1000X))
        .div(BigNumber.from('1000'))

      const overheadProduction = await this.state.OVM_GasPriceOracle.overhead()

      if (
        (targetOverheadGas.toNumber() <
          overheadProduction.toNumber() *
            (1 + this.options.overheadMinPercentChange) &&
          targetOverheadGas.toNumber() >
            overheadProduction.toNumber() *
              (1 - this.options.overheadMinPercentChange)) ||
        !targetOverheadGas.toNumber()
      ) {
        this.logger.info('No need to update overhead value', {
          targetOverheadGas: targetOverheadGas.toNumber(),
          overheadGas: overheadProduction.toNumber(),
        })
      } else {
        if (targetOverheadGas.toNumber() > this.options.minOverhead) {
          this.logger.debug('Updating overhead gas...')
          const tx = await this.state.OVM_GasPriceOracle.setOverhead(
            targetOverheadGas,
            { gasPrice: 0 }
          )
          await tx.wait()
          this.logger.info('Updated overhead gas', {
            overheadProduction: overheadProduction.toNumber(),
            overheadGas: targetOverheadGas.toNumber(),
          })
        } else {
          this.logger.info('No need to update overhead value', {
            targetOverheadGas: targetOverheadGas.toNumber(),
            overheadGas: overheadProduction.toNumber(),
            minOverheadGas: this.options.minOverhead,
          })
        }
      }
    } catch (error) {
      this.logger.warn(`CAN\'T UPDATE OVER HEAD RATIO ${error}`)
    }
  }

  private async _updateNFTBridgeGasBurnFee(): Promise<void> {
    try {
      const latestL1Block = await this.options.l1RpcProvider.getBlockNumber()
      const L1NFTBridgeSuccessLog =
        await this.state.Proxy__L1NFTBridge.queryFilter(
          this.state.Proxy__L1NFTBridge.filters.NFTWithdrawalFinalized(),
          Number(latestL1Block) - 10000,
          Number(latestL1Block)
        )
      const L1NFTBridgeFailureLog =
        await this.state.Proxy__L1NFTBridge.queryFilter(
          this.state.Proxy__L1NFTBridge.filters.NFTWithdrawalFailed(),
          Number(latestL1Block) - 10000,
          Number(latestL1Block)
        )

      const orderedL1NFTBridgeLog = orderBy(
        [...L1NFTBridgeSuccessLog, ...L1NFTBridgeFailureLog],
        'blockNumber',
        'desc'
      )

      // Calculate the average fee of last 50 relayed messages
      let L1NFTRelayerCost = BigNumber.from(0)
      const transactionHashList = orderedL1NFTBridgeLog.reduce(
        (acc, cur, index) => {
          if (
            index < 50 &&
            acc.length < 10 &&
            !acc.includes(cur.transactionHash)
          ) {
            acc.push(cur.transactionHash)
          }
          return acc
        },
        []
      )
      const numberOfMessages = [
        ...L1NFTBridgeSuccessLog,
        ...L1NFTBridgeFailureLog,
      ].filter((i) => transactionHashList.includes(i.transactionHash)).length

      if (numberOfMessages) {
        for (const hash of transactionHashList) {
          const txReceipt =
            await this.options.l1RpcProvider.getTransactionReceipt(hash)
          L1NFTRelayerCost = L1NFTRelayerCost.add(
            txReceipt.effectiveGasPrice.mul(txReceipt.gasUsed)
          )
        }

        const messageFee = L1NFTRelayerCost.div(
          BigNumber.from(numberOfMessages)
        )
        const extraChargeFee = messageFee
          .mul(BigNumber.from(this.options.burnedGasFeeRatio100X))
          .div(BigNumber.from(100))
        const L2GasPrice = await this.options.l2RpcProvider.getGasPrice()
        const targetExtraGasRelay = extraChargeFee
          .div(L2GasPrice)
          .gt(BigNumber.from(this.options.maxBurnedGas))
          ? BigNumber.from(this.options.maxBurnedGas)
          : extraChargeFee.div(L2GasPrice)

        const extraGasRelay =
          await this.state.Proxy__L2NFTBridge.extraGasRelay()

        if (targetExtraGasRelay.toString() === extraGasRelay.toString()) {
          this.logger.info('No need to update extra gas', {
            targetExtraGasRelay: targetExtraGasRelay.toNumber(),
            extraGasRelay: extraGasRelay.toNumber(),
          })
        } else {
          this.logger.debug('Updating extra gas for Proxy__L2NFTBridge...')
          const tx = await this.state.Proxy__L2NFTBridge.configureExtraGasRelay(
            targetExtraGasRelay,
            { gasPrice: 0 }
          )
          await tx.wait()
          this.logger.info('Updated Proxy__L2NFTBridge extra gas', {
            extraGasRelay: targetExtraGasRelay.toNumber(),
          })
        }
      } else {
        this.logger.info('No need to update extra gas for NFT')
      }
    } catch (error) {
      this.logger.warn(`CAN\'T UPDATE NFT EXIT BURNED RATIO ${error}`)
    }
  }

  private async _upateL1BaseFee(): Promise<void> {
    try {
      const l1GasPrice = await this.options.l1RpcProvider.getGasPrice()
      const l1BaseFee = await this.state.OVM_GasPriceOracle.l1BaseFee()
      if (
        l1GasPrice.toNumber() !== l1BaseFee.toNumber() &&
        l1GasPrice.toNumber() > this.options.minL1BaseFee &&
        l1GasPrice.toNumber() < this.options.maxL1BaseFee
      ) {
        const tx = await this.state.OVM_GasPriceOracle.setL1BaseFee(
          l1GasPrice,
          { gasPrice: 0 }
        )
        await tx.wait()
        this.logger.info('Updated l1BaseFee', {
          l1GasPrice: l1GasPrice.toNumber(),
          l1BaseFee: l1BaseFee.toNumber(),
        })
      } else {
        this.logger.info('No need to update L1 base gas price', {
          l1GasPrice: l1GasPrice.toNumber(),
          l1BaseFee: l1BaseFee.toNumber(),
          minL1BaseFee: this.options.minL1BaseFee,
          maxL1BaseFee: this.options.maxL1BaseFee,
        })
      }
    } catch (error) {
      this.logger.warn(`CAN\'T UPDATE L1 BASE FEE ${error}`)
    }
  }

  private async _queryTokenPrice(tokenPair): Promise<void> {
    const RequestURL = `https://api.polygon.io/v1/last/crypto/${tokenPair}?apiKey=${this.options.polygonAPIKey}`
    const response = await fetch(RequestURL)
    if (response.status === 200) {
      const json = await response.json()
      if (json.status === 'success') {
        if (tokenPair === 'BOBA/USD') {
          this.state.BOBAUSDPrice = Number(json.last.price)
        }
        if (tokenPair === 'ETH/USD') {
          this.state.ETHUSDPrice = Number(json.last.price)
        }
      }
    }
  }
}
