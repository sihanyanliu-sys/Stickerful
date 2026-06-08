export const mockStamps = [
  { id: '1', shopId: '1', shopName: 'Blue Bottle Coffee', city: 'San Francisco', date: '2026-05-10', rating: 5, note: '燕麦拿铁很香', emoji: '☕' },
  { id: '2', shopId: '2', shopName: 'Stumptown Coffee', city: 'Portland', date: '2026-05-08', rating: 4, note: '环境很好', emoji: '🧋' },
  { id: '3', shopId: '3', shopName: 'Intelligentsia', city: 'Chicago', date: '2026-05-01', rating: 5, note: '滤杯冲得很稳', emoji: '☕' },
  { id: '4', shopId: '4', shopName: 'Verve Coffee', city: 'Santa Cruz', date: '2026-04-22', rating: 4, note: '氛围好', emoji: '🍵' },
  { id: '5', shopId: '5', shopName: 'Onyx Coffee Lab', city: 'Bentonville', date: '2026-04-15', rating: 5, note: '必喝推荐', emoji: '☕' },
];

export const mockShops = [
  { id: '1', name: 'Blue Bottle Coffee', city: 'San Francisco', address: '66 Mint St', tags: ['精品', '连锁'], lat: 37.7829, lng: -122.4094, visited: true },
  { id: '2', name: 'Stumptown Coffee', city: 'Portland', address: '128 SW 3rd Ave', tags: ['精品', '烘焙'], lat: 45.5231, lng: -122.6765, visited: true },
  { id: '3', name: 'Sightglass Coffee', city: 'San Francisco', address: '270 7th St', tags: ['独立', '空间大'], lat: 37.7749, lng: -122.4086, visited: false },
  { id: '4', name: 'Ritual Coffee', city: 'San Francisco', address: '1026 Valencia St', tags: ['精品'], lat: 37.7566, lng: -122.4208, visited: false },
  { id: '5', name: 'Four Barrel Coffee', city: 'San Francisco', address: '375 Valencia St', tags: ['独立'], lat: 37.7636, lng: -122.4214, visited: false },
];

export const mockCities = [
  { id: 'sf', name: 'San Francisco', country: 'USA', count: 8, emoji: '🌉' },
  { id: 'portland', name: 'Portland', country: 'USA', count: 3, emoji: '🌲' },
  { id: 'chicago', name: 'Chicago', country: 'USA', count: 2, emoji: '🏙️' },
  { id: 'nyc', name: 'New York', country: 'USA', count: 5, emoji: '🗽' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', count: 4, emoji: '🗼' },
];

export const mockUser = {
  name: 'Hana',
  avatar: null,
  totalStamps: 22,
  totalCities: 5,
  totalShops: 18,
  joinDate: '2025-01-01',
};

export const mockWeekRecords = {
  '2026-05-06': [{ id: '1', emoji: '☕', shopName: 'Blue Bottle' }],
  '2026-05-08': [{ id: '2', emoji: '🧋', shopName: 'Stumptown' }],
  '2026-05-10': [{ id: '3', emoji: '☕', shopName: 'Blue Bottle' }],
};
