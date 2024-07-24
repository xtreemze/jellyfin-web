import { destroyWaveSurferInstance } from 'components/visualizer/WaveSurfer';
import { audioNodeBus, masterAudioOutput } from './master.logic';
import * as userSettings from '../../scripts/settings/userSettings';

export function setXDuration(crossfadeDuration: number) {
    if (crossfadeDuration < 0.01) {
        xDuration.enabled = false;
        xDuration.fadeOut = 0;
        xDuration.disableFade = true;
        xDuration.sustain = 0;
        return;
    }

    if (crossfadeDuration < 0.51) {
        xDuration.enabled = true;
        xDuration.fadeOut = crossfadeDuration * 2;
        xDuration.disableFade = true;
        xDuration.sustain = crossfadeDuration;
        return;
    }

    xDuration.enabled = true;
    xDuration.fadeOut = crossfadeDuration * 2.5;
    xDuration.disableFade = false;
    xDuration.sustain = crossfadeDuration;
}

export const xDuration = {
    disableFade: true,
    sustain: 0.5,
    fadeOut: 1,
    enabled: true,
    t0: performance.now(),
    busy: false
};

export function hijackMediaElementForCrossfade() {
    xDuration.t0 = performance.now(); // Record the start time

    const hijackedPlayer = document.getElementById('currentMediaElement') as HTMLMediaElement;
    if (!hijackedPlayer || !masterAudioOutput.audioContext) return;

    if (hijackedPlayer.paused) {
        setXDuration(0);
    }

    const disposeElement = document.getElementById('crossFadeMediaElement');
    if (disposeElement) {
        destroyWaveSurferInstance();
    }
    prevNextDisable(true);
    hijackedPlayer.classList.remove('mediaPlayerAudio');
    hijackedPlayer.id = 'crossFadeMediaElement';

    hijackedPlayer.pause = ()=>{
        // Do nothing
    };

    Object.defineProperty(hijackedPlayer, 'src', {
        set: () => {
            // Do nothing
        }
    });

    xDuration.busy = true;

    if (!xDuration.disableFade && audioNodeBus[0] && masterAudioOutput.audioContext) {
        // Schedule the fadeout crossfade curve
        audioNodeBus[0].gain.linearRampToValueAtTime(audioNodeBus[0].gain.value, masterAudioOutput.audioContext.currentTime);
        audioNodeBus[0].gain.exponentialRampToValueAtTime(0.01, masterAudioOutput.audioContext.currentTime + xDuration.fadeOut);
    }

    setTimeout(() => {
        if (typeof unbindCallback === 'function') {
            unbindCallback();
        }
        // This destroys the wavesurfer on the fade out track when the new track starts
        destroyWaveSurferInstance();
    }, xDuration.sustain * 990);

    setTimeout(() => {
        const xfadeGainNode = audioNodeBus.pop();

        if (!masterAudioOutput.audioContext || !xfadeGainNode) return;
        xfadeGainNode.gain.linearRampToValueAtTime(0, masterAudioOutput.audioContext.currentTime + 1);
        setTimeout(() => {
            prevNextDisable(false);
            // Clean up and destroy the xfade MediaElement here
            xfadeGainNode.disconnect();
            hijackedPlayer.remove();
            xDuration.busy = false;
        }, 1015);
    }, xDuration.fadeOut * 1000);
}

function prevNextDisable(disable = false) {
    const buttons = [
        '.btnPreviousTrack', '.previousTrackButton',
        '.btnNextTrack', '.nextTrackButton',
        '.btnPlayPause', '.playPauseButton',
        '.stopButton', '.btnStop'
    ];

    buttons.forEach(selector => {
        const button = document.querySelector(selector) as HTMLButtonElement;
        if (button) {
            button.disabled = disable;
        }
    });
}

export function createGainNode(elem: HTMLMediaElement) {
    if (!masterAudioOutput.audioContext) {
        console.error('Audio context is not initialized');
        return;
    }

    const source = masterAudioOutput.audioContext.createMediaElementSource(elem);

    audioNodeBus.unshift(masterAudioOutput.audioContext.createGain());
    audioNodeBus[0].gain.setValueAtTime(0, masterAudioOutput.audioContext.currentTime);

    source.connect(audioNodeBus[0]);
    if (masterAudioOutput.mixerNode) {
        audioNodeBus[0].connect(masterAudioOutput.mixerNode);
    }
}

let unbindCallback = () => {
    return;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function initializeMasterAudio(unbind: any) {
    unbindCallback = unbind;

    const webAudioSupported = ('AudioContext' in window || 'webkitAudioContext' in window);

    if (!webAudioSupported) {
        throw new Error('WebAudio not supported');
    }
    // eslint-disable-next-line compat/compat, @typescript-eslint/no-explicit-any
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = masterAudioOutput.audioContext || new AudioContext();

    if (!masterAudioOutput.audioContext) masterAudioOutput.audioContext = audioCtx;

    const savedDuration = userSettings.crossfadeDuration(undefined);
    setXDuration(savedDuration);

    if (!masterAudioOutput.mixerNode) {
        masterAudioOutput.mixerNode = audioCtx.createGain();

        masterAudioOutput.mixerNode.connect(audioCtx.destination);
        masterAudioOutput.mixerNode.gain
            .setValueAtTime((masterAudioOutput.volume / 100) * masterAudioOutput.makeupGain, audioCtx.currentTime);
    }
}

export function timeRunningOut(player: any) {
    const currentTime = player.currentTime();

    if (!masterAudioOutput.audioContext || !xDuration.enabled || xDuration.busy || currentTime < xDuration.fadeOut * 1001) return false;
    return (player.duration() - currentTime) <= (xDuration.fadeOut * 1000);
}

