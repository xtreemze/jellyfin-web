import Box from '@mui/material/Box';
import React, { useEffect } from 'react';
import Visualizer from './visualizer/Visualizer';

const Backdrop = () => {
    useEffect(() => {
        // Initialize the UI components after first render
        import('../scripts/autoBackdrops');
    }, []);

    return (
        <>
            <Box
                className='backdropContainer'
            />
            <Visualizer></Visualizer>
            <div className='backgroundContainer' />
        </>
    );
};

export default Backdrop;
