const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_KEY

function ensureGoogleKey() {
  if (!API_KEY) throw new Error('缺少 VITE_GOOGLE_PLACES_KEY')
}

function extractCity(components = []) {
  const find = (...types) => components.find(c => types.some(t => c.types?.includes(t)))?.longText
  return find('locality') || find('administrative_area_level_2') || find('administrative_area_level_1') || ''
}

export async function searchPlaces(query, options = {}) {
  ensureGoogleKey()
  const locationBias = options.location && Number.isFinite(Number(options.location.lat)) && Number.isFinite(Number(options.location.lng))
    ? {
        circle: {
          center: {
            latitude: Number(options.location.lat),
            longitude: Number(options.location.lng),
          },
          radius: Number(options.radius) || 10000,
        },
      }
    : undefined

  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
    },
    body: JSON.stringify({
      input: query,
      languageCode: 'zh-CN',
      ...(locationBias ? { locationBias } : {}),
    }),
  })
  if (!res.ok) throw new Error(`${res.status}`)
  const data = await res.json()
  return (data.suggestions || []).map(s => {
    const pred = s.placePrediction || {}
    return {
      provider: 'google',
      poiId: pred.placeId,
      placeId: pred.placeId,
      name: pred.structuredFormat?.mainText?.text || pred.text?.text || '',
      address: pred.structuredFormat?.secondaryText?.text || '',
      city: '',
      adcode: '',
      lat: null,
      lng: null,
      coordType: 'WGS-84',
      raw: s,
    }
  })
}

export async function getPlaceDetail(id) {
  ensureGoogleKey()
  const mask = 'displayName,formattedAddress,location,addressComponents'
  const res = await fetch(`https://places.googleapis.com/v1/places/${id}`, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': mask,
    },
  })
  if (!res.ok) throw new Error(`${res.status}`)
  const place = await res.json()
  return {
    provider: 'google',
    poiId: id,
    placeId: id,
    name: place.displayName?.text || '',
    address: place.formattedAddress || '',
    city: extractCity(place.addressComponents),
    adcode: '',
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    coordType: 'WGS-84',
    raw: place,
  }
}

export async function getCurrentLocation() {
  if (!navigator.geolocation) throw new Error('当前浏览器不支持定位')
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords
        resolve({ provider: 'google', lat, lng, accuracy, coordType: 'WGS-84', raw: pos })
      },
      () => reject(new Error('定位失败')),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 5 * 60 * 1000 }
    )
  })
}

export function openNavigation(place) {
  const lat = place?.lat
  const lng = place?.lng
  const query = encodeURIComponent(place?.name || `${lat},${lng}`)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${place.placeId || ''}`, '_blank', 'noopener,noreferrer')
  return true
}
