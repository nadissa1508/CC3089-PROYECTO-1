/**
 * Database Seeding Script
 * 
 * Generates test data for the restaurant_platform database:
 * - 500 users
 * - 100 restaurants  
 * - ~2,000 menu items
 * - 55,000 orders (optimized for shard key distribution)
 * - 2,000 reviews
 * 
 * SHARDING COMPATIBILITY:
 * Orders are generated with:
 * - Distributed restaurantId values (100 different restaurants)
 * - Time-spread createdAt dates (2024-present)
 * This ensures even distribution across the compound shard key:
 *   { restaurantId: 1, createdAt: 1 }
 * 
 * Run with: npm run seed
 */

import { ObjectId } from 'mongodb';
import { faker } from '@faker-js/faker';
import { connectDB } from '../db/connection.js';

const BATCH_SIZE = 1000;
const TOTAL_ORDERS = 55000;

// Store IDs for reference
let userIds = [];
let restaurantIds = [];
let menuItemsByRestaurant = {};

// Helper function to generate random date within last 2 years
function randomDate() {
  const start = new Date(2024, 0, 1); // Jan 1, 2024
  const end = new Date(); // Now
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to generate GeoJSON point
function randomLocation() {
  // Guatemala coordinates roughly: longitude -92 to -88, latitude 13.5 to 17.8
  return {
    type: 'Point',
    coordinates: [
      faker.number.float({ min: -92, max: -88, multipleOf: 0.000001 }),
      faker.number.float({ min: 13.5, max: 17.8, multipleOf: 0.000001 })
    ]
  };
}

// Seed users
async function seedUsers(db) {
  console.log('Seeding users...');
  const users = [];
  
  for (let i = 0; i < 500; i++) {
    users.push({
      name: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      passwordHash: faker.string.alphanumeric(60),
      role: faker.helpers.arrayElement(['cliente', 'cliente', 'cliente', 'admin']), // 75% cliente
      phone: faker.phone.number(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.helpers.arrayElement(['Guatemala', 'Antigua', 'Quetzaltenango', 'Escuintla', 'Mixco']),
        state: 'Guatemala',
        zipCode: faker.location.zipCode(),
        location: randomLocation()
      },
      orderCount: 0,
      registeredAt: randomDate(),
      active: faker.datatype.boolean(0.9) // 90% active
    });
  }
  
  const result = await db.collection('users').insertMany(users);
  userIds = Object.values(result.insertedIds);
  console.log(`✓ Inserted ${userIds.length} users`);
}

// Seed restaurants
async function seedRestaurants(db) {
  console.log('Seeding restaurants...');
  const restaurants = [];
  const tags = ['Italiana', 'Mexicana', 'China', 'FastFood', 'Vegetariana', 'Mariscos', 'Parrilla', 'Cafeteria', 'Postres', 'Gourmet'];
  
  for (let i = 0; i < 100; i++) {
    restaurants.push({
      name: faker.company.name() + ' Restaurant',
      tags: faker.helpers.arrayElements(tags, faker.number.int({ min: 1, max: 3 })),
      address: {
        street: faker.location.streetAddress(),
        city: faker.helpers.arrayElement(['Guatemala', 'Antigua', 'Quetzaltenango', 'Escuintla', 'Mixco']),
        state: 'Guatemala',
        zipCode: faker.location.zipCode(),
        location: randomLocation()
      },
      phone: faker.phone.number(),
      schedule: {
        opensAt: faker.number.int({ min: 6, max: 10 }),
        closesAt: faker.number.int({ min: 18, max: 23 })
      },
      averageRating: 0,
      totalReviews: 0,
      totalOrders: 0,
      totalRevenue: 0.0,
      active: faker.datatype.boolean(0.95), // 95% active
      registeredAt: randomDate()
    });
  }
  
  const result = await db.collection('restaurants').insertMany(restaurants);
  restaurantIds = Object.values(result.insertedIds);
  console.log(`✓ Inserted ${restaurantIds.length} restaurants`);
}

// Seed menu items
async function seedMenuItems(db) {
  console.log('Seeding menu items...');
  const categories = ['Entradas', 'Platos Fuertes', 'Bebidas', 'Postres', 'Ensaladas', 'Sopas'];
  const allItems = [];
  
  for (const restaurantId of restaurantIds) {
    const itemCount = faker.number.int({ min: 10, max: 30 });
    const items = [];
    
    for (let i = 0; i < itemCount; i++) {
      items.push({
        restaurantId: restaurantId,
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: parseFloat(faker.commerce.price({ min: 20, max: 200 })),
        category: faker.helpers.arrayElement(categories),
        available: faker.datatype.boolean(0.9), // 90% available
        createdAt: randomDate()
      });
    }
    
    allItems.push(...items);
    menuItemsByRestaurant[restaurantId.toString()] = items;
  }
  
  // Insert in batches
  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    const batch = allItems.slice(i, i + BATCH_SIZE);
    await db.collection('menu_items').insertMany(batch);
  }
  
  console.log(`✓ Inserted ${allItems.length} menu items`);
}

// Generate a random order
function generateOrder() {
  const userId = faker.helpers.arrayElement(userIds);
  const restaurantId = faker.helpers.arrayElement(restaurantIds);
  const restaurantItems = menuItemsByRestaurant[restaurantId.toString()] || [];
  
  if (restaurantItems.length === 0) return null;
  
  // Select 1-5 random items
  const itemCount = faker.number.int({ min: 1, max: 5 });
  const selectedItems = faker.helpers.arrayElements(restaurantItems, Math.min(itemCount, restaurantItems.length));
  
  const items = selectedItems.map(item => {
    const quantity = faker.number.int({ min: 1, max: 3 });
    const subtotal = item.price * quantity;
    
    return {
      menuItemId: item._id,
      name: item.name,
      unitPrice: item.price,
      quantity,
      subtotal
    };
  });
  
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  
  // Status distribution: 60% entregado, 20% pendiente, 10% preparando, 10% cancelado
  const statusRoll = Math.random();
  let status;
  if (statusRoll < 0.6) status = 'entregado';
  else if (statusRoll < 0.8) status = 'pendiente';
  else if (statusRoll < 0.9) status = 'preparando';
  else status = 'cancelado';
  
  return {
    userId,
    restaurantId,
    items,
    total,
    status,
    paymentMethod: faker.helpers.arrayElement(['tarjeta', 'efectivo', 'tarjeta']), // 66% tarjeta
    createdAt: randomDate(),
    updatedAt: randomDate()
  };
}

// Seed orders - 55,000 documents
async function seedOrders(db) {
  console.log(`Seeding ${TOTAL_ORDERS} orders...`);
  
  const totalBatches = Math.ceil(TOTAL_ORDERS / BATCH_SIZE);
  
  for (let i = 0; i < totalBatches; i++) {
    const batch = [];
    const currentBatchSize = Math.min(BATCH_SIZE, TOTAL_ORDERS - (i * BATCH_SIZE));
    
    for (let j = 0; j < currentBatchSize; j++) {
      const order = generateOrder();
      if (order) batch.push(order);
    }
    
    if (batch.length > 0) {
      await db.collection('orders').insertMany(batch);
    }
    
    console.log(`✓ Inserted batch ${i + 1}/${totalBatches} (${batch.length} orders)`);
  }
  
  const finalCount = await db.collection('orders').countDocuments();
  console.log(`✓ Total orders in database: ${finalCount}`);
}

// Seed reviews
async function seedReviews(db) {
  console.log('Seeding reviews...');
  const reviews = [];
  
  // Generate 2000 reviews
  for (let i = 0; i < 2000; i++) {
    reviews.push({
      restaurantId: faker.helpers.arrayElement(restaurantIds),
      userId: faker.helpers.arrayElement(userIds),
      orderId: null, // Could link to actual orders, but optional
      rating: faker.number.int({ min: 1, max: 5 }),
      comment: faker.lorem.sentences(faker.number.int({ min: 1, max: 3 })),
      createdAt: randomDate()
    });
  }
  
  // Insert in batches
  for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
    const batch = reviews.slice(i, i + BATCH_SIZE);
    await db.collection('reviews').insertMany(batch);
  }
  
  console.log(`✓ Inserted ${reviews.length} reviews`);
}

// Update restaurant metrics based on orders and reviews
async function updateRestaurantMetrics(db) {
  console.log('Updating restaurant metrics...');
  
  // Update based on orders
  const orderStats = await db.collection('orders').aggregate([
    { $match: { status: { $ne: 'cancelado' } } },
    {
      $group: {
        _id: '$restaurantId',
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$total' }
      }
    }
  ]).toArray();
  
  for (const stat of orderStats) {
    await db.collection('restaurants').updateOne(
      { _id: stat._id },
      {
        $set: {
          totalOrders: stat.totalOrders,
          totalRevenue: stat.totalRevenue
        }
      }
    );
  }
  
  // Update based on reviews
  const reviewStats = await db.collection('reviews').aggregate([
    {
      $group: {
        _id: '$restaurantId',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]).toArray();
  
  for (const stat of reviewStats) {
    await db.collection('restaurants').updateOne(
      { _id: stat._id },
      {
        $set: {
          averageRating: stat.averageRating,
          totalReviews: stat.totalReviews
        }
      }
    );
  }
  
  console.log('✓ Restaurant metrics updated');
}

// Update user order counts
async function updateUserMetrics(db) {
  console.log('Updating user metrics...');
  
  const userStats = await db.collection('orders').aggregate([
    { $match: { status: { $ne: 'cancelado' } } },
    {
      $group: {
        _id: '$userId',
        orderCount: { $sum: 1 }
      }
    }
  ]).toArray();
  
  for (const stat of userStats) {
    await db.collection('users').updateOne(
      { _id: stat._id },
      { $set: { orderCount: stat.orderCount } }
    );
  }
  
  console.log('✓ User metrics updated');
}

// Main seed function
async function seed() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Starting database seeding...');
  console.log('═══════════════════════════════════════════════════════════');
  
  const startTime = Date.now();
  
  try {
    const db = await connectDB();
    
    // Clear existing data
    console.log('\nClearing existing collections...');
    await db.collection('users').deleteMany({});
    await db.collection('restaurants').deleteMany({});
    await db.collection('menu_items').deleteMany({});
    await db.collection('orders').deleteMany({});
    await db.collection('reviews').deleteMany({});
    console.log('✓ Collections cleared\n');
    
    // Seed in order
    await seedUsers(db);
    await seedRestaurants(db);
    await seedMenuItems(db);
    await seedOrders(db); // 55,000 orders
    await seedReviews(db);
    
    // Update metrics
    console.log('\nUpdating calculated metrics...');
    await updateRestaurantMetrics(db);
    await updateUserMetrics(db);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✓ Seeding completed successfully!');
    console.log(`  Duration: ${duration} seconds`);
    console.log('═══════════════════════════════════════════════════════════');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seed
seed();
