import React from 'react';
import { Outlet } from 'react-router-dom';

import AppBody from 'components/AppBody';
import Visualizer from 'components/visualizer/Visualizer';

export default function AppLayout() {
    return (
        <>
            <AppBody>
                <Outlet />
            </AppBody>
            <Visualizer />
        </>
    );
}
