import WaveSurfer from 'wavesurfer.js';
import './visualizers.scss';

const visOptions = {
    container: '#inputSurfer',
    dragToSeek: true,
    interact: true,
    normalize: true,
    cursorColor: 'rgb(25, 213, 11)',
    cursorWidth: 3,
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
};

let waveSurferInstance: WaveSurfer;

let inputSurfer: HTMLElement | null;
let simpleSlider: HTMLElement | null;

function findElements() {
    inputSurfer = document.getElementById('inputSurfer');
    simpleSlider = document.getElementById('simpleSlider');
}

// See appFooter.scss for styling
function waveSurferInitialization() {
    findElements();
    if (!inputSurfer && !simpleSlider) {
        return;
    }
    if (waveSurferInstance) {
        // waveSurferInstance.empty();
        waveSurferInstance.setOptions(visOptions);
        waveSurferInstance.setMediaElement(window.myMediaElement);
        return;
    }
    waveSurferInstance = WaveSurfer.create(visOptions);
    waveSurferInstance.once('ready', () => {
        if (inputSurfer && simpleSlider) {
            simpleSlider.hidden = true;
            inputSurfer.hidden = false;
        }
        waveSurferInstance.setMediaElement(window.myMediaElement);

        // waveSurferInstance.play();
    });
}

function destroyWaveSurferInstance() {
    if (waveSurferInstance && simpleSlider && inputSurfer) {
        waveSurferInstance.destroy();
        simpleSlider.hidden = false;
        inputSurfer.hidden = true;
    }
}

export { waveSurferInitialization, waveSurferInstance, destroyWaveSurferInstance };
