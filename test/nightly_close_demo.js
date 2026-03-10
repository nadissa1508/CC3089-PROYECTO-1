/**
 * Nightly Close Demo Script
 * 
 * Demonstrates the bulk nightly close endpoint using bulkWrite
 * with two updateMany operations to reconcile order statuses.
 * 
 * Run with: node test/nightly_close_demo.js
 */

import { connectDB } from '../src/db/connection.js';

async function demonstrateNightlyClose() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      MongoDB BulkWrite - Nightly Close Demo          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    const db = await connectDB();
    console.log('✓ Connected to MongoDB\n');

    // Calculate timestamps
    const now = new Date();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    console.log('⏰ TIMESTAMP CALCULATIONS:');
    console.log(`   Now: ${now.toISOString()}`);
    console.log(`   2 hours ago: ${twoHoursAgo.toISOString()}`);
    console.log(`   1 day ago: ${oneDayAgo.toISOString()}\n`);

    // Get initial status counts
    console.log('📊 BEFORE Nightly Close:\n');
    const beforeStats = await db.collection('orders').aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    beforeStats.forEach(stat => {
      console.log(`   ${stat._id.padEnd(12)}: ${stat.count} orders`);
    });

    // Check for stuck orders
    const stuckPreparando = await db.collection('orders').countDocuments({
      status: 'preparando',
      updatedAt: { $lt: twoHoursAgo }
    });

    const stuckPendiente = await db.collection('orders').countDocuments({
      status: 'pendiente',
      createdAt: { $lt: oneDayAgo }
    });

    console.log(`\n🔍 STUCK ORDERS DETECTED:`);
    console.log(`   Preparando (2+ hours): ${stuckPreparando} orders`);
    console.log(`   Pendiente (24+ hours): ${stuckPendiente} orders\n`);

    if (stuckPreparando === 0 && stuckPendiente === 0) {
      console.log('✨ No stuck orders found. Creating test data...\n');

      // Create some test orders with old timestamps for demonstration
      const testOrders = [
        {
          userId: (await db.collection('users').findOne())._id,
          restaurantId: (await db.collection('restaurants').findOne())._id,
          items: [{ menuItemId: (await db.collection('menu_items').findOne())._id, quantity: 1, name: 'Test Item', unitPrice: 10, subtotal: 10 }],
          total: 10,
          status: 'preparando',
          paymentMethod: 'efectivo',
          createdAt: twoDaysAgo,
          updatedAt: twoDaysAgo
        },
        {
          userId: (await db.collection('users').findOne())._id,
          restaurantId: (await db.collection('restaurants').findOne())._id,
          items: [{ menuItemId: (await db.collection('menu_items').findOne())._id, quantity: 1, name: 'Test Item', unitPrice: 15, subtotal: 15 }],
          total: 15,
          status: 'pendiente',
          paymentMethod: 'tarjeta',
          createdAt: twoDaysAgo,
          updatedAt: twoDaysAgo
        }
      ];

      await db.collection('orders').insertMany(testOrders);
      console.log('   ✓ Created 2 test orders with old timestamps\n');
    }

    console.log('🔧 Executing BulkWrite Nightly Close Operations:\n');
    console.log('   Operation 1: updateMany');
    console.log('   └─ Auto-complete orders stuck in "preparando" for 2+ hours');
    console.log('   └─ Change status to "entregado"\n');
    
    console.log('   Operation 2: updateMany');
    console.log('   └─ Auto-cancel orders stuck in "pendiente" for 24+ hours');
    console.log('   └─ Change status to "cancelado"\n');

    // Execute bulkWrite
    const bulkOps = [
      {
        updateMany: {
          filter: {
            status: 'preparando',
            updatedAt: { $lt: twoHoursAgo }
          },
          update: {
            $set: {
              status: 'entregado',
              updatedAt: now
            }
          }
        }
      },
      {
        updateMany: {
          filter: {
            status: 'pendiente',
            createdAt: { $lt: oneDayAgo }
          },
          update: {
            $set: {
              status: 'cancelado',
              updatedAt: now
            }
          }
        }
      }
    ];

    const startTime = Date.now();
    const result = await db.collection('orders').bulkWrite(bulkOps, { ordered: false });
    const duration = Date.now() - startTime;

    console.log('✅ Nightly Close completed successfully!\n');
    console.log('📈 RESULTS:');
    console.log(`   Total matched: ${result.matchedCount || 0} orders`);
    console.log(`   Total modified: ${result.modifiedCount || 0} orders`);
    console.log(`   Operations executed: ${bulkOps.length}`);
    console.log(`   Execution time: ${duration}ms\n`);

    // Get final status counts
    console.log('📊 AFTER Nightly Close:\n');
    const afterStats = await db.collection('orders').aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    afterStats.forEach(stat => {
      console.log(`   ${stat._id.padEnd(12)}: ${stat.count} orders`);
    });

    // Calculate changes
    const beforeMap = {};
    beforeStats.forEach(s => { beforeMap[s._id] = s.count; });
    const afterMap = {};
    afterStats.forEach(s => { afterMap[s._id] = s.count; });

    console.log(`\n📊 CHANGES:`);
    console.log(`   Pendiente:   ${beforeMap['pendiente'] || 0} → ${afterMap['pendiente'] || 0} (${(afterMap['pendiente'] || 0) - (beforeMap['pendiente'] || 0)})`);
    console.log(`   Preparando:  ${beforeMap['preparando'] || 0} → ${afterMap['preparando'] || 0} (${(afterMap['preparando'] || 0) - (beforeMap['preparando'] || 0)})`);
    console.log(`   Entregado:   ${beforeMap['entregado'] || 0} → ${afterMap['entregado'] || 0} (+${(afterMap['entregado'] || 0) - (beforeMap['entregado'] || 0)})`);
    console.log(`   Cancelado:   ${beforeMap['cancelado'] || 0} → ${afterMap['cancelado'] || 0} (+${(afterMap['cancelado'] || 0) - (beforeMap['cancelado'] || 0)})\n`);

    console.log('💡 KEY BENEFITS OF BULKWRITE:');
    console.log('   • Both status reconciliations in a single database round-trip');
    console.log('   • Atomic execution ensures data consistency');
    console.log('   • Ordered: false allows parallel execution for better performance');
    console.log('   • Prevents partial updates if one operation fails\n');

    console.log('🎯 Real-world use case: Automated batch reconciliation');
    console.log('   This simulates a cron job that runs nightly (e.g., midnight) to:');
    console.log('   • Prevent orders from being stuck in intermediate states');
    console.log('   • Ensure accurate business metrics and reporting');
    console.log('   • Clean up abandoned carts and forgotten kitchen orders');
    console.log('   • Maintain data integrity for analytics dashboards\n');

    console.log('⏰ TYPICAL SCHEDULING:');
    console.log('   • Linux/Mac cron: 0 0 * * * /path/to/nightly-close.sh');
    console.log('   • Windows Task Scheduler: Daily at 12:00 AM');
    console.log('   • Node-cron: cron.schedule("0 0 * * *", nightlyClose)');
    console.log('   • Cloud Functions: Pub/Sub scheduled trigger\n');

    console.log('📚 See implementation: src/controllers/orders.controller.js');
    console.log('   Function: bulkNightlyClose()');
    console.log('   Route: POST /api/orders/bulk-nightly-close\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

demonstrateNightlyClose();
