import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

function AddTopics() {
  const [baslik, setBaslik] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!baslik.trim()) {
      toast.error("Başlık boş olamaz!");
      return;
    }

    try {
      await addDoc(collection(db, "konular"), {
        baslik: baslik.trim()
      });
      
      setBaslik("");
      toast.success("Konu başarıyla eklendi!");
    } catch (error) {
      toast.error("Konu eklenirken bir hata oluştu: " + error.message);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="baslik" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Konu Başlığı
          </label>
          <input
            type="text"
            id="baslik"
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="Konu başlığını giriniz"
          />
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
        >
          Konu Ekle
        </button>
      </form>
    </div>
  );
}

export default AddTopics;