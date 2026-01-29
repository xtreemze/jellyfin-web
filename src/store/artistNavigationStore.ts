/**
 * Artist Navigation Store
 *
 * Manages artist navigation context for now-playing experience.
 * Stores current artist information for "Go to Artist" navigation.
 */

import { create } from 'zustand';

export interface ArtistNav {
    id: string;
    name: string;
    serverId: string;
    imageUrl?: string;
}

interface ArtistNavigationState {
    currentArtist: ArtistNav | null;
    currentAlbumArtist: ArtistNav | null;
    setCurrentArtist: (artist: ArtistNav | null) => void;
    setCurrentAlbumArtist: (artist: ArtistNav | null) => void;
}

export const useArtistNavigationStore = create<ArtistNavigationState>((set) => ({
    currentArtist: null,
    currentAlbumArtist: null,
    setCurrentArtist: (artist) => set({ currentArtist: artist }),
    setCurrentAlbumArtist: (artist) => set({ currentAlbumArtist: artist })
}));

/**
 * Update artist navigation context from track info
 */
export function updateArtistNavigation(trackInfo: {
    artistId?: string;
    artistName?: string;
    artistServerId?: string;
    albumArtistId?: string;
    albumArtistName?: string;
    albumArtistServerId?: string;
}): void {
    const store = useArtistNavigationStore.getState();

    if (trackInfo.artistId && trackInfo.artistName && trackInfo.artistServerId) {
        store.setCurrentArtist({
            id: trackInfo.artistId,
            name: trackInfo.artistName,
            serverId: trackInfo.artistServerId
        });
    } else {
        store.setCurrentArtist(null);
    }

    if (trackInfo.albumArtistId && trackInfo.albumArtistName && trackInfo.albumArtistServerId) {
        store.setCurrentAlbumArtist({
            id: trackInfo.albumArtistId,
            name: trackInfo.albumArtistName,
            serverId: trackInfo.albumArtistServerId
        });
    } else {
        store.setCurrentAlbumArtist(null);
    }
}
