<div align="center">
  <a href="https://forum.boba.network"><img alt="Boba" src="https://github.com/bobanetwork/boba/blob/develop/packages/boba/gateway/src/images/boba2/logo-boba2.svg" width=400></a>
  <br />
  <h1> The Boba Monorepo</h1>
</div>

<p align="center">
  <a href="https://github.com/bobanetwork/boba/actions/workflows/ts-packages.yml?query=branch%3Adevelop"><img src="https://github.com/bobanetwork/boba/actions/workflows/ts-packages.yml/badge.svg?branch%3Adevelop" /></a>
  <a href="https://github.com/bobanetwork/boba/actions/workflows/integration.yml?query=branch%3Adevelop"><img src="https://github.com/bobanetwork/boba/actions/workflows/integration.yml/badge.svg?branch%3Adevelop" /></a>
  <a href="https://github.com/bobanetwork/boba/actions/workflows/geth.yml?query=branch%3Adevelop"><img src="https://github.com/bobanetwork/boba/actions/workflows/geth.yml/badge.svg?branch%3Adevelop" /></a>
</p>

- [TL;DR](#tl-dr)
- [Documentation](#documentation)
- [Community and DAO](#community-and-dao)
- [Directory Structure](#directory-structure)
- [Contributing](#contributing)
  * [Dependencies](#dependencies)
- [Spinning up the stack](#spinning-up-the-stack)
  * [Helpful commands](#helpful-commands)
  * [Running unit tests](#running-unit-tests)
  * [Running integration tests](#running-integration-tests)
  * [Viewing docker container logs](#viewing-docker-container-logs)
- [License](#license)

## TL;DR

This is the primary place where [Boba](https://boba.network) works on the Boba L2, a compute-focused L2. Fundamentally, Ethereum is a distributed computer. We believe that L2s can play a unique role in augmenting the base _compute_ capabilities of the Ethereum ecosystem. You can learn more about Turing hybrid compute [here](./packages/boba/turing/README.md).

<a href="https://github.com/bobanetwork/boba/blob/develop/packages/boba/turing">
  <img alt="Boba" src="https://github.com/bobanetwork/boba/blob/develop/packages/boba/gateway/src/images/boba2/turing.png" width=500>
</a>

 Boba is built on the Optimistic Rollup developed by [Optimism](https://optimism.io). Aside from its main focus, augmenting compute, Boba differs from Optimism by:

  * providing additional cross-chain messaging such as a `message-relayer-fast`
  * using different gas pricing logic
  * providing a swap-based system for rapid L2->L1 exits (without the 7 day delay)
  * providing a community fraud-detector that allows transactions to be independently verified by anyone
  * interacting with L2 ETH using the normal ETH methods (`msg.value`, `send eth_sendTransaction`, and `provider.getBalance(address)` rather than as WETH
  * being organized as a [DAO](./packages/boba/contracts/contracts/DAO)
  * native [NFT bridging](./packages/boba/contracts/contracts/bridges)
  * automatically relaying classical 7-day exit messages to L1 for you, rather than this being a separate step

## Documentation

User focused documentation is available [on the Boba docs website](http://docs.boba.network/). Developer-focused documentation lives in [this folder](https://github.com/bobanetwork/boba/blob/develop/boba_documentation) and within the service and contract directories.

## Directory Structure

**Base Layer (generally similar to Optimistic Ethereum)**

* [`packages`](./packages): Contains all the typescript packages and contracts
  * [`contracts`](./packages/contracts): Solidity smart contracts implementing the OVM
  * [`core-utils`](./packages/core-utils): Low-level utilities and encoding packages
  * [`common-ts`](./packages/common-ts): Common tools for TypeScript code that runs in Node
  * [`data-transport-layer`](./packages/data-transport-layer): Event indexer, allowing the `l2geth` node to access L1 data
  * [`batch-submitter`](./go/batch-submitter): Daemon for submitting L2 transaction and state root batches to L1
  * [`message-relayer`](./packages/message-relayer): Service for relaying L2 messages to L1
  * [`replica-healthcheck`](./packages/replica-healthcheck): Service to monitor the health of different replica deployments
* [`l2geth`](./l2geth): Fork of [go-ethereum v1.9.10](https://github.com/ethereum/go-ethereum/tree/v1.9.10) implementing the [OVM](https://research.paradigm.xyz/optimism#optimistic-geth).
* [`integration-tests`](./integration-tests): Integration tests between a L1 testnet and the `l2geth`
* [`ops`](./ops): Contains Dockerfiles for containerizing each service involved in the protocol,
as well as a docker-compose file for bringing up local testnets easily

**Boba Layer**

* [`packages/boba/turing`](./packages/boba/turing): System for hybrid compute
* [`boba_community`](./boba_community): Code for running your own Boba node/replica and the fraud detector
* [`boba_documentation`](./boba_documentation): Boba-specific documentation
* [`boba_examples`](./boba_examples): Basic examples of deploying contracts on Boba
* [`boba_utilities`](./boba_utilities): A stress-tester for discovering bugs under load
* [`ops_boba`](./ops_boba): Parts of the Boba back-end, including the `api-watcher` service
* [`packages/boba`](./packages/boba): Contains all the Boba typescript packages and contracts
  * [`contracts`](./packages/boba/contracts): Solidity smart contracts implementing the fast bridges, the DAO, etc.
  * [`gas-price-oracle`](./packages/boba/gas-price-oracle): A custom gas price oracle
  * [`gateway`](./packages/boba/gateway): The Boba Web gateway
  * [`message-relayer-fast`](./packages/boba/message-relayer-fast): A fast message relayer without a 7 day delay
  * [`register`](./packages/boba/register): Code for registering addresses in the AddressManager
  * [`subgraph`](./packages/boba/subgraph): Subgraphs for indexing the **StandardBridge** and **LiquidityPool** contracts

## Contributing

Follow these instructions to set up your local development environment.

### Dependencies

You'll need the following:

* [Git](https://git-scm.com/downloads)
* [NodeJS](https://nodejs.org/en/download/)
* [Yarn](https://classic.yarnpkg.com/en/docs/install)
* [Docker](https://docs.docker.com/get-docker/)
* [Docker Compose](https://docs.docker.com/compose/install/)

**Note: this is only relevant to developers who wish to work on Boba core services. For most test uses, e.g. deploying you contracts, it's simpler to use https://rinkeby.boba.network**.

Clone the repository, open it, and install nodejs packages with `yarn`:

```bash
$ git clone git@github.com:bobanetwork/boba.git
$ cd boba
$ yarn clean # only needed / will only work if you had it installed previously
$ yarn
$ yarn build
```

Then, make sure you have Docker installed _and make sure Docker is running_. Finally, build and run the entire stack:

```bash
$ cd ops
$ BUILD=1 DAEMON=0 ./up_local.sh
```

## Spinning up the stack

Stack spinup can take 15 minutes or more. There are many interdependent services to bring up with two waves of contract deployment and initialization. Recommended settings in docker - 10 CPUs, 30 to 40 GB of memory. You can either inspect the Docker `Dashboard>Containers/All>Ops` for the progress of the `ops_deployer` _or_ you can run this script to wait for the sequencer to be fully up:

```bash
./scripts/wait-for-sequencer.sh
```

If the command returns with no log output, the sequencer is up. Once the sequencer is up, you can inspect the Docker `Dashboard>Containers/All>Ops` for the progress of `ops_boba_deployer` _or_ you can run the following script to wait for all the Boba contracts (e.g. the fast message relay system) to be deployed and up:

```bash
./scripts/wait-for-boba.sh
```

When the command returns with `Pass: Found L2 Liquidity Pool contract address`, the entire Boba stack has come up correctly.

### Helpful commands

* _Running out of space on your Docker, or having other having hard to debug issues_? Try running `docker system prune -a --volumes` and then rebuild the images.
* _To (re)build individual base services_: `docker-compose build -- l2geth`
* _To (re)build individual Boba ts services_: `docker-compose build -- builder` then `docker-compose build -- dtl`, for example

### Running unit tests

To run unit tests for a specific package:

```bash
cd packages/package-to-test
yarn test
```

### Running integration tests

Make sure you are in the `ops` folder and then run

```bash
docker-compose run integration_tests
```

Expect the full test suite with more than 110 tests including load tests to complete in
between *30 minutes* to *two hours* depending on your computer hardware.

### Viewing docker container logs

By default, the `docker-compose up` command will show logs from all services, and that
can be hard to filter through. In order to view the logs from a specific service, you can run:

```bash
docker-compose logs --follow <service name>
```

## License

Code forked from [`go-ethereum`](https://github.com/ethereum/go-ethereum) under the name [`l2geth`](https://github.com/ethereum-optimism/optimism/tree/master/l2geth) is licensed under the [GNU GPLv3](https://gist.github.com/kn9ts/cbe95340d29fc1aaeaa5dd5c059d2e60) in accordance with the [original license](https://github.com/ethereum/go-ethereum/blob/master/COPYING).

All other files within this repository are licensed under the [MIT License](https://github.com/bobanetwork/boba/blob/develop/LICENSE) unless stated otherwise.
