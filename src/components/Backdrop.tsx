import Box from '@mui/material/Box';
import React, { useEffect } from 'react';
import Visualizer from './visualizer/Visualizer';
import * as userSettings from '../scripts/settings/userSettings';

const Backdrop = () => {
    useEffect(() => {
        // Initialize the UI components after first render
        import('../scripts/autoBackdrops');
    }, []);

    const enableVisualizer = userSettings.enableVisualizer();

    return (
        <>
            <Box
                className='backdropContainer'
            />
            {enableVisualizer && (<Visualizer />)}
            <div className='backgroundContainer' />
        </>
    );
};

export default Backdrop;
