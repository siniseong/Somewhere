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
  colorId: string;
  note: string;
  photo?: string;
  music?: Music;
  createdAt: number;
};
