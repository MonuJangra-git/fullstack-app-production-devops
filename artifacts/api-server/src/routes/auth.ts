import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";

const router = Router();

router.get("/me", async (req, res): Promise<void> => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  res.json(session?.user ?? null);
});

export default router;
