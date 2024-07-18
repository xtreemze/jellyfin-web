import browser from '../../scripts/browser';
import { appHost } from '../../components/apphost';
import * as htmlMediaHelper from '../../components/htmlMediaHelper';
import profileBuilder from '../../scripts/browserDeviceProfile';
import { getIncludeCorsCredentials } from '../../scripts/settings/webSettings';
import { PluginType } from '../../types/plugin';
import Events from '../../utils/events';
import { MediaError } from 'types/mediaError';
import { destroyWaveSurferInstance } from 'components/visualizer/WaveSurfer';

export function setXDuration(crossfadeDuration) {
    if (crossfadeDuration < 0) xDuration.enabled = false;

    if (crossfadeDuration > 0) {
        xDuration.enabled = true;

        xDuration.fadeOut = crossfadeDuration * 2;
        xDuration.fadeIn = crossfadeDuration / 50;
        xDuration.sustain = crossfadeDuration - xDuration.fadeIn;
    }

    if (crossfadeDuration === 0) {
        xDuration.enabled = true;
        const minimalValue = 0.01;

        xDuration.fadeOut = minimalValue * 2;
        xDuration.fadeIn = minimalValue;
        xDuration.sustain = 0;
    }
}

export const xDuration = {
    fadeIn: 0.01,
    sustain: 5.4,
    fadeOut: 12,
    enabled: true
};

import('../../scripts/settings/userSettings').then((userSettings) => {
    setXDuration(userSettings.crossfadeDuration());
});

const dbBoost = 2;

export const masterAudioOutput = {
    mixerNode: undefined,
    makeupGain: Math.pow(10, dbBoost / 20),
    muted: false
};

function getDefaultProfile() {
    return profileBuilder({});
}

let originalPause;

function applyDbReduction(originalVolume, reductionDb) {
    // Convert the original volume to a linear scale of 0 to 1
    const originalLinear = originalVolume / 100;

    // Calculate the new volume
    const newLinear = originalLinear * Math.pow(10, -reductionDb / 20);

    // Convert back to a scale of 0 to 100
    return newLinear * 100;
}

let volume = applyDbReduction(100, dbBoost);

export function disableControl(override = false) {
    if (!originalPause) return;
    const elements = document.getElementsByTagName('audio');

    if (!override && elements.length) {
        [...elements].forEach((element) => {
            element.pause = originalPause;
        });
    } else {
        [...elements].forEach((element) => {
            element.pause = () => {
                return null;
            };
        });
    }
}

let fadeTimeout;
function fade(instance, elem, startingVolume) {
    if (masterAudioOutput.mixerNode && xDuration.enabled) {
        return new Promise(function (resolve) {
            instance._isFadingOut = true;
            window.crossFade();
            setTimeout(() => {
                instance._isFadingOut = false;
                resolve();
            }, (xDuration.fadeOut + 3) * 1000);
        });
    }

    // Need to record the starting volume on each pass rather than querying elem.volume
    // This is due to iOS safari not allowing volume changes and always returning the system volume value
    const newVolume = Math.max(0, startingVolume - 0.01);
    console.debug('fading volume to ' + newVolume);
    elem.volume = newVolume;

    if (newVolume <= 0) {
        instance._isFadingOut = false;
        return Promise.resolve();
    }

    return new Promise(function (resolve, reject) {
        cancelFadeTimeout();
        fadeTimeout = setTimeout(function () {
            fade(instance, elem, newVolume).then(resolve, reject);
        }, 20);
    });
}

function cancelFadeTimeout() {
    const timeout = fadeTimeout;
    if (timeout) {
        clearTimeout(timeout);
        fadeTimeout = null;
    }
}

function supportsFade() {
    // Not working on tizen.
    // We could possibly enable on other tv's, but all smart tv browsers tend to be pretty primitive
    return true;
}

function requireHlsPlayer(callback) {
    import('hls.js/dist/hls.js').then(({ default: hls }) => {
        hls.DefaultConfig.lowLatencyMode = false;
        hls.DefaultConfig.backBufferLength = Infinity;
        hls.DefaultConfig.liveBackBufferLength = 1000 * 60 * 12;
        window.Hls = hls;
        callback();
    });
}

function enableHlsPlayer(url, item, mediaSource, mediaType) {
    if (!htmlMediaHelper.enableHlsJsPlayer(mediaSource.RunTimeTicks, mediaType)) {
        return Promise.reject();
    }

    if (url.indexOf('.m3u8') !== -1) {
        return Promise.resolve();
    }

    // issue head request to get content type
    return new Promise(function (resolve, reject) {
        import('../../components/fetchhelper').then((fetchHelper) => {
            fetchHelper.ajax({
                url: url,
                type: 'HEAD'
            }).then(function (response) {
                const contentType = (response.headers.get('Content-Type') || '').toLowerCase();
                if (contentType === 'application/vnd.apple.mpegurl' || contentType === 'application/x-mpegurl') {
                    resolve();
                } else {
                    reject();
                }
            }, reject);
        });
    });
}

class HtmlAudioPlayer {
    constructor() {
        const self = this;

        self.name = 'Html Audio Player';
        self.type = PluginType.MediaPlayer;
        self.id = 'htmlaudioplayer';

        // Let any players created by plugins take priority
        self.priority = 1;

        self.play = function (options) {
            self._started = false;
            self._timeUpdated = false;
            self._currentTime = null;

            const elem = createMediaElement();

            return setCurrentSrc(elem, options);
        };

        function setCurrentSrc(elem, options) {
            unBindEvents(elem);
            bindEvents(elem);

            let val = options.url;
            console.debug('playing url: ' + val);
            import('../../scripts/settings/userSettings').then((userSettings) => {
                let normalizationGain;
                if (userSettings.selectAudioNormalization() == 'TrackGain') {
                    normalizationGain = options.item.NormalizationGain
                        ?? options.mediaSource.albumNormalizationGain;
                } else if (userSettings.selectAudioNormalization() == 'AlbumGain') {
                    normalizationGain =
                        options.mediaSource.albumNormalizationGain
                        ?? options.item.NormalizationGain;
                }

                if (normalizationGain) {
                    // Calculate the normalization gain
                    const gainValue = Math.pow(10, normalizationGain / 20);

                    // Set the final gain value
                    self.gainNode.gain.exponentialRampToValueAtTime(
                        gainValue,
                        window.myAudioContext.currentTime + 0.1);
                } else {
                    self.gainNode.gain.value = 1;
                }
            }).catch((err) => {
                console.error('Failed to add/change gainNode', err);
            });

            // Convert to seconds
            const seconds = (options.playerStartPositionTicks || 0) / 10000000;
            if (seconds) {
                val += '#t=' + seconds;
            }

            htmlMediaHelper.destroyHlsPlayer(self);

            self._currentPlayOptions = options;

            const crossOrigin = htmlMediaHelper.getCrossOriginValue(options.mediaSource);
            if (crossOrigin) {
                elem.crossOrigin = crossOrigin;
            }

            return enableHlsPlayer(val, options.item, options.mediaSource, 'Audio').then(function () {
                return new Promise(function (resolve, reject) {
                    requireHlsPlayer(async () => {
                        const includeCorsCredentials = await getIncludeCorsCredentials();

                        const hls = new Hls({
                            manifestLoadingTimeOut: 20000,
                            xhrSetup: function (xhr) {
                                xhr.withCredentials = includeCorsCredentials;
                            }
                        });
                        hls.loadSource(val);
                        hls.attachMedia(elem);
                        htmlMediaHelper.bindEventsToHlsPlayer(self, hls, elem, onError, resolve, reject);

                        self._hlsPlayer = hls;

                        self._currentSrc = val;
                    });
                });
            }, async () => {
                elem.autoplay = true;

                const includeCorsCredentials = await getIncludeCorsCredentials();
                if (includeCorsCredentials) {
                    // Safari will not send cookies without this
                    elem.crossOrigin = 'use-credentials';
                }

                return htmlMediaHelper.applySrc(elem, val, options).then(function () {
                    self._currentSrc = val;

                    return htmlMediaHelper.playWithPromise(elem, onError);
                });
            });
        }

        function bindEvents(elem) {
            elem.addEventListener('timeupdate', onTimeUpdate);
            elem.addEventListener('ended', onEnded);
            elem.addEventListener('volumechange', onVolumeChange);
            elem.addEventListener('pause', onPause);
            elem.addEventListener('playing', onPlaying);
            elem.addEventListener('play', onPlay);
            elem.addEventListener('waiting', onWaiting);
        }

        function unBindEvents(elem) {
            elem.removeEventListener('timeupdate', onTimeUpdate);
            elem.removeEventListener('ended', onEnded);
            elem.removeEventListener('volumechange', onVolumeChange);
            elem.removeEventListener('pause', onPause);
            elem.removeEventListener('playing', onPlaying);
            elem.removeEventListener('play', onPlay);
            elem.removeEventListener('waiting', onWaiting);
            elem.removeEventListener('error', onError); // bound in htmlMediaHelper
        }

        self.stop = function (destroyPlayer) {
            cancelFadeTimeout();

            const elem = self._mediaElement;
            const src = self._currentSrc;

            if (elem && src) {
                if (!destroyPlayer || !supportsFade()) {
                    elem.pause();

                    htmlMediaHelper.onEndedInternal(self, elem, onError);

                    if (destroyPlayer) {
                        self.destroy();
                    }
                    return Promise.resolve();
                }

                const originalVolume = elem.volume;

                return fade(self, elem, elem.volume).then(function () {
                    elem.pause();
                    elem.volume = originalVolume;

                    htmlMediaHelper.onEndedInternal(self, elem, onError);

                    if (destroyPlayer) {
                        self.destroy();
                    }
                });
            }
            return Promise.resolve();
        };

        self.destroy = function () {
            unBindEvents(self._mediaElement);
            htmlMediaHelper.resetSrc(self._mediaElement);
        };

        function createMediaElement() {
            let elem = self._mediaElement;

            if (elem && elem.id === 'currentMediaElement') {
                return elem;
            }

            elem = document.querySelector('.mediaPlayerAudio');

            if (!elem) {
                elem = document.createElement('audio');
                elem.classList.add('mediaPlayerAudio');
                elem.id = 'currentMediaElement';
                elem.classList.add('hide');
                elem.autoplay = false;

                document.body.appendChild(elem);
            }

            if (!xDuration.enabled) {
                elem.volume = htmlMediaHelper.getSavedVolume();
            }

            self._mediaElement = elem;

            addGainElement(elem);

            return elem;
        }

        function createCrossfadeMediaElement() {
            const disposeElement = document.getElementById('crossFadeMediaElement');
            if (disposeElement) {
                destroyWaveSurferInstance();
                // disposeElement.pause();
                disposeElement.remove();
            }

            const elem = document.getElementById('currentMediaElement');
            elem.classList.remove('mediaPlayerAudio');
            elem.id = 'crossFadeMediaElement';

            let gainNode = self.gainNode;
            self.gainNode = null;
            const audioCtx = window.myAudioContext;

            // Schedule the fadeout crossfade curve
            gainNode.gain.linearRampToValueAtTime(gainNode.gain.value, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + xDuration.fadeOut);

            originalPause = elem.pause;

            setTimeout(() => {
                // This destroys the wavesurfer on the fade out track when the new track starts
                unBindEvents(elem);
                destroyWaveSurferInstance();
            }, (xDuration.sustain + xDuration.fadeIn) * 1000);

            setTimeout(() => {
                gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2);
                setTimeout(() => {
                    // Clean up and destroy the xfade MediaElement here
                    elem.pause();
                    gainNode.disconnect();
                    gainNode = null;
                    elem.remove();
                    prevNextDisable(false);
                }, 2000);
            }, (xDuration.fadeOut) * 1000);

            prevNextDisable(true);

            return createMediaElement();
        }

        function prevNextDisable(disable = false) {
            const btnPreviousTrack = document.querySelector('.btnPreviousTrack');
            const previousTrackBtn = document.querySelector('.previousTrackButton');
            const btnNextTrack = document.querySelector('.btnNextTrack');
            const nextTrackBtn = document.querySelector('.nextTrackButton');
            const btnPlayPause = document.querySelector('.btnPlayPause');
            const playPauseButton = document.querySelector('.playPauseButton');
            const stopButton = document.querySelector('.stopButton');
            const btnStop = document.querySelector('.btnStop');
            if (btnStop) {
                btnStop.disabled = disable;
            }
            if (stopButton) {
                stopButton.disabled = disable;
            }
            if (btnPlayPause) {
                btnPlayPause.disabled = disable;
            }
            if (playPauseButton) {
                playPauseButton.disabled = disable;
            }
            if (btnPreviousTrack) {
                btnPreviousTrack.disabled = disable;
            }
            if (previousTrackBtn) {
                previousTrackBtn.disabled = disable;
            }
            if (btnNextTrack) {
                btnNextTrack.disabled = disable;
            }
            if (nextTrackBtn) {
                nextTrackBtn.disabled = disable;
            }
        }

        window.crossFade = createCrossfadeMediaElement;

        function addGainElement(elem) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext; /* eslint-disable-line compat/compat */
                const audioCtx = window.myAudioContext || new AudioContext();

                if (!window.myAudioContext) window.myAudioContext = audioCtx;

                if (!masterAudioOutput.mixerNode) {
                    masterAudioOutput.mixerNode = audioCtx.createGain();
                    masterAudioOutput.mixerNode.gain.value = 0;
                    masterAudioOutput.mixerNode.connect(audioCtx.destination);
                    masterAudioOutput.mixerNode.gain.exponentialRampToValueAtTime(
                        (volume / 100) * masterAudioOutput.makeupGain, 0.2);
                }

                // For the visualizer. The first one is for non-xfaded, the second one is for xfaded
                const source = audioCtx.createMediaElementSource(elem);

                const gainNode = audioCtx.createGain();
                gainNode.gain.setValueAtTime(0, window.myAudioContext.currentTime);

                source.connect(gainNode);
                gainNode.connect(masterAudioOutput.mixerNode);

                if (elem && elem.id === 'currentMediaElement') {
                    self.gainNode = gainNode;
                }

                return { gainNode: gainNode, audioCtx: audioCtx };
            } catch (e) {
                console.error('Web Audio API is not supported in this browser', e);
            }
        }

        function onEnded() {
            htmlMediaHelper.onEndedInternal(self, this, onError);
        }

        function onTimeUpdate() {
            // Get the player position + the transcoding offset
            const time = this.currentTime;

            // Don't trigger events after user stop
            if (!self._isFadingOut) {
                self._currentTime = time;
                Events.trigger(self, 'timeupdate');
            }
        }

        function onVolumeChange() {
            if (!self._isFadingOut) {
                htmlMediaHelper.saveVolume(this.volume);
                Events.trigger(self, 'volumechange');
            }
        }

        function onPlaying(e) {
            if (!self._started) {
                self._started = true;
                this.removeAttribute('controls');

                htmlMediaHelper.seekOnPlaybackStart(self, e.target, self._currentPlayOptions.playerStartPositionTicks);
            }
            Events.trigger(self, 'playing');
        }

        function onPlay() {
            Events.trigger(self, 'unpause');
        }

        function onPause() {
            Events.trigger(self, 'pause');
        }

        function onWaiting() {
            Events.trigger(self, 'waiting');
        }

        function onError() {
            const errorCode = this.error ? (this.error.code || 0) : 0;
            const errorMessage = this.error ? (this.error.message || '') : '';
            console.error('media element error: ' + errorCode.toString() + ' ' + errorMessage);

            let type;

            switch (errorCode) {
                case 1:
                    // MEDIA_ERR_ABORTED
                    // This will trigger when changing media while something is playing
                    return;
                case 2:
                    // MEDIA_ERR_NETWORK
                    type = MediaError.NETWORK_ERROR;
                    break;
                case 3:
                    // MEDIA_ERR_DECODE
                    if (self._hlsPlayer) {
                        htmlMediaHelper.handleHlsJsMediaError(self);
                        return;
                    } else {
                        type = MediaError.MEDIA_DECODE_ERROR;
                    }
                    break;
                case 4:
                    // MEDIA_ERR_SRC_NOT_SUPPORTED
                    type = MediaError.MEDIA_NOT_SUPPORTED;
                    break;
                default:
                    // seeing cases where Edge is firing error events with no error code
                    // example is start playing something, then immediately change src to something else
                    return;
            }

            htmlMediaHelper.onErrorInternal(self, type);
        }
    }

    currentSrc() {
        return this._currentSrc;
    }

    canPlayMediaType(mediaType) {
        return (mediaType || '').toLowerCase() === 'audio';
    }

    getDeviceProfile(item) {
        if (appHost.getDeviceProfile) {
            return appHost.getDeviceProfile(item);
        }

        return getDefaultProfile();
    }

    toggleAirPlay() {
        return this.setAirPlayEnabled(!this.isAirPlayEnabled());
    }

    // Save this for when playback stops, because querying the time at that point might return 0
    currentTime(val) {
        const mediaElement = this._mediaElement;
        if (mediaElement) {
            if (val != null) {
                mediaElement.currentTime = val / 1000;
                return;
            }

            const currentTime = this._currentTime;
            if (currentTime) {
                return currentTime * 1000;
            }

            return (mediaElement.currentTime || 0) * 1000;
        }
    }

    duration() {
        const mediaElement = this._mediaElement;
        if (mediaElement) {
            const duration = mediaElement.duration;
            if (htmlMediaHelper.isValidDuration(duration)) {
                return duration * 1000;
            }
        }

        return null;
    }

    seekable() {
        const mediaElement = this._mediaElement;
        if (mediaElement) {
            const seekable = mediaElement.seekable;
            if (seekable?.length) {
                let start = seekable.start(0);
                let end = seekable.end(0);

                if (!htmlMediaHelper.isValidDuration(start)) {
                    start = 0;
                }
                if (!htmlMediaHelper.isValidDuration(end)) {
                    end = 0;
                }

                return (end - start) > 0;
            }

            return false;
        }
    }

    getBufferedRanges() {
        const mediaElement = this._mediaElement;
        if (mediaElement) {
            return htmlMediaHelper.getBufferedRanges(this, mediaElement);
        }

        return [];
    }

    pause() {
        const mediaElement = this._mediaElement;
        if (mediaElement) {
            mediaElement.pause();
        }
    }

    // This is a retry after error
    resume() {
        this.unpause();
    }

    unpause() {
        const mediaElement = this._mediaElement;
        if (mediaElement) {
            mediaElement.play();
        }
    }

    paused() {
        const mediaElement = this._mediaElement;
        if (mediaElement) {
            return mediaElement.paused;
        }

        return false;
    }

    setPlaybackRate(value) {
        const mediaElement = this._mediaElement;
        if (mediaElement) {
            mediaElement.playbackRate = value;
        }
    }

    getPlaybackRate() {
        const mediaElement = this._mediaElement;
        if (mediaElement) {
            return mediaElement.playbackRate;
        }
        return null;
    }

    setVolume(val) {
        const audioCtx = window.myAudioContext;
        const mediaElement = this._mediaElement;

        if (masterAudioOutput.mixerNode && audioCtx) {
            // Apply the makeup gain
            const gainValue = (val / 100);

            masterAudioOutput.mixerNode.gain.setTargetAtTime(
                gainValue * masterAudioOutput.makeupGain,
                audioCtx.currentTime + 0.2,
                0.1
            );
            volume = Math.max(val, 1);
            let muteButton = document.querySelector('.buttonMute');
            if (!muteButton) muteButton = document.querySelector('.muteButton');
            if (muteButton) {
                const muteButtonIcon = muteButton?.querySelector('.material-icons');
                muteButtonIcon?.classList.remove('volume_off', 'volume_up');
                muteButtonIcon?.classList.add('volume_up');
            }

            const volumeSlider = document.querySelector('.nowPlayingVolumeSlider');
            if (volumeSlider && !volumeSlider.dragging) {
                volumeSlider.level = volume;
            }
            masterAudioOutput.muted = false;
        } else if (mediaElement) {
            mediaElement.volume = Math.pow(val / 100, 3);
        }
    }

    getVolume() {
        const audioCtx = window.myAudioContext;

        if (masterAudioOutput.mixerNode && audioCtx) {
            return Math.min(Math.round(volume), 100);
        }

        const mediaElement = this._mediaElement;
        if (mediaElement) {
            return Math.min(Math.round(Math.pow(mediaElement.volume, 1 / 3) * 100), 100);
        }
    }

    volumeUp() {
        const audioCtx = window.myAudioContext;

        if (masterAudioOutput.mixerNode && audioCtx) {
            masterAudioOutput.mixerNode.gain.exponentialRampToValueAtTime(
                this.getVolume() + 0.05,
                audioCtx.currentTime + 0.3
            );
            return;
        }
        this.setVolume(Math.min(this.getVolume() + 2, 100));
    }

    volumeDown() {
        const audioCtx = window.myAudioContext;

        if (masterAudioOutput.mixerNode && window.myAudioContext) {
            masterAudioOutput.mixerNode.gain.exponentialRampToValueAtTime(
                this.getVolume() - 0.05,
                audioCtx.currentTime + 0.3
            );
            return;
        }
        this.setVolume(Math.max(this.getVolume() - 2, 0));
    }

    setMute(mute) {
        const audioCtx = window.myAudioContext;
        if (masterAudioOutput.mixerNode && audioCtx) {
            masterAudioOutput.mixerNode.gain.cancelScheduledValues(audioCtx.currentTime);
            if (mute) {
                masterAudioOutput.mixerNode.gain.linearRampToValueAtTime(
                    (volume / 100) * masterAudioOutput.makeupGain,
                    audioCtx.currentTime
                );
                masterAudioOutput.mixerNode.gain.exponentialRampToValueAtTime(
                    0.01,
                    audioCtx.currentTime + 1.5
                );
            } else {
                masterAudioOutput.mixerNode.gain.linearRampToValueAtTime(
                    0.01,
                    audioCtx.currentTime
                );
                masterAudioOutput.mixerNode.gain.exponentialRampToValueAtTime(
                    (volume / 100) * masterAudioOutput.makeupGain,
                    audioCtx.currentTime + 1.5
                );
            }
            let muteButton = document.querySelector('.buttonMute');
            if (!muteButton) muteButton = document.querySelector('.muteButton');
            if (!muteButton) return;
            const muteButtonIcon = muteButton?.querySelector('.material-icons');
            muteButtonIcon?.classList.remove('volume_off', 'volume_up');
            muteButtonIcon?.classList.add(mute ? 'volume_off' : 'volume_up');
            masterAudioOutput.muted = mute;
            return;
        }
        const mediaElement = this._mediaElement;
        if (mediaElement) {
            mediaElement.muted = mute;
        }
    }

    isMuted() {
        const audioCtx = window.myAudioContext;

        if (masterAudioOutput.mixerNode && audioCtx) {
            return masterAudioOutput.muted;
        }
        const mediaElement = this._mediaElement;
        if (mediaElement) {
            return mediaElement.muted;
        }
        return false;
    }

    isAirPlayEnabled() {
        if (document.AirPlayEnabled) {
            return !!document.AirplayElement;
        }
        return false;
    }

    setAirPlayEnabled(isEnabled) {
        const mediaElement = this._mediaElement;

        if (mediaElement) {
            if (document.AirPlayEnabled) {
                if (isEnabled) {
                    mediaElement.requestAirPlay().catch(function (err) {
                        console.error('Error requesting AirPlay', err);
                    });
                } else {
                    document.exitAirPLay().catch(function (err) {
                        console.error('Error exiting AirPlay', err);
                    });
                }
            } else {
                mediaElement.webkitShowPlaybackTargetPicker();
            }
        }
    }

    supports(feature) {
        if (!supportedFeatures) {
            supportedFeatures = getSupportedFeatures();
        }

        return supportedFeatures.indexOf(feature) !== -1;
    }
}

let supportedFeatures;

function getSupportedFeatures() {
    const list = [];
    const audio = document.createElement('audio');

    if (typeof audio.playbackRate === 'number') {
        list.push('PlaybackRate');
    }

    if (browser.safari) {
        list.push('AirPlay');
    }

    return list;
}

export default HtmlAudioPlayer;
