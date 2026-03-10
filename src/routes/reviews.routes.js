import express from 'express';
import {
  createReview,
  getAllReviews,
  getReviewById,
  updateReview,
  deleteReview,
  deleteRestaurantReviews
} from '../controllers/reviews.controller.js';

const router = express.Router();

// Create
router.post('/', createReview);

// Read
router.get('/', getAllReviews);
router.get('/:id', getReviewById);

// Update
router.put('/:id', updateReview);

// Delete
router.delete('/restaurant/:restaurantId', deleteRestaurantReviews);
router.delete('/:id', deleteReview);

export default router;
