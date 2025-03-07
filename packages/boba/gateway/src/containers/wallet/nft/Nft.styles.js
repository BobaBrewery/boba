import { styled } from '@mui/material/styles'
import { Box, Typography, Grid, Divider } from "@mui/material"

export const NFTPageContainer = styled(Box)(({ theme }) => ({
  margin: '20px auto',
  display: 'flex',
  justifyContent: 'space-around',
  width: '100%',
  gap: '10px',
  // [theme.breakpoints.between('md', 'lg')]: {
  //   width: '90%',
  //   padding: '0px',
  // },
  // [theme.breakpoints.between('sm', 'md')]: {
  //   width: '90%',
  //   padding: '0px',
  // },
  [ theme.breakpoints.down('sm') ]: {
    width: '100%',
    padding: '0px',
    flexDirection: 'column',
  },
}));

export const NFTActionContent = styled(Box)(({ theme }) => ({
  width: '35%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  gap: '10px',
  [ theme.breakpoints.down('sm') ]: {
    width: '100%',
  },
}));

export const NFTFormContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  padding: '10px',
  borderRadius: '20px',
  gap: '10px',
  height: 'fit-content',
  background: theme.palette.background.secondary,
  [ theme.breakpoints.down('sm') ]: {
    width: '100%',
  },
}));

export const NFTListContainer = styled(Grid)((props) => ({
  width: '63%',
  background: !props['data-empty'] ? props.theme.palette.background.secondary : 'none',
  padding: !props['data-empty'] ? '10px' : 0,
  borderRadius: !props['data-empty'] ? '20px' : 0,
  [ props.theme.breakpoints.down('sm') ]: {
    width: '100%',
  },
}))

export const NFTPageContent = styled(Grid)(({ theme }) => ({
  marginTop: '20px',
  padding: '10px',
  borderRadius: '20px',
  background: theme.palette.background.secondary,
}))

export const TableHeading = styled(Box)(({ theme }) => ({
  padding: "20px",
  borderTopLeftRadius: "6px",
  borderTopRightRadius: "6px",
  display: "flex",
  alignItems: "center",
  background: theme.palette.background.secondary,
  [ theme.breakpoints.down('md') ]: {
    marginBottom: "5px",
  },
}))

export const LayerAlert = styled(Box)(({ theme }) => ({
  width: "50%",
  margin: '20px auto',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '30px',
  borderRadius: '12px',
  padding: '25px',
  background: theme.palette.background.secondary,
  [ theme.breakpoints.up('md') ]: {
    width: '100%',
  },
  [ theme.breakpoints.down('md') ]: {
    width: '100%',
  },

}));

export const AlertText = styled(Typography)(({ theme }) => ({
  marginLeft: '10px',
  flex: 4,
  [ theme.breakpoints.up('md') ]: {
  },
}));

export const AlertInfo = styled(Box)`
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex: 1;
`;

export const Wrapper = styled(Box)(({ theme, ...props }) => ({
  borderRadius: '8px',
  background: props.dropDownBox ? theme.palette.background.dropdown : theme.palette.background.secondary,
  [ theme.breakpoints.down('md') ]: {
    padding: ' 30px 10px',
  },
  [ theme.breakpoints.up('md') ]: {
    padding: '20px',
  },
}));

export const GridItemTagContainer = styled(Grid)(({ theme, ...props }) => ({
  spacing: 2,
  flexDirection: 'row',
  justifyContent: "left",
  alignItems: "center",
  [ theme.breakpoints.down('md') ]: {
    flexDirection: 'column'
  }
}));

export const GridItemTag = styled(Grid)`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const DropdownWrapper = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  width: 100%;
  padding: 16px;
  margin-top: 16px;
  background-color: ${props => props.theme.palette.background.secondary};
  border-radius: 12px;
  text-align: left;
`;

export const DropdownContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  [ theme.breakpoints.down('md') ]: {
    flexDirection: 'column',
    gap: '0',
  },
  [ theme.breakpoints.up('md') ]: {
    flexDirection: 'row',
    gap: '16px',
  },
}));

export const FarmActionContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  [ theme.breakpoints.down('md') ]: {
    width: '100%'
  }
}))

export const FarmListContainer = styled(Box)(({ theme }) => ({
  [ theme.breakpoints.down('md') ]: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  }
}))

export const BpIcon = styled('span')(({ theme }) => ({
  borderRadius: 3,
  width: 16,
  height: 16,
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 0 0 1px rgb(16 22 26 / 40%)'
      : 'inset 0 0 0 1px rgba(16,22,26,.2), inset 0 -1px 0 rgba(16,22,26,.1)',
  backgroundColor: theme.palette.mode === 'dark' ? '#394b59' : '#f5f8fa',
  backgroundImage:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg,hsla(0,0%,100%,.05),hsla(0,0%,100%,0))'
      : 'linear-gradient(180deg,hsla(0,0%,100%,.8),hsla(0,0%,100%,0))',
  '.Mui-focusVisible &': {
    outline: '2px auto rgba(19,124,189,.6)',
    outlineOffset: 2,
  },
  'input:hover ~ &': {
    backgroundColor: theme.palette.mode === 'dark' ? '#30404d' : '#ebf1f5',
  },
  'input:disabled ~ &': {
    boxShadow: 'none',
    background:
      theme.palette.mode === 'dark' ? 'rgba(57,75,89,.5)' : 'rgba(206,217,224,.5)',
  },
}))


export const DividerLine = styled(Divider)(({ theme }) => ({
  background: `${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(3, 19, 19, 0.04)'}`,
  boxSizing: 'border-box',
  boxShadow: `${theme.palette.mode === 'dark' ? '0px 4px 4px rgba(0, 0, 0, 0.25)' : 'none'}`,
  width: '100%'
}))

export const TokenPageContentEmpty = styled(Box)(({ theme }) => ({
  width: '100%',
  minHeight: '400px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '10px',
  borderRadius: '20px',
  gap: '10px',
  height: 'fit-content',
  background: theme.palette.background.secondary,
}))

export const TokenPageContent = styled(Box)(({ theme }) => ({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '10px',
  borderRadius: '20px',
  gap: '10px',
  height: 'fit-content',
  background: theme.palette.background.secondary,
  [ theme.breakpoints.down('sm') ]: {
    width: 'fit-content',
    minWidth: '100%'
  },
}))

export const TokenPageContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-around',
  margin: '20px auto',
  width: '100%',
  gap: '10px',
  [ theme.breakpoints.down('sm') ]: {
    width: '100%',
    padding: '0px',
    overflowX: 'scroll',
    display: 'block'
  },
}))
