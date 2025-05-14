import React, { useState, useRef } from 'react';
import { db } from '../firebase';
import JoditEditor from 'jodit-react';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const AddQuestionSubbranch = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        baslik: '',
        icerik: ''
    });
    const [loading, setLoading] = useState(false);
    const editorRef = useRef(null);

    const config = {
        readonly: false,
        height: 400,
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
        ],
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.baslik.trim() || !formData.icerik.trim()) {
            toast.error('Lütfen tüm alanları doldurun!');
            return;
        }

        setLoading(true);
        try {
            // Mevcut notları al ve sıra numarasını belirle
            const subbranchRef = collection(db, 'question-subbranch');
            const q = query(subbranchRef, orderBy('siraNo', 'desc'));
            const snapshot = await getDocs(q);
            const lastSubbranch = snapshot.docs[0];
            const nextSiraNo = lastSubbranch ? lastSubbranch.data().siraNo + 1 : 1;

            // Yeni alt dalı ekle
            await addDoc(subbranchRef, {
                baslik: formData.baslik,
                icerik: formData.icerik,
                siraNo: nextSiraNo,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            toast.success('Alt dal başarıyla eklendi!');
            onSuccess?.();
            onClose();
            setFormData({ baslik: '', icerik: '' });
        } catch (error) {
            console.error('Alt dal eklenirken hata:', error);
            toast.error('Alt dal eklenirken bir hata oluştu!');
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
                        Yeni Alt Dal
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
                            placeholder="Alt dal başlığı"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        />
                    </div>

                    <div>
                        <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                            İçerik
                        </label>
                        <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                            <JoditEditor
                                ref={editorRef}
                                value={formData.icerik}
                                config={config}
                                onChange={(newContent) => setFormData(prev => ({ ...prev, icerik: newContent }))}
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
                                Ekleniyor...
                            </>
                        ) : (
                            'Ekle'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddQuestionSubbranch;
