import { ObjectId } from 'mongodb';
import { getDB } from '../db/connection.js';

// POST /api/users — Create one user (with embedded address)
export async function createUser(req, res) {
  try {
    const db = getDB();
    const userData = {
      ...req.body,
      orderCount: 0,
      registeredAt: new Date(),
      active: true
    };
    
    const result = await db.collection('users').insertOne(userData);
    res.status(201).json({ 
      message: 'User created successfully',
      userId: result.insertedId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/users — Get all users with projection, skip, limit, sort, filters
export async function getAllUsers(req, res) {
  try {
    const db = getDB();
    const { role, active, sort, limit, skip, fields } = req.query;
    
    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (active !== undefined) filter.active = active === 'true';
    
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
    
    const users = await db.collection('users')
      .find(filter, { projection })
      .sort(sortObj)
      .skip(parseInt(skip) || 0)
      .limit(parseInt(limit) || 50)
      .toArray();
      
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/users/:id — Get user by ID
export async function getUserById(req, res) {
  try {
    const db = getDB();
    const user = await db.collection('users').findOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/users/:id — Update one user
export async function updateUser(req, res) {
  try {
    const db = getDB();
    const { _id, ...updateData } = req.body;
    
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      message: 'User updated successfully',
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/users/:id — Delete one user
export async function deleteUser(req, res) {
  try {
    const db = getDB();
    const result = await db.collection('users').deleteOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/users/bulk — Delete many inactive users
export async function deleteManyUsers(req, res) {
  try {
    const db = getDB();
    const { active } = req.body;
    
    const filter = {};
    if (active !== undefined) filter.active = active;
    
    const result = await db.collection('users').deleteMany(filter);
    
    res.json({ 
      message: 'Users deleted successfully',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/users/nearby — Find users near coordinates (geospatial)
export async function findNearbyUsers(req, res) {
  try {
    const db = getDB();
    const { longitude, latitude, maxDistance } = req.query;
    
    if (!longitude || !latitude) {
      return res.status(400).json({ error: 'longitude and latitude are required' });
    }
    
    const users = await db.collection('users').find({
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
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// PATCH /api/users/:id/role — Update user role
export async function updateUserRole(req, res) {
  try {
    const db = getDB();
    const { role } = req.body;
    
    if (!['cliente', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be cliente or admin' });
    }
    
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { role } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
