import WaveSurfer from 'wavesurfer.js';
import './visualizers.scss';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom';
import { waveSurferChannelStyle, surferOptions, waveSurferPluginOptions } from './WaveSurferOptions';

let waveSurferInstance: WaveSurfer;

let inputSurfer: HTMLElement | null;
let simpleSlider: HTMLElement | null;
let barSurfer: HTMLElement | null;

const maxZoom = 60000;
const minZoom = 1.01;
const doubleChannelZoom = 200;
const wholeSongZoom = 10;
let currentZoom = 100;

let mobileTouch = false;

function findElements() {
    inputSurfer = document.getElementById('inputSurfer');
    simpleSlider = document.getElementById('simpleSlider');
    barSurfer = document.getElementById('barSurfer');
}

function waveSurferInitialization(container: string) {
    findElements();
    resetVisibility();
    waveSurferInstance = WaveSurfer.create({ ...surferOptions,
        media: window.myMediaElement,
        container: container
    });
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    waveSurferInstance.play();

    waveSurferInstance.on('zoom', (minPxPerSec)=>{
        if (mobileTouch) return;
        initializeStyle(minPxPerSec);
        currentZoom = minPxPerSec;
    });

    waveSurferInstance.once('ready', () => {
        setVisibility();
        if (container === '#barSurfer') {
            waveSurferInstance.setOptions(waveSurferChannelStyle.bar);
            return;
        }
        initializeStyle(currentZoom);
        waveSurferInstance.zoom(currentZoom);
        waveSurferInstance.setScroll(0);
        if (inputSurfer && simpleSlider) {
            inputSurfer.addEventListener('touchstart', onTouchStart);
            inputSurfer.addEventListener('touchmove', onTouchMove);
            inputSurfer.addEventListener('touchend', onTouchEnd);
        }
        waveSurferInstance.registerPlugin(
            TimelinePlugin.create(waveSurferPluginOptions.timelineOptions)
        );
        waveSurferInstance.registerPlugin(
            ZoomPlugin.create(waveSurferPluginOptions.zoomOptions)
        );
    });

    waveSurferInstance.once('destroy', () => {
        if (!inputSurfer) return;
        inputSurfer.removeEventListener('touchstart', onTouchStart);
        inputSurfer.removeEventListener('touchmove', onTouchMove);
        inputSurfer.removeEventListener('touchend', onTouchEnd);
    });

    function initializeStyle(minPxPerSec: number) {
        if (minPxPerSec < doubleChannelZoom && minPxPerSec > wholeSongZoom) {
            waveSurferInstance.setOptions(waveSurferChannelStyle.showSingleChannel);
            return;
        }
        if (minPxPerSec > doubleChannelZoom && minPxPerSec > wholeSongZoom) {
            waveSurferInstance.setOptions(waveSurferChannelStyle.showDoubleChannels);
            return;
        }
        waveSurferInstance.setOptions(waveSurferChannelStyle.showWholeSong);
    }

    if (container === '#barSlider') return;

    let initialDistance: number | null = null;

    function getDistance(touches: TouchList): number {
        const [touch1, touch2] = touches;
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function onTouchStart(e: TouchEvent): void {
        mobileTouch = true;
        if (e.touches.length > 1) {
            waveSurferInstance.setOptions({
                interact: false
            });
            initialDistance = getDistance(e.touches);
        }
    }

    let lastTouchTime = 0; // Track the last touch time

    function onTouchMove(e: TouchEvent): void {
        const MIN_DELTA = 5; // Define a threshold for minimal significant distance change

        if (e.touches.length === 2 && initialDistance !== null) {
            const currentDistance = getDistance(e.touches);
            const delta = Math.abs(currentDistance - initialDistance);

            // Check if the distance change is significant
            if (delta < MIN_DELTA) return;

            const zoomFactor = currentDistance / initialDistance;

            // Ensure the new zoom factor is within allowed bounds
            if ((currentZoom * zoomFactor) > maxZoom) return;
            if ((currentZoom * zoomFactor) < minZoom) return;

            const now = performance.now(); // Get the current time

            // Debounce logic with time difference check
            if (now - lastTouchTime > 20) { // Update only if time have passed since last touch
                currentZoom = currentZoom * zoomFactor;
                waveSurferInstance.zoom(currentZoom);
                // Update the initial distance for the next move event
                initialDistance = currentDistance;
                lastTouchTime = now; // Update last touch time for next check
            }
        }
    }

    function onTouchEnd(e: TouchEvent): void {
        if (e.touches.length < 2) {
            initialDistance = null;
        }
        mobileTouch = false;
        initializeStyle(currentZoom);
    }
}

function destroyWaveSurferInstance() {
    resetVisibility();
    if (waveSurferInstance) {
        waveSurferInstance.unAll();
        waveSurferInstance.destroy();
    }
}
function setVisibility() {
    if (inputSurfer) inputSurfer.hidden = false;
    if (simpleSlider) simpleSlider.hidden = true;
    if (barSurfer) barSurfer.hidden = false;
}

function resetVisibility() {
    if (simpleSlider) simpleSlider.hidden = false;
    if (inputSurfer) inputSurfer.hidden = true;
    if (barSurfer) barSurfer.hidden = true;
}

export { waveSurferInitialization, waveSurferInstance, destroyWaveSurferInstance, currentZoom };
