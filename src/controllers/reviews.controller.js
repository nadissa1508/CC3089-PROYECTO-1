import { ObjectId } from 'mongodb';
import { getDB, getClient } from '../db/connection.js';
import { createReviewTransaction, editReviewTransaction } from '../services/transactions.service.js';

// POST /api/reviews — Create review (Transaction 2)
export async function createReview(req, res) {
  try {
    const client = getClient();
    const reviewId = await createReviewTransaction(client, req.body);
    res.status(201).json({ 
      message: 'Review created successfully',
      reviewId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/reviews — List with filters, sort, projection
export async function getAllReviews(req, res) {
  try {
    const db = getDB();
    const { restaurantId, userId, rating, sort, limit, skip, fields } = req.query;
    
    // Build filter
    const filter = {};
    if (restaurantId) filter.restaurantId = new ObjectId(restaurantId);
    if (userId) filter.userId = new ObjectId(userId);
    if (rating) filter.rating = parseInt(rating);
    
    // Build projection
    let projection = {};
    if (fields) {
      fields.split(',').forEach(field => {
        projection[field.trim()] = 1;
      });
    }
    
    // Build sort
    let sortObj = { createdAt: -1 }; // Default sort by newest
    if (sort) {
      const [field, order] = sort.split(':');
      sortObj = { [field]: order === 'desc' || order === '-1' ? -1 : 1 };
    }
    
    const reviews = await db.collection('reviews')
      .find(filter, { projection })
      .sort(sortObj)
      .skip(parseInt(skip) || 0)
      .limit(parseInt(limit) || 50)
      .toArray();
      
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/reviews/:id — Get one with $lookup
export async function getReviewById(req, res) {
  try {
    const db = getDB();
    const review = await db.collection('reviews').aggregate([
      { $match: { _id: new ObjectId(req.params.id) } },
      { 
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { 
        $lookup: {
          from: 'restaurants',
          localField: 'restaurantId',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      {
        $project: {
          rating: 1, 
          comment: 1, 
          createdAt: 1,
          'user.name': 1, 
          'user.lastName': 1,
          'user.email': 1,
          'restaurant.name': 1, 
          'restaurant.address.city': 1
        }
      },
      {
        $unwind: { path: '$user', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$restaurant', preserveNullAndEmptyArrays: true }
      }
    ]).toArray();
    
    if (review.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    res.json(review[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/reviews/:id — Edit review (Transaction 4)
export async function updateReview(req, res) {
  try {
    const client = getClient();
    const { userId, ...updateData } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required for authorization' });
    }
    
    await editReviewTransaction(client, req.params.id, userId, updateData);
    res.json({ message: 'Review updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/reviews/:id — Delete one review
export async function deleteReview(req, res) {
  try {
    const db = getDB();
    const result = await db.collection('reviews').deleteOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/reviews/restaurant/:restaurantId — Delete all reviews of a restaurant
export async function deleteRestaurantReviews(req, res) {
  try {
    const db = getDB();
    const result = await db.collection('reviews').deleteMany({
      restaurantId: new ObjectId(req.params.restaurantId)
    });
    
    res.json({ 
      message: 'Restaurant reviews deleted successfully',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
