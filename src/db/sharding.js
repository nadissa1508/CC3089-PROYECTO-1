/**
 * MongoDB Sharding Configuration
 * 
 * This file contains the sharding setup for the restaurant_platform database.
 * Run these commands in MongoDB Shell (mongosh) after connecting to your cluster.
 */

// ═══════════════════════════════════════════════════════════════════════════
// SHARDING STRATEGY: orders collection
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Shard Key Choice: { restaurantId: 1, createdAt: 1 }
 * 
 * RATIONALE:
 * - restaurantId provides good data distribution across shards
 * - createdAt enables range-based queries (common for order history)
 * - Compound key supports queries filtering by restaurant and date range
 * - Avoids hotspots better than just restaurantId or just createdAt
 * 
 * WHY NOT HASHED?
 * - Hashed keys scatter data randomly, breaking range query efficiency
 * - Order queries often need date ranges: "all orders in March 2026"
 * - Restaurant analytics need temporal patterns preserved
 * - Compound key balances distribution + query performance
 * 
 * QUERY PATTERNS SUPPORTED:
 * ✓ { restaurantId: X } — Prefix of shard key
 * ✓ { restaurantId: X, createdAt: { $gte: date } } — Full shard key
 * ✓ { restaurantId: X, status: Y, createdAt: -1 } — Uses compound index
 * ✗ { createdAt: date } alone — Broadcast to all shards (less efficient)
 */

export const SHARDING_CONFIG = {
  database: 'restaurant_platform',
  collection: 'orders',
  shardKey: {
    restaurantId: 1,
    createdAt: 1
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// MONGO SHELL COMMANDS (Run these manually in mongosh)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * STEP 1: Enable sharding on the database
 * 
 * sh.enableSharding("restaurant_platform")
 */

/**
 * STEP 2: Create the shard key index (if not exists)
 * This index is REQUIRED before sharding the collection.
 * 
 * use restaurant_platform
 * db.orders.createIndex({ restaurantId: 1, createdAt: 1 })
 */

/**
 * STEP 3: Shard the collection with compound key
 * 
 * sh.shardCollection(
 *   "restaurant_platform.orders",
 *   { restaurantId: 1, createdAt: 1 }
 * )
 */

/**
 * STEP 4: Verify sharding status
 * 
 * sh.status()
 * db.orders.getShardDistribution()
 */

// ═══════════════════════════════════════════════════════════════════════════
// PROGRAMMATIC SHARDING SETUP (Optional)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * This function can be called to set up sharding programmatically.
 * NOTE: Requires admin connection to MongoDB cluster.
 * Atlas Free Tier (M0) does NOT support sharding; requires M10+.
 */
export async function setupSharding(adminDb) {
  try {
    console.log('Setting up sharding for orders collection...');

    // 1. Enable sharding on database
    await adminDb.command({ enableSharding: SHARDING_CONFIG.database });
    console.log(`✓ Sharding enabled on database: ${SHARDING_CONFIG.database}`);

    // 2. Get database reference
    const db = adminDb.getSiblingDB(SHARDING_CONFIG.database);

    // 3. Create shard key index
    await db.collection(SHARDING_CONFIG.collection).createIndex(SHARDING_CONFIG.shardKey);
    console.log(`✓ Shard key index created: ${JSON.stringify(SHARDING_CONFIG.shardKey)}`);

    // 4. Shard the collection
    await adminDb.command({
      shardCollection: `${SHARDING_CONFIG.database}.${SHARDING_CONFIG.collection}`,
      key: SHARDING_CONFIG.shardKey
    });
    console.log(`✓ Collection sharded successfully`);

    return true;
  } catch (error) {
    console.error('Sharding setup failed:', error.message);
    
    if (error.codeName === 'IllegalOperation') {
      console.error('\n⚠ MongoDB Atlas M0 (free tier) does NOT support sharding.');
      console.error('   Sharding requires M10+ cluster.');
      console.error('   For testing purposes, the compound index still improves query performance.\n');
    }
    
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PERFORMANCE CONSIDERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CHUNK DISTRIBUTION:
 * - MongoDB splits data into chunks based on shard key ranges
 * - Initial chunk: { restaurantId: MinKey, createdAt: MinKey } → { restaurantId: MaxKey, createdAt: MaxKey }
 * - Auto-splits when chunks exceed 64MB (default)
 * 
 * BALANCER:
 * - Automatically moves chunks between shards for even distribution
 * - Enable with: sh.startBalancer()
 * - Check status: sh.getBalancerState()
 * 
 * ZONE SHARDING (Optional):
 * - Assign specific restaurant ranges to specific shards
 * - Useful for geographic distribution or compliance
 * 
 * Example:
 * sh.addShardTag("shard0000", "US-West")
 * sh.addTagRange(
 *   "restaurant_platform.orders",
 *   { restaurantId: ObjectId("..."), createdAt: MinKey },
 *   { restaurantId: ObjectId("..."), createdAt: MaxKey },
 *   "US-West"
 * )
 */

/**
 * MONITORING QUERIES:
 * 
 * // Check shard distribution
 * db.orders.getShardDistribution()
 * 
 * // View chunk ranges
 * use config
 * db.chunks.find({ ns: "restaurant_platform.orders" }).pretty()
 * 
 * // Check if query uses shard key (targeted vs broadcast)
 * db.orders.find({ restaurantId: ObjectId("...") }).explain("executionStats")
 */
