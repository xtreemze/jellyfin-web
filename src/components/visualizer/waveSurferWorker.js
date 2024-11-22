let initialDistance = null;
const MIN_DELTA = 10; // Define a threshold for minimal significant distance change

function getDistance(touches) {
    const [touch1, touch2] = touches;
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

onmessage = function (event) {
    const { type, touches, minPxPerSec, waveSurferChannelStyle } = event.data;

    if (type === 'touchStart') {
        initialDistance = getDistance(touches);
    }

    if (type === 'touchMove' && initialDistance !== null) {
        const currentDistance = getDistance(touches);
        const delta = Math.abs(currentDistance - initialDistance);

        if (delta < MIN_DELTA) return;

        const zoomFactor = currentDistance / initialDistance;
        postMessage({ type: 'zoom', zoomFactor, newZoom: zoomFactor });
        initialDistance = currentDistance;
    }

    if (type === 'touchEnd') {
        initialDistance = null;
    }

    if (type === 'initializeStyle') {
        let styleOptions;
        if (minPxPerSec < 130 && minPxPerSec > 70) {
            styleOptions = waveSurferChannelStyle.showSingleChannel;
        } else if (minPxPerSec > 130 && minPxPerSec > 70) {
            styleOptions = waveSurferChannelStyle.showDoubleChannels;
        } else {
            styleOptions = waveSurferChannelStyle.showWholeSong;
        }
        postMessage({ type: 'initializeStyle', styleOptions });
    }
};
