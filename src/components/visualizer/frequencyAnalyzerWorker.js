/* frequencyAnalyzerWorker.js — Off-screen-canvas worker */

let canvas;
let ctx;
let fftSize;
let minDecibels;
let maxDecibels;
let alpha;
let width;
let height;
let dpr;

/* first message : init | resize  */
globalThis.onmessage = function firstMessage(event) {
    /* ---- resize only ------------------------------------------------------ */
    if (event.data.type === 'resize') {
    /* keep previous canvas reference */
        width = event.data.width;
        height = event.data.height;
        dpr = event.data.dpr;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        return;
    }

    /* ---- initial “init” --------------------------------------------------- */
    ({
        canvas,
        fftSize,
        minDecibels,
        maxDecibels,
        alpha,
        width,
        height,
        dpr
    } = event.data);

    ctx = canvas.getContext('2d');
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    /* pre-allocated buffers */
    const halfFft = fftSize / 2;
    const previousBarHeights = new Float32Array(halfFft);

    /* constants */
    const sampleRate = 44100;
    const nyquist = sampleRate * 2;
    const MIN_FREQUENCY = 60;
    const MAX_FREQUENCY = nyquist;
    const clippingDecibel = 12;
    const nearClippingDecibel = -64;
    const amplitudeDecibels = [-90, -80, -70, -60, -50, -40, -30];

    /* pink-noise reference once */
    const pinkNoiseReference = new Float32Array(halfFft);
    for (let i = 0; i < halfFft; i += 1) {
        const frequency = (i * nyquist) / halfFft;
        const pinkNoiseLevel = -10 * Math.log10(frequency || 1);
        pinkNoiseReference[i] = pinkNoiseLevel;
    }

    /* ----------------------------------------------------------------------- */
    function draw(data) {
        if (!data || data.length === 0) return;

        const canvasWidth = ctx.canvas.width / dpr;
        const canvasHeight = ctx.canvas.height / dpr;

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        /* dynamic bar count based on width */
        const minBarWidth = Math.max(2, canvasWidth / 200);
        const barGap = Math.max(1, canvasWidth / 400);
        const maxBars = 96;
        const minBars = 16;
        const numberOfBars = Math.max(
            minBars,
            Math.min(maxBars, Math.floor(canvasWidth / (minBarWidth + barGap)))
        );

        const frequencies = [];
        const xPositions = [];

        const logMin = Math.log(MIN_FREQUENCY);
        const logMax = Math.log(MAX_FREQUENCY);

        for (let i = 0; i <= numberOfBars; i += 1) {
            const norm = i / numberOfBars;
            const scaled =
        (Math.exp(alpha * norm) - 1) / (Math.exp(alpha) - 1);
            const freq =
        MIN_FREQUENCY + scaled * (MAX_FREQUENCY - MIN_FREQUENCY);
            frequencies.push(freq);

            const freqForLog = Math.max(freq, MIN_FREQUENCY);
            const x =
        ((Math.log(freqForLog) - logMin) / (logMax - logMin))
        * canvasWidth;
            xPositions.push(x);
        }

        /* render the bars */
        for (let i = 0; i < numberOfBars; i += 1) {
            const xLeft = xPositions[i];
            const xRight = xPositions[i + 1];
            let barWidth = xRight - xLeft - barGap;
            barWidth = Math.max(0, barWidth);
            const x = xLeft + barGap * 0.5;

            const bin = Math.floor(
                ((frequencies[i] - MIN_FREQUENCY) / (nyquist - MIN_FREQUENCY))
          * halfFft
            );
            const safeBin = Math.max(0, Math.min(bin, halfFft - 1));

            const value = data[safeBin];
            const targetHeight = (value / 255) * canvasHeight;

            const currentHeight = previousBarHeights[i] || 0;
            const barHeight =
        currentHeight + (targetHeight - currentHeight) * 0.3;
            previousBarHeights[i] = barHeight;

            /* colour logic */
            const pinkNoiseLevel = pinkNoiseReference[safeBin];
            const clippingLevel = pinkNoiseLevel + clippingDecibel;
            const nearClipLevel = pinkNoiseLevel + nearClippingDecibel;
            const actualDb =
        minDecibels
        + (value / 255) * (maxDecibels - minDecibels);

            let fillColor = '';
            if (actualDb <= nearClipLevel) {
                const ratio =
          (actualDb - minDecibels)
          / (nearClipLevel - minDecibels);
                const sat = 30 + ratio * 70;
                fillColor = `hsl(120, ${sat}%, 50%)`;
            } else if (actualDb < clippingLevel) {
                const ratio =
          (actualDb - nearClipLevel)
          / (clippingLevel - nearClipLevel);
                const hue = 120 - 120 * Math.min(ratio, 1);
                fillColor = `hsl(${hue}, 100%, 50%)`;
            } else {
                fillColor = 'hsl(0, 100%, 50%)';
            }

            ctx.fillStyle = fillColor;
            ctx.fillRect(
                x,
                canvasHeight - barHeight,
                barWidth,
                barHeight
            );
        }

        /* dB scale */
        const fontSize = Math.max(10, canvasHeight / 80);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = `${fontSize}px Noto Sans`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        amplitudeDecibels.forEach((db) => {
            const value =
        ((db - minDecibels) / (maxDecibels - minDecibels)) * 255;
            let y = canvasHeight - (value / 255) * canvasHeight;
            y = Math.min(Math.max(y, fontSize * 0.5), canvasHeight - fontSize * 0.5);

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(8, y);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();

            const label = `${db} dB`;
            const textX = Math.min(30, canvasWidth - fontSize * 2);
            ctx.fillText(label, textX, y);
        });

        /* frequency scale */
        ctx.textBaseline = 'top';
        const commonFreqs = [100, 200, 500, 1000, 2000, 5000, 10000, 20000];
        commonFreqs.forEach((f) => {
            const percent = (Math.log(f) - logMin) / (logMax - logMin);
            let x = percent * canvasWidth;
            x = Math.min(Math.max(x, fontSize * 0.5), canvasWidth - fontSize * 0.5);

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 8);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();

            const label = f >= 1000 ? `${f / 1000}k Hz` : `${f} Hz`;
            ctx.fillText(label, x, 17);
        });
    }

    /* swap in fast render handler */
    globalThis.onmessage = function renderMessage(innerEvent) {
        draw(innerEvent.data.frequencyData);
    };
};
