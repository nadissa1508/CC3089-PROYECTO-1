import { ObjectId } from 'mongodb';
import { connectDB } from '../src/db/connection.js';

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function printHeader(text) {
  console.log(`\n${colors.bright}${colors.cyan}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${text}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'═'.repeat(70)}${colors.reset}\n`);
}

function printSection(text) {
  console.log(`\n${colors.bright}${colors.blue}${text}${colors.reset}`);
  console.log(`${colors.blue}${'─'.repeat(70)}${colors.reset}`);
}

// Test 1: Simple Index on users.email
async function testSimpleIndex(db) {
  printSection('TEST 1: Simple Index — users.email');
  
  const indexName = 'idx_users_email_simple';
  const query = { email: 'test@example.com' };
  
  // Drop index if exists
  try {
    await db.collection('users').dropIndex(indexName);
    console.log('✓ Dropped existing index');
  } catch (e) {
    console.log('  (No existing index to drop)');
  }
  
  // BEFORE: Run explain without index
  console.log('\n📊 BEFORE (without index):');
  const beforeExplain = await db.collection('users')
    .find(query)
    .explain('executionStats');
  
  const beforeStage = beforeExplain.executionStats.executionStages.stage;
  const beforeDocs = beforeExplain.executionStats.totalDocsExamined;
  const beforeTime = beforeExplain.executionStats.executionTimeMillis;
  
  console.log(`  Stage: ${colors.red}${beforeStage}${colors.reset}`);
  console.log(`  Docs Examined: ${colors.yellow}${beforeDocs}${colors.reset}`);
  console.log(`  Execution Time: ${beforeTime}ms`);
  
  // Create index
  await db.collection('users').createIndex({ email: 1 }, { unique: true, name: indexName });
  console.log(`\n✓ Created index: ${indexName}`);
  
  // AFTER: Run explain with index
  console.log('\n📊 AFTER (with index):');
  const afterExplain = await db.collection('users')
    .find(query)
    .explain('executionStats');
  
  const afterStage = afterExplain.executionStats.executionStages.stage;
  const afterDocs = afterExplain.executionStats.totalDocsExamined;
  const afterTime = afterExplain.executionStats.executionTimeMillis;
  
  console.log(`  Stage: ${colors.green}${afterStage}${colors.reset}`);
  console.log(`  Docs Examined: ${colors.green}${afterDocs}${colors.reset}`);
  console.log(`  Execution Time: ${afterTime}ms`);
  
  const improvement = beforeDocs - afterDocs;
  console.log(`\n${colors.bright}${colors.green}✓ Improvement: -${improvement} documents examined${colors.reset}`);
}

// Test 2: Compound Index on orders
async function testCompoundIndex(db) {
  printSection('TEST 2: Compound Index — orders (restaurantId, status, createdAt)');
  
  const indexName = 'idx_orders_restaurant_status_date';
  
  // Get a real restaurantId from the database
  const sampleOrder = await db.collection('orders').findOne();
  if (!sampleOrder) {
    console.log('⚠ No orders found, skipping test');
    return;
  }
  
  const query = {
    restaurantId: sampleOrder.restaurantId,
    status: 'entregado'
  };
  const sort = { createdAt: -1 };
  
  // Drop index if exists
  try {
    await db.collection('orders').dropIndex(indexName);
    console.log('✓ Dropped existing index');
  } catch (e) {
    console.log('  (No existing index to drop)');
  }
  
  // BEFORE
  console.log('\n📊 BEFORE (without compound index):');
  const beforeExplain = await db.collection('orders')
    .find(query)
    .sort(sort)
    .limit(10)
    .explain('executionStats');
  
  const beforeStage = beforeExplain.executionStats.executionStages.stage;
  const beforeDocs = beforeExplain.executionStats.totalDocsExamined;
  const beforeTime = beforeExplain.executionStats.executionTimeMillis;
  
  console.log(`  Stage: ${colors.red}${beforeStage}${colors.reset}`);
  console.log(`  Docs Examined: ${colors.yellow}${beforeDocs}${colors.reset}`);
  console.log(`  Execution Time: ${beforeTime}ms`);
  
  // Create compound index
  await db.collection('orders').createIndex(
    { restaurantId: 1, status: 1, createdAt: -1 },
    { name: indexName }
  );
  console.log(`\n✓ Created compound index: ${indexName}`);
  
  // AFTER
  console.log('\n📊 AFTER (with compound index):');
  const afterExplain = await db.collection('orders')
    .find(query)
    .sort(sort)
    .limit(10)
    .explain('executionStats');
  
  const afterStage = afterExplain.executionStats.executionStages.stage;
  const afterDocs = afterExplain.executionStats.totalDocsExamined;
  const afterTime = afterExplain.executionStats.executionTimeMillis;
  
  console.log(`  Stage: ${colors.green}${afterStage}${colors.reset}`);
  console.log(`  Docs Examined: ${colors.green}${afterDocs}${colors.reset}`);
  console.log(`  Execution Time: ${afterTime}ms`);
  
  const improvement = beforeDocs - afterDocs;
  console.log(`\n${colors.bright}${colors.green}✓ Improvement: -${improvement} documents examined${colors.reset}`);
}

// Test 3: Geospatial Index (2dsphere)
async function testGeospatialIndex(db) {
  printSection('TEST 3: Geospatial Index — restaurants (2dsphere)');
  
  const indexName = 'idx_restaurants_location_2dsphere';
  
  const query = {
    'address.location': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [-90.5, 14.6] // Guatemala City coordinates
        },
        $maxDistance: 10000 // 10km
      }
    }
  };
  
  // Drop index if exists
  try {
    await db.collection('restaurants').dropIndex(indexName);
    console.log('✓ Dropped existing index');
  } catch (e) {
    console.log('  (No existing index to drop)');
  }
  
  // BEFORE - $near requires 2dsphere index, so it will error
  console.log('\n📊 BEFORE (without 2dsphere index):');
  console.log(`  Stage: ${colors.red}ERROR - $near requires geospatial index${colors.reset}`);
  console.log('  $near queries cannot run without a 2dsphere or 2d index');
  
  // Create 2dsphere index
  await db.collection('restaurants').createIndex(
    { 'address.location': '2dsphere' },
    { name: indexName }
  );
  console.log(`\n✓ Created 2dsphere index: ${indexName}`);
  
  // AFTER
  console.log('\n📊 AFTER (with 2dsphere index):');
  const afterExplain = await db.collection('restaurants')
    .find(query)
    .limit(10)
    .explain('executionStats');
  
  const afterStage = afterExplain.executionStats.executionStages.stage;
  const afterDocs = afterExplain.executionStats.totalDocsExamined;
  const afterTime = afterExplain.executionStats.executionTimeMillis;
  
  console.log(`  Stage: ${colors.green}${afterStage}${colors.reset}`);
  console.log(`  Docs Examined: ${colors.green}${afterDocs}${colors.reset}`);
  console.log(`  Execution Time: ${afterTime}ms`);
  
  console.log(`\n${colors.bright}${colors.green}✓ Geospatial queries now work (REQUIRED index)${colors.reset}`);
}

// Test 4: Text Index
async function testTextIndex(db) {
  printSection('TEST 4: Text Index — menu_items (name, description)');
  
  const indexName = 'idx_menuitems_text';
  const searchTerm = 'pizza';
  
  // Drop index if exists
  try {
    await db.collection('menu_items').dropIndex(indexName);
    console.log('✓ Dropped existing index');
  } catch (e) {
    console.log('  (No existing index to drop)');
  }
  
  // BEFORE - $text requires text index, so it will error
  console.log('\n📊 BEFORE (without text index):');
  console.log(`  Stage: ${colors.red}ERROR - $text requires text index${colors.reset}`);
  console.log('  $text queries cannot run without a text index');
  
  // Create text index
  await db.collection('menu_items').createIndex(
    { name: 'text', description: 'text' },
    { name: indexName }
  );
  console.log(`\n✓ Created text index: ${indexName}`);
  
  // AFTER
  console.log('\n📊 AFTER (with text index):');
  const afterExplain = await db.collection('menu_items')
    .find({ $text: { $search: searchTerm } })
    .explain('executionStats');
  
  const afterStage = afterExplain.executionStats.executionStages.stage;
  const afterDocs = afterExplain.executionStats.totalDocsExamined;
  const afterTime = afterExplain.executionStats.executionTimeMillis;
  
  console.log(`  Stage: ${colors.green}${afterStage}${colors.reset}`);
  console.log(`  Docs Examined: ${colors.green}${afterDocs}${colors.reset}`);
  console.log(`  Execution Time: ${afterTime}ms`);
  
  console.log(`\n${colors.bright}${colors.green}✓ Text search now works (REQUIRED index)${colors.reset}`);
}

// Test 5: Multikey Index
async function testMultikeyIndex(db) {
  printSection('TEST 5: Multikey Index — restaurants.tags');
  
  const indexName = 'idx_restaurants_tags_multikey';
  const query = { tags: 'Italiana' };
  
  // Drop index if exists
  try {
    await db.collection('restaurants').dropIndex(indexName);
    console.log('✓ Dropped existing index');
  } catch (e) {
    console.log('  (No existing index to drop)');
  }
  
  // BEFORE
  console.log('\n📊 BEFORE (without multikey index):');
  const beforeExplain = await db.collection('restaurants')
    .find(query)
    .explain('executionStats');
  
  const beforeStage = beforeExplain.executionStats.executionStages.stage;
  const beforeDocs = beforeExplain.executionStats.totalDocsExamined;
  const beforeTime = beforeExplain.executionStats.executionTimeMillis;
  
  console.log(`  Stage: ${colors.red}${beforeStage}${colors.reset}`);
  console.log(`  Docs Examined: ${colors.yellow}${beforeDocs}${colors.reset}`);
  console.log(`  Execution Time: ${beforeTime}ms`);
  
  // Create multikey index
  await db.collection('restaurants').createIndex(
    { tags: 1 },
    { name: indexName }
  );
  console.log(`\n✓ Created multikey index: ${indexName}`);
  
  // AFTER
  console.log('\n📊 AFTER (with multikey index):');
  const afterExplain = await db.collection('restaurants')
    .find(query)
    .explain('executionStats');
  
  const afterStage = afterExplain.executionStats.executionStages.stage;
  const afterDocs = afterExplain.executionStats.totalDocsExamined;
  const afterTime = afterExplain.executionStats.executionTimeMillis;
  
  console.log(`  Stage: ${colors.green}${afterStage}${colors.reset}`);
  console.log(`  Docs Examined: ${colors.green}${afterDocs}${colors.reset}`);
  console.log(`  Execution Time: ${afterTime}ms`);
  
  const improvement = beforeDocs - afterDocs;
  console.log(`\n${colors.bright}${colors.green}✓ Improvement: -${improvement} documents examined${colors.reset}`);
  console.log(`  (MongoDB auto-detected multikey for array field)`);
}

// Main execution
async function runExplainDemo() {
  printHeader('MONGODB INDEX PERFORMANCE DEMO');
  console.log('This demo shows the before/after impact of each index type.');
  console.log('Make sure to run the seed script first to have data in the database.');
  
  try {
    const db = await connectDB();
    
    // Check if we have data
    const orderCount = await db.collection('orders').countDocuments();
    if (orderCount < 1000) {
      console.log(`\n${colors.red}⚠ WARNING: Only ${orderCount} orders found. Run 'npm run seed' first for accurate results.${colors.reset}\n`);
    }
    
    await testSimpleIndex(db);
    await testCompoundIndex(db);
    await testGeospatialIndex(db);
    await testTextIndex(db);
    await testMultikeyIndex(db);
    
    printHeader('SUMMARY');
    console.log('All 5 index types demonstrated:');
    console.log(`  ${colors.green}✓${colors.reset} Simple Index (users.email)`);
    console.log(`  ${colors.green}✓${colors.reset} Compound Index (orders: restaurantId + status + createdAt)`);
    console.log(`  ${colors.green}✓${colors.reset} Geospatial Index (2dsphere on location)`);
    console.log(`  ${colors.green}✓${colors.reset} Text Index (menu_items: name + description)`);
    console.log(`  ${colors.green}✓${colors.reset} Multikey Index (restaurants.tags array)`);
    
    console.log(`\n${colors.bright}${colors.green}Demo completed successfully!${colors.reset}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error(`\n${colors.red}✗ Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run the demo
runExplainDemo();
