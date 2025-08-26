import { db } from "@/lib/firebase";
import { collection, doc, getDoc, addDoc } from "firebase/firestore";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { title, date, price, maxPlayers, organiserEmail } = req.body;

    if (!organiserEmail) return res.status(400).json({ error: "Missing organiser email" });

    const organiserSnap = await getDoc(doc(db, "organisers", organiserEmail));
    if (!organiserSnap.exists()) {
        return res.status(400).json({ error: "Organiser not found or not onboarded with Stripe" });
    }

    const { stripeAccountId } = organiserSnap.data();
    if (!stripeAccountId) {
        return res.status(400).json({ error: "Stripe account not connected" });
    }

    const gameRef = await addDoc(collection(db, "games"), {
        title,
        date,
        price,
        maxPlayers,
        organiserEmail,
        stripeAccountId,
        createdAt: new Date().toISOString(),
    });

    res.status(200).json({ gameId: gameRef.id });
}
