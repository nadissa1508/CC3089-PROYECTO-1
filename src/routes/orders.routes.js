import express from 'express';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  addItemToOrder,
  removeItemFromOrder,
  cancelOrder,
  updateManyOrdersStatus,
  bulkNightlyClose,
  deleteOrder,
  deleteCancelledOrders
} from '../controllers/orders.controller.js';

const router = express.Router();

// Create
router.post('/', createOrder);

// Read
router.get('/', getAllOrders);

// Bulk operations (MUST be before /:id to avoid matching as ID)
router.post('/bulk-nightly-close', bulkNightlyClose);
router.put('/bulk/status', updateManyOrdersStatus);
router.delete('/bulk/cancelled', deleteCancelledOrders);

router.get('/:id', getOrderById);

// Update
router.patch('/:id/status', updateOrderStatus);
router.patch('/:id/items', addItemToOrder);
router.patch('/:id/items/remove', removeItemFromOrder);
router.patch('/:id/cancel', cancelOrder);

// Delete
router.delete('/:id', deleteOrder);

export default router;
