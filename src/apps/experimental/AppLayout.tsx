import React, { useCallback, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import { type Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Outlet, useLocation } from 'react-router-dom';

import AppBody from 'components/AppBody';
import ElevationScroll from 'components/ElevationScroll';
import { useApi } from 'hooks/useApi';

import AppToolbar from './components/AppToolbar';
import AppDrawer, { isDrawerPath } from './components/drawers/AppDrawer';

import './AppOverrides.scss';
import Visualizers from 'components/visualizer/Visualizers';

export const Component = () => {
    const [ isDrawerActive, setIsDrawerActive ] = useState(false);
    const { user } = useApi();
    const location = useLocation();

    const isMediumScreen = useMediaQuery((t: Theme) => t.breakpoints.up('md'));
    const isDrawerAvailable = isDrawerPath(location.pathname) && Boolean(user);
    const isDrawerOpen = isDrawerActive && isDrawerAvailable;

    const onToggleDrawer = useCallback(() => {
        setIsDrawerActive(!isDrawerActive);
    }, [isDrawerActive, setIsDrawerActive]);

    return (
        <Box sx={{ position: 'relative', display: 'flex' }}>
            <ElevationScroll elevate={false}>
                <AppBar
                    position='fixed'
                    sx={{
                        width: {
                            xs: '100%'
                        }
                    }}
                >
                    <AppToolbar
                        isDrawerAvailable={!isMediumScreen && isDrawerAvailable}
                        isDrawerOpen={isDrawerOpen}
                        onDrawerButtonClick={onToggleDrawer}
                    />
                </AppBar>
            </ElevationScroll>

            {
                isDrawerAvailable && (
                    <AppDrawer
                        open={isDrawerOpen}
                        onClose={onToggleDrawer}
                        onOpen={onToggleDrawer}
                    />
                )
            }

            <Box
                component='main'
                sx={{
                    width: '100%',
                    flexGrow: 1
                }}
            >
                <Visualizers />
                <AppBody>
                    <Outlet />
                </AppBody>
            </Box>
        </Box>
    );
};
