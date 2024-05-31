// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable compat/compat */
import React, { useEffect, useRef, useCallback } from 'react';

declare global {
    interface Window { myAudioContext: AudioContext; myMediaElement: HTMLMediaElement; mySourceNode: AudioNode }
}

type VisualizerProps = {
    audioContext?: AudioContext;
    mediaElement?: HTMLMediaElement;
    mySourceNode?: AudioNode;
};

window.myAudioContext = window.myAudioContext || new AudioContext();

const Visualizer: React.FC<VisualizerProps> = ({ audioContext = window.myAudioContext, mediaElement = window.myMediaElement, mySourceNode = window.mySourceNode }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const draw = useCallback((analyser: AnalyserNode, ctx: CanvasRenderingContext2D, defaultBarHeight: number) => {
        // Don't update the visualizer if the tab is not in focus or the screen is off
        if (document.hidden || document.visibilityState !== 'visible') {
            return;
        }

        const numberOfBars = Math.floor(window.innerWidth / 48);
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);

        analyser.getByteFrequencyData(frequencyData);

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = 'rgba(76, 36, 141, 0.546)';
        ctx.globalCompositeOperation = 'difference';

        const barWidth = window.innerWidth / (numberOfBars + 1); // Adjusted for equal gaps

        const minFrequency = 20; // Minimum frequency we care about (20 Hz)
        const maxFrequency = analyser.context.sampleRate / 2; // Maximum frequency (Nyquist frequency)

        for (let barIndex = 0; barIndex < numberOfBars; barIndex++) {
            // Calculate the frequency range for this bar
            const minBarFrequency = minFrequency * Math.pow(maxFrequency / minFrequency, barIndex / numberOfBars);
            const maxBarFrequency = minFrequency * Math.pow(maxFrequency / minFrequency, (barIndex + 1) / numberOfBars);

            // Map the frequencies to the range [0, frequencyBinCount]
            const minBinIndex = Math.floor(minBarFrequency / maxFrequency * frequencyData.length);
            const maxBinIndex = Math.floor(maxBarFrequency / maxFrequency * frequencyData.length);

            let sumOfFrequencies = 0;
            for (let binIndex = minBinIndex; binIndex < maxBinIndex; binIndex++) {
                sumOfFrequencies += frequencyData[binIndex];
            }

            // Calculate the average frequency for this bar
            const averageFrequency = sumOfFrequencies / (maxBinIndex - minBinIndex);
            const barHeight = averageFrequency / 256 * ctx.canvas.height + defaultBarHeight;
            const barPositionX = (barIndex + 0.5) * barWidth; // Adjusted for equal gaps

            ctx.fillRect(barPositionX, ctx.canvas.height - barHeight, barWidth / 1.2, barHeight);
        }

        requestAnimationFrame(() => draw(analyser, ctx, defaultBarHeight));
    }, []);

    useEffect(() => {
        if (!audioContext || !mediaElement || !mySourceNode) return;

        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 8192;
        analyser.smoothingTimeConstant = 0.8;
        analyser.minDecibels = -110;
        analyser.maxDecibels = -10;

        mySourceNode.connect(analyser);
        const canvas = canvasRef.current;
        if (canvas !== null) {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            draw(analyser, ctx, 19);
        }
    }, [audioContext, mediaElement, mySourceNode, draw]);

    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };

        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    return (
        <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} />
    );
};

export default Visualizer;
