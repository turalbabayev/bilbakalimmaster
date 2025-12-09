import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../components/layout";
import { toast } from "react-hot-toast";
import { FaArrowLeft, FaSave, FaFileAlt } from "react-icons/fa";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const PackageDescriptionPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [packageData, setPackageData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [fullDescription, setFullDescription] = useState("");

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            ['link', 'image'],
            ['clean']
        ],
    };

    const formats = [
        'header', 'bold', 'italic', 'underline', 'strike',
        'list', 'bullet', 'color', 'background', 'align',
        'link', 'image'
    ];

    useEffect(() => {
        loadPackage();
    }, [id]);

    const loadPackage = async () => {
        setIsLoading(true);
        try {
            const packageDoc = await getDoc(doc(db, "packages", id));
            if (packageDoc.exists()) {
                const data = packageDoc.data();
                setPackageData({ id: packageDoc.id, ...data });
                setFullDescription(data.fullDescription || "");
            } else {
                toast.error('Paket bulunamadı');
                navigate('/paketlerimiz');
            }
        } catch (error) {
            console.error('Paket yüklenirken hata:', error);
            toast.error('Paket yüklenirken hata oluştu');
            navigate('/paketlerimiz');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateDoc(doc(db, "packages", id), {
                fullDescription: fullDescription,
                updatedAt: serverTimestamp()
            });
            toast.success('Açıklama başarıyla kaydedildi!');
        } catch (error) {
            console.error('Açıklama kaydedilirken hata:', error);
            toast.error('Açıklama kaydedilirken hata oluştu');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </Layout>
        );
    }

    if (!packageData) {
        return null;
    }

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="container mx-auto py-8 px-4">
                    <div className="max-w-5xl mx-auto">
                        {/* Header */}
                        <div className="mb-8">
                            <button
                                onClick={() => navigate('/paketlerimiz')}
                                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors"
                            >
                                <FaArrowLeft />
                                <span>Paketlere Dön</span>
                            </button>
                            <div className="flex items-center gap-3 mb-2">
                                <FaFileAlt className="text-indigo-600 text-2xl" />
                                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                                    {packageData.title} - Açıklama Düzenle
                                </h1>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400">
                                Paket için detaylı açıklama yazın. Bu açıklama zengin metin editörü ile formatlanabilir.
                            </p>
                        </div>

                        {/* Rich Text Editor */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                Paket Açıklaması
                            </label>
                            <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                                <ReactQuill
                                    theme="snow"
                                    value={fullDescription}
                                    onChange={setFullDescription}
                                    modules={modules}
                                    formats={formats}
                                    placeholder="Paket hakkında detaylı açıklama yazın..."
                                    style={{
                                        minHeight: '400px',
                                        backgroundColor: 'white'
                                    }}
                                    className="dark:bg-gray-700"
                                />
                            </div>
                            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                                <p>💡 İpucu: Başlıklar, listeler, renkler ve resimler ekleyerek açıklamanızı zenginleştirebilirsiniz.</p>
                            </div>
                        </div>

                        {/* Preview Section */}
                        {fullDescription && (
                            <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                                    Önizleme
                                </h2>
                                <div
                                    className="prose prose-indigo max-w-none dark:prose-invert"
                                    dangerouslySetInnerHTML={{ __html: fullDescription }}
                                />
                            </div>
                        )}

                        {/* Save Button */}
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => navigate('/paketlerimiz')}
                                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Kaydediliyor...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaSave />
                                        <span>Kaydet</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default PackageDescriptionPage;

