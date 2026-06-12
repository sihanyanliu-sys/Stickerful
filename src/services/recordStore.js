import { supabase } from './supabaseClient'

const LEGACY_RECORDS_KEY = 'stickerful_records'
const BUCKET = 'record-images'

function userRecordsKey(userId) {
  return `stickerful_records_${userId}`
}

function migrationKey(userId) {
  return `stickerful_cloud_migrated_${userId}`
}

function isDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:')
}

function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta.match(/data:(.*?);base64/)?.[1] || 'image/jpeg'
  const bytes = atob(base64)
  const buffer = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i += 1) buffer[i] = bytes.charCodeAt(i)
  return { blob: new Blob([buffer], { type: mime }), mime }
}

function extensionForMime(mime) {
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('png')) return 'png'
  return 'jpg'
}

function loadJson(key) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export function loadLocalRecords(userId) {
  const scoped = userId ? loadJson(userRecordsKey(userId)) : []
  if (scoped.length > 0) return scoped
  return loadJson(LEGACY_RECORDS_KEY)
}

export function saveLocalRecords(userId, records) {
  try {
    if (userId) localStorage.setItem(userRecordsKey(userId), JSON.stringify(records))
    return true
  } catch (error) {
    if (import.meta.env.DEV) console.warn('Failed to cache records locally:', error)
    return false
  }
}

async function createSignedUrl(path) {
  if (!path) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24)
  if (error) {
    if (import.meta.env.DEV) console.warn('Failed to sign image URL:', error)
    return null
  }
  return data.signedUrl
}

async function uploadImage(userId, recordId, kind, value, existingPath) {
  if (!isDataUrl(value)) return existingPath || null

  const { blob, mime } = dataUrlToBlob(value)
  const ext = extensionForMime(mime)
  const path = `${userId}/${recordId}/${kind}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: mime,
    upsert: true,
  })
  if (error) throw error
  return path
}

function recordToRow(userId, record, imagePaths) {
  return {
    user_id: userId,
    id: String(record.id),
    shop_id: record.shopId || null,
    shop_name: record.shopName || '未知店铺',
    city: record.city || null,
    visit_date: record.date || null,
    rating: Number(record.rating || 0),
    note: record.note || null,
    emoji: record.emoji || null,
    photo_path: imagePaths.photoPath || null,
    cutout_path: imagePaths.cutoutPath || null,
    cutout_provider: record.cutoutProvider || null,
    provider: record.provider || null,
    poi_id: record.poiId || null,
    place_id: record.placeId || null,
    adcode: record.adcode || null,
    coord_type: record.coordType || null,
    lat: record.lat ?? null,
    lng: record.lng ?? null,
    dish_name: record.dishName || null,
    calories: Number(record.calories || 0),
    carbs: Number(record.carbs || 0),
    protein: Number(record.protein || 0),
    fat: Number(record.fat || 0),
  }
}

async function rowToRecord(row) {
  const [photo, cutout] = await Promise.all([
    createSignedUrl(row.photo_path),
    createSignedUrl(row.cutout_path),
  ])

  return {
    id: row.id,
    shopId: row.shop_id || 'custom',
    shopName: row.shop_name,
    city: row.city || '未知城市',
    date: row.visit_date || '',
    rating: row.rating || 0,
    note: row.note || '',
    emoji: row.emoji || 'coffee-cup',
    photo: photo || null,
    cutout: cutout || null,
    photoPath: row.photo_path || null,
    cutoutPath: row.cutout_path || null,
    cutoutProvider: row.cutout_provider || null,
    provider: row.provider || null,
    poiId: row.poi_id || null,
    placeId: row.place_id || null,
    adcode: row.adcode || '',
    coordType: row.coord_type || null,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    dishName: row.dish_name || null,
    calories: Number(row.calories || 0),
    carbs: Number(row.carbs || 0),
    protein: Number(row.protein || 0),
    fat: Number(row.fat || 0),
  }
}

export async function fetchRemoteRecords(userId) {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('user_id', userId)
    .order('visit_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return Promise.all((data || []).map(rowToRecord))
}

export async function saveRemoteRecord(userId, record) {
  const recordId = String(record.id)
  const photoPath = await uploadImage(userId, recordId, 'photo', record.photo, record.photoPath)
  const cutoutPath = await uploadImage(userId, recordId, 'cutout', record.cutout, record.cutoutPath)

  const row = recordToRow(userId, record, { photoPath, cutoutPath })
  const { data, error } = await supabase
    .from('records')
    .upsert(row, { onConflict: 'user_id,id' })
    .select('*')
    .single()

  if (error) throw error
  return rowToRecord(data)
}

export async function deleteRemoteRecord(userId, recordId) {
  const prefix = `${userId}/${recordId}`
  const { data: files } = await supabase.storage.from(BUCKET).list(prefix)
  if (files?.length) {
    await supabase.storage.from(BUCKET).remove(files.map(file => `${prefix}/${file.name}`))
  }

  const { error } = await supabase
    .from('records')
    .delete()
    .eq('user_id', userId)
    .eq('id', String(recordId))
  if (error) throw error
}

export async function migrateLocalRecordsOnce(userId, remoteRecords) {
  if (localStorage.getItem(migrationKey(userId)) === 'done') return remoteRecords

  const localRecords = loadJson(LEGACY_RECORDS_KEY)
  if (localRecords.length === 0) {
    localStorage.setItem(migrationKey(userId), 'done')
    return remoteRecords
  }

  const remoteIds = new Set(remoteRecords.map(record => String(record.id)))
  const migrated = []
  for (const record of localRecords) {
    if (remoteIds.has(String(record.id))) continue
    migrated.push(await saveRemoteRecord(userId, record))
  }

  localStorage.setItem(migrationKey(userId), 'done')
  return [...migrated, ...remoteRecords]
}
