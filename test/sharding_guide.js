import { SHARDING_CONFIG } from '../src/db/sharding.js';

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║         MongoDB Sharding Configuration Guide        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📋 Shard Key Configuration:');
console.log(`   Database: ${SHARDING_CONFIG.database}`);
console.log(`   Collection: ${SHARDING_CONFIG.collection}`);
console.log(`   Shard Key: ${JSON.stringify(SHARDING_CONFIG.shardKey)}\n`);

console.log('⚠️  PREREQUISITES:');
console.log('   • MongoDB Atlas M10+ cluster (M0 free tier does NOT support sharding)');
console.log('   • OR MongoDB Replica Set with sharding enabled\n');

console.log('📝 MANUAL SETUP STEPS:\n');
console.log('1️⃣  Connect to your MongoDB cluster:');
console.log('   mongosh "YOUR_MONGODB_URI"\n');

console.log('2️⃣  Enable sharding on the database:');
console.log(`   sh.enableSharding("${SHARDING_CONFIG.database}")\n`);

console.log('3️⃣  Shard the orders collection:');
console.log(`   sh.shardCollection(`);
console.log(`     "${SHARDING_CONFIG.database}.${SHARDING_CONFIG.collection}",`);
console.log(`     ${JSON.stringify(SHARDING_CONFIG.shardKey)}`);
console.log(`   )\n`);

console.log('4️⃣  Verify sharding status:');
console.log('   sh.status()');
console.log(`   db.${SHARDING_CONFIG.collection}.getShardDistribution()\n`);

console.log('💡 WHY THIS SHARD KEY?\n');
console.log('   • restaurantId: Distributes orders across shards by restaurant');
console.log('   • createdAt: Preserves chronological order for range queries');
console.log('   • Compound key: Balances distribution + query efficiency');
console.log('   • Avoids hotspots from time-based or single-field keys\n');

console.log('📊 QUERY OPTIMIZATION:\n');
console.log('   ✅ EFFICIENT (uses shard key):');
console.log('      db.orders.find({ restaurantId: ObjectId("...") })');
console.log('      db.orders.find({ restaurantId: ObjectId("..."), createdAt: { $gte: date } })\n');
console.log('   ⚠️  BROADCAST (all shards):');
console.log('      db.orders.find({ createdAt: { $gte: date } })  // Missing restaurantId');
console.log('      db.orders.find({ userId: ObjectId("...") })    // Not in shard key\n');

console.log('📚 For detailed documentation, see:');
console.log('   • src/db/sharding.js (configuration file)');
console.log('   • README.md (Sharding Strategy section)\n');

console.log('🚀 The shard key INDEX is automatically created when you run:');
console.log('   npm start  (or npm run dev)\n');

console.log('✨ For local/M0 development:');
console.log('   The compound index provides query optimization even without sharding enabled.\n');
