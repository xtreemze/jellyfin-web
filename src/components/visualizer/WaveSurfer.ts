import WaveSurfer from 'wavesurfer.js';
import './visualizers.scss';
import surferOptions from './WaveSurferOptions';

let waveSurferInstance: WaveSurfer;

let inputSurfer: HTMLElement | null;
let simpleSlider: HTMLElement | null;

let currentZoom = surferOptions.minPxPerSec || 200;
const maxZoom = 700;
const minZoom = 1.05;

function findElements() {
    inputSurfer = document.getElementById('inputSurfer');
    simpleSlider = document.getElementById('simpleSlider');
}

function waveSurferInitialization() {
    if (waveSurferInstance) {
        destroyWaveSurferInstance();
    }
    findElements();
    if (!inputSurfer && !simpleSlider) {
        return;
    }
    resetVisibility();
    waveSurferInstance = WaveSurfer.create({ ...surferOptions,
        media: window.myMediaElement
        // minPxPerSec: currentZoom
    });
    waveSurferInstance.once('redrawcomplete', () => {
        findElements();
        if (inputSurfer && simpleSlider) {
            simpleSlider.hidden = true;
            inputSurfer.hidden = false;
        }
    });
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    waveSurferInstance.play();

    let initialDistance: number | null = null;

    function getDistance(touches: TouchList): number {
        const [touch1, touch2] = touches;
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function onTouchStart(e: TouchEvent): void {
        if (e.touches.length === 1) {
            waveSurferInstance.setOptions({
                autoScroll: false,
                autoCenter: false
            });
        }
        if (e.touches.length === 2) {
            initialDistance = getDistance(e.touches);
            waveSurferInstance.setOptions({
                autoScroll: true,
                autoCenter: true
            });
        }
    }

    function onTouchMove(e: TouchEvent): void {
        const MIN_DELTA = 15; // Define a threshold for minimal significant distance change

        if (e.touches.length === 2 && initialDistance !== null) {
            const currentDistance = getDistance(e.touches);
            const delta = Math.abs(currentDistance - initialDistance);

            // Check if the distance change is significant
            if (delta < MIN_DELTA) return;

            const zoomFactor = currentDistance / initialDistance;

            // Ensure the new zoom factor is within allowed bounds
            if ((currentZoom * zoomFactor) > maxZoom) return;
            if ((currentZoom * zoomFactor) < minZoom) return;

            currentZoom = currentZoom * zoomFactor;
            waveSurferInstance.zoom(currentZoom);

            // Update the initial distance for the next move event
            initialDistance = currentDistance;
        }
    }

    function onTouchEnd(e: TouchEvent): void {
        waveSurferInstance.setOptions({
            autoScroll: surferOptions.autoScroll || true,
            autoCenter: surferOptions.autoCenter || true
        });
        if (e.touches.length < 2) {
            initialDistance = null;
        }
    }

    waveSurferInstance.on('ready', () => {
        if (!inputSurfer) return;
        inputSurfer.addEventListener('touchstart', onTouchStart);
        inputSurfer.addEventListener('touchmove', onTouchMove);
        inputSurfer.addEventListener('touchend', onTouchEnd);
    });

    waveSurferInstance.on('destroy', () => {
        if (!inputSurfer) return;
        inputSurfer.removeEventListener('touchstart', onTouchStart);
        inputSurfer.removeEventListener('touchmove', onTouchMove);
        inputSurfer.removeEventListener('touchend', onTouchEnd);
    });
}

function destroyWaveSurferInstance() {
    if (waveSurferInstance) {
        resetVisibility();
        waveSurferInstance.destroy();
    }
}

function resetVisibility() {
    if ( simpleSlider && inputSurfer) {
        simpleSlider.hidden = false;
        inputSurfer.hidden = true;
    }
}

export { waveSurferInitialization, waveSurferInstance, destroyWaveSurferInstance, currentZoom };
