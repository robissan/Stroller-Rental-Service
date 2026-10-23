import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({
    status: "ok",
    detail:
      "Process is up. This check does not read product data. Little Roam bookings stay on the device.",
  });
  res.json(data);
});

export default router;
