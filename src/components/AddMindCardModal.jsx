import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import { collection, addDoc, doc, serverTimestamp, getDocs, query, orderBy, limit, where, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-hot-toast";
import JoditEditor from 'jodit-react';
import { useTopics } from '../hooks/useTopics';

const AddMindCardModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        kartNo: '',
        altKonu: '',
        icerik: '',
    });
    const { topics } = useTopics();
    const [selectedKonu, setSelectedKonu] = useState("");
    const [maxKartNo, setMaxKartNo] = useState(0);
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
                    setFormData(prev => ({ ...prev, kartNo: highestKartNo + 1 }));
                } else {
                    setMaxKartNo(1);
                    setFormData(prev => ({ ...prev, kartNo: 1 }));
                }
            });
        }
    }, [selectedKonu]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageUpload = async (file) => {
        try {
            setLoading(true);
            const storageRef = ref(storage, `mind_card_images/${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            setLoading(false);
            return downloadURL;
        } catch (error) {
            console.error('Resim yükleme hatası:', error);
            setLoading(false);
            return null;
        }
    };

    const config = {
        readonly: false,
        height: 400,
        uploader: {
            insertImageAsBase64URI: false,
            url: handleImageUpload,
            format: 'json',
            method: 'POST',
            filesVariableName: 'files',
            prepareData: function (data) {
                return data;
            },
            isSuccess: function (resp) {
                return resp;
            },
            getMsg: function (resp) {
                return resp;
            },
            process: function (resp) {
                return resp;
            },
            error: function (e) {
                console.log(e);
            },
            defaultHandlerSuccess: function (data, resp) {
                return data;
            },
        },
        buttons: [
            'source',
            '|',
            'bold',
            'italic',
            'underline',
            'strikethrough',
            '|',
            'font',
            'fontsize',
            'brush',
            'paragraph',
            '|',
            'superscript',
            'subscript',
            '|',
            'ul',
            'ol',
            '|',
            'outdent',
            'indent',
            '|',
            'align',
            'undo',
            'redo',
            '\n',
            'selectall',
            'cut',
            'copy',
            'paste',
            '|',
            'hr',
            'eraser',
            'copyformat',
            '|',
            'symbol',
            'fullsize',
            'print',
            'about',
            '|',
            'image',
            'table',
        ],
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedKonu || !formData.altKonu.trim() || !formData.icerik.trim()) {
            toast.error('Lütfen tüm alanları doldurun!');
            return;
        }

        setLoading(true);
        try {
            const konuRef = doc(db, "miniCards-konular", selectedKonu);
            const cardsRef = collection(konuRef, "cards");

            const q = query(cardsRef, where("kartNo", ">=", formData.kartNo), orderBy("kartNo", "desc"));
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
                altKonu: formData.altKonu,
                content: formData.icerik,
                kartNo: formData.kartNo,
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
        <div className={`fixed inset-0 z-50 overflow-y-auto ${isOpen ? '' : 'hidden'}`}>
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Akıl Kartı Ekle</h3>
                                <div className="mt-2 space-y-4">
                                    <div>
                                        <label htmlFor="kartNo" className="block text-sm font-medium text-gray-700">Kart No</label>
                                        <input
                                            type="number"
                                            name="kartNo"
                                            id="kartNo"
                                            value={formData.kartNo}
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="altKonu" className="block text-sm font-medium text-gray-700">Alt Konu</label>
                                        <input
                                            type="text"
                                            name="altKonu"
                                            id="altKonu"
                                            value={formData.altKonu}
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="icerik" className="block text-sm font-medium text-gray-700">İçerik</label>
                                        <JoditEditor
                                            ref={editorRef}
                                            value={formData.icerik}
                                            config={config}
                                            onChange={(newContent) => setFormData({ ...formData, icerik: newContent })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            {loading ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            İptal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddMindCardModal; 