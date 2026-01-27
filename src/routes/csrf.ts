import { Router } from "express";

import { handleGetCsrfToken } from "../controllers/csrfController";

const router = Router();

router.get("/", handleGetCsrfToken);

export default router;
