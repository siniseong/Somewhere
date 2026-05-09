type KakaoAddressDocument = {
  address?: { address_name?: string; region_3depth_name?: string };
  road_address?: { address_name?: string; building_name?: string };
};

export type ReverseGeocodeResult = {
  placeName?: string;
  address?: string;
};

/**
 * Reverse-geocode a coordinate via Kakao's coord2address API.
 * Returns undefined fields when the network or key is unavailable so callers
 * can still proceed with raw coordinates.
 */
export async function reverseGeocode(
  lng: number,
  lat: number,
  signal?: AbortSignal,
): Promise<ReverseGeocodeResult> {
  const key = process.env.NEXT_PUBLIC_KAKAO_REST_KEY;
  if (!key) return {};
  const url = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      signal,
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { documents?: KakaoAddressDocument[] };
    const doc = data.documents?.[0];
    if (!doc) return {};
    const placeName =
      doc.road_address?.building_name ||
      doc.road_address?.address_name ||
      doc.address?.region_3depth_name ||
      undefined;
    const address =
      doc.road_address?.address_name ||
      doc.address?.address_name ||
      undefined;
    return { placeName, address };
  } catch {
    return {};
  }
}
