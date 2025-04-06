import React, { useState } from "react";
import { database } from "../firebase";
import { ref, remove } from "firebase/database";

const DeleteSubbranch = ({ konular, closeModal }) => {
    const [selectedTopic, setSelectedTopic] = useState("");
    const [selectedSubtopic, setSelectedSubtopic] = useState("");
    const [selectedSubbranch, setSelectedSubbranch] = useState("");

    const handleDeleteSubbranch = () => {
        if (!selectedTopic) {
            alert("Bir konu seçmelisiniz!");
            return;
        }
        if (!selectedSubtopic) {
            alert("Bir alt konu seçmelisiniz!");
            return;
        }
        if (!selectedSubbranch) {
            alert("Bir alt dal seçmelisiniz!");
            return;
        }

        const subbranchRef = ref(
            database,
            `konular/${selectedTopic}/altkonular/${selectedSubtopic}/altdallar/${selectedSubbranch}`
        );
        remove(subbranchRef)
            .then(() => {
                alert("Alt dal başarıyla silindi.");
                setSelectedTopic("");
                setSelectedSubtopic("");
                setSelectedSubbranch("");
                closeModal();
            })
            .catch((error) => {
                console.error("Alt dal silinirken hata oluştu:", error);
                alert("Alt dal silinemedi!");
            });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4">Alt Dal Sil</h3>
                <div className="mb-4">
                    <label htmlFor="topic" className="block text-gray-700 mb-2">
                        Konu Seçin
                    </label>
                    <select
                        id="topic"
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="w-full p-2 border rounded"
                    >
                        <option value="">Bir konu seçin</option>
                        {konular.map((konu) => (
                            <option key={konu.id} value={konu.id}>
                                {konu.baslik}
                            </option>
                        ))}
                    </select>
                </div>
                {selectedTopic && (
                    <div className="mb-4">
                        <label htmlFor="subtopic" className="block text-gray-700 mb-2">
                            Alt Konu Seçin
                        </label>
                        <select
                            id="subtopic"
                            value={selectedSubtopic}
                            onChange={(e) => setSelectedSubtopic(e.target.value)}
                            className="w-full p-2 border rounded"
                        >
                            <option value="">Bir alt konu seçin</option>
                            {konular
                                .find((konu) => konu.id === selectedTopic)
                                ?.altkonular &&
                                Object.entries(
                                    konular.find((konu) => konu.id === selectedTopic).altkonular
                                ).map(([key, altkonu]) => (
                                    <option key={key} value={key}>
                                        {altkonu.baslik}
                                    </option>
                                ))}
                        </select>
                    </div>
                )}
                {selectedSubtopic && (
                    <div className="mb-4">
                        <label htmlFor="subbranch" className="block text-gray-700 mb-2">
                            Alt Dal Seçin
                        </label>
                        <select
                            id="subbranch"
                            value={selectedSubbranch}
                            onChange={(e) => setSelectedSubbranch(e.target.value)}
                            className="w-full p-2 border rounded"
                        >
                            <option value="">Bir alt dal seçin</option>
                            {konular
                                .find((konu) => konu.id === selectedTopic)
                                ?.altkonular?.[selectedSubtopic]?.altdallar &&
                                Object.entries(
                                    konular
                                        .find((konu) => konu.id === selectedTopic)
                                        .altkonular[selectedSubtopic].altdallar
                                ).map(([key, altdal]) => (
                                    <option key={key} value={key}>
                                        {altdal.baslik}
                                    </option>
                                ))}
                        </select>
                    </div>
                )}
                <div className="flex justify-end">
                    <button
                        onClick={handleDeleteSubbranch}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 mr-2"
                    >
                        Sil
                    </button>
                    <button
                        onClick={closeModal}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteSubbranch;