import React, { useState } from "react";
import { database } from "../firebase";
import { ref, update } from "firebase/database";

const AddSubbranch = ({ konular, closeModal}) => {
    const [selectedKonu, setSelectedKonu] = useState("");
    const [selectedAltKonu, setSelectedAltKonu] = useState("");
    const [newAltDal, setNewAltDal] = useState("");

    const handleAddAltDal = () => {
        if (selectedKonu && selectedAltKonu && newAltDal) {
            const altDalRef = ref(database, `konular/${selectedKonu}/altkonular/${selectedAltKonu}/altdallar`);
            update(altDalRef, {
                [Date.now()]: {baslik: newAltDal},
            });
            alert("Alt dal başarıyla eklendi");
            closeModal();
        } else {
            alert("Lütfen tüm alanları doldurun.");
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded shadow w-96">
                <h3 className="text-xl font-semibold mb-4">Alt Dal Ekle</h3>
                <div className="mb-4">
                    <label className="block font-medium mb-1">Konu Seç</label>
                    <select
                        className="w-full border px-3 py-2 rounded"
                        value={selectedKonu}
                        onChange={(e) => setSelectedKonu(e.target.value)}
                    >
                        <option value="">Konu Seç</option>
                        {konular.map((konu) => (
                            <option key={konu.id} value={konu.id}>
                                {konu.baslik}
                            </option>
                        ))}
                    </select>
                </div>
                {selectedKonu && (
                    <div className="mb-4">
                        <label className="block font-medium mb-1">Alt Konu Seç</label>
                        <select
                            className="w-full border px-3 py-2 rounded"
                            value={selectedAltKonu}
                            onChange={(e) => setSelectedAltKonu(e.target.value)}
                        >
                            <option value="">Alt Konu Seç</option>
                            {Object.entries(konular.find(k => k.id === selectedKonu).altkonular || {}).map(([key, altkonu]) => (
                                <option key={key} value={key}>
                                    {altkonu.baslik}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                {selectedAltKonu && (
                    <div className="mb-4">
                        <label className="block font-medium mb-1">Alt Dal Başlık</label>
                        <input
                            type="text"
                            className="w-full border px-3 py-2 rounded"
                            value={newAltDal}
                            onChange={(e) => setNewAltDal(e.target.value)}
                        />
                    </div>
                )}
                <div className="flex justify-end">
                    <button
                        onClick={handleAddAltDal}
                        className="px-4 py-2 bg-blue-500 text-white rounded mr-2 hover:bg-blue-600"
                    >
                        Ekle
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

export default AddSubbranch;