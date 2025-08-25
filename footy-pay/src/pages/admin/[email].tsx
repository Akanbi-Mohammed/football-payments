import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PlayerList from "@/components/PlayerList";

export default function OrganiserDashboard() {
    const router = useRouter();
    const { email } = router.query;
    const [games, setGames] = useState<any[]>([]);
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

    useEffect(() => {
        if (!email || typeof email !== "string") return;

        const fetchGames = async () => {
            const q = query(
                collection(db, "games"),
                where("organiserEmail", "==", email),
                orderBy("createdAt", "desc")
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGames(data);
        };

        fetchGames();
    }, [email]);

    return (
        <main className="p-6">
            <h1 className="text-2xl font-bold mb-4">Games for {email}</h1>
            {games.length === 0 && (
                <p className="text-gray-500">No games found for this email.</p>
            )}
            {games.map((game) => (
                <div key={game.id} className="mb-4 border rounded p-4">
                    <h2 className="text-lg font-semibold">{game.title}</h2>
                    <p>{game.date} at {game.time}</p>
                    <p>£{game.price} · Max Players: {game.maxPlayers}</p>
                    <a
                        href={`/play/${game.id}`}
                        className="block mt-2 text-blue-600 underline"
                        target="_blank"
                    >
                        Public Link ↗
                    </a>
                    <button
                        onClick={() => setSelectedGameId(game.id)}
                        className="mt-2 text-green-600 underline"
                    >
                        View Players
                    </button>
                </div>
            ))}
            {selectedGameId && <PlayerList gameId={selectedGameId} />}
        </main>
    );
}
