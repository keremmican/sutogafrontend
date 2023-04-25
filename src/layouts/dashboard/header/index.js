import PropTypes from 'prop-types';
// @mui
import { styled } from '@mui/material/styles';
import {Box, Stack, AppBar, Toolbar, IconButton, Typography} from '@mui/material';
// utils
import { useSelector} from "react-redux";
import { bgBlur } from '../../../utils/cssStyles';
// components
import Iconify from '../../../components/iconify';
//
import AccountPopover from './AccountPopover';
import NotificationsPopover from './NotificationsPopover';
import React from "react";

// ----------------------------------------------------------------------

const NAV_WIDTH = 220;

const HEADER_MOBILE = 64;

const HEADER_DESKTOP = 70;

const StyledRoot = styled(AppBar)(({ theme }) => ({
  ...bgBlur({ color: theme.palette.background.default }),
  boxShadow: 'none',
  [theme.breakpoints.up('lg')]: {
    width: `calc(100% - ${NAV_WIDTH + 1}px)`,
  },
}));

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  minHeight: HEADER_MOBILE,
  [theme.breakpoints.up('lg')]: {
    minHeight: HEADER_DESKTOP,
    padding: theme.spacing(0, 5),
  },
}));

// ----------------------------------------------------------------------

Header.propTypes = {
    onOpenNav: PropTypes.func,
    setIsAuthenticated: PropTypes.func,
};


export default function Header({ onOpenNav, isAuthenticated, setIsAuthenticated }) {
    const userName = useSelector((state) => state.auth.userName);

  return (
    <StyledRoot>
      <StyledToolbar>
          <Typography variant="h5" color="common.black">Welcome back</Typography>
          <Typography>&nbsp;</Typography>
          <Typography variant="h5" color="common.black" fontWeight={"bold"}>{userName}</Typography>
          <Typography variant="h5" color="common.black">!</Typography>

        <IconButton
          onClick={onOpenNav}
          sx={{
            mr: 1,
            color: 'text.primary',
            display: { lg: 'none' },
          }}
        >
          <Iconify icon="eva:menu-2-fill" />
        </IconButton>

        <Box sx={{ flexGrow: 1 }} />

        <Stack
          direction="row"
          alignItems="center"
          spacing={{
            xs: 0.5,
            sm: 1,
          }}
        >
          <NotificationsPopover />
            <AccountPopover/>

        </Stack>
      </StyledToolbar>
    </StyledRoot>
  );
}
