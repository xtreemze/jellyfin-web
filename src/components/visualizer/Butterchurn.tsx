// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/ban-ts-comment */

import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import butterchurn from 'butterchurn';
// @ts-ignore
import butterchurnPresets from 'butterchurn-presets';
import { masterAudioOutput } from 'components/audioEngine/master.logic';
import { xDuration } from 'components/audioEngine/crossfader.logic';

type ButterchurnVisualizerProps = {
    audioContext: AudioContext; // Make sure to pass the audio context
    mixerNode: AudioNode;
};

const ButterchurnVisualizer: React.FC<ButterchurnVisualizerProps> = ({
    audioContext = masterAudioOutput.audioContext,
    mixerNode = masterAudioOutput.mixerNode
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [currentPresetIndex, setCurrentPresetIndex] = useState(0);

    useEffect(() => {
        if (!audioContext) return;

        const visualizer = butterchurn.createVisualizer(audioContext, canvasRef.current, {
            width: window.innerWidth,
            height: window.innerHeight,
            pixelRatio: window.devicePixelRatio / 4 || 1,
            textureRatio: (1 / 4)
        });

        // Connect your audio source (e.g., mixerNode) to the visualizer
        visualizer.connectAudio(mixerNode);

        const presets = butterchurnPresets.getPresets();
        const presetNames = Object.keys(presets);

        const loadNextPreset = () => {
            const randomIndex = Math.floor(Math.random() * presetNames.length);
            const nextPresetName = presetNames[randomIndex];
            const nextPreset = presets[nextPresetName];
            if (nextPreset) {
                visualizer.loadPreset(nextPreset, xDuration.fadeOut); // Blend presets over 0 seconds
                setCurrentPresetIndex(randomIndex);
            }
        };

        // Load the initial preset
        loadNextPreset();

        // Custom animation loop using requestAnimationFrame
        const animate = () => {
            visualizer.render();
            requestAnimationFrame(animate);
        };
        animate();

        // Switch presets every 30 seconds
        const presetSwitchInterval = setInterval(loadNextPreset, 60000);

        return () => {
            clearInterval(presetSwitchInterval);
            visualizer.disconnectAudio(mixerNode);
        };
    }, [audioContext, mixerNode, currentPresetIndex]);

    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    return <canvas id='butterchurn' ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight} />;
};

export default ButterchurnVisualizer;
