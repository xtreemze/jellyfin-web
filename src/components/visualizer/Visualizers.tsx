import { masterAudioOutput } from 'components/audioEngine/master.logic';
import React from 'react';
// import ButterchurnVisualizer from './Butterchurn';
import FrequencyAnalyzer from './FrequencyAnalyzer';

const Visualizers: React.FC = () => {
    const audioContext = masterAudioOutput.audioContext;
    const mixerNode = masterAudioOutput.mixerNode;
    if (!audioContext || !mixerNode) return;

    return (
        <>
            <FrequencyAnalyzer audioContext={audioContext} mixerNode={mixerNode} />
            {/* <ButterchurnVisualizer audioContext={audioContext} mixerNode={mixerNode} /> */}
        </>
    );
};

export default Visualizers;
