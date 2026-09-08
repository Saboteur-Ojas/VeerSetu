const { Router } = require('express');

const commanderController = require('../controllers/commanderController');
const validateDto = require('../middleware/validateDto');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { unitQuerySchema } = require('../dtos/commander.dto');

const router = Router();

router.use(verifyToken, authorize(['COMMANDER']));

router.get('/dashboard', commanderController.getDashboard);
router.get('/unit', validateDto(unitQuerySchema, 'query'), commanderController.getUnit);
router.get('/personnel', commanderController.listPersonnel);
router.get('/deployment', commanderController.getDeployment);
router.get('/readiness', validateDto(unitQuerySchema, 'query'), commanderController.getReadiness);
router.get('/weekly-report', commanderController.getWeeklyReport);
router.get('/escalations/:id', commanderController.getEscalation);

module.exports = router;