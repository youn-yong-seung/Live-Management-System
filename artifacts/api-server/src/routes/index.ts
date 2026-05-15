import { Router, type IRouter } from "express";
import healthRouter from "./health";
import livesRouter from "./lives";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";
import editorsRouter from "./editors";
import youtubeUploadRouter from "./youtube-upload";
import marketingRouter from "./marketing";
import techTreeRouter from "./tech-tree";
import authRouter from "./auth";
import communityRouter from "./community";
import resourcesRouter from "./resources";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(livesRouter);
router.use(notificationsRouter);
router.use(adminRouter);
router.use(editorsRouter);
router.use(youtubeUploadRouter);
router.use(marketingRouter);
router.use(techTreeRouter);
router.use(authRouter);
router.use(communityRouter);
router.use(resourcesRouter);
router.use(analyticsRouter);

export default router;
