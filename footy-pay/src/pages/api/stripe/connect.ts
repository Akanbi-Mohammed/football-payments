import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { ServiceAccount } from 'firebase-admin';
import serviceAccountRaw from '@/lib/serviceAccountKey.json';

const serviceAccount = serviceAccountRaw as ServiceAccount;


if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const db = getFirestore();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-07-30.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid email address' });
        }

        console.log("📦 Creating Stripe Express account...");
        const account = await stripe.accounts.create({
            type: 'express',
            email,
            capabilities: {
                transfers: { requested: true },
                card_payments: { requested: true },
            },
            business_type: 'individual',
        });
        console.log("✅ Account created:", account.id);

        // 💾 Save Stripe account to Firestore
        await db.collection('organisers').doc(email).set({
            email,
            stripeAccountId: account.id,
            createdAt: new Date().toISOString(),
        });
        console.log("📁 Firestore organiser record saved");

        const origin = req.headers.origin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        const returnUrl = `${origin}/create?accountId=${account.id}`;

        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: returnUrl,
            return_url: returnUrl,
            type: 'account_onboarding',
            collect: 'currently_due',
        });

        console.log("🔗 Onboarding link:", accountLink.url);
        return res.status(200).json({ url: accountLink.url });
    } catch (error: any) {
        console.error("❌ Stripe error:", error?.message);
        return res.status(500).json({ error: 'Failed to create Stripe Connect Link' });
    }
}
