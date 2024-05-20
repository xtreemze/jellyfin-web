// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable compat/compat */
import React, { useEffect, useRef, useCallback } from 'react';

declare global {
    interface Window { myAudioContext: AudioContext; myMediaElement: HTMLMediaElement; mySourceNode: AudioNode }
}

window.myAudioContext = window.myAudioContext || new AudioContext();

interface VisualizerProps {
    audioContext?: AudioContext;
    mediaElement?: HTMLMediaElement;
    mySourceNode?: AudioNode;
}

const Visualizer: React.FC<VisualizerProps> = ({ audioContext = window.myAudioContext, mediaElement = window.myMediaElement, mySourceNode = window.mySourceNode }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const draw = useCallback((analyser: AnalyserNode, ctx: CanvasRenderingContext2D) => {
        const numBars = Math.floor(window.innerWidth / 64);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const binSize = Math.floor(data.length / numBars);
        analyser.getByteFrequencyData(data);

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = 'rgba(86, 36, 166, 0.453)';
        ctx.globalCompositeOperation = 'difference';

        for (let i = 0; i < numBars; i++) {
            let sum = 0;
            for (let j = 0; j < binSize; j++) {
                sum += data[i * binSize + j];
            }
            const average = sum / binSize;
            const barWidth = ctx.canvas.width / numBars;
            const scaledAverage = average / 256 * ctx.canvas.height;
            ctx.fillRect(i * barWidth, ctx.canvas.height, barWidth / 1.4, -scaledAverage);
        }

        requestAnimationFrame(() => draw(analyser, ctx));
    }, []);

    useEffect(() => {
        if (!audioContext || !mediaElement || !mySourceNode) return;

        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.8;
        analyser.minDecibels = -110;
        analyser.maxDecibels = -10;

        mySourceNode.connect(analyser);
        analyser.connect(audioContext.destination);
        const canvas = canvasRef.current;
        if (canvas !== null) {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            draw(analyser, ctx);
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
