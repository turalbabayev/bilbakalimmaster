import React, { useState } from "react";
import { db } from "../firebase";
import { doc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { toast } from "react-hot-toast";

function DeleteSubtopics({ konular, closeModal }) {
    const [selectedKonu, setSelectedKonu] = useState("");
    const [selectedAltKonu, setSelectedAltKonu] = useState("");
    const [altKonular, setAltKonular] = useState([]);

    const handleKonuChange = async (e) => {
        const konuId = e.target.value;
        setSelectedKonu(konuId);
        setSelectedAltKonu("");

        if (konuId) {
            try {
                const altkonularRef = collection(db, "konular", konuId, "altkonular");
                const altkonularSnap = await getDocs(altkonularRef);
                
                const altkonularData = [];
                altkonularSnap.forEach((doc) => {
                    altkonularData.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                setAltKonular(altkonularData);
            } catch (error) {
                console.error("Alt konular çekilirken hata oluştu:", error);
                toast.error("Alt konular yüklenirken bir hata oluştu");
            }
        } else {
            setAltKonular([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedKonu || !selectedAltKonu) {
            toast.error("Lütfen bir konu ve alt konu seçin");
            return;
        }

        try {
            await deleteDoc(doc(db, "konular", selectedKonu, "altkonular", selectedAltKonu));
            toast.success("Alt konu başarıyla silindi");
            closeModal();
        } catch (error) {
            console.error("Alt konu silinirken hata oluştu:", error);
            toast.error("Alt konu silinirken bir hata oluştu");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Alt Konu Sil</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                            Konu Seçin
                        </label>
                        <select
                            value={selectedKonu}
                            onChange={handleKonuChange}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required
                        >
                            <option value="">Seçiniz</option>
                            {konular.map((konu) => (
                                <option key={konu.id} value={konu.id}>
                                    {konu.baslik}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                            Alt Konu Seçin
                        </label>
                        <select
                            value={selectedAltKonu}
                            onChange={(e) => setSelectedAltKonu(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required
                        >
                            <option value="">Seçiniz</option>
                            {altKonular.map((altKonu) => (
                                <option key={altKonu.id} value={altKonu.id}>
                                    {altKonu.baslik}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            Sil
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default DeleteSubtopics;