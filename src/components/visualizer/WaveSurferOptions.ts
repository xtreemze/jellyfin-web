import { WaveSurferOptions } from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom';

const surferOptions = {
    container: '#inputSurfer',
    media: window.myMediaElement,
    dragToSeek: false,
    interact: true,
    normalize: false,
    cursorColor: 'rgb(25, 213, 11)',
    cursorWidth: 2,
    barWidth: 2,
    autoplay: true,
    hideScrollbar: true,
    autoScroll: true,
    autoCenter: true,
    minPxPerSec: 200,
    width: '100%',
    plugins: [
        TimelinePlugin.create({
            secondaryLabelOpacity: 0.37,
            insertPosition: 'afterend',
            height: 15
        }),
        ZoomPlugin.create({
            scale: 0.1,
            maxZoom: 700,
            deltaThreshold: 10
        })
    ],
    splitChannels: [
        {
            height: 'auto',
            waveColor: 'rgb(0, 100, 100)',
            progressColor: 'rgba(0, 200, 200)',
            barAlign: 'bottom'
        },
        {
            height: 'auto',
            waveColor: 'rgba(100, 0, 100)',
            progressColor: 'rgb(200, 0, 200)',
            barAlign: 'top'
        }
    ]
} as WaveSurferOptions;

export default surferOptions;
