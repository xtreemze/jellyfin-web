// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import butterchurn from 'butterchurn';
// @ts-ignore
import butterchurnPresets from 'butterchurn-presets';
import { xDuration } from 'components/audioEngine/crossfader.logic';
import { masterAudioOutput } from 'components/audioEngine/master.logic';

let presetSwitchInterval: NodeJS.Timeout;

export const butterchurnInstance: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    visualizer: any;
    nextPreset: () => void;
    destroy: () => void;
} = {
    visualizer: null,
    nextPreset: () => {
        // empty
    },
    destroy: () => {
        // empty
    }
};

export function initializeButterChurn(canvas: HTMLCanvasElement) {
    if (!masterAudioOutput.audioContext) return;

    butterchurnInstance.visualizer = butterchurn.createVisualizer(masterAudioOutput.audioContext, canvas, {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 0.25,
        textureRatio: 1
    });

    // Connect your audio source (e.g., mixerNode) to the visualizer
    butterchurnInstance.visualizer.connectAudio(masterAudioOutput.mixerNode);

    const presets = butterchurnPresets.getPresets();
    const presetNames = Object.keys(presets);

    const loadNextPreset = () => {
        const randomIndex = Math.floor(Math.random() * presetNames.length);
        const nextPresetName = presetNames[randomIndex];
        const nextPreset = presets[nextPresetName];
        if (nextPreset) {
            butterchurnInstance.visualizer.loadPreset(nextPreset, xDuration.fadeOut); // Blend presets over 0 seconds
        }
    };
    // Load the initial preset
    loadNextPreset();
    butterchurnInstance.nextPreset = loadNextPreset;

    // Custom animation loop using requestAnimationFrame
    const animate = () => {
        butterchurnInstance.visualizer.render();
        requestAnimationFrame(animate);
    };
    animate();

    butterchurnInstance.destroy = () => {
        clearInterval(presetSwitchInterval);
        butterchurnInstance.visualizer.disconnectAudio(masterAudioOutput.mixerNode);
    };

    // Switch presets every 60 seconds
    presetSwitchInterval = setInterval(loadNextPreset, 60000);
}

