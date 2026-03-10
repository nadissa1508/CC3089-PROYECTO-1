import express from 'express';
import {
  createMenuItem,
  createManyMenuItems,
  getAllMenuItems,
  searchMenuItems,
  getMenuItemById,
  updateMenuItem,
  updateManyPrices,
  deleteMenuItem,
  deleteRestaurantMenuItems
} from '../controllers/menuItems.controller.js';

const router = express.Router();

// Create
router.post('/', createMenuItem);

// Read
router.get('/', getAllMenuItems);
router.get('/search', searchMenuItems);
router.get('/:id', getMenuItemById);

// Update
router.put('/:id', updateMenuItem);
router.patch('/restaurant/:restaurantId/price', updateManyPrices);

// Delete
router.delete('/restaurant/:restaurantId', deleteRestaurantMenuItems);
router.delete('/:id', deleteMenuItem);

export default router;
