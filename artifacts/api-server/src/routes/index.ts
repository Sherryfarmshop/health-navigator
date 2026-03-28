import { Router, type IRouter } from "express";
import healthRouter from "./health";
import labResultsRouter from "./lab-results";
import medicationsRouter from "./medications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(labResultsRouter);
router.use(medicationsRouter);

export default router;
