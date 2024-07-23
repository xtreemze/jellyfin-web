const sitbackSettings = {
    songInfoDisplayDurationInSeconds: 5
};

let activePlaylistItem: HTMLElement | null;

declare let window: Window & {Emby: IEmby, crossFade: ()=> void};

interface IEmby {
    Page: {currentRouteInfo: { path: string }};
}

function isNowPlaying() {
    return (window?.Emby?.Page?.currentRouteInfo.path === '/queue');
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

let scrollTimeout: number | NodeJS.Timeout | undefined;
let scrollTimeout2: number | NodeJS.Timeout | undefined;

export function scrollToActivePlaylistItem() {
    clearTimeout(scrollTimeout);
    clearTimeout(scrollTimeout2);
    if (!isNowPlaying()) return;
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

    scrollToActivePlaylistItem();

    classList.add('transition');
}

function endTransition() {
    const classList = document.body.classList;
    classList.remove('transition');
}

export function triggerSongInfoDisplay() {
    if (isNowPlaying()) {
        startTransition();
        scrollToActivePlaylistItem();

        setTimeout(()=>{
            endTransition();
        }, (sitbackSettings.songInfoDisplayDurationInSeconds * 1000));
    }
}
