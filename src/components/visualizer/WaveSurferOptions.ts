import { WaveSurferOptions } from 'wavesurfer.js';

const color = {
    progressLeft: 'rgb(20, 160, 160)',
    progressRight: 'rgb(160, 20, 160)',
    waveLeft: 'rgb(0, 180, 180)',
    waveRight: 'rgb(180, 0, 180)',
    cursor: 'rgb(25, 213, 11)',
    black: 'rgb(10, 10, 10)',
    transparentBlack: 'rgba(0, 0, 0, 0.6)',
    white: 'rgb(245, 245, 245)',
    transparentWhite: 'rgba(255, 255, 255, 0.6)'
};

const waveSurferChannelStyle = {
    showDoubleChannels: {
        barWidth: undefined,
        barGap: undefined,
        cursorColor: color.cursor,
        cursorWidth: 1,
        autoScroll: true,
        autoCenter: true,
        dragToSeek: false,
        interact: false,
        sampleRate: 8000,
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
        cursorColor: color.cursor,
        cursorWidth: 2,
        autoScroll: true,
        autoCenter: true,
        dragToSeek: false,
        interact: true,
        sampleRate: 8000,
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
        cursorColor: color.cursor,
        cursorWidth: 1,
        autoScroll: true,
        autoCenter: true,
        sampleRate: 8000,
        interact: true,
        dragToSeek: false,
        splitChannels: [
            {
                height: 'auto',
                waveColor: color.transparentBlack,
                progressColor: color.black,
                barAlign: undefined
            },
            {
                overlay: true,
                height: 'auto',
                waveColor: color.transparentWhite,
                progressColor: color.white,
                barAlign: undefined
            }
        ] } as Partial<WaveSurferOptions>,
    bar: {
        barWidth: 4,
        barGap: 2,
        cursorColor: color.cursor,
        cursorWidth: 21,
        autoScroll: false,
        autoCenter: false,
        sampleRate: 8000,
        interact: true,
        dragToSeek: false,
        splitChannels: [
            {
                height: 'auto',
                waveColor: color.waveLeft,
                progressColor: color.progressLeft,
                barAlign: undefined
            },
            {
                height: 'auto',
                overlay: true,
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
        maxZoom: 60000,
        deltaThreshold: 12
    }
};

export { surferOptions, waveSurferChannelStyle, waveSurferPluginOptions };
