import { ObjectId } from 'mongodb';
import { getDB } from '../db/connection.js';

// POST /api/restaurants — Create restaurant
export async function createRestaurant(req, res) {
  try {
    const db = getDB();
    const restaurantData = {
      ...req.body,
      averageRating: 0,
      totalReviews: 0,
      totalOrders: 0,
      totalRevenue: 0.0,
      active: true,
      registeredAt: new Date()
    };
    
    const result = await db.collection('restaurants').insertOne(restaurantData);
    res.status(201).json({ 
      message: 'Restaurant created successfully',
      restaurantId: result.insertedId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/restaurants — List with filter, sort, skip, limit, projection
export async function getAllRestaurants(req, res) {
  try {
    const db = getDB();
    const { active, tags, city, sort, limit, skip, fields } = req.query;
    
    // Build filter
    const filter = {};
    if (active !== undefined) filter.active = active === 'true';
    if (tags) filter.tags = { $in: tags.split(',') };
    if (city) filter['address.city'] = city;
    
    // Build projection
    let projection = {};
    if (fields) {
      fields.split(',').forEach(field => {
        projection[field.trim()] = 1;
      });
    }
    
    // Build sort
    let sortObj = {};
    if (sort) {
      const [field, order] = sort.split(':');
      sortObj[field] = order === 'desc' || order === '-1' ? -1 : 1;
    }
    
    const restaurants = await db.collection('restaurants')
      .find(filter, { projection })
      .sort(sortObj)
      .skip(parseInt(skip) || 0)
      .limit(parseInt(limit) || 50)
      .toArray();
      
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/restaurants/:id — Get by ID
export async function getRestaurantById(req, res) {
  try {
    const db = getDB();
    const restaurant = await db.collection('restaurants').findOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/restaurants/:id — Update one
export async function updateRestaurant(req, res) {
  try {
    const db = getDB();
    const { _id, ...updateData } = req.body;
    
    const result = await db.collection('restaurants').updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    res.json({ 
      message: 'Restaurant updated successfully',
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// PATCH /api/restaurants/:id/tags — Add tag via $addToSet (Array ops ✅)
export async function addTag(req, res) {
  try {
    const db = getDB();
    const { tag } = req.body;
    
    if (!tag) {
      return res.status(400).json({ error: 'Tag is required' });
    }
    
    const result = await db.collection('restaurants').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $addToSet: { tags: tag } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    res.json({ message: 'Tag added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// PATCH /api/restaurants/:id/tags/remove — Remove tag via $pull (Array ops ✅)
export async function removeTag(req, res) {
  try {
    const db = getDB();
    const { tag } = req.body;
    
    if (!tag) {
      return res.status(400).json({ error: 'Tag is required' });
    }
    
    const result = await db.collection('restaurants').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $pull: { tags: tag } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    res.json({ message: 'Tag removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/restaurants/:id — Delete one
export async function deleteRestaurant(req, res) {
  try {
    const db = getDB();
    const result = await db.collection('restaurants').deleteOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    res.json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/restaurants/bulk/inactive — Delete all inactive restaurants
export async function deleteInactiveRestaurants(req, res) {
  try {
    const db = getDB();
    const result = await db.collection('restaurants').deleteMany({
      active: false
    });
    
    res.json({ 
      message: 'Inactive restaurants deleted successfully',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/restaurants/nearby — $near geospatial search
export async function findNearbyRestaurants(req, res) {
  try {
    const db = getDB();
    const { longitude, latitude, maxDistance } = req.query;
    
    if (!longitude || !latitude) {
      return res.status(400).json({ error: 'longitude and latitude are required' });
    }
    
    const restaurants = await db.collection('restaurants').find({
      'address.location': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance) || 5000 // Default 5km
        }
      }
    }).toArray();
    
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
