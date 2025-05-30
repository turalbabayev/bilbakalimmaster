import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const EditMotivationNote = ({ isOpen, onClose, note, onSuccess }) => {
    const [formData, setFormData] = useState({
        baslik: '',
        icerik: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (note) {
            setFormData({
                baslik: note.baslik || '',
                icerik: note.icerik || ''
            });
        }
    }, [note]);

    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['link', 'image'],
            ['clean']
        ],
        clipboard: {
            matchVisual: false
        }
    };

    const quillFormats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list', 'bullet',
        'align',
        'link', 'image'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.baslik.trim() || !formData.icerik.trim()) {
            toast.error('Lütfen tüm alanları doldurun!');
            return;
        }

        setLoading(true);
        try {
            const noteRef = doc(db, 'motivation-notes', note.id);
            await updateDoc(noteRef, {
                baslik: formData.baslik,
                icerik: formData.icerik,
                updatedAt: serverTimestamp()
            });

            toast.success('Motivasyon notu başarıyla güncellendi!');
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Not güncellenirken hata:', error);
            toast.error('Not güncellenirken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-11/12 max-w-4xl max-h-[calc(100vh-40px)] overflow-hidden">
                <div className="p-8 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Motivasyon Notunu Düzenle
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                            Başlık
                        </label>
                        <input
                            type="text"
                            value={formData.baslik}
                            onChange={(e) => setFormData(prev => ({ ...prev, baslik: e.target.value }))}
                            placeholder="Motivasyon notu başlığı"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        />
                    </div>

                    <div>
                        <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                            İçerik
                        </label>
                        <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                            <ReactQuill
                                theme="snow"
                                value={formData.icerik}
                                onChange={(value) => setFormData(prev => ({ ...prev, icerik: value }))}
                                modules={quillModules}
                                formats={quillFormats}
                                className="bg-white dark:bg-gray-800 h-64"
                            />
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Güncelleniyor...
                            </>
                        ) : (
                            'Güncelle'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditMotivationNote; 