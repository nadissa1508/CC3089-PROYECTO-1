import express from 'express';
import {
  createRestaurant,
  getAllRestaurants,
  getRestaurantById,
  updateRestaurant,
  addTag,
  removeTag,
  deleteRestaurant,
  deleteInactiveRestaurants,
  findNearbyRestaurants
} from '../controllers/restaurants.controller.js';

const router = express.Router();

// Create
router.post('/', createRestaurant);

// Read
router.get('/', getAllRestaurants);
router.get('/nearby', findNearbyRestaurants);
router.get('/:id', getRestaurantById);

// Update
router.put('/:id', updateRestaurant);
router.patch('/:id/tags', addTag);
router.patch('/:id/tags/remove', removeTag);

// Delete
router.delete('/bulk/inactive', deleteInactiveRestaurants);
router.delete('/:id', deleteRestaurant);

export default router;
