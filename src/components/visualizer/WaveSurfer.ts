import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom';
import MiniMapPlugin from 'wavesurfer.js/dist/plugins/minimap';
import { waveSurferChannelStyle, surferOptions, waveSurferPluginOptions } from './WaveSurferOptions';
import { disableControl } from 'plugins/htmlAudioPlayer/plugin';

type WaveSurferLegacy = {
    peaks: number[][]
    duration: number
    isPlaying: boolean
    currentTime: number
    scrollPosition: number
};

let waveSurferInstance: WaveSurfer;

let activePlaylistItem: HTMLElement | null;
let inputSurfer: HTMLElement | null;
let simpleSlider: HTMLElement | null;
let barSurfer: HTMLElement | null;
let mediaElement: HTMLMediaElement | undefined;

let savedPeaks: number[][];
let savedDuration = 0;

const maxZoom = waveSurferPluginOptions.zoomOptions.maxZoom;
const minZoom = 1;
const doubleChannelZoom = 130;
const wholeSongZoom = 70;
let currentZoom = 100;

let mobileTouch = false;

let initialDistance: number | null = null;
const MIN_DELTA = waveSurferPluginOptions.zoomOptions.deltaThreshold; // Define a threshold for minimal significant distance change
interface IEmby {
    Page: {currentRouteInfo: { path: string }};
}

declare let window: Window & {Emby: IEmby, crossFade: ()=> void};

export const purgatory: WaveSurfer[] = [];

export function isNowPlaying() {
    return (window?.Emby?.Page?.currentRouteInfo.path === '/queue');
}

function findElements() {
    inputSurfer = document.getElementById('inputSurfer');
    simpleSlider = document.getElementById('simpleSlider');
    barSurfer = document.getElementById('barSurfer');
    mediaElement = document.getElementById('currentMediaElement') as HTMLMediaElement || null;

    const activePlaylistItems = document.getElementsByClassName('playlistIndexIndicatorImage');
    if (activePlaylistItems) activePlaylistItem = activePlaylistItems[0] as HTMLElement;
}

function scrollPageToTop() {
    requestAnimationFrame(() => {
        document.body.scrollIntoView({
            block: 'start',
            inline: 'nearest',
            behavior: 'smooth'
        });
    });
}

function isNewSong(newSongDuration: number) {
    return (newSongDuration !== Math.floor(savedDuration * 10000000));
}

const smoothScrollSettings = {
    block: 'center',
    inline: 'nearest',
    behavior: 'smooth'
} as ScrollIntoViewOptions;

let scrollTimeout: number | NodeJS.Timeout | undefined;
let scrollTimeout2: number | NodeJS.Timeout | undefined;

function scrollToActivePlaylistItem() {
    clearTimeout(scrollTimeout);
    clearTimeout(scrollTimeout2);
    if (!isNowPlaying()) return;
    scrollTimeout = setTimeout(()=>{
        findElements();

        if (activePlaylistItem) {
            if (inputSurfer) inputSurfer.scrollIntoView(smoothScrollSettings);

            activePlaylistItem.scrollIntoView(smoothScrollSettings);

            scrollTimeout2 = setTimeout(()=>{
                document.body.scrollIntoView(smoothScrollSettings);
            }, 1200);
        }
    }, 300);
}

function waveSurferInitialization(container: string, legacy: WaveSurferLegacy, newSongDuration: 0 ) {
    findElements();

    if (container !== ('#' + barSurfer?.id) && container !== ('#' + inputSurfer?.id)) {
        return;
    }
    // Don't update if the tab is not in focus or the screen is off
    destroyWaveSurferInstance();
    if (document.hidden
        || document.visibilityState !== 'visible'
        || ( !inputSurfer && !barSurfer)
        || !mediaElement) {
        return;
    }

    scrollToActivePlaylistItem();

    const newSong = isNewSong(newSongDuration);
    console.debug('wavesurfer created. New song:', newSong, newSongDuration, Math.floor(savedDuration * 10000000));

    waveSurferInstance = WaveSurfer.create({ ...surferOptions,
        media: mediaElement,
        container: container,
        peaks: newSong ? undefined : legacy?.peaks,
        duration: newSong ? undefined : legacy?.duration
    });

    waveSurferInstance.on('zoom', (minPxPerSec)=>{
        if (mobileTouch) return;
        initializeStyle(minPxPerSec);

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
        // requestAnimationFrame(() => {
        initializeStyle(currentZoom);
        waveSurferInstance.zoom(currentZoom);
        waveSurferInstance.registerPlugin(
            TimelinePlugin.create(waveSurferPluginOptions.timelineOptions)
        );
        waveSurferInstance.registerPlugin(
            ZoomPlugin.create(waveSurferPluginOptions.zoomOptions)
        );
        waveSurferInstance.registerPlugin(
            MiniMapPlugin.create(waveSurferChannelStyle.map)
        );
        if (inputSurfer) {
            inputSurfer.addEventListener('touchstart', onTouchStart, { passive: true });
            inputSurfer.addEventListener('touchmove', onTouchMove, { passive: true });
            inputSurfer.addEventListener('touchend', onTouchEnd, { passive: true });
        }
        // });s
    });

    waveSurferInstance.once('destroy', () => {
        resetVisibility();

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
        startTransition();
        if (e.touches.length === 1) {
            waveSurferInstance.setOptions({
                autoCenter: false,
                autoScroll: false
            });
        }

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
            const newZoom = currentZoom ** zoomFactor;
            if (newZoom >= maxZoom || newZoom <= minZoom) return;

            // Debounce logic with time difference check
            waveSurferInstance.zoom(newZoom);
            currentZoom = newZoom ;
            // Update the initial distance for the next move event
            initialDistance = currentDistance;
        }
    }

    function onTouchEnd(e: TouchEvent): void {
        if (e.touches.length === 1) {
            waveSurferInstance.setOptions({
                autoCenter: true,
                autoScroll: true
            });
        }
        if (e.touches.length === 2) {
            initialDistance = null;
        }
        initializeStyle(currentZoom);

        mobileTouch = false;
        endTransition();
    }
}

function destroyWaveSurferInstance(): WaveSurferLegacy {
    if (!waveSurferInstance) resetVisibility();

    const legacy = {
        peaks: savedPeaks,
        duration: savedDuration,
        isPlaying: waveSurferInstance?.isPlaying(),
        currentTime: waveSurferInstance?.getCurrentTime(),
        scrollPosition: waveSurferInstance?.getScroll()
    };
    if (waveSurferInstance) {
        const victim = purgatory.shift();
        if (victim) {
            disableControl(true);
            victim.destroy();
            disableControl(false);
        }
        purgatory.push(waveSurferInstance);
    }
    if (legacy?.isPlaying) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        mediaElement?.play();
    }

    if (isNowPlaying()) {
        startTransition();

        setTimeout(()=>{
            endTransition();
        }, 5000);
    }
    return legacy;
}

function startTransition() {
    const classList = document.body.classList;

    scrollToActivePlaylistItem();

    classList.add('transition');
}

function endTransition() {
    const classList = document.body.classList;
    classList.remove('transition');
}

function setVisibility() {
    if (inputSurfer) inputSurfer.hidden = false;
    if (simpleSlider) simpleSlider.hidden = true;
    if (barSurfer) barSurfer.hidden = false;
}

function resetVisibility() {
    if (inputSurfer) inputSurfer.hidden = true;
    if (simpleSlider) simpleSlider.hidden = false;
    if (barSurfer) barSurfer.hidden = true;
}

export { waveSurferInitialization, waveSurferInstance, destroyWaveSurferInstance, currentZoom, scrollToActivePlaylistItem, scrollPageToTop };
