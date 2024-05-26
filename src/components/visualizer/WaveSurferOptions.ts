import { WaveSurferOptions } from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom';

const surferOptions = {
    container: '#inputSurfer',
    dragToSeek: false,
    interact: true,
    normalize: false,
    cursorColor: 'rgb(25, 213, 11)',
    cursorWidth: 2,
    barWidth: 2,
    gap: 1,
    autoplay: true,
    hideScrollbar: true,
    autoScroll: false,
    autoCenter: false,
    minPxPerSec: 30,
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
            deltaThreshold: 12
        })
    ],
    splitChannels: [
        {
            height: 'auto',
            waveColor: 'rgb(0, 180, 180)',
            progressColor: 'rgb(20, 160, 160)',
            barAlign: 'bottom'
        },
        {
            height: 'auto',
            waveColor: 'rgba(180, 0, 180)',
            progressColor: 'rgba(160, 20, 160)',
            barAlign: 'top'
        }
    ]
} as WaveSurferOptions;

export default surferOptions;
