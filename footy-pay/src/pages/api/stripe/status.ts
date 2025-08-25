// pages/api/stripe/status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-07-30.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { accountId } = req.query;

    if (!accountId || typeof accountId !== "string") {
        return res.status(400).json({ error: "Missing or invalid accountId" });
    }

    try {
        const account = await stripe.accounts.retrieve(accountId);
        return res.status(200).json({ charges_enabled: account.charges_enabled });
    } catch (err: any) {
        console.error("Stripe account retrieval error:", err);
        return res.status(500).json({ error: "Failed to check Stripe account status" });
    }
}
