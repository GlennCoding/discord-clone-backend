import { Router } from "express";
import { handleRefreshToken } from "../controllers/refreshController";

const router = Router();

router.get("/", handleRefreshToken);

export default router;
