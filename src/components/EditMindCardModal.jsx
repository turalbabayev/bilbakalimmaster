import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { doc, updateDoc, serverTimestamp, collection, query, orderBy, limit, where, writeBatch, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { toast } from 'react-hot-toast';

const EditMindCardModal = ({ isOpen, onClose, cardId, konuId }) => {
    const [loading, setLoading] = useState(false);
    const [card, setCard] = useState(null);
    const [maxKartNo, setMaxKartNo] = useState(1);

    useEffect(() => {
        if (isOpen && cardId && konuId) {
            const fetchCard = async () => {
                try {
                    const konuRef = doc(db, "miniCards-konular", konuId);
                    const cardRef = doc(collection(konuRef, "cards"), cardId);
                    const cardDoc = await getDocs(cardRef);
                    
                    if (cardDoc.exists()) {
                        setCard(cardDoc.data());
                    }

                    const cardsRef = collection(konuRef, "cards");
                    const q = query(cardsRef, orderBy("kartNo", "desc"), limit(1));
                    const snapshot = await getDocs(q);
                    
                    if (!snapshot.empty) {
                        setMaxKartNo(snapshot.docs[0].data().kartNo);
                    }
                } catch (error) {
                    console.error("Kart yüklenirken hata:", error);
                    toast.error("Kart yüklenirken bir hata oluştu!");
                }
            };
            fetchCard();
        }
    }, [isOpen, cardId, konuId]);

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
        if (!card.altKonu.trim() || !card.content.trim()) {
            toast.error('Lütfen tüm alanları doldurun!');
            return;
        }

        setLoading(true);
        try {
            const konuRef = doc(db, "miniCards-konular", konuId);
            const cardRef = doc(collection(konuRef, "cards"), cardId);

            if (card.kartNo !== card.originalKartNo) {
                const cardsRef = collection(konuRef, "cards");
                const batch = writeBatch(db);

                if (card.kartNo > card.originalKartNo) {
                    const q = query(
                        cardsRef,
                        where("kartNo", ">", card.originalKartNo),
                        where("kartNo", "<=", card.kartNo)
                    );
                    const snapshot = await getDocs(q);
                    snapshot.docs.forEach((doc) => {
                        batch.update(doc.ref, {
                            kartNo: doc.data().kartNo - 1,
                            updatedAt: serverTimestamp()
                        });
                    });
                } else {
                    const q = query(
                        cardsRef,
                        where("kartNo", ">=", card.kartNo),
                        where("kartNo", "<", card.originalKartNo)
                    );
                    const snapshot = await getDocs(q);
                    snapshot.docs.forEach((doc) => {
                        batch.update(doc.ref, {
                            kartNo: doc.data().kartNo + 1,
                            updatedAt: serverTimestamp()
                        });
                    });
                }

                batch.update(cardRef, {
                    altKonu: card.altKonu,
                    content: card.content,
                    kartNo: card.kartNo,
                    updatedAt: serverTimestamp()
                });

                await batch.commit();
            } else {
                await updateDoc(cardRef, {
                    altKonu: card.altKonu,
                    content: card.content,
                    updatedAt: serverTimestamp()
                });
            }

            toast.success('Kart başarıyla güncellendi!');
            onClose();
        } catch (error) {
            console.error('Kart güncellenirken hata:', error);
            toast.error('Kart güncellenirken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !card) return null;

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
                            Akıl Kartı Düzenle
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Kart Numarası
                                </label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="number"
                                        value={card.kartNo}
                                        onChange={(e) => setCard({...card, kartNo: parseInt(e.target.value)})}
                                        min="1"
                                        max={maxKartNo}
                                        className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        / {maxKartNo}
                                    </span>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Alt Konu
                                </label>
                                <input
                                    type="text"
                                    value={card.altKonu}
                                    onChange={(e) => setCard({...card, altKonu: e.target.value})}
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
                                        data={card.content}
                                        onChange={(event, editor) => {
                                            const data = editor.getData();
                                            setCard({...card, content: data});
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
                                    {loading ? "Güncelleniyor..." : "Güncelle"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditMindCardModal; 