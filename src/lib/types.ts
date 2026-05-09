export type Music = {
  artist: string;
  title: string;
};

export type Memory = {
  id: string;
  lat: number;
  lng: number;
  placeName?: string;
  /** Detail line under the place name — usually a road address */
  address?: string;
  color: string;
  note: string;
  /** ID into the photos store (IndexedDB). Photo blobs live separately to keep the memory record small. */
  photoId?: string;
  /** Public URL of the photo when stored remotely (e.g. Supabase Storage). */
  photoUrl?: string;
  /** Tiny inline base64 preview for instant rendering on the map marker. */
  photoThumb?: string;
  music?: Music;
  createdAt: number;
};

export type PhotoRecord = {
  id: string;
  blob: Blob;
  mime: string;
  createdAt: number;
};
