import React from "react";
import { db } from "../firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

function DeleteTopics({ selectedTopic, closeModal }) {
  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "konular", selectedTopic));
      closeModal();
      toast.success("Konu başarıyla silindi!");
    } catch (error) {
      toast.error("Konu silinirken bir hata oluştu: " + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg max-w-md w-full">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Konuyu Sil</h3>
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          Bu konuyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
          >
            Sil
          </button>
          <button
            onClick={closeModal}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteTopics;