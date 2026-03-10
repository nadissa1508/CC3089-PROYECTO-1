import express from 'express';
import 'dotenv/config';
import { connectDB } from './db/connection.js';
import { createIndexes } from './db/indexes.js';

// Import routes
import usersRouter from './routes/users.routes.js';
import restaurantsRouter from './routes/restaurants.routes.js';
import menuItemsRouter from './routes/menuItems.routes.js';
import ordersRouter from './routes/orders.routes.js';
import reviewsRouter from './routes/reviews.routes.js';
import filesRouter from './routes/files.routes.js';
import analyticsRouter from './routes/analytics.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware (optional, for frontend integration)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Restaurant Platform API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      users: '/api/users',
      restaurants: '/api/restaurants',
      menuItems: '/api/menu-items',
      orders: '/api/orders',
      reviews: '/api/reviews',
      files: '/api/files',
      analytics: '/api/analytics'
    }
  });
});

// API Routes
app.use('/api/users', usersRouter);
app.use('/api/restaurants', restaurantsRouter);
app.use('/api/menu-items', menuItemsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/files', filesRouter);
app.use('/api/analytics', analyticsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size too large (max 10MB)' });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Connect to MongoDB
    const db = await connectDB();
    console.log('✓ MongoDB connected');
    
    // Create indexes
    await createIndexes(db);
    console.log('✓ Indexes created (includes shard key index)');
    
    // Start Express server
    app.listen(PORT, () => {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log(`║  🚀 Restaurant Platform API running on port ${PORT}       ║`);
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      console.log(`📍 Server: http://localhost:${PORT}`);
      console.log(`📋 Health: http://localhost:${PORT}/`);
      console.log(`\n📚 Available endpoints:`);
      console.log(`   • POST   /api/users              - Create user`);
      console.log(`   • GET    /api/users              - List users`);
      console.log(`   • GET    /api/users/nearby       - Geospatial search`);
      console.log(`   • POST   /api/restaurants        - Create restaurant`);
      console.log(`   • PATCH  /api/restaurants/:id/tags - Array operations`);
      console.log(`   • POST   /api/orders             - Create order (Transaction)`);
      console.log(`   • PATCH  /api/orders/:id/cancel  - Cancel order (Transaction)`);
      console.log(`   • POST   /api/reviews            - Create review (Transaction)`);
      console.log(`   • POST   /api/files/upload       - Upload to GridFS`);
      console.log(`   • GET    /api/analytics/*        - Aggregation queries`);
      console.log(`\n💡 Tips:`);
      console.log(`   • Run 'npm run seed' to populate with 50k+ orders`);
      console.log(`   • Run 'npm run explain' to see index performance demos`);
      console.log(`\n`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n✓ Server shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n✓ Server shutting down gracefully...');
  process.exit(0);
});

// Start the application
startServer();
