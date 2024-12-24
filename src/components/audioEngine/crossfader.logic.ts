import { hijackMediaElementForCrossfade, setXDuration, timeRunningOut, xDuration } from 'plugins/crossfadingPlayer/plugin';
import { masterAudioOutput } from './master.logic';
import * as userSettings from '../../scripts/settings/userSettings';

/**
 * Gets the crossfade duration from user settings.
 * @returns {number} The crossfade duration.
 */
function getCrossfadeDuration() {
    return userSettings.crossfadeDuration(undefined);
}
