import Box from '@mui/material/Box';
import React, { useEffect } from 'react';

import layoutManager from './layoutManager';
import { DRAWER_WIDTH } from './ResponsiveDrawer';
import Visualizer from './visualizer/Visualizer';

const styles = layoutManager.experimental ? {
    left: {
        md: DRAWER_WIDTH
    }
} : {};

const Backdrop = () => {
    useEffect(() => {
        // Initialize the UI components after first render
        import('../scripts/autoBackdrops');
    }, []);

    return (
        <>
            <Visualizer />
            <Box
                className='backdropContainer'
                sx={styles}
            />
            <div className='backgroundContainer' />
        </>
    );
};

export default Backdrop;
