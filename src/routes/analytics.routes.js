import express from 'express';
import {
  getTopRatedRestaurants,
  getTopSoldMenuItems,
  getUserAverageSpending,
  getMonthlyRevenue,
  getRatingDistribution,
  getOrdersCount,
  getOrdersCountByStatus,
  getDistinctCities,
  getDistinctCategories,
  getUsersCountByRole
} from '../controllers/analytics.controller.js';

const router = express.Router();

// Complex aggregations
router.get('/restaurants/top-rated', getTopRatedRestaurants);
router.get('/menu-items/top-sold', getTopSoldMenuItems);
router.get('/users/avg-spend', getUserAverageSpending);
router.get('/restaurants/monthly-revenue', getMonthlyRevenue);
router.get('/reviews/rating-distribution', getRatingDistribution);

// Simple aggregations
router.get('/orders/count', getOrdersCount);
router.get('/orders/count-by-status', getOrdersCountByStatus);
router.get('/restaurants/distinct-cities', getDistinctCities);
router.get('/menu-items/distinct-categories', getDistinctCategories);
router.get('/users/count-by-role', getUsersCountByRole);

export default router;
