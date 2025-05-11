import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, updateDoc, serverTimestamp, collection, query, orderBy, limit, where, writeBatch, getDocs } from "firebase/firestore";
import { toast } from "react-hot-toast";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useTopics } from '../hooks/useTopics';

const EditMindCardModal = ({ isOpen, onClose, card, konuId, onSuccess }) => {
    const { topics } = useTopics();
    const [formData, setFormData] = useState({
        selectedKonu: '',
        altKonu: '',
        content: '',
        resim: null,
        resimTuru: '',
        resimPreview: null
    });
    const [loading, setLoading] = useState(false);
    const [kartNo, setKartNo] = useState(card?.kartNo || 1);
    const [maxKartNo, setMaxKartNo] = useState(1);

    useEffect(() => {
        if (card) {
            setFormData({
                selectedKonu: card.konuId || '',
                altKonu: card.altKonu || '',
                content: card.content || '',
                resim: null,
                resimTuru: card.resimTuru || '',
                resimPreview: card.resim || null
            });
        }
    }, [card]);

    useEffect(() => {
        if (card?.konuId) {
            // Seçili konudaki en yüksek kart numarasını bul
            const konuRef = doc(db, "miniCards-konular", card.konuId);
            const cardsRef = collection(konuRef, "cards");
            const q = query(cardsRef, orderBy("kartNo", "desc"), limit(1));
            
            getDocs(q).then((snapshot) => {
                if (!snapshot.empty) {
                    const highestKartNo = snapshot.docs[0].data().kartNo;
                    setMaxKartNo(highestKartNo);
                }
            });
        }
    }, [card?.konuId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.content.trim() || !formData.selectedKonu || !formData.altKonu) {
            toast.error('Lütfen gerekli alanları doldurun!');
            return;
        }

        setLoading(true);
        try {
            const konuRef = doc(db, "miniCards-konular", card.konuId);
            const cardsRef = collection(konuRef, "cards");
            const cardRef = doc(cardsRef, card.id);

            // Eğer kart numarası değiştiyse, diğer kartları güncelle
            if (kartNo !== card.kartNo) {
                const batch = writeBatch(db);
                
                if (kartNo > card.kartNo) {
                    // Yukarı taşınıyorsa, aradaki kartları bir aşağı kaydır
                    const q = query(cardsRef, 
                        where("kartNo", ">", card.kartNo),
                        where("kartNo", "<=", kartNo),
                        orderBy("kartNo")
                    );
                    const snapshot = await getDocs(q);
                    snapshot.docs.forEach(doc => {
                        batch.update(doc.ref, {
                            kartNo: doc.data().kartNo - 1,
                            updatedAt: serverTimestamp()
                        });
                    });
                } else {
                    // Aşağı taşınıyorsa, aradaki kartları bir yukarı kaydır
                    const q = query(cardsRef,
                        where("kartNo", ">=", kartNo),
                        where("kartNo", "<", card.kartNo),
                        orderBy("kartNo")
                    );
                    const snapshot = await getDocs(q);
                    snapshot.docs.forEach(doc => {
                        batch.update(doc.ref, {
                            kartNo: doc.data().kartNo + 1,
                            updatedAt: serverTimestamp()
                        });
                    });
                }

                // Kartı güncelle
                batch.update(cardRef, {
                    content: formData.content,
                    explanation: formData.explanation,
                    kartNo,
                    updatedAt: serverTimestamp()
                });

                await batch.commit();
            } else {
                // Sadece içeriği güncelle
                await updateDoc(cardRef, {
                    content: formData.content,
                    explanation: formData.explanation,
                    updatedAt: serverTimestamp()
                });
            }

            toast.success('Kart başarıyla güncellendi!');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Kart güncellenirken hata:', error);
            toast.error('Kart güncellenirken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Resim boyutu 5MB\'dan küçük olmalıdır.');
                return;
            }

            // Resim önizleme için URL oluştur
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    resim: file,
                    resimTuru: file.type,
                    resimPreview: reader.result
                }));
            };
            reader.readAsDataURL(file);
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
                            Akıl Kartını Düzenle
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Konu
                                </label>
                                <select
                                    value={formData.selectedKonu}
                                    onChange={(e) => setFormData(prev => ({ ...prev, selectedKonu: e.target.value }))}
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
                                    value={formData.altKonu}
                                    onChange={(e) => setFormData(prev => ({ ...prev, altKonu: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="Alt konu başlığı"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    İçerik
                                </label>
                                <div className="border border-gray-300 rounded-md dark:border-gray-600">
                                    <ReactQuill
                                        value={formData.content}
                                        onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                                        className="h-64 mb-12 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Resim (Opsiyonel)
                                </label>
                                <input
                                    type="file"
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                        Kart No
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="number"
                                            min="1"
                                            max={maxKartNo}
                                            value={kartNo}
                                            onChange={(e) => setKartNo(parseInt(e.target.value))}
                                            className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            (Maksimum: {maxKartNo})
                                        </span>
                                    </div>
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