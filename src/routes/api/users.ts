import { Router, Response } from "express";
import { UserRequest } from "../../middleware/verifyJWT";

const router = Router();

router.get("/", async (req: UserRequest, res: Response) => {
  console.log(req.userId);
  res.send({
    message: `Hello wonderful world! This is your user id: ${req.userId}`,
  });
});

export default router;
