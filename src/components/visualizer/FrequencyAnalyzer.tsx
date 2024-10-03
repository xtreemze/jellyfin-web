import React, { useEffect, useRef, useCallback } from 'react';
import { masterAudioOutput } from 'components/audioEngine/master.logic';

type FrequencyAnalyzersProps = {
    audioContext?: AudioContext;
    mixerNode?: AudioNode;
    fftSize?: number;
    smoothingTimeConstant?: number;
    minDecibels?: number;
    maxDecibels?: number;
    alpha?: number; // Parameter for mapping adjustment
};

const FrequencyAnalyzer: React.FC<FrequencyAnalyzersProps> = ({
    audioContext = masterAudioOutput.audioContext,
    mixerNode = masterAudioOutput.mixerNode,
    fftSize = 4096,
    smoothingTimeConstant = 0.65,
    minDecibels = -100,
    maxDecibels = 0,
    alpha = 4.5 // Adjust this value to control frequency distribution
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameId = useRef<number>();
    const analyserRef = useRef<AnalyserNode>();

    const draw = useCallback(
        (analyser: AnalyserNode, ctx: CanvasRenderingContext2D) => {
            if (document.visibilityState === 'hidden') return;
            const frequencyData = new Uint8Array(analyser.frequencyBinCount);
            const previousBarHeights = new Float32Array(analyser.frequencyBinCount);
            const sampleRate = analyser.context.sampleRate;
            const nyquist = sampleRate / 2;
            const MIN_FREQUENCY = 40;
            const MAX_FREQUENCY = nyquist;

            // Adjust nearClippingDecibel and clippingDecibel as needed
            const clippingDecibel = 12;
            const nearClippingDecibel = -64;

            // Define amplitude labels of common interest
            const amplitudeDecibels = [-90, -80, -70, -60, -50, -40, -30];

            // Precompute pink noise reference levels in decibels
            const pinkNoiseReference = new Float32Array(analyser.frequencyBinCount);
            for (let i = 0; i < analyser.frequencyBinCount; i++) {
                const frequency = (i * nyquist) / analyser.frequencyBinCount;
                // Pink noise decreases by 3 dB per octave
                // We can approximate the expected level at each frequency
                const pinkNoiseLevel = -10 * Math.log10(frequency || 1); // Avoid log(0)
                pinkNoiseReference[i] = pinkNoiseLevel;
            }

            const renderFrame = () => {
                analyser.getByteFrequencyData(frequencyData);

                // Get canvas dimensions in CSS pixels
                const dpr = window.devicePixelRatio || 1;
                const canvasWidth = ctx.canvas.width / dpr;
                const canvasHeight = ctx.canvas.height / dpr;

                ctx.clearRect(0, 0, canvasWidth, canvasHeight);

                // Dynamically adjust barGap and minBarWidth based on canvas width
                const minBarWidth = Math.max(2, canvasWidth / 200);
                const barGap = Math.max(1, canvasWidth / 400);

                // Calculate number of bars based on canvas width and barGap
                const maxBars = 96;
                const minBars = 16;
                const availableWidth = canvasWidth;
                const numberOfBars = Math.max(
                    minBars,
                    Math.min(
                        maxBars,
                        Math.floor(availableWidth / (minBarWidth + barGap))
                    )
                );

                // Compute frequencies and corresponding x-positions with adjusted mapping
                const frequencies = [];
                const xPositions = [];

                const logMinFreq = Math.log(MIN_FREQUENCY);
                const logMaxFreq = Math.log(MAX_FREQUENCY);

                for (let i = 0; i <= numberOfBars; i++) {
                    // Normalized position between 0 and 1
                    const normPosition = i / numberOfBars;

                    // Adjusted mapping function using exponential
                    const scaledPosition =
                        (Math.exp(alpha * normPosition) - 1) / (Math.exp(alpha) - 1);

                    // Frequency mapping
                    const frequency =
                        MIN_FREQUENCY + scaledPosition * (MAX_FREQUENCY - MIN_FREQUENCY);
                    frequencies.push(frequency);

                    // Map frequencies to x-positions logarithmically
                    const freqForLog = Math.max(frequency, MIN_FREQUENCY); // Avoid log(0)
                    const x =
                        ((Math.log(freqForLog) - logMinFreq) / (logMaxFreq - logMinFreq))
                        * canvasWidth;
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
                        ((frequencies[i] - MIN_FREQUENCY) / (nyquist - MIN_FREQUENCY))
                        * analyser.frequencyBinCount
                    );
                    const safeBin = Math.max(
                        0,
                        Math.min(bin, analyser.frequencyBinCount - 1)
                    );

                    const value = frequencyData[safeBin];
                    const targetHeight = (value / 255) * canvasHeight;

                    // Smooth transition
                    const currentHeight = previousBarHeights[i] || 0;
                    const barHeight = currentHeight + (targetHeight - currentHeight) * 0.3;
                    previousBarHeights[i] = barHeight;

                    // Calculate the expected pink noise level at this frequency bin
                    const pinkNoiseLevel = pinkNoiseReference[safeBin];

                    // Compute clipping and near-clipping levels for this frequency bin
                    const clippingLevel = pinkNoiseLevel + clippingDecibel;
                    const nearClippingLevel = pinkNoiseLevel + nearClippingDecibel;

                    // Convert the actual value to decibels
                    const actualDecibel =
                        analyser.minDecibels
                        + (value / 255) * (analyser.maxDecibels - analyser.minDecibels);

                    // Use actualDecibel to determine color
                    let fillColor = '';

                    if (actualDecibel <= nearClippingLevel) {
                        // Below nearClippingLevel - less saturation at lower amplitudes
                        const ratio =
                            (actualDecibel - analyser.minDecibels)
                            / (nearClippingLevel - analyser.minDecibels);
                        const saturation = 30 + ratio * 70; // Saturation from 30% to 100%
                        fillColor = `hsl(120, ${saturation}%, 50%)`; // Green with varying saturation
                    } else if (
                        actualDecibel > nearClippingLevel
                        && actualDecibel < clippingLevel
                    ) {
                        // Between nearClippingLevel and clippingLevel - transition from green to red
                        const ratio =
                            (actualDecibel - nearClippingLevel)
                            / (clippingLevel - nearClippingLevel);
                        const hue = 120 - 120 * Math.min(ratio, 1); // Hue from green (120) to red (0)
                        fillColor = `hsl(${hue}, 100%, 50%)`;
                    } else {
                        // actualDecibel >= clippingLevel
                        fillColor = 'hsl(0, 100%, 50%)'; // Red
                    }

                    ctx.fillStyle = fillColor;
                    ctx.fillRect(x, canvasHeight - barHeight, barWidth, barHeight);
                }

                // Adjust font size based on canvas height
                const fontSize = Math.max(10, canvasHeight / 80);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.font = `${fontSize}px Roboto`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Draw amplitude labels/markers on the left side
                amplitudeDecibels.forEach((decibel) => {
                    const value =
                        ((decibel - analyser.minDecibels)
                            / (analyser.maxDecibels - analyser.minDecibels))
                        * 255;
                    let y = canvasHeight - (value / 255) * canvasHeight;

                    // Ensure y is within canvasHeight
                    y = Math.min(Math.max(y, fontSize / 2), canvasHeight - fontSize / 2);

                    // Adjust x position if necessary to keep text within canvas
                    const textX = Math.min(30, canvasWidth - fontSize * 2);

                    // Draw a short horizontal line near the left
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(8, y);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // Draw the decibel label
                    const label = `${decibel} dB`;
                    ctx.fillText(label, textX, y);
                });

                // Draw frequency labels/markers at the bottom if in portrait mode
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.font = `${fontSize}px Roboto`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                const commonFrequencies = [100, 200, 500, 1000, 2000, 5000, 10000, 20000];

                commonFrequencies.forEach((freq) => {
                    const percent =
                        (Math.log(freq) - logMinFreq) / (logMaxFreq - logMinFreq);
                    let x = percent * canvasWidth;

                    // Ensure x is within canvasWidth
                    x = Math.min(Math.max(x, fontSize / 2), canvasWidth - fontSize / 2);

                    // Draw a short vertical line near the top
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, 8);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
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
                const { clientWidth, clientHeight } = canvas;
                canvas.width = clientWidth * dpr;
                canvas.height = clientHeight * dpr;
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
                const { clientWidth, clientHeight } = canvasRef.current;
                canvasRef.current.width = clientWidth * dpr;
                canvasRef.current.height = clientHeight * dpr;

                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformations
                    ctx.scale(dpr, dpr);
                }
            }
        };

        const observer = new ResizeObserver(() => {
            resizeCanvas();
        });
        if (canvasRef.current) {
            observer.observe(canvasRef.current);
        }

        // Call resizeCanvas initially
        resizeCanvas();

        return () => {
            if (canvasRef.current) {
                observer.unobserve(canvasRef.current);
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh'
            }}
        />
    );
};

export default FrequencyAnalyzer;
