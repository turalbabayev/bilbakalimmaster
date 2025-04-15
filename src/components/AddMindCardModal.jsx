import React, { useState } from "react";
import { db, storage } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-hot-toast";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const AddMindCardModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        topic: "",
        subtopic: "",
        content: "",
        image: null,
        resimPreview: null
    });

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['link'],
            ['clean']
        ],
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list', 'bullet',
        'align',
        'link'
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEditorChange = (content) => {
        setFormData(prev => ({
            ...prev,
            content: content
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    image: file,
                    resimPreview: reader.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let imageUrl = null;

            if (formData.image) {
                // Resmi Firebase Storage'a yükle
                const storageRef = ref(storage, `mind-cards/${Date.now()}_${formData.image.name}`);
                const snapshot = await uploadBytes(storageRef, formData.image);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            const mindCardData = {
                topic: formData.topic,
                subtopic: formData.subtopic,
                content: formData.content,
                imageUrl: imageUrl,
                createdAt: new Date()
            };

            const mindCardsRef = collection(db, "mindCards");
            await addDoc(mindCardsRef, mindCardData);

            toast.success("Akıl kartı başarıyla eklendi!");
            onSuccess();
            onClose();
            
        } catch (error) {
            console.error("Akıl kartı eklenirken hata:", error);
            toast.error("Akıl kartı eklenirken bir hata oluştu!");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 pb-3 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                        Yeni Akıl Kartı Ekle
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Konu
                            </label>
                            <input
                                type="text"
                                name="topic"
                                value={formData.topic}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Alt Konu
                            </label>
                            <input
                                type="text"
                                name="subtopic"
                                value={formData.subtopic}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            İçerik
                        </label>
                        <div className="min-h-[200px] bg-white rounded-lg">
                            <ReactQuill
                                theme="snow"
                                value={formData.content}
                                onChange={handleEditorChange}
                                modules={modules}
                                formats={formats}
                                className="h-48 mb-12"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Resim
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                        {formData.resimPreview && (
                            <div className="mt-4">
                                <img
                                    src={formData.resimPreview}
                                    alt="Önizleme"
                                    className="max-h-40 rounded-lg shadow-sm"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-4 pt-4 border-t dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors duration-200 flex items-center ${
                                loading ? "opacity-50 cursor-not-allowed" : ""
                            }`}
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
                                "Ekle"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddMindCardModal; 