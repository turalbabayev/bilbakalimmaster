import React, { useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

function AddSubtopics({ selectedTopic, closeModal }) {
  const [baslik, setBaslik] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!baslik.trim()) {
      toast.error("Alt konu başlığı boş olamaz!");
      return;
    }

    try {
      const konuRef = doc(db, "konular", selectedTopic);
      await updateDoc(konuRef, {
        [`altkonular.${Date.now()}`]: {
          baslik: baslik.trim(),
          altdallar: {}
        }
      });

      setBaslik("");
      closeModal();
      toast.success("Alt konu başarıyla eklendi!");
    } catch (error) {
      toast.error("Alt konu eklenirken bir hata oluştu: " + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg max-w-md w-full">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Alt Konu Ekle</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="baslik" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Alt Konu Başlığı
            </label>
            <input
              type="text"
              id="baslik"
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
              placeholder="Alt konu başlığını giriniz"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
            >
              Ekle
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800"
            >
              Kapat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddSubtopics;