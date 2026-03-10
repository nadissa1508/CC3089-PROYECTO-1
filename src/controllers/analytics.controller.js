import { ObjectId } from 'mongodb';
import { getDB } from '../db/connection.js';

// ═══════════════════════════════════════════════════════════════════════════
// COMPLEX AGGREGATIONS (10 points)
// ═══════════════════════════════════════════════════════════════════════════

// Pipeline 1: Top-rated restaurants
export async function getTopRatedRestaurants(req, res) {
  try {
    const db = getDB();
    const limit = parseInt(req.query.limit) || 10;
    
    const pipeline = [
      {
        $match: {
          totalReviews: { $gte: 5 } // Only restaurants with at least 5 reviews
        }
      },
      {
        $sort: { averageRating: -1, totalReviews: -1 }
      },
      {
        $limit: limit
      },
      {
        $project: {
          name: 1,
          averageRating: 1,
          totalReviews: 1,
          totalOrders: 1,
          'address.city': 1,
          tags: 1
        }
      }
    ];
    
    const results = await db.collection('restaurants').aggregate(pipeline).toArray();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Pipeline 2: Top sold menu items (with $unwind)
export async function getTopSoldMenuItems(req, res) {
  try {
    const db = getDB();
    const limit = parseInt(req.query.limit) || 10;
    const restaurantId = req.query.restaurantId;
    
    const matchStage = restaurantId 
      ? { restaurantId: new ObjectId(restaurantId), status: { $ne: 'cancelado' } }
      : { status: { $ne: 'cancelado' } };
    
    const pipeline = [
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItemId',
          itemName: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'menu_items',
          localField: '_id',
          foreignField: '_id',
          as: 'itemDetails'
        }
      },
      {
        $unwind: { path: '$itemDetails', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          itemName: 1,
          totalQuantity: 1,
          totalRevenue: 1,
          orderCount: 1,
          category: '$itemDetails.category',
          currentPrice: '$itemDetails.price'
        }
      }
    ];
    
    const results = await db.collection('orders').aggregate(pipeline).toArray();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Pipeline 3: Average spending per user (with $lookup)
export async function getUserAverageSpending(req, res) {
  try {
    const db = getDB();
    const minOrders = parseInt(req.query.minOrders) || 1;
    
    const pipeline = [
      {
        $match: { status: { $ne: 'cancelado' } }
      },
      {
        $group: {
          _id: '$userId',
          totalSpent: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $match: { orderCount: { $gte: minOrders } }
      },
      {
        $addFields: {
          avgSpending: { $divide: ['$totalSpent', '$orderCount'] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          userName: { $concat: ['$userDetails.name', ' ', '$userDetails.lastName'] },
          email: '$userDetails.email',
          totalSpent: 1,
          orderCount: 1,
          avgSpending: 1
        }
      },
      {
        $sort: { avgSpending: -1 }
      }
    ];
    
    const results = await db.collection('orders').aggregate(pipeline).toArray();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Pipeline 4: Monthly revenue per restaurant (date operations)
export async function getMonthlyRevenue(req, res) {
  try {
    const db = getDB();
    const restaurantId = req.query.restaurantId;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    
    const matchStage = {
      status: { $ne: 'cancelado' },
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${year + 1}-01-01`)
      }
    };
    
    if (restaurantId) {
      matchStage.restaurantId = new ObjectId(restaurantId);
    }
    
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            restaurantId: '$restaurantId',
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'restaurants',
          localField: '_id.restaurantId',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      {
        $unwind: { path: '$restaurant', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          restaurantName: '$restaurant.name',
          year: '$_id.year',
          month: '$_id.month',
          revenue: 1,
          orderCount: 1
        }
      },
      {
        $sort: { year: -1, month: -1, revenue: -1 }
      }
    ];
    
    const results = await db.collection('orders').aggregate(pipeline).toArray();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Pipeline 5: Rating distribution per restaurant (double $group)
export async function getRatingDistribution(req, res) {
  try {
    const db = getDB();
    const restaurantId = req.query.restaurantId;
    
    const matchStage = restaurantId 
      ? { restaurantId: new ObjectId(restaurantId) }
      : {};
    
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            restaurantId: '$restaurantId',
            rating: '$rating'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.restaurantId',
          distribution: {
            $push: {
              rating: '$_id.rating',
              count: '$count'
            }
          },
          totalReviews: { $sum: '$count' }
        }
      },
      {
        $lookup: {
          from: 'restaurants',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      {
        $unwind: { path: '$restaurant', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          restaurantName: '$restaurant.name',
          averageRating: '$restaurant.averageRating',
          totalReviews: 1,
          distribution: 1
        }
      },
      {
        $sort: { totalReviews: -1 }
      }
    ];
    
    const results = await db.collection('reviews').aggregate(pipeline).toArray();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}


// NEW PIPELINE: Order status distribution by restaurant
export async function getOrderStatusDistribution(req, res) {
  try {
    const db = getDB();
    const restaurantId = req.query.restaurantId;
    
    const matchStage = restaurantId ? { restaurantId: new ObjectId(restaurantId) } : {};
    
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: { restaurantId: '$restaurantId', status: '$status' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.restaurantId',
          statuses: {
            $push: { status: '$_id.status', count: '$count' }
          },
          total: { $sum: '$count' }
        }
      },
      {
        $lookup: {
          from: 'restaurants',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      {
        $unwind: { path: '$restaurant', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          restaurantName: '$restaurant.name',
          statuses: 1,
          total: 1
        }
      },
      { $sort: { total: -1 } }
    ];
    
    const results = await db.collection('orders').aggregate(pipeline).toArray();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// NEW PIPELINE: Top 10 dishes by revenue
export async function getTopDishesByRevenue(req, res) {
  try {
    const db = getDB();
    const limit = parseInt(req.query.limit) || 10;
    
    const pipeline = [
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalRevenue: { $sum: '$items.subtotal' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limit }
    ];
    
    const results = await db.collection('orders').aggregate(pipeline).toArray();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
// ═══════════════════════════════════════════════════════════════════════════
// SIMPLE AGGREGATIONS (5 points)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/analytics/orders/count — countDocuments
export async function getOrdersCount(req, res) {
  try {
    const db = getDB();
    const count = await db.collection('orders').countDocuments({});
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/analytics/orders/count-by-status — countDocuments with filter
export async function getOrdersCountByStatus(req, res) {
  try {
    const db = getDB();
    const { status } = req.query;
    
    if (!status) {
      return res.status(400).json({ error: 'status query parameter is required' });
    }
    
    const count = await db.collection('orders').countDocuments({ status });
    res.json({ status, count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/analytics/restaurants/distinct-cities — distinct
export async function getDistinctCities(req, res) {
  try {
    const db = getDB();
    const cities = await db.collection('restaurants').distinct('address.city');
    res.json({ cities, count: cities.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/analytics/menu-items/distinct-categories — distinct with filter
export async function getDistinctCategories(req, res) {
  try {
    const db = getDB();
    const { restaurantId } = req.query;
    
    const filter = restaurantId ? { restaurantId: new ObjectId(restaurantId) } : {};
    const categories = await db.collection('menu_items').distinct('category', filter);
    
    res.json({ categories, count: categories.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/analytics/users/count-by-role — countDocuments with filter
export async function getUsersCountByRole(req, res) {
  try {
    const db = getDB();
    const { role } = req.query;
    
    if (!role) {
      return res.status(400).json({ error: 'role query parameter is required' });
    }
    
    const count = await db.collection('users').countDocuments({ role });
    res.json({ role, count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
