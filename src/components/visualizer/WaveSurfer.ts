import WaveSurfer from 'wavesurfer.js';
import './visualizers.scss';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom';
import { waveSurferChannelStyle, surferOptions, waveSurferPluginOptions } from './WaveSurferOptions';

type WaveSurferLegacy = {
    peaks: number[][] | undefined
    duration: number | undefined
    isPlaying: boolean | undefined
    currentTime: number | undefined
};

let waveSurferInstance: WaveSurfer;

let inputSurfer: HTMLElement | null;
let simpleSlider: HTMLElement | null;
let barSurfer: HTMLElement | null;
let mediaElement: HTMLMediaElement | null;

let savedPeaks: number[][];
let savedDuration = 0;

const maxZoom = 60000;
const minZoom = 1;
const doubleChannelZoom = 150;
const wholeSongZoom = 20;
let currentZoom = 100;

let mobileTouch = false;

let initialDistance: number | null = null;
let lastTouchTime = 0; // Track the last touch time
const MIN_DELTA = 5; // Define a threshold for minimal significant distance change

function findElements() {
    inputSurfer = document.getElementById('inputSurfer');
    simpleSlider = document.getElementById('simpleSlider');
    barSurfer = document.getElementById('barSurfer');
    mediaElement = document.getElementById('currentMediaElement') as HTMLMediaElement || null;
}

function isNewSong(newSongDuration: number) {
    return (newSongDuration !== Math.floor(savedDuration * 10000000));
}

function waveSurferInitialization(container: string, legacy: WaveSurferLegacy, newSongDuration: 0 ) {
    findElements();
    resetVisibility();
    if (!mediaElement) return;
    const newSong = isNewSong(newSongDuration);
    console.debug('wavesurfer created. New song:', newSong, newSongDuration, Math.floor(savedDuration * 10000000));

    waveSurferInstance = WaveSurfer.create({ ...surferOptions,
        media: mediaElement,
        container: container,
        peaks: newSong ? undefined : legacy?.peaks,
        duration: newSong ? undefined : legacy?.duration
    });
    if (legacy?.isPlaying === false && legacy?.currentTime && legacy?.duration) {
        waveSurferInstance.seekTo(legacy.currentTime / legacy.duration);
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    if (legacy?.isPlaying === true) waveSurferInstance.play();

    waveSurferInstance.on('zoom', (minPxPerSec)=>{
        if (mobileTouch) return;
        initializeStyle(minPxPerSec);
        if (minPxPerSec < wholeSongZoom) {
            currentZoom = 1; // snap to show whole song
            return;
        }
        currentZoom = minPxPerSec;
    });

    waveSurferInstance.once('ready', (duration) => {
        setVisibility();
        savedDuration = duration;
        savedPeaks = waveSurferInstance.exportPeaks();
        if (container === '#barSurfer') {
            waveSurferInstance.setOptions(waveSurferChannelStyle.bar);
            return;
        }
        initializeStyle(currentZoom);
        waveSurferInstance.zoom(currentZoom);

        if (inputSurfer) {
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

    function getDistance(touches: TouchList): number {
        const [touch1, touch2] = touches;
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function onTouchStart(e: TouchEvent): void {
        mobileTouch = true;
        if (e.touches.length === 2) {
            waveSurferInstance.setOptions({
                interact: false,
                autoCenter: false,
                autoScroll: false
            });
            initialDistance = getDistance(e.touches);
        }
    }

    function onTouchMove(e: TouchEvent): void {
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
        if (e.touches.length === 2) {
            initialDistance = null;
        }
        initializeStyle(currentZoom);
        mobileTouch = false;
    }
}

function destroyWaveSurferInstance(): WaveSurferLegacy {
    const legacy = {
        peaks: savedPeaks || undefined,
        duration: savedDuration || undefined,
        isPlaying: waveSurferInstance?.isPlaying() || undefined,
        currentTime: waveSurferInstance?.getCurrentTime() || undefined
    };
    resetVisibility();
    if (waveSurferInstance) {
        waveSurferInstance.unAll();
        waveSurferInstance.destroy();
    }
    return legacy;
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
