import express from 'express';
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  deleteManyUsers,
  findNearbyUsers,
  updateUserRole
} from '../controllers/users.controller.js';

const router = express.Router();

// Create
router.post('/', createUser);

// Read
router.get('/', getAllUsers);
router.get('/nearby', findNearbyUsers);
router.get('/:id', getUserById);

// Update
router.put('/:id', updateUser);
router.patch('/:id/role', updateUserRole);

// Delete
router.delete('/bulk', deleteManyUsers);
router.delete('/:id', deleteUser);

export default router;
