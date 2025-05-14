import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import { collection, addDoc, doc, serverTimestamp, getDocs, query, orderBy, limit, where, writeBatch, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-hot-toast";
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { useTopics } from '../hooks/useTopics';

const AddMindCardModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        content: "",
    });
    const { topics } = useTopics();
    const [selectedKonu, setSelectedKonu] = useState("");
    const [altKonu, setAltKonu] = useState("");
    const [kartNo, setKartNo] = useState(1);
    const [maxKartNo, setMaxKartNo] = useState(1);
    const editorRef = useRef(null);

    useEffect(() => {
        if (selectedKonu) {
            const konuRef = doc(db, "miniCards-konular", selectedKonu);
            const cardsRef = collection(konuRef, "cards");
            const q = query(cardsRef, orderBy("kartNo", "desc"), limit(1));
            
            getDocs(q).then((snapshot) => {
                if (!snapshot.empty) {
                    const highestKartNo = snapshot.docs[0].data().kartNo;
                    setMaxKartNo(highestKartNo + 1);
                    setKartNo(highestKartNo + 1);
                } else {
                    setMaxKartNo(1);
                    setKartNo(1);
                }
            });
        }
    }, [selectedKonu]);

    const handleEditorChange = (content) => {
        setFormData(prev => ({
            ...prev,
            content: content
        }));
    };

    const handleImageUpload = async (file) => {
        try {
            const storageRef = ref(storage, `kart_resimleri/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            return downloadURL;
        } catch (error) {
            console.error("Resim yükleme hatası:", error);
            throw error;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedKonu || !altKonu.trim() || !formData.content.trim()) {
            toast.error('Lütfen tüm alanları doldurun!');
            return;
        }

        setLoading(true);
        try {
            const konuRef = doc(db, "miniCards-konular", selectedKonu);
            const cardsRef = collection(konuRef, "cards");

            const q = query(cardsRef, where("kartNo", ">=", kartNo), orderBy("kartNo", "desc"));
            const snapshot = await getDocs(q);
            
            const batch = writeBatch(db);
            
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    kartNo: doc.data().kartNo + 1,
                    updatedAt: serverTimestamp()
                });
            });

            const newCardRef = doc(cardsRef);
            batch.set(newCardRef, {
                altKonu,
                content: formData.content,
                kartNo,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            await batch.commit();
            toast.success('Kart başarıyla eklendi!');
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Kart eklenirken hata:', error);
            toast.error('Kart eklenirken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div 
                        className="absolute inset-0 bg-gray-500 opacity-75"
                        onClick={onClose}
                    ></div>
                </div>

                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="p-6">
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                            Yeni Akıl Kartı Ekle
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Konu
                                </label>
                                <select
                                    value={selectedKonu}
                                    onChange={(e) => setSelectedKonu(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    required
                                >
                                    <option value="">Konu Seçin</option>
                                    {topics.map((konu) => (
                                        <option key={konu.id} value={konu.id}>
                                            {konu.baslik}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Alt Konu
                                </label>
                                <input
                                    type="text"
                                    value={altKonu}
                                    onChange={(e) => setAltKonu(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="Alt konu başlığı"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                    İçerik
                                </label>
                                <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                    <CKEditor
                                        editor={ClassicEditor}
                                        data={formData.content}
                                        onChange={(event, editor) => {
                                            const data = editor.getData();
                                            setFormData(prev => ({
                                                ...prev,
                                                content: data
                                            }));
                                        }}
                                        config={{
                                            toolbar: ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|', 'outdent', 'indent', '|', 'imageUpload', 'blockQuote', 'insertTable', 'undo', 'redo'],
                                            image: {
                                                upload: {
                                                    types: ['jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff']
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {loading ? "Ekleniyor..." : "Ekle"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddMindCardModal; 