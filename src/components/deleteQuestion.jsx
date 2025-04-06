import React from "react";
import { database } from "../firebase";
import { ref, remove } from "firebase/database";

const DeleteQuestion = ({ soruRef, onDelete }) => {
    const handleDelete = () => {
        if (window.confirm("Bu soruyu silmek istediğinize emin misiniz ?")) {
            remove(ref(database, soruRef))
                .then(() => {
                    alert("Bu soru başarıyla silindi.");
                    onDelete();
                })
                .catch((error) => {
                    console.error("Soru silinirken bir hata oluştu ? ", error);
                });
        }
    };

    return (
        <button
            className="bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600"
            onClick={handleDelete}
        >
            Sil
        </button>
    );
};

export default DeleteQuestion;