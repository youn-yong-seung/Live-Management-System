import { Router, type IRouter } from "express";
import healthRouter from "./health";
import livesRouter from "./lives";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(livesRouter);
router.use(notificationsRouter);

export default router;
