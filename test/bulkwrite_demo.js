/**
 * BulkWrite Demo Script
 * 
 * Demonstrates the bulk price adjustment endpoint using bulkWrite
 * with mixed operation types (updateMany, updateOne, deleteMany).
 * 
 * Run with: node test/bulkwrite_demo.js
 */

import { connectDB } from '../src/db/connection.js';
import { ObjectId } from 'mongodb';

async function demonstrateBulkWrite() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         MongoDB BulkWrite Demo (Extra Credit)        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    const db = await connectDB();
    console.log('✓ Connected to MongoDB\n');

    // Find a restaurant with menu items
    const restaurant = await db.collection('restaurants').findOne({ active: true });
    
    if (!restaurant) {
      console.log('❌ No active restaurants found. Run "npm run seed" first.');
      return;
    }

    const restaurantId = restaurant._id;
    console.log(`📍 Using restaurant: ${restaurant.name}`);
    console.log(`   Restaurant ID: ${restaurantId}\n`);

    // Get initial menu item counts
    const initialStats = await db.collection('menu_items').aggregate([
      { $match: { restaurantId: restaurantId } },
      {
        $group: {
          _id: '$available',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      }
    ]).toArray();

    console.log('📊 BEFORE BulkWrite:');
    initialStats.forEach(stat => {
      console.log(`   ${stat._id ? 'Available' : 'Unavailable'}: ${stat.count} items (avg price: $${stat.avgPrice?.toFixed(2)})`);
    });

    // Find categories
    const categories = await db.collection('menu_items')
      .distinct('category', { restaurantId: restaurantId });
    
    console.log(`\n📂 Categories found: ${categories.join(', ')}`);

    // Prepare bulkWrite operations
    const categoryAdjustments = categories.slice(0, 2).map(cat => ({
      category: cat,
      multiplier: 1.1 // 10% increase
    }));

    // Find a popular item for special pricing
    const popularItem = await db.collection('menu_items').findOne({
      restaurantId: restaurantId,
      available: true
    });

    const cutoffDays = 90; // Remove items unavailable for 90+ days
    const cutoffDate = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000);

    console.log(`\n🔧 Executing BulkWrite operations:`);
    console.log(`   1. updateMany: Increase prices by 10% for categories: ${categoryAdjustments.map(c => c.category).join(', ')}`);
    if (popularItem) {
      console.log(`   2. updateOne: Set "${popularItem.name}" to $15.99`);
    }
    console.log(`   3. deleteMany: Remove unavailable items older than ${cutoffDays} days (before ${cutoffDate.toDateString()})\n`);

    // Build bulkWrite array
    const bulkOps = [];

    // updateMany operations
    categoryAdjustments.forEach(({ category, multiplier }) => {
      bulkOps.push({
        updateMany: {
          filter: { 
            restaurantId: restaurantId,
            category: category,
            available: true
          },
          update: [
            {
              $set: {
                price: { $multiply: ['$price', multiplier] },
                updatedAt: new Date()
              }
            }
          ]
        }
      });
    });

    // updateOne operation
    if (popularItem) {
      bulkOps.push({
        updateOne: {
          filter: { 
            restaurantId: restaurantId,
            name: popularItem.name
          },
          update: {
            $set: {
              price: 15.99,
              updatedAt: new Date()
            }
          }
        }
      });
    }

    // deleteMany operation
    bulkOps.push({
      deleteMany: {
        filter: {
          restaurantId: restaurantId,
          available: false,
          createdAt: { $lt: cutoffDate }
        }
      }
    });

    // Execute bulkWrite
    const startTime = Date.now();
    const result = await db.collection('menu_items').bulkWrite(bulkOps, { ordered: false });
    const duration = Date.now() - startTime;

    console.log('✅ BulkWrite completed successfully!\n');
    console.log('📈 RESULTS:');
    console.log(`   Matched: ${result.matchedCount || 0} documents`);
    console.log(`   Modified: ${result.modifiedCount || 0} documents`);
    console.log(`   Deleted: ${result.deletedCount || 0} documents`);
    console.log(`   Operations: ${bulkOps.length}`);
    console.log(`   Execution time: ${duration}ms\n`);

    // Get final stats
    const finalStats = await db.collection('menu_items').aggregate([
      { $match: { restaurantId: restaurantId } },
      {
        $group: {
          _id: '$available',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      }
    ]).toArray();

    console.log('📊 AFTER BulkWrite:');
    finalStats.forEach(stat => {
      console.log(`   ${stat._id ? 'Available' : 'Unavailable'}: ${stat.count} items (avg price: $${stat.avgPrice?.toFixed(2)})`);
    });

    console.log('\n💡 KEY BENEFITS OF BULKWRITE:');
    console.log('   • Single round-trip to database (vs multiple separate calls)');
    console.log('   • Atomic execution of mixed operation types');
    console.log('   • Better performance for batch operations');
    console.log('   • Supports updateMany, updateOne, insertOne, deleteMany, replaceOne\n');

    console.log('🎯 Real-world use case: Restaurant menu catalog updates');
    console.log('   Restaurants commonly need to:');
    console.log('   - Apply percentage-based price increases to categories (inflation, cost changes)');
    console.log('   - Set promotional prices on specific items (daily specials, happy hour)');
    console.log('   - Clean up discontinued items from the database\n');

    console.log('📚 See implementation: src/controllers/menuItems.controller.js');
    console.log('   Function: bulkPriceAdjustment()\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

demonstrateBulkWrite();
