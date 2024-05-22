import WaveSurfer, { WaveSurferOptions } from 'wavesurfer.js';
import './visualizers.scss';

let waveSurferInstance: WaveSurfer;

let inputSurfer: HTMLElement | null;
let simpleSlider: HTMLElement | null;

function findElements() {
    inputSurfer = document.getElementById('inputSurfer');
    simpleSlider = document.getElementById('simpleSlider');
}

function waveSurferInitialization() {
    const visOptions = {
        container: '#inputSurfer',
        dragToSeek: true,
        interact: true,
        normalize: true,
        media: window.myMediaElement,
        cursorColor: 'rgb(25, 213, 11)',
        cursorWidth: 3,
        autoplay: true,
        splitChannels: [
            {
                height: 23,
                waveColor: 'rgba(100, 0, 100)',
                progressColor: 'rgb(200, 0, 200)'
            },
            {
                height: 23,
                overlay: true,
                waveColor: 'rgb(0, 100, 100)',
                progressColor: 'rgba(0, 200, 200)'
            }
        ]
    } as WaveSurferOptions;

    if (waveSurferInstance) {
        destroyWaveSurferInstance();
    }
    findElements();
    if (!inputSurfer && !simpleSlider) {
        return;
    }
    resetVisibility();
    waveSurferInstance = WaveSurfer.create(visOptions);
    waveSurferInstance.once('ready', () => {
        findElements();
        if (inputSurfer && simpleSlider) {
            simpleSlider.hidden = true;
            inputSurfer.hidden = false;
        }
    });
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    waveSurferInstance.play();
}

function destroyWaveSurferInstance() {
    if (waveSurferInstance) {
        waveSurferInstance.destroy();
        resetVisibility();
    }
}

function resetVisibility() {
    if ( simpleSlider && inputSurfer) {
        simpleSlider.hidden = false;
        inputSurfer.hidden = true;
    }
}

export { waveSurferInitialization, waveSurferInstance, destroyWaveSurferInstance };
