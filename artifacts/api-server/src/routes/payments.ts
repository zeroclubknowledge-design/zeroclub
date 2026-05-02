import { Router } from "express";
import { db } from "@workspace/db";
import { bootcampsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { generateId } from "../lib/ids";

const router = Router();

function getStripe() {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) return null;
  // Dynamic import to avoid crashing when key not set
  const Stripe = require("stripe");
  return new Stripe(key, { apiVersion: "2025-04-30" });
}

// POST /payments/bootcamp/:bootcampId/initiate
// Returns either a Stripe clientSecret (if STRIPE_SECRET_KEY is set)
// or a simulated success token for development
router.post("/bootcamp/:bootcampId/initiate", requireAuth, async (req: AuthRequest, res) => {
  const { bootcampId } = req.params as { bootcampId: string };
  try {
    const bootcamps = await db
      .select()
      .from(bootcampsTable)
      .where(eq(bootcampsTable.id, bootcampId))
      .limit(1);
    if (bootcamps.length === 0) {
      res.status(404).json({ error: "not_found", message: "Bootcamp not found" });
      return;
    }
    const bootcamp = bootcamps[0]!;
    if (bootcamp.priceCents === 0) {
      res.status(400).json({ error: "free_bootcamp", message: "This bootcamp is free" });
      return;
    }

    const stripe = getStripe();
    if (stripe) {
      // Real Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: bootcamp.priceCents,
        currency: "ngn",
        metadata: { bootcampId, userId: req.userId!, bootcampTitle: bootcamp.title },
      });
      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: bootcamp.priceCents,
        currency: "ngn",
        simulated: false,
      });
    } else {
      // Simulated payment for development (no Stripe key)
      const simulatedRef = `sim_${generateId()}`;
      res.json({
        clientSecret: null,
        paymentIntentId: simulatedRef,
        amount: bootcamp.priceCents,
        currency: "ngn",
        simulated: true,
      });
    }
  } catch (err) {
    req.log.error({ err }, "payment initiate error");
    res.status(500).json({ error: "internal_error", message: "Failed to initiate payment" });
  }
});

export default router;
