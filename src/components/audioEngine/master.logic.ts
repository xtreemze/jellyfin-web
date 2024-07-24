import { setVisualizerSettings } from 'components/visualizer/visualizers.logic';
import * as userSettings from '../../scripts/settings/userSettings';
import { setXDuration } from './crossfader.logic';

type MasterAudioTypes = {
    mixerNode?: GainNode;
    makeupGain: number;
    muted: boolean;
    audioContext?: AudioContext;
    volume: number;
};

const dbBoost = 2;

function applyDbReduction(originalVolume: number, reductionDb: number) {
    const originalLinear = originalVolume / 100; // Convert the original volume to a linear scale of 0 to 1
    const newLinear = originalLinear * Math.pow(10, -reductionDb / 20);

    return newLinear * 100; // Convert back to a scale of 0 to 100
}

export const masterAudioOutput: MasterAudioTypes = {
    makeupGain: Math.pow(10, dbBoost / 20),
    muted: false,
    volume: applyDbReduction(100, dbBoost)
};

export let unbindCallback = () => {
    return;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function initializeMasterAudio(unbind: any) {
    const savedDuration = userSettings.crossfadeDuration(undefined);
    setXDuration(savedDuration);

    unbindCallback = unbind;

    const webAudioSupported = ('AudioContext' in window || 'webkitAudioContext' in window);

    if (!webAudioSupported) {
        console.log('WebAudio not supported');
        return;
    }
    // eslint-disable-next-line compat/compat, @typescript-eslint/no-explicit-any
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = masterAudioOutput.audioContext || new AudioContext();

    if (!masterAudioOutput.audioContext) masterAudioOutput.audioContext = audioCtx;

    if (!masterAudioOutput.mixerNode) {
        masterAudioOutput.mixerNode = audioCtx.createGain();

        masterAudioOutput.mixerNode.connect(audioCtx.destination);
        masterAudioOutput.mixerNode.gain
            .setValueAtTime((masterAudioOutput.volume / 100) * masterAudioOutput.makeupGain, audioCtx.currentTime);
    }
}

type GainNodes = GainNode[];

export const audioNodeBus: GainNodes = [];

export function createGainNode(elem: HTMLMediaElement) {
    if (!masterAudioOutput.audioContext || !masterAudioOutput.mixerNode) {
        console.log('MasterAudio is not initialized');
        return;
    }

    const source = masterAudioOutput.audioContext.createMediaElementSource(elem);
    const gainNode = masterAudioOutput.audioContext.createGain();

    audioNodeBus.unshift(gainNode);
    audioNodeBus[0].gain.setValueAtTime(0, masterAudioOutput.audioContext.currentTime);

    source.connect(audioNodeBus[0]);
    audioNodeBus[0].connect(masterAudioOutput.mixerNode);
}

