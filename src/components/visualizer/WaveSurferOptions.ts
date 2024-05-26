import { WaveSurferOptions } from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom';

const white = 'rgb(240, 240, 240)';
const transparentWhite = 'rgba(255, 255, 255, 0.3)';

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
                waveColor: 'rgb(0, 180, 180)',
                progressColor: 'rgb(20, 160, 160)',
                barAlign: undefined
            },
            {
                height: 'auto',
                waveColor: 'rgb(180, 0, 180)',
                progressColor: 'rgb(160, 20, 160)',
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
                waveColor: 'rgb(0, 180, 180)',
                progressColor: 'rgb(20, 160, 160)',
                barAlign: 'bottom'
            },
            {
                height: 'auto',
                waveColor: 'rgb(180, 0, 180)',
                progressColor: 'rgb(160, 20, 160)',
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
    width: '100%',
    plugins: [
        TimelinePlugin.create({
            secondaryLabelOpacity: 0.37,
            insertPosition: 'afterend',
            height: 18,
            primaryLabelInterval: 30,
            secondaryLabelInterval: 5
        }),
        ZoomPlugin.create({
            scale: 0.1,
            maxZoom: 690,
            deltaThreshold: 8
        })
    ]
} as WaveSurferOptions;

export { surferOptions, waveSurferChannelStyle };
