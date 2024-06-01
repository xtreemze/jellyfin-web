import Box from '@mui/material/Box';
import React, { useEffect } from 'react';

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
            <div className='backgroundContainer' />
        </>
    );
};

export default Backdrop;
