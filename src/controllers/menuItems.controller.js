import { ObjectId } from 'mongodb';
import { getDB } from '../db/connection.js';

// POST /api/menu-items — Create one item
export async function createMenuItem(req, res) {
  try {
    const db = getDB();
    const itemData = {
      ...req.body,
      restaurantId: new ObjectId(req.body.restaurantId),
      available: req.body.available !== false,
      createdAt: new Date()
    };
    
    const result = await db.collection('menu_items').insertOne(itemData);
    res.status(201).json({ 
      message: 'Menu item created successfully',
      itemId: result.insertedId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}


// GET /api/menu-items — List with filters, projection
export async function getAllMenuItems(req, res) {
  try {
    const db = getDB();
    const { restaurantId, category, available, sort, limit, skip, fields } = req.query;
    
    // Build filter
    const filter = {};
    if (restaurantId) filter.restaurantId = new ObjectId(restaurantId);
    if (category) filter.category = category;
    if (available !== undefined) filter.available = available === 'true';
    
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
    
    const items = await db.collection('menu_items')
      .find(filter, { projection })
      .sort(sortObj)
      .skip(parseInt(skip) || 0)
      .limit(parseInt(limit) || 50)
      .toArray();
      
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/menu-items/search — Text search ($text)
export async function searchMenuItems(req, res) {
  try {
    const db = getDB();
    const { q, restaurantId } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }
    
    const filter = {
      $text: { $search: q }
    };
    
    if (restaurantId) {
      filter.restaurantId = new ObjectId(restaurantId);
    }
    
    const items = await db.collection('menu_items')
      .find(filter, {
        projection: { score: { $meta: 'textScore' } }
      })
      .sort({ score: { $meta: 'textScore' } })
      .toArray();
      
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/menu-items/:id — Get by ID
export async function getMenuItemById(req, res) {
  try {
    const db = getDB();
    const item = await db.collection('menu_items').findOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/menu-items/:id — Update one item
export async function updateMenuItem(req, res) {
  try {
    const db = getDB();
    const { _id, ...updateData } = req.body;
    
    if (updateData.restaurantId) {
      updateData.restaurantId = new ObjectId(updateData.restaurantId);
    }
    
    const result = await db.collection('menu_items').updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json({ 
      message: 'Menu item updated successfully',
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// PATCH /api/menu-items/restaurant/:restaurantId/price — Update price on many items
export async function updateManyPrices(req, res) {
  try {
    const db = getDB();
    const { percentageChange } = req.body;
    
    if (!percentageChange) {
      return res.status(400).json({ error: 'percentageChange is required' });
    }
    
    const multiplier = 1 + (percentageChange / 100);
    
    const result = await db.collection('menu_items').updateMany(
      { restaurantId: new ObjectId(req.params.restaurantId) },
      [
        {
          $set: {
            price: { $multiply: ['$price', multiplier] },
            updatedAt: new Date()
          }
        }
      ]
    );
    
    res.json({ 
      message: 'Prices updated successfully',
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/menu-items/:id — Delete one item
export async function deleteMenuItem(req, res) {
  try {
    const db = getDB();
    const result = await db.collection('menu_items').deleteOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/menu-items/restaurant/:restaurantId — Delete all items of a restaurant
export async function deleteRestaurantMenuItems(req, res) {
  try {
    const db = getDB();
    const result = await db.collection('menu_items').deleteMany({
      restaurantId: new ObjectId(req.params.restaurantId)
    });
    
    res.json({ 
      message: 'Restaurant menu items deleted successfully',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

