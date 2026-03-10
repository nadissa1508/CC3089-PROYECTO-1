export async function createIndexes(db) {

  // ── SIMPLE ──────────────────────────────────────────────────────────────
  // Justification: login queries filter by email; unique enforces integrity
  await db.collection('users').createIndex(
    { email: 1 },
    { unique: true, name: 'idx_users_email_simple' }
  );

  // ── COMPOUND — orders ───────────────────────────────────────────────────
  // SHARD KEY INDEX (REQUIRED for sharding)
  // Compound shard key: { restaurantId: 1, createdAt: 1 }
  // - Enables horizontal scaling across multiple shards
  // - restaurantId distributes data by restaurant
  // - createdAt preserves chronological order for range queries
  // - Must exist BEFORE running sh.shardCollection()
  await db.collection('orders').createIndex(
    { restaurantId: 1, createdAt: 1 },
    { name: 'idx_orders_shard_key' }
  );

  // ESR pattern: Equality(restaurantId) → Equality(status) → Sort(createdAt)
  await db.collection('orders').createIndex(
    { restaurantId: 1, status: 1, createdAt: -1 },
    { name: 'idx_orders_restaurant_status_date' }
  );

  // Compound for user order history
  await db.collection('orders').createIndex(
    { userId: 1, createdAt: -1 },
    { name: 'idx_orders_user_date' }
  );

  // ── COMPOUND — reviews ───────────────────────────────────────────────────
  await db.collection('reviews').createIndex(
    { restaurantId: 1, rating: -1, createdAt: -1 },
    { name: 'idx_reviews_restaurant_rating_date' }
  );

  // ── GEOSPATIAL ───────────────────────────────────────────────────────────
  // Required (not optional) — $near throws error without 2dsphere
  await db.collection('restaurants').createIndex(
    { 'address.location': '2dsphere' },
    { name: 'idx_restaurants_location_2dsphere' }
  );

  await db.collection('users').createIndex(
    { 'address.location': '2dsphere' },
    { name: 'idx_users_location_2dsphere' }
  );

  // ── TEXT ──────────────────────────────────────────────────────────────────
  // Required — $text throws error without text index
  await db.collection('menu_items').createIndex(
    { name: 'text', description: 'text' },
    { name: 'idx_menuitems_text' }
  );

  // ── MULTIKEY ─────────────────────────────────────────────────────────────
  // MongoDB auto-detects multikey when field is array
  await db.collection('restaurants').createIndex(
    { tags: 1 },
    { name: 'idx_restaurants_tags_multikey' }
  );

  console.log('All indexes created.');
}
