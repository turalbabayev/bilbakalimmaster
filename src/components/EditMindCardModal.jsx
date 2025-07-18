import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { doc, updateDoc, serverTimestamp, collection, query, orderBy, limit, where, writeBatch, getDocs } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-hot-toast";
import { Editor } from '@tinymce/tinymce-react';
import { useTopics } from '../hooks/useTopics';

const EditMindCardModal = ({ isOpen, onClose, card, konuId, onSuccess }) => {
    const { topics } = useTopics();
    const [formData, setFormData] = useState({
        selectedKonu: '',
        altKonu: '',
        content: '',
        titleColor: '',
        contentColor: ''
    });
    const [loading, setLoading] = useState(false);
    const [kartNo, setKartNo] = useState(card?.kartNo || 1);
    const [maxKartNo, setMaxKartNo] = useState(1);
    const editorRef = useRef(null);

    useEffect(() => {
        if (card) {
            setFormData({
                selectedKonu: card.konuId || '',
                altKonu: card.altKonu || '',
                content: card.content || '',
                titleColor: card.titleColor || '',
                contentColor: card.contentColor || ''
            });
        }
    }, [card]);

    useEffect(() => {
        if (card?.konuId) {
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

    const handleImageUpload = async (blobInfo) => {
        try {
            setLoading(true);
            const storage = getStorage();
            const timestamp = Date.now();
            const fileExtension = blobInfo.filename().split('.').pop();
            const fileName = `${timestamp}.${fileExtension}`;
            const imageRef = storageRef(storage, `mind-cards-images/${fileName}`);
            
            // Blob'u File'a çeviriyoruz
            const file = new File([blobInfo.blob()], fileName, { type: blobInfo.blob().type });
            
            // Metadata ekliyoruz
            const metadata = {
                contentType: file.type,
                customMetadata: {
                    originalName: blobInfo.filename()
                }
            };
            
            await uploadBytes(imageRef, file, metadata);
            const downloadUrl = await getDownloadURL(imageRef);
            
            return downloadUrl;
        } catch (error) {
            console.error('Resim yüklenirken hata:', error);
            toast.error('Resim yüklenirken bir hata oluştu!');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.altKonu.trim() || !formData.content.trim()) {
            toast.error("Lütfen tüm alanları doldurun!");
            return;
        }

        setLoading(true);
        try {
            const konuRef = doc(db, "miniCards-konular", card.konuId);
            const cardsRef = collection(konuRef, "cards");
            const batch = writeBatch(db);

            // Eğer kart numarası değiştiyse, diğer kartların numaralarını güncelle
            if (kartNo !== card.kartNo) {
                const q = query(cardsRef);
                const snapshot = await getDocs(q);
                
                snapshot.docs.forEach(doc => {
                    const cardData = doc.data();
                    if (kartNo > card.kartNo) {
                        // Yeni pozisyon daha büyükse
                        if (cardData.kartNo > card.kartNo && cardData.kartNo <= kartNo) {
                            batch.update(doc.ref, {
                                kartNo: cardData.kartNo - 1,
                                updatedAt: serverTimestamp()
                            });
                        }
                    } else {
                        // Yeni pozisyon daha küçükse
                        if (cardData.kartNo >= kartNo && cardData.kartNo < card.kartNo) {
                            batch.update(doc.ref, {
                                kartNo: cardData.kartNo + 1,
                                updatedAt: serverTimestamp()
                            });
                        }
                    }
                });
            }

            // Güncel kartı güncelle
            const cardRef = doc(konuRef, "cards", card.id);
            batch.update(cardRef, {
                altKonu: formData.altKonu,
                content: formData.content,
                kartNo: kartNo,
                updatedAt: serverTimestamp(),
                titleColor: formData.titleColor,
                contentColor: formData.contentColor
            });

            await batch.commit();
            toast.success("Kart başarıyla güncellendi!");
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Kart güncellenirken hata:", error);
            toast.error("Kart güncellenirken bir hata oluştu!");
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
                                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                    Alt Konu
                                </label>
                                <input
                                    type="text"
                                    value={formData.altKonu}
                                    onChange={(e) => setFormData(prev => ({ ...prev, altKonu: e.target.value }))}
                                    placeholder="Alt konu girin"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    style={{ color: formData.titleColor || 'inherit' }}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                    Başlık Rengi
                                </label>
                                <input
                                    type="color"
                                    value={formData.titleColor || '#000000'}
                                    onChange={(e) => setFormData(prev => ({ ...prev, titleColor: e.target.value }))}
                                    className="w-full h-12 rounded-lg cursor-pointer"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                    İçerik
                                </label>
                                <Editor
                                    apiKey="83kpgxax9nnx3wf6kruxk3rhefe9xso7fgxkah69lh4eie05"
                                    onInit={(evt, editor) => editorRef.current = editor}
                                    value={formData.content}
                                    onEditorChange={(content) => setFormData(prev => ({ ...prev, content }))}
                                    init={{
                                        height: 300,
                                        menubar: false,
                                        plugins: [
                                            'advlist', 'autolink', 'lists', 'link', 'image', 
                                            'charmap', 'preview', 'anchor', 'searchreplace', 'visualblocks', 
                                            'code', 'fullscreen', 'insertdatetime', 'media', 'table', 
                                            'help', 'wordcount'
                                        ],
                                        toolbar: 'undo redo | blocks | ' +
                                            'bold italic underline forecolor | alignleft aligncenter ' +
                                            'alignright alignjustify | bullist numlist outdent indent | ' +
                                            'removeformat | image',
                                        formats: {
                                            underline: { inline: 'u' }
                                        },
                                        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                                        images_upload_handler: handleImageUpload,
                                        automatic_uploads: true,
                                        images_reuse_filename: true,
                                        paste_data_images: true,
                                        paste_as_text: true,
                                        paste_enable_default_filters: true,
                                        paste_word_valid_elements: "p,b,strong,i,em,h1,h2,h3,h4,h5,h6",
                                        paste_retain_style_properties: "color,background-color,font-size",
                                        convert_urls: false,
                                        relative_urls: false,
                                        remove_script_host: false
                                    }}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                    İçerik Rengi
                                </label>
                                <input
                                    type="color"
                                    value={formData.contentColor || '#000000'}
                                    onChange={(e) => setFormData(prev => ({ ...prev, contentColor: e.target.value }))}
                                    className="w-full h-12 rounded-lg cursor-pointer"
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