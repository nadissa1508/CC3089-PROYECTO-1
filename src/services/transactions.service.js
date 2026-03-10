import { ObjectId } from 'mongodb';

// Transaction 1 — Create Order
export async function createOrderTransaction(client, orderData) {
  const session = client.startSession();
  try {
    let orderId;
    
    await session.withTransaction(async () => {
      const db = client.db('restaurant_platform');

      // 1. Validate each menu item exists and is available
      for (const item of orderData.items) {
        const menuItem = await db.collection('menu_items').findOne(
          { _id: new ObjectId(item.menuItemId), available: true },
          { session }
        );
        if (!menuItem) {
          throw new Error(`Menu item ${item.menuItemId} is not available`);
        }
        
        // Enrich item with current data
        item.name = menuItem.name;
        item.unitPrice = menuItem.price;
        item.subtotal = menuItem.price * item.quantity;
      }

      // 2. Calculate order total
      const total = orderData.items.reduce((sum, item) => sum + item.subtotal, 0);

      // 3. Insert order document
      const orderDoc = {
        userId: new ObjectId(orderData.userId),
        restaurantId: new ObjectId(orderData.restaurantId),
        items: orderData.items.map(item => ({
          menuItemId: new ObjectId(item.menuItemId),
          name: item.name,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          subtotal: item.subtotal
        })),
        total,
        status: 'pendiente',
        paymentMethod: orderData.paymentMethod || 'efectivo',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.collection('orders').insertOne(orderDoc, { session });
      orderId = result.insertedId;

      // 4. Update restaurant metrics
      await db.collection('restaurants').updateOne(
        { _id: new ObjectId(orderData.restaurantId) },
        { 
          $inc: { 
            totalOrders: 1, 
            totalRevenue: total 
          } 
        },
        { session }
      );

      // 5. Update user order counter
      await db.collection('users').updateOne(
        { _id: new ObjectId(orderData.userId) },
        { $inc: { orderCount: 1 } },
        { session }
      );
    }, {
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' }
    });
    
    return orderId;
  } finally {
    await session.endSession();
  }
}

// Transaction 2 — Create Review + Update Rating
export async function createReviewTransaction(client, reviewData) {
  const session = client.startSession();
  try {
    let reviewId;
    
    await session.withTransaction(async () => {
      const db = client.db('restaurant_platform');

      // 1. Insert review
      const reviewDoc = {
        restaurantId: new ObjectId(reviewData.restaurantId),
        userId: new ObjectId(reviewData.userId),
        orderId: reviewData.orderId ? new ObjectId(reviewData.orderId) : null,
        rating: reviewData.rating,
        comment: reviewData.comment,
        createdAt: new Date()
      };
      
      const result = await db.collection('reviews').insertOne(reviewDoc, { session });
      reviewId = result.insertedId;

      // 2. Increment totalReviews on restaurant
      await db.collection('restaurants').updateOne(
        { _id: new ObjectId(reviewData.restaurantId) },
        { $inc: { totalReviews: 1 } },
        { session }
      );

      // 3. Recalculate averageRating using $avg aggregation
      const avgResult = await db.collection('reviews').aggregate([
        { $match: { restaurantId: new ObjectId(reviewData.restaurantId) } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ], { session }).toArray();

      const newAvgRating = avgResult.length > 0 ? avgResult[0].avgRating : 0;

      // 4. Update restaurant averageRating
      await db.collection('restaurants').updateOne(
        { _id: new ObjectId(reviewData.restaurantId) },
        { $set: { averageRating: newAvgRating } },
        { session }
      );
    }, {
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' }
    });
    
    return reviewId;
  } finally {
    await session.endSession();
  }
}

// Transaction 3 — Cancel Order + Revert Metrics
export async function cancelOrderTransaction(client, orderId) {
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const db = client.db('restaurant_platform');

      // 1. Find order and verify status
      const order = await db.collection('orders').findOne(
        { _id: new ObjectId(orderId) },
        { session }
      );

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status === 'cancelado') {
        throw new Error('Order is already cancelled');
      }

      if (order.status === 'entregado') {
        throw new Error('Cannot cancel a delivered order');
      }

      // 2. Update order status to 'cancelado'
      await db.collection('orders').updateOne(
        { _id: new ObjectId(orderId) },
        { 
          $set: { 
            status: 'cancelado',
            updatedAt: new Date()
          } 
        },
        { session }
      );

      // 3. Revert restaurant metrics
      await db.collection('restaurants').updateOne(
        { _id: order.restaurantId },
        { 
          $inc: { 
            totalOrders: -1, 
            totalRevenue: -order.total 
          } 
        },
        { session }
      );
    }, {
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' }
    });
  } finally {
    await session.endSession();
  }
}

// Transaction 4 — Edit Review + Recalculate Rating
export async function editReviewTransaction(client, reviewId, userId, newData) {
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const db = client.db('restaurant_platform');

      // 1. Verify review exists and belongs to userId
      const review = await db.collection('reviews').findOne(
        { _id: new ObjectId(reviewId) },
        { session }
      );

      if (!review) {
        throw new Error('Review not found');
      }

      if (review.userId.toString() !== userId.toString()) {
        throw new Error('Unauthorized: You can only edit your own reviews');
      }

      // 2. Update review document
      const updateFields = {};
      if (newData.rating !== undefined) updateFields.rating = newData.rating;
      if (newData.comment !== undefined) updateFields.comment = newData.comment;
      updateFields.updatedAt = new Date();

      await db.collection('reviews').updateOne(
        { _id: new ObjectId(reviewId) },
        { $set: updateFields },
        { session }
      );

      // 3. Re-aggregate average rating for the restaurant
      const avgResult = await db.collection('reviews').aggregate([
        { $match: { restaurantId: review.restaurantId } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ], { session }).toArray();

      const newAvgRating = avgResult.length > 0 ? avgResult[0].avgRating : 0;

      // 4. Update restaurant averageRating
      await db.collection('restaurants').updateOne(
        { _id: review.restaurantId },
        { $set: { averageRating: newAvgRating } },
        { session }
      );
    }, {
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' }
    });
  } finally {
    await session.endSession();
  }
}
