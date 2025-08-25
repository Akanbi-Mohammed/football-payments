// src/pages/api/debug/runtime.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
    res.status(200).json({
        SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? null,
        hasStripeSecret: Boolean(process.env.STRIPE_SECRET_KEY),
        hasFirebaseAdmin: Boolean(process.env.FIREBASE_ADMIN_CREDENTIALS),
        vercelUrl: process.env.VERCEL_URL ?? null,
        nodeEnv: process.env.NODE_ENV,
    });
}
