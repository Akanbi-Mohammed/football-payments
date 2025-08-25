// src/components/ProtectedRoute.tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Props = {
    children: React.ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
    const router = useRouter();
    const [user, setUser] = useState<User | null | undefined>(undefined);

    // Inline useCurrentUser hook logic
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user === null) router.push("/login"); // not signed in
    }, [user]);

    if (user === undefined) return <p>Loading...</p>;

    return <>{children}</>;
}
