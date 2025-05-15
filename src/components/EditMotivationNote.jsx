import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-hot-toast";
import { Editor } from '@tinymce/tinymce-react';

const EditMotivationNote = ({ isOpen, onClose, noteId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        baslik: "",
        icerik: ""
    });
    const editorRef = useRef(null);

    useEffect(() => {
        const fetchNote = async () => {
            if (noteId) {
                try {
                    console.log('Veri yükleniyor, noteId:', noteId);
                    const noteDoc = await getDoc(doc(db, "motivation-notes", noteId));
                    console.log('Firestore\'dan gelen veri:', noteDoc.data());
                    
                    if (noteDoc.exists()) {
                        const noteData = noteDoc.data();
                        setFormData({
                            baslik: noteData.baslik || '',
                            icerik: noteData.icerik || ''
                        });
                        console.log('Form verisi güncellendi:', {
                            baslik: noteData.baslik,
                            icerik: noteData.icerik
                        });
                    } else {
                        console.log('Not bulunamadı');
                        toast.error('Not bulunamadı!');
                    }
                } catch (error) {
                    console.error('Not yüklenirken hata:', error);
                    toast.error('Not yüklenirken bir hata oluştu!');
                }
            } else {
                console.log('noteId bulunamadı');
            }
        };

        fetchNote();
    }, [noteId]);

    const handleImageUpload = async (blobInfo) => {
        try {
            setLoading(true);
            const timestamp = Date.now();
            const fileExtension = blobInfo.filename().split('.').pop();
            const fileName = `${timestamp}.${fileExtension}`;
            const imageRef = ref(storage, `motivation-notes-images/${fileName}`);
            
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
        
        if (!formData.baslik.trim() || !formData.icerik.trim()) {
            toast.error('Lütfen tüm alanları doldurun!');
            return;
        }

        setLoading(true);
        try {
            await updateDoc(doc(db, "motivation-notes", noteId), {
                ...formData,
                updatedAt: serverTimestamp()
            });

            toast.success('Not başarıyla güncellendi!');
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
                            Motivasyon Notunu Düzenle
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Başlık
                                </label>
                                <input
                                    type="text"
                                    value={formData.baslik}
                                    onChange={(e) => setFormData(prev => ({ ...prev, baslik: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="Not başlığı"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    İçerik
                                </label>
                                <Editor
                                    apiKey="83kpgxax9nnx3wf6kruxk3rhefe9xso7fgxkah69lh4eie05"
                                    onInit={(evt, editor) => editorRef.current = editor}
                                    value={formData.icerik}
                                    onEditorChange={(content) => setFormData(prev => ({ ...prev, icerik: content }))}
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
                                            'bold italic forecolor | alignleft aligncenter ' +
                                            'alignright alignjustify | bullist numlist outdent indent | ' +
                                            'removeformat | image',
                                        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                                        images_upload_handler: handleImageUpload,
                                        automatic_uploads: true,
                                        images_reuse_filename: true,
                                        paste_data_images: true,
                                        paste_as_text: false,
                                        paste_enable_default_filters: true,
                                        paste_word_valid_elements: "p,b,strong,i,em,h1,h2,h3,h4,h5,h6",
                                        paste_retain_style_properties: "color,background-color,font-size",
                                        convert_urls: false,
                                        relative_urls: false,
                                        remove_script_host: false
                                    }}
                                />
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

export default EditMotivationNote; 