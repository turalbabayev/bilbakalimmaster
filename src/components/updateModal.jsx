import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, update, onValue } from "firebase/database";

const UpdateModal = ({ isOpen, closeModal, updatePath, itemType }) => {
    const [title, setTitle] = useState("");

    useEffect(() => {
        if (updatePath) {
            const itemRef = ref(database, updatePath);
            onValue(itemRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setTitle(data.baslik || "");
                }
            });
        }
    }, [updatePath]);

    const handleUpdate = () => {
        if (!title.trim()) {
            alert("Başlık boş olamaz!");
            return;
        }

        const updatedData = { baslik: title };
        const itemRef = ref(database, updatePath);

        update(itemRef, updatedData)
            .then(() => {
                alert(`${itemType} başarıyla güncellendi.`);
                closeModal();
            })
            .catch((error) => {
                console.error(`${itemType} güncelleme hatası:`, error);
                alert(`${itemType} güncellenirken bir hata oluştu!`);
            });
    };

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full">
                <h3 className="text-xl font-semibold mb-2">{itemType} Güncelle</h3>
                <div className="mb-4">
                    <label htmlFor="title">Başlık</label>
                    <input 
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-2 border rounded"
                    />
                </div>
                <div className="flex justify-end space-x-2">
                    <button
                        onClick={handleUpdate}
                        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                    >
                        Güncelle
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

export default UpdateModal;