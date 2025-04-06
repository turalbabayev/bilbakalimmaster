import React, { useState, useEffect, use } from "react";
import Layout from "../../components/layout";
import { Link } from "react-router-dom";
import { database } from "../../firebase";
import { ref, onValue, set } from "firebase/database";

function QuestionsPage() {
    const [konular, setKonular] = useState([]);

    useEffect(() => {
        const konularRef = ref(database, "konular");
        const unsubscribe = onValue(konularRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const formattedData = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                }));
                setKonular(formattedData);
            } else {
                setKonular([]);
            }
        });
        return () => unsubscribe();
    }, []);

    return (
        <Layout>
            <div className="min-h-screen bg-gray-400">
                <div className="container mx-auto py-6 px-4">
                    <h1 className="text-2xl font-bold text-gray-800 mb-6">Sorular</h1>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {konular.map((konu) => (
                            <Link
                                to={`/question/${konu.id}`}
                                key={konu.id}
                                className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition"
                            >
                                <h2 className="text-lg font-semibold text-indigo-600 mb-2">
                                    {konu.baslik || "Başlık Yok"}
                                </h2>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default QuestionsPage;