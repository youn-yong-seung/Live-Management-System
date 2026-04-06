import { Router, type IRouter } from "express";
import healthRouter from "./health";
import livesRouter from "./lives";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";
import editorsRouter from "./editors";
import youtubeUploadRouter from "./youtube-upload";
import marketingRouter from "./marketing";

const router: IRouter = Router();

router.use(healthRouter);
router.use(livesRouter);
router.use(notificationsRouter);
router.use(adminRouter);
router.use(editorsRouter);
router.use(youtubeUploadRouter);
router.use(marketingRouter);

export default router;
