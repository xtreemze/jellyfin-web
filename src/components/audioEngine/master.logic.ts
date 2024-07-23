const dbBoost = 2;

function applyDbReduction(originalVolume: number, reductionDb: number) {
    // Convert the original volume to a linear scale of 0 to 1
    const originalLinear = originalVolume / 100;

    // Calculate the new volume
    const newLinear = originalLinear * Math.pow(10, -reductionDb / 20);

    // Convert back to a scale of 0 to 100
    return newLinear * 100;
}

type MasterAudioTypes = {
    mixerNode?: GainNode;
    makeupGain: number;
    muted: boolean;
    audioContext: AudioContext | null;
    volume: number;
};

export const masterAudioOutput: MasterAudioTypes = {
    makeupGain: Math.pow(10, dbBoost / 20),
    muted: false,
    // eslint-disable-next-line compat/compat
    audioContext: typeof AudioContext !== 'undefined' ? new AudioContext() : null,
    volume: applyDbReduction(100, dbBoost)
};

type GainNodes = GainNode[];

export const audioNodeBus: GainNodes = [];
