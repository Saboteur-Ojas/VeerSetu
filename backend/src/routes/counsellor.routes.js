const { Router } = require('express');

const counsellorController = require('../controllers/counsellorController');
const validateDto = require('../middleware/validateDto');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  paramIdSchema,
  paginationSchema,
  createCaseSchema,
  updateCaseSchema,
  followUpSchema,
  escalateCaseSchema,
} = require('../dtos/counsellor.dto');

const router = Router();

router.use(verifyToken, authorize(['COUNSELLOR']));

router.get('/dashboard', counsellorController.getDashboard);

router.get('/personnel', validateDto(paginationSchema, 'query'), counsellorController.listPersonnel);
router.get(
  '/personnel/:id',
  validateDto(paramIdSchema, 'params'),
  counsellorController.getPersonnelDetail
);
router.get(
  '/personnel/:id/predictions',
  validateDto(paramIdSchema, 'params'),
  validateDto(paginationSchema, 'query'),
  counsellorController.getPersonnelPredictions
);
router.get(
  '/personnel/:id/trends',
  validateDto(paramIdSchema, 'params'),
  counsellorController.getPersonnelTrends
);

router.get('/reports', validateDto(paginationSchema, 'query'), counsellorController.listWelfareReports);
router.post('/reports', counsellorController.createWelfareReport);

router.get('/cases', validateDto(paginationSchema, 'query'), counsellorController.listCases);
router.post('/cases', validateDto(createCaseSchema), counsellorController.createCase);
router.patch(
  '/cases/:id',
  validateDto(paramIdSchema, 'params'),
  validateDto(updateCaseSchema),
  counsellorController.updateCase
);
router.post(
  '/cases/:id/follow-up',
  validateDto(paramIdSchema, 'params'),
  validateDto(followUpSchema),
  counsellorController.addFollowUp
);
router.post(
  '/cases/:id/escalate',
  authLimiter,
  validateDto(paramIdSchema, 'params'),
  validateDto(escalateCaseSchema),
  counsellorController.escalateCase
);

module.exports = router;