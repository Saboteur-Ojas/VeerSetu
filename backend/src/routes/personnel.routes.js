const { Router } = require('express');

const personnelController = require('../controllers/personnelController');
const validateDto = require('../middleware/validateDto');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const {
  updateProfileSchema,
  dailyRecordSchema,
  selfReviewSchema,
  helpRequestSchema,
  stressReportSchema,
  fatigueReportSchema,
  paginationSchema,
  dailyRecordsQuerySchema,
} = require('../dtos/personnel.dto');

const router = Router();

router.use(verifyToken, authorize(['PERSONNEL']));

router.get('/profile', personnelController.getProfile);
router.patch('/profile', validateDto(updateProfileSchema), personnelController.updateProfile);

router.get(
  '/daily-records',
  validateDto(dailyRecordsQuerySchema, 'query'),
  personnelController.getDailyRecords
);
router.post('/daily-records', validateDto(dailyRecordSchema), personnelController.createDailyRecord);

router.get('/self-reviews', validateDto(paginationSchema, 'query'), personnelController.getSelfReviews);
router.post('/self-reviews', validateDto(selfReviewSchema), personnelController.createSelfReview);

router.get('/history', personnelController.getHistory);

router.post('/help-request', validateDto(helpRequestSchema), personnelController.createHelpRequest);
router.post('/stress-report', validateDto(stressReportSchema), personnelController.createStressReport);
router.post('/fatigue-report', validateDto(fatigueReportSchema), personnelController.createFatigueReport);

module.exports = router;