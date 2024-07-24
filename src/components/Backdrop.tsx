import Box from '@mui/material/Box';
import React, { useEffect } from 'react';
import * as userSettings from '../scripts/settings/userSettings';
import Visualizers from './visualizer/Visualizers';

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
            {enableVisualizer && (<Visualizers />)}
            <div className='backgroundContainer' />
        </>
    );
};

export default Backdrop;
