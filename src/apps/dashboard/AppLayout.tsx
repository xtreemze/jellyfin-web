import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import { type Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import React, { FC, useCallback, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import AppBody from 'components/AppBody';
import AppToolbar from 'components/toolbar/AppToolbar';
import ElevationScroll from 'components/ElevationScroll';
import { useApi } from 'hooks/useApi';

import AppTabs from './components/AppTabs';
import AppDrawer from './components/drawer/AppDrawer';

import './AppOverrides.scss';

interface AppLayoutProps {
    drawerlessPaths: string[]
}

const AppLayout: FC<AppLayoutProps> = ({
    drawerlessPaths
}) => {
    const [ isDrawerActive, setIsDrawerActive ] = useState(false);
    const location = useLocation();
    const { user } = useApi();

    const isMediumScreen = useMediaQuery((t: Theme) => t.breakpoints.up('md'));
    const isDrawerAvailable = Boolean(user)
        && !drawerlessPaths.some(path => location.pathname.startsWith(`/${path}`));
    const isDrawerOpen = isDrawerActive && isDrawerAvailable;

    const onToggleDrawer = useCallback(() => {
        setIsDrawerActive(!isDrawerActive);
    }, [ isDrawerActive, setIsDrawerActive ]);

    return (
        <Box sx={{ display: 'flex' }}>
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
                    >
                        <AppTabs isDrawerOpen={isDrawerOpen} />
                    </AppToolbar>
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
                <AppBody>
                    <Outlet />
                </AppBody>
            </Box>
        </Box>
    );
};

export default AppLayout;
