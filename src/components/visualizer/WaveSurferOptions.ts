import { WaveSurferOptions } from 'wavesurfer.js';

const white = 'rgb(240, 240, 240)';
const transparentWhite = 'rgba(255, 255, 255, 0.3)';

const color = {
    progressLeft: 'rgb(20, 160, 160)',
    progressRight: 'rgb(160, 20, 160)',
    waveLeft: 'rgb(0, 180, 180)',
    waveRight: 'rgb(180, 0, 180)'
};

const waveSurferChannelStyle = {
    showDoubleChannels: {
        barWidth: undefined,
        barGap: undefined,
        cursorColor: 'rgb(25, 213, 11)',
        cursorWidth: 1,
        autoScroll: true,
        autoCenter: true,
        dragToSeek: false,
        interact: false,
        sampleRate: 4000,
        splitChannels: [
            {
                height: 'auto',
                waveColor: color.waveLeft,
                progressColor: color.progressLeft,
                barAlign: undefined
            },
            {
                height: 'auto',
                waveColor: color.waveRight,
                progressColor: color.progressRight,
                barAlign: undefined
            }
        ]
    } as Partial<WaveSurferOptions>,
    showSingleChannel: {
        barWidth: 4,
        barGap: 2,
        cursorColor: 'rgb(25, 213, 11)',
        cursorWidth: 2,
        autoScroll: true,
        autoCenter: true,
        dragToSeek: false,
        interact: true,
        sampleRate: 3000,
        splitChannels: [
            {
                height: 'auto',
                waveColor: color.waveLeft,
                progressColor: color.progressLeft,
                barAlign: 'bottom'
            },
            {
                height: 'auto',
                waveColor: color.waveRight,
                progressColor: color.progressRight,
                barAlign: 'top'
            }
        ] } as Partial<WaveSurferOptions>,
    showWholeSong: {
        barWidth: undefined,
        barGap: undefined,
        cursorColor: 'rgb(25, 213, 11)',
        cursorWidth: 1,
        autoScroll: false,
        autoCenter: false,
        sampleRate: 3000,
        interact: true,
        dragToSeek: false,
        splitChannels: [
            {
                height: 'auto',
                waveColor: transparentWhite,
                progressColor: white,
                barAlign: 'bottom'
            },
            {
                height: 'auto',
                waveColor: transparentWhite,
                progressColor: white,
                barAlign: 'top'
            }
        ] } as Partial<WaveSurferOptions>,
    bar: {
        barWidth: 4,
        barGap: 2,
        cursorColor: 'rgb(25, 213, 11)',
        cursorWidth: 6,
        autoScroll: false,
        autoCenter: false,
        sampleRate: 3000,
        interact: true,
        dragToSeek: { debounceTime: 3000 },
        splitChannels: [
            {
                height: 'auto',
                waveColor: color.waveLeft,
                progressColor: color.progressLeft,
                overlay: true,
                barAlign: undefined
            },
            {
                height: 'auto',
                waveColor: color.waveRight,
                progressColor: color.progressRight,
                barAlign: undefined
            }
        ] } as Partial<WaveSurferOptions>
};

const surferOptions = {
    container: '#inputSurfer',
    dragToSeek: false,
    interact: true,
    normalize: false,
    autoplay: true,
    hideScrollbar: true,
    autoScroll: false,
    autoCenter: false,
    sampleRate: 3000,
    minPxPerSec: 1,
    width: '100%'
} as WaveSurferOptions;

const waveSurferPluginOptions = {
    timelineOptions: {
        secondaryLabelOpacity: 0.37,
        height: 18,
        primaryLabelInterval: 30,
        secondaryLabelInterval: 5
    },
    zoomOptions:  {
        scale: 0.1,
        maxZoom: 690,
        deltaThreshold: 8
    }
};

export { surferOptions, waveSurferChannelStyle, waveSurferPluginOptions };
