import { Router, type IRouter } from "express";
import healthRouter from "./health";
import livesRouter from "./lives";

const router: IRouter = Router();

router.use(healthRouter);
router.use(livesRouter);

export default router;
