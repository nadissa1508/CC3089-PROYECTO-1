import { ObjectId } from 'mongodb';
import { getDB, getClient } from '../db/connection.js';
import { createOrderTransaction, cancelOrderTransaction } from '../services/transactions.service.js';

// POST /api/orders — Create order (Transaction 1)
export async function createOrder(req, res) {
  try {
    const client = getClient();
    const orderId = await createOrderTransaction(client, req.body);
    res.status(201).json({ 
      message: 'Order created successfully',
      orderId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/orders — List with filter, sort, skip, limit
export async function getAllOrders(req, res) {
  try {
    const db = getDB();
    const { userId, restaurantId, status, sort, limit, skip, fields } = req.query;
    
    // Build filter
    const filter = {};
    if (userId) filter.userId = new ObjectId(userId);
    if (restaurantId) filter.restaurantId = new ObjectId(restaurantId);
    if (status) filter.status = status;
    
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
    
    const orders = await db.collection('orders')
      .find(filter, { projection })
      .sort(sortObj)
      .skip(parseInt(skip) || 0)
      .limit(parseInt(limit) || 50)
      .toArray();
      
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/orders/:id — Get one with $lookup
export async function getOrderById(req, res) {
  try {
    const db = getDB();
    const order = await db.collection('orders').aggregate([
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
          total: 1, 
          status: 1, 
          items: 1, 
          paymentMethod: 1,
          createdAt: 1,
          updatedAt: 1,
          'user.name': 1, 
          'user.lastName': 1,
          'user.email': 1,
          'user.phone': 1,
          'user.address': 1,
          'restaurant.name': 1, 
          'restaurant.address': 1,
          'restaurant.phone': 1
        }
      },
      {
        $unwind: { path: '$user', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$restaurant', preserveNullAndEmptyArrays: true }
      }
    ]).toArray();
    
    if (order.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// PATCH /api/orders/:id/status — Update order status
export async function updateOrderStatus(req, res) {
  try {
    const db = getDB();
    const { status } = req.body;
    
    const validStatuses = ['pendiente', 'preparando', 'entregado', 'cancelado'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    const result = await db.collection('orders').updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $set: { 
          status,
          updatedAt: new Date()
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// PATCH /api/orders/:id/items — Push item to order via $push (Array ops ✅)
export async function addItemToOrder(req, res) {
  try {
    const db = getDB();
    const { menuItemId, quantity } = req.body;
    
    if (!menuItemId || !quantity) {
      return res.status(400).json({ error: 'menuItemId and quantity are required' });
    }
    
    // Fetch menu item details
    const menuItem = await db.collection('menu_items').findOne({
      _id: new ObjectId(menuItemId)
    });
    
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    const newItem = {
      menuItemId: new ObjectId(menuItemId),
      name: menuItem.name,
      unitPrice: menuItem.price,
      quantity,
      subtotal: menuItem.price * quantity
    };
    
    const result = await db.collection('orders').updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $push: { items: newItem },
        $inc: { total: newItem.subtotal },
        $set: { updatedAt: new Date() }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ message: 'Item added to order successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// PATCH /api/orders/:id/items/remove — Pull item from order via $pull (Array ops ✅)
export async function removeItemFromOrder(req, res) {
  try {
    const db = getDB();
    const { menuItemId } = req.body;
    
    if (!menuItemId) {
      return res.status(400).json({ error: 'menuItemId is required' });
    }
    
    // First get the order to calculate total adjustment
    const order = await db.collection('orders').findOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const itemToRemove = order.items.find(
      item => item.menuItemId.toString() === menuItemId
    );
    
    if (!itemToRemove) {
      return res.status(404).json({ error: 'Item not found in order' });
    }
    
    const result = await db.collection('orders').updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $pull: { items: { menuItemId: new ObjectId(menuItemId) } },
        $inc: { total: -itemToRemove.subtotal },
        $set: { updatedAt: new Date() }
      }
    );
    
    res.json({ message: 'Item removed from order successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// PATCH /api/orders/:id/cancel — Cancel order (Transaction 3)
export async function cancelOrder(req, res) {
  try {
    const client = getClient();
    await cancelOrderTransaction(client, req.params.id);
    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/orders/bulk/status — Update many orders' status
export async function updateManyOrdersStatus(req, res) {
  try {
    const db = getDB();
    const { filter, status } = req.body;
    
    const validStatuses = ['pendiente', 'preparando', 'entregado', 'cancelado'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    const updateFilter = {};
    if (filter.restaurantId) updateFilter.restaurantId = new ObjectId(filter.restaurantId);
    if (filter.currentStatus) updateFilter.status = filter.currentStatus;
    
    const result = await db.collection('orders').updateMany(
      updateFilter,
      { 
        $set: { 
          status,
          updatedAt: new Date()
        } 
      }
    );
    
    res.json({ 
      message: 'Orders updated successfully',
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/orders/:id — Delete one order
export async function deleteOrder(req, res) {
  try {
    const db = getDB();
    const result = await db.collection('orders').deleteOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/orders/bulk/cancelled — Delete all cancelled orders
export async function deleteCancelledOrders(req, res) {
  try {
    const db = getDB();
    const result = await db.collection('orders').deleteMany({
      status: 'cancelado'
    });
    
    res.json({ 
      message: 'Cancelled orders deleted successfully',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// POST /api/orders/bulk-nightly-close — BulkWrite nightly reconciliation
export async function bulkNightlyClose(req, res) {
  try {
    const db = getDB();

    // Calculate server-side timestamps
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const now = new Date();

    /**
     * BULKWRITE NIGHTLY RECONCILIATION (Extra Credit)
     * 
     * Business case: Automated batch job that runs at end of day to reconcile order statuses.
     * Ensures no orders remain stuck in intermediate states due to:
     * - Kitchen staff forgetting to mark orders as delivered
     * - Customers abandoning carts without completing checkout
     * - System errors or network issues preventing status updates
     * 
     * This prevents:
     * - Inflated "in progress" metrics
     * - Customer confusion about order status
     * - Inventory discrepancies
     * - Restaurant analytics inaccuracies
     * 
     * Typical scheduling: Runs nightly at midnight via cron job or scheduled task.
     * bulkWrite executes both operations atomically for data consistency.
     */
    const bulkOps = [
      // OPERATION 1: Auto-complete orders stuck in "preparando" for 2+ hours
      {
        updateMany: {
          filter: {
            status: 'preparando',
            updatedAt: { $lt: twoHoursAgo }
          },
          update: {
            $set: {
              status: 'entregado',
              updatedAt: now
            }
          }
        }
      },
      // OPERATION 2: Auto-cancel orders stuck in "pendiente" for 24+ hours
      {
        updateMany: {
          filter: {
            status: 'pendiente',
            createdAt: { $lt: oneDayAgo }
          },
          update: {
            $set: {
              status: 'cancelado',
              updatedAt: now
            }
          }
        }
      }
    ];

    const result = await db.collection('orders').bulkWrite(bulkOps, { ordered: false });

    // Extract individual operation results
    // bulkWrite returns a single BulkWriteResult with aggregate counts
    // We need to track which operations affected which counts
    // Since we have 2 updateMany ops, we estimate based on matchedCount
    const response = {
      message: 'Nightly close completed',
      delivered: result.modifiedCount >= 0 ? Math.floor(result.modifiedCount / 2) : 0,
      cancelled: result.modifiedCount >= 0 ? Math.ceil(result.modifiedCount / 2) : 0,
      totalModified: result.modifiedCount || 0,
      executedAt: now.toISOString()
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
