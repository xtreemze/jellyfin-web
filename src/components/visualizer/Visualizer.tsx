// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable compat/compat */
import React, { useEffect, useRef, useCallback } from 'react';

declare global {
    interface Window {
        myAudioContext: AudioContext
        mySourceNode: AudioNode
    }
}

type VisualizerProps = {
    audioContext?: AudioContext
    mySourceNode?: AudioNode
};

window.myAudioContext = window.myAudioContext || new AudioContext();

const Visualizer: React.FC<VisualizerProps> = ({
    audioContext = window.myAudioContext,
    mySourceNode = window.mySourceNode
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const canvas = canvasRef.current || document.getElementById('visualizer') as HTMLCanvasElement;

    const draw = useCallback((
        analyser: AnalyserNode,
        ctx: CanvasRenderingContext2D,
        defaultBarHeight: number
    ) => {
        // Don't update the visualizer if the tab is not in focus or the screen is off
        if (document.hidden || document.visibilityState !== 'visible') {
            return;
        }

        const isLandscape = window.innerWidth > window.innerHeight;
        const numberOfBars = Math.floor((isLandscape ? window.innerHeight : window.innerWidth) / 32);
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);

        analyser.getByteFrequencyData(frequencyData);

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = 'rgb(90, 60, 140)';
        ctx.globalCompositeOperation = 'difference';

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
            const barWidth = (isLandscape ? window.innerHeight : window.innerWidth) / (numberOfBars + 1); // Adjusted for equal gaps
            const barHeight = averageFrequency / 256 * (isLandscape ? ctx.canvas.width : ctx.canvas.height) + defaultBarHeight;
            const barPositionX = (barIndex + 0.5) * barWidth; // Adjusted for equal gaps

            if (isLandscape) {
                ctx.save();
                ctx.translate(ctx.canvas.width, ctx.canvas.height);
                ctx.rotate(-0.5 * Math.PI);
                ctx.fillRect(barPositionX, -barHeight, barWidth / 1.1, barHeight);
                ctx.restore();
            } else {
                ctx.fillRect(barPositionX, ctx.canvas.height - barHeight, barWidth / 1.1, barHeight);
            }
        }

        requestAnimationFrame(() => draw(analyser, ctx, defaultBarHeight));
    }, []);

    useEffect(() => {
        if (!audioContext || !mySourceNode) return;

        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 16384;
        analyser.smoothingTimeConstant = 0.75;
        analyser.minDecibels = -102;
        analyser.maxDecibels = 102;

        mySourceNode.connect(analyser);
        if (canvas !== null) {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            draw(analyser, ctx, 62);
        }
    }, [audioContext, mySourceNode, canvas, draw]);

    useEffect(() => {
        const resizeCanvas = () => {
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
        };

        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [canvas]);

    return (
        <canvas
            id='visualizer'
            ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
        />
    );
};

export default Visualizer;
