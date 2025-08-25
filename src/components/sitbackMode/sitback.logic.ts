import layoutManager from '../layoutManager';
import inputManager from '../../scripts/inputManager';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { getImageUrl } from 'apps/stable/features/playback/utils/image';
import { ServerConnections } from 'lib/jellyfin-apiclient';

const sitbackSettings = {
    songInfoDisplayDurationInSeconds: 5
};

let activePlaylistItem: HTMLElement | null;

declare let window: Window & { Emby: IEmby };

interface IEmby {
    Page: { currentRouteInfo: { path: string } };
}

function isNowPlaying() {
    return (window.location.hash === '#/queue');
}

function findActivePlaylistItem() {
    const activePlaylistItems = document.getElementsByClassName('playlistIndexIndicatorImage');
    if (activePlaylistItems) activePlaylistItem = activePlaylistItems[0] as HTMLElement;
}

export function scrollPageToTop() {
    requestAnimationFrame(() => {
        document.body.scrollIntoView({
            block: 'start',
            inline: 'nearest',
            behavior: 'smooth'
        });
    });
}

const smoothScrollSettings = {
    block: 'center',
    inline: 'nearest',
    behavior: 'smooth'
} as ScrollIntoViewOptions;

let scrollTimeout: NodeJS.Timeout;
let scrollTimeout2: NodeJS.Timeout;

export function scrollToActivePlaylistItem() {
    clearTimeout(scrollTimeout);
    clearTimeout(scrollTimeout2);
    if (!isNowPlaying() || window.innerWidth < 400) return;
    scrollTimeout = setTimeout(()=>{
        findActivePlaylistItem();

        if (activePlaylistItem) {
            activePlaylistItem.scrollIntoView(smoothScrollSettings);

            scrollTimeout2 = setTimeout(()=>{
                document.body.scrollIntoView(smoothScrollSettings);
            }, 1200);
        }
    }, 300);
}

function startTransition() {
    const classList = document.body.classList;
    classList.add('transition');
    classList.remove('songEnd');
}

function endTransition() {
    const classList = document.body.classList;
    classList.remove('transition');
}

export function endSong() {
    if (!isNowPlaying()) return;

    endTransition();
    const classList = document.body.classList;
    classList.add('songEnd');
}

export function triggerSongInfoDisplay() {
    if (!isNowPlaying()) return;

    startTransition();

    setTimeout(()=>{
        endTransition();
    }, (sitbackSettings.songInfoDisplayDurationInSeconds * 1000));
}

export function prefetchNextItemImages(playQueueManager: any) {
    const playlist = playQueueManager.getPlaylist();
    const currentIndex = playQueueManager.getCurrentPlaylistIndex();

    for (let i = 1; i <= 2; i++) {
        const item = playlist[currentIndex + i];
        if (!item) {
            break;
        }

        const apiClient = ServerConnections.getApiClient(item.ServerId);

        const primaryUrl = getImageUrl(item, { height: 50 });
        if (primaryUrl && typeof Image !== 'undefined') {
            const img = new Image();
            img.src = primaryUrl;
        }

        if (item.AlbumId) {
            const discOptions: any = { type: ImageType.Disc };
            if (typeof window !== 'undefined') {
                discOptions.maxWidth = window.innerHeight * 0.8;
            }
            const discUrl = apiClient.getScaledImageUrl(item.AlbumId, discOptions);
            if (discUrl && typeof Image !== 'undefined') {
                const img = new Image();
                img.src = discUrl;
            }
        }

        let logoUrl;
        if (item.ImageTags?.[ImageType.Logo]) {
            logoUrl = apiClient.getScaledImageUrl(item.Id, {
                type: ImageType.Logo,
                tag: item.ImageTags[ImageType.Logo]
            });
        } else if (item.ParentLogoImageTag) {
            logoUrl = apiClient.getScaledImageUrl(item.ParentLogoItemId, {
                type: ImageType.Logo,
                tag: item.ParentLogoImageTag
            });
        }

        if (logoUrl && typeof Image !== 'undefined') {
            const img = new Image();
            img.src = logoUrl;
        }
    }
}

// Enable mouse idle tracking on mobile to ease Butterchurn blur
if (layoutManager.mobile) {
    const idleDelay = 5000;
    let lastInput = Date.now();
    let isIdle = false;

    function showCursor() {
        if (isIdle) {
            isIdle = false;
            const classList = document.body.classList;
            classList.remove('mouseIdle');
            classList.remove('mouseIdle-tv');
        }
    }

    function hideCursor() {
        if (!isIdle) {
            isIdle = true;
            const classList = document.body.classList;
            classList.add('mouseIdle');
            if (layoutManager.tv) {
                classList.add('mouseIdle-tv');
            }
            scrollToActivePlaylistItem();
        }
    }

    function pointerActivity() {
        lastInput = Date.now();
        inputManager.notifyMouseMove();
        showCursor();
    }

    document.addEventListener(window.PointerEvent ? 'pointermove' : 'mousemove', pointerActivity, { passive: true });
    document.addEventListener(window.PointerEvent ? 'pointerdown' : 'mousedown', pointerActivity, { passive: true });

    setInterval(() => {
        if (!isIdle && Date.now() - lastInput >= idleDelay) {
            hideCursor();
        }
    }, idleDelay);
}
