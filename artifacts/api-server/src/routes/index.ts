import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workspacesRouter from "./workspaces";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import insightsRouter from "./insights";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workspacesRouter);
router.use(projectsRouter);
router.use(tasksRouter);
router.use(insightsRouter);

export default router;
