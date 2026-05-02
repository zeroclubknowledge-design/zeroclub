import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profilesRouter from "./profiles";
import postsRouter from "./posts";
import bootcampsRouter from "./bootcamps";
import channelsRouter from "./channels";
import walletRouter from "./wallet";
import feedRouter from "./feed";
import enrollmentsRouter from "./enrollments";
import seedRouter from "./seed";
import referralsRouter from "./referrals";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/profiles", profilesRouter);
router.use("/posts", postsRouter);
router.use("/bootcamps", bootcampsRouter);
router.use("/channels", channelsRouter);
router.use("/wallet", walletRouter);
router.use("/feed", feedRouter);
router.use("/enrollments", enrollmentsRouter);
router.use("/seed", seedRouter);
router.use("/referrals", referralsRouter);

export default router;
