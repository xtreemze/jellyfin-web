import React, { useEffect, useRef, useCallback } from 'react';
import { masterAudioOutput } from 'components/audioEngine/master.logic';

type FrequencyAnalyzersProps = {
    audioContext?: AudioContext;
    mixerNode?: AudioNode;
    fftSize?: number;
    smoothingTimeConstant?: number;
    minDecibels?: number;
    maxDecibels?: number;
    alpha?: number; // New parameter for mapping adjustment
};

const FrequencyAnalyzer: React.FC<FrequencyAnalyzersProps> = ({
    audioContext = masterAudioOutput.audioContext,
    mixerNode = masterAudioOutput.mixerNode,
    fftSize = 16384,
    smoothingTimeConstant = 0.2,
    minDecibels = -90,
    maxDecibels = -10,
    alpha = 4 // Adjust this value to control frequency distribution
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameId = useRef<number>();
    const analyserRef = useRef<AnalyserNode>();

    const draw = useCallback(
        (analyser: AnalyserNode, ctx: CanvasRenderingContext2D) => {
            const frequencyData = new Uint8Array(analyser.frequencyBinCount);
            const previousBarHeights = new Float32Array(analyser.frequencyBinCount);
            const sampleRate = analyser.context.sampleRate;
            const nyquist = sampleRate / 2;
            const MIN_FREQUENCY = 50;
            const MAX_FREQUENCY = nyquist;

            const decibelToValue = (decibel: number) => {
                const normalized =
                    (decibel - analyser.minDecibels)
                    / (analyser.maxDecibels - analyser.minDecibels);
                return normalized * 255;
            };

            const clippingDecibel = -20;
            const nearClippingDecibel = -65;

            const maxDecibelValue = decibelToValue(clippingDecibel);
            const minHueDecibelValue = decibelToValue(nearClippingDecibel);

            // Define amplitude labels of common interest
            const amplitudeDecibels = [-85, -80, -75, -70, -60, -50, -40, -30];

            const renderFrame = () => {
                analyser.getByteFrequencyData(frequencyData);

                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

                // Introduce barGap parameter
                const barGap = 3; // Gap between bars in pixels

                // Calculate number of bars based on canvas width and barGap
                const minBarWidth = 8;
                const maxBars = 128;
                const minBars = 16;
                const availableWidth = ctx.canvas.width - barGap * (maxBars - 1);
                const numberOfBars = Math.max(
                    minBars,
                    Math.min(maxBars, Math.floor(availableWidth / (minBarWidth + barGap)))
                );

                // Compute frequencies and corresponding x-positions with adjusted mapping
                const frequencies = [];
                const xPositions = [];

                for (let i = 0; i <= numberOfBars; i++) {
                    // Normalized position between 0 and 1
                    const normPosition = i / numberOfBars;

                    // Adjusted mapping function using exponential
                    const scaledPosition =
                        (Math.exp(alpha * normPosition) - 1) / (Math.exp(alpha) - 1);

                    // Frequency mapping
                    const frequency =
                        MIN_FREQUENCY
                        + scaledPosition * (MAX_FREQUENCY - MIN_FREQUENCY);
                    frequencies.push(frequency);

                    // Map frequencies to x-positions logarithmically
                    const logMinFreq = Math.log(MIN_FREQUENCY);
                    const logMaxFreq = Math.log(MAX_FREQUENCY);
                    const freqForLog = Math.max(frequency, MIN_FREQUENCY); // Avoid log(0)
                    const x =
                        ((Math.log(freqForLog) - logMinFreq) / (logMaxFreq - logMinFreq))
                        * ctx.canvas.width;
                    xPositions.push(x);
                }

                // Draw the bars with gaps
                for (let i = 0; i < numberOfBars; i++) {
                    const xLeft = xPositions[i];
                    const xRight = xPositions[i + 1];
                    let barWidth = xRight - xLeft - barGap;

                    // Ensure barWidth is not negative
                    barWidth = Math.max(0, barWidth);

                    // Adjust xLeft to center the bar between the gaps
                    const x = xLeft + barGap / 2;

                    // Compute bin index
                    const bin = Math.floor(
                        (frequencies[i] / nyquist) * frequencyData.length
                    );
                    const safeBin = Math.max(0, Math.min(bin, frequencyData.length - 1));

                    const value = frequencyData[safeBin];
                    const targetHeight = (value / 255) * ctx.canvas.height;

                    // Smooth transition
                    const currentHeight = previousBarHeights[i] || 0;
                    const barHeight =
                        currentHeight + (targetHeight - currentHeight) * 0.3;
                    previousBarHeights[i] = barHeight;

                    // Calculate fill color
                    const normalizedValue = value / 255;
                    let fillColor = '';

                    if (value < minHueDecibelValue) {
                        // Adjust green brightness based on amplitude
                        const lightness = 30 + normalizedValue * 30; // 30% to 60%
                        fillColor = `hsl(120, 100%, ${lightness}%)`;
                    } else if (value >= maxDecibelValue) {
                        fillColor = 'hsl(0, 100%, 50%)'; // Red
                    } else {
                        // Adjust hue from 120 (green) to 0 (red)
                        const ratio =
                            (value - minHueDecibelValue)
                            / (maxDecibelValue - minHueDecibelValue);
                        const hue = 120 - 120 * ratio;
                        fillColor = `hsl(${hue}, 100%, 50%)`;
                    }

                    ctx.fillStyle = fillColor;
                    ctx.fillRect(
                        x,
                        ctx.canvas.height - barHeight,
                        barWidth,
                        barHeight
                    );
                }

                // Draw amplitude labels/markers on the left side
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                amplitudeDecibels.forEach((decibel) => {
                    const value = decibelToValue(decibel);
                    const y = ctx.canvas.height - (value / 255) * ctx.canvas.height;

                    // Draw a short horizontal line near the left
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(15, y);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // Draw the decibel label
                    const label = `${decibel} dB`;
                    ctx.fillText(label, 30, y);
                });

                // Draw frequency labels/markers after the bars
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                const commonFrequencies = [
                    100,
                    200,
                    500,
                    1000,
                    2000,
                    5000,
                    10000,
                    15000
                ];

                commonFrequencies.forEach((freq) => {
                    const logMinFreq = Math.log(MIN_FREQUENCY);
                    const logMaxFreq = Math.log(MAX_FREQUENCY);
                    const percent =
                        (Math.log(freq) - logMinFreq) / (logMaxFreq - logMinFreq);
                    const x = percent * ctx.canvas.width;

                    // Draw a short vertical line near the top
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, 15);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // Draw the frequency label at the top
                    const label = freq >= 1000 ? `${freq / 1000}k Hz` : `${freq} Hz`;
                    ctx.fillText(label, x, 17);
                });

                animationFrameId.current = requestAnimationFrame(renderFrame);
            };

            renderFrame();
        },
        [alpha]
    );

    useEffect(() => {
        if (!audioContext) {
            console.error('AudioContext not available');
            return;
        }

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.smoothingTimeConstant = smoothingTimeConstant;
        analyser.minDecibels = minDecibels;
        analyser.maxDecibels = maxDecibels;
        analyserRef.current = analyser;

        if (mixerNode) mixerNode.connect(analyser);

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const dpr = window.devicePixelRatio || 1;
                const width = window.innerWidth;
                const height = window.innerHeight;
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;
                ctx.scale(dpr, dpr);

                draw(analyser, ctx);
            }
        }

        return () => {
            if (mixerNode) mixerNode.disconnect(analyser);
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [
        audioContext,
        mixerNode,
        fftSize,
        smoothingTimeConstant,
        minDecibels,
        maxDecibels,
        draw
    ]);

    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current) {
                const dpr = window.devicePixelRatio || 1;
                const width = window.innerWidth;
                const height = window.innerHeight;
                canvasRef.current.width = width * dpr;
                canvasRef.current.height = height * dpr;
                canvasRef.current.style.width = `${width}px`;
                canvasRef.current.style.height = `${height}px`;

                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformations
                    ctx.scale(dpr, dpr);
                }
            }
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    // Use absolute positioning to make the canvas fill the viewport
    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%'
            }}
        />
    );
};

export default FrequencyAnalyzer;
