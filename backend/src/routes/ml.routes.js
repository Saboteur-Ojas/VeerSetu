const { Router } = require('express');

const mlController = require('../controllers/mlController');
const validateDto = require('../middleware/validateDto');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { predictSchema, batchPredictSchema } = require('../dtos/ml.dto');

const router = Router();

router.use(verifyToken, authorize(['COUNSELLOR', 'COMMANDER', 'ADMIN']));

router.post('/predict', validateDto(predictSchema), mlController.predict);
router.post('/batch-predict', validateDto(batchPredictSchema), mlController.batchPredict);
router.get('/health', mlController.health);

module.exports = router;