const express = require('express');
const router = express.Router();
const {
  getMedicines,
  getMedicineStats,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  adjustStock,
  disposeMedicine,
  getExpiryBreakdown,
} = require('../controllers/medicineController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/stats', getMedicineStats);
router.get('/expiry/breakdown', getExpiryBreakdown);

router
  .route('/')
  .get(getMedicines)
  .post(createMedicine);

router
  .route('/:id')
  .get(getMedicineById)
  .put(updateMedicine)
  .delete(deleteMedicine);

router.patch('/:id/stock', adjustStock);
router.post('/:id/dispose', disposeMedicine);

module.exports = router;
