import React, { useState } from "react";
import { db } from "../firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

const DeleteQuestion = ({ soruRef, onDelete }) => {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!window.confirm("Bu soruyu silmek istediğinizden emin misiniz?")) {
            return;
        }

        setLoading(true);
        try {
            // soruRef formatı: konular/konuId/altkonular/altKonuId/sorular/soruId
            const [_, konuId, __, altKonuId, ___, soruId] = soruRef.split('/');
            const soruDocRef = doc(db, `konular/${konuId}/altkonular/${altKonuId}/sorular/${soruId}`);
            
            await deleteDoc(soruDocRef);
            
            toast.success("Soru başarıyla silindi!");
            if (onDelete) onDelete();
        } catch (error) {
            console.error("Soru silinirken hata:", error);
            toast.error(`Soru silinirken bir hata oluştu: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-200"
        >
            <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {loading ? "Siliniyor..." : "Sil"}
            </div>
        </button>
    );
};

export default DeleteQuestion;