import { masterAudioOutput } from 'components/audioEngine/master.logic';
import React, { useEffect, useRef, useCallback } from 'react';

type FrequencyAnalyzersProps = {
    audioContext?: AudioContext;
    mixerNode?: AudioNode;
    fftSize?: number;
    smoothingTimeConstant?: number;
    minDecibels?: number;
    maxDecibels?: number;
};

const FrequencyAnalyzer: React.FC<FrequencyAnalyzersProps> = ({
    audioContext = masterAudioOutput.audioContext,
    mixerNode = masterAudioOutput.mixerNode,
    fftSize = 32768,
    smoothingTimeConstant = 0,
    minDecibels = -102,
    maxDecibels = 102
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const draw = useCallback((analyser: AnalyserNode, ctx: CanvasRenderingContext2D, defaultBarHeight: number) => {
        if (document.hidden || document.visibilityState !== 'visible') {
            return;
        }

        const isLandscape = false; //window.innerWidth > window.innerHeight;
        const numberOfBars = Math.floor((isLandscape ? window.innerHeight : window.innerWidth) / 32);
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);

        analyser.getByteFrequencyData(frequencyData);

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = 'rgb(30, 210, 75)';

        const minFrequency = 20; // Minimum frequency we care about (20 Hz)
        const maxFrequency = analyser.context.sampleRate / 2; // Maximum frequency (Nyquist frequency)

        for (let barIndex = 0; barIndex < numberOfBars; barIndex++) {
            const minBarFrequency = minFrequency * Math.pow(maxFrequency / minFrequency, barIndex / numberOfBars);
            const maxBarFrequency = minFrequency * Math.pow(maxFrequency / minFrequency, (barIndex + 1) / numberOfBars);

            const minBinIndex = Math.floor(minBarFrequency / maxFrequency * frequencyData.length);
            const maxBinIndex = Math.floor(maxBarFrequency / maxFrequency * frequencyData.length);

            let sumOfFrequencies = 0;
            for (let binIndex = minBinIndex; binIndex < maxBinIndex; binIndex++) {
                sumOfFrequencies += frequencyData[binIndex];
            }

            const averageFrequency = sumOfFrequencies / (maxBinIndex - minBinIndex);
            const barWidth = (isLandscape ? window.innerHeight : window.innerWidth) / (numberOfBars + 1);
            const barHeight = averageFrequency / 256 * (isLandscape ? ctx.canvas.width : ctx.canvas.height) + defaultBarHeight;
            const barPositionX = (barIndex + 0.5) * barWidth;

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
        if (!audioContext) {
            return;
        }

        const analyser = audioContext.createAnalyser();

        analyser.fftSize = fftSize;
        analyser.smoothingTimeConstant = smoothingTimeConstant;
        analyser.minDecibels = minDecibels;
        analyser.maxDecibels = maxDecibels;

        if (mixerNode) mixerNode.connect(analyser);

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                draw(analyser, ctx, 62);
            }
        }

        return () => {
            if (mixerNode) mixerNode.disconnect(analyser);
        };
    }, [audioContext, mixerNode, fftSize, smoothingTimeConstant, minDecibels, maxDecibels, draw]);

    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas(); // Ensure the canvas is set to the correct size initially

        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    return (
        <canvas
            id='frequencyAnalyzer'
            ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
        />
    );
};

export default FrequencyAnalyzer;
