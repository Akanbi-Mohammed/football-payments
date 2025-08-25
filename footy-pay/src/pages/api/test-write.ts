import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
    try {
        await setDoc(doc(db, "test", "test-doc"), {
            hello: "world",
            timestamp: new Date().toISOString(),
        });

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("❌ Firestore test write error:", err);
        return res.status(500).json({ error: "Write failed" });
    }
}
