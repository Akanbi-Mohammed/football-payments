// pages/api/stripe/status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { accountId } = req.query;
    if (!accountId || typeof accountId !== "string") {
        return res.status(400).json({ error: "Missing or invalid accountId" });
    }

    try {
        const acct = await stripe.accounts.retrieve(accountId);

        return res.status(200).json({
            id: acct.id,
            charges_enabled: acct.charges_enabled,
            payouts_enabled: acct.payouts_enabled,
            capabilities: acct.capabilities ?? null,
            requirements: {
                currently_due: acct.requirements?.currently_due ?? [],
                eventually_due: acct.requirements?.eventually_due ?? [],
                past_due: acct.requirements?.past_due ?? [],
                disabled_reason: acct.requirements?.disabled_reason ?? null,
            },
        });
    } catch (err: any) {
        const msg = err?.raw?.message || err?.message || "Failed to check Stripe account status";
        const status = err?.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
        console.error("Stripe account retrieval error:", msg);
        return res.status(status).json({ error: msg });
    }
}
