import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../components/layout";
import { toast } from "react-hot-toast";
import { 
    FaArrowLeft, 
    FaSave, 
    FaImage,
    FaTimes
} from 'react-icons/fa';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { db, storage } from "../../firebase";
import { 
    addDoc, 
    getDoc, 
    updateDoc,
    doc,
    collection,
    serverTimestamp 
} from "firebase/firestore";
import { 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from "firebase/storage";

const PackageAddEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;
    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isUploading, setIsUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const [packageForm, setPackageForm] = useState({
        title: "",
        description: "",
        fullDescription: "",
        price: "",
        durationType: "aylik",
        imageFile: null,
        imageUrl: ""
    });

    const quillModules = {
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

    const quillFormats = [
        'header', 'bold', 'italic', 'underline', 'strike',
        'list', 'bullet', 'color', 'background', 'align',
        'link', 'image'
    ];

    useEffect(() => {
        if (isEditMode) {
            loadPackage();
        }
    }, [id]);

    const loadPackage = async () => {
        setIsLoading(true);
        try {
            const packageDoc = await getDoc(doc(db, "packages", id));
            if (packageDoc.exists()) {
                const data = packageDoc.data();
                setPackageForm({
                    title: data.title || "",
                    description: data.description || "",
                    fullDescription: data.fullDescription || "",
                    price: data.price?.toString() || "",
                    durationType: data.durationType || "aylik",
                    imageFile: null,
                    imageUrl: data.imageUrl || ""
                });
                setImagePreview(data.imageUrl || null);
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

    const handleImageChange = (file) => {
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            toast.error('Lütfen bir resim dosyası seçin');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Resim boyutu 5MB\'dan küçük olmalıdır');
            return;
        }
        
        setPackageForm({ ...packageForm, imageFile: file });
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files[0];
        handleImageChange(file);
    };

    // Drag & Drop handlers
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleImageChange(file);
        }
    };

    const uploadImage = async (file) => {
        if (!file) return null;
        const fileName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `packages/${fileName}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        return {
            url: downloadURL,
            path: `packages/${fileName}`
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!packageForm.title.trim() || !packageForm.price.trim()) {
            toast.error('Lütfen başlık ve fiyat alanlarını doldurun');
            return;
        }

        setIsUploading(true);
        try {
            let imageUrl = packageForm.imageUrl;
            let imagePath = null;
            
            // Yeni resim yükleniyorsa
            if (packageForm.imageFile) {
                // Düzenleme modunda ve eski resim varsa sil
                if (isEditMode) {
                    // Firestore'dan eski paket verisini çek
                    const oldPackageDoc = await getDoc(doc(db, "packages", id));
                    if (oldPackageDoc.exists()) {
                        const oldData = oldPackageDoc.data();
                        // Eski resmin path'ini kullanarak sil
                        if (oldData.imagePath) {
                            try {
                                const oldImageRef = ref(storage, oldData.imagePath);
                                await deleteObject(oldImageRef);
                            } catch (error) {
                                console.error('Eski resim silinirken hata:', error);
                            }
                        }
                    }
                }
                const imageData = await uploadImage(packageForm.imageFile);
                imageUrl = imageData.url;
                imagePath = imageData.path;
            } else if (isEditMode && packageForm.imageUrl) {
                // Resim değiştirilmediyse, mevcut path'i koru
                const oldPackageDoc = await getDoc(doc(db, "packages", id));
                if (oldPackageDoc.exists()) {
                    const oldData = oldPackageDoc.data();
                    imagePath = oldData.imagePath || null;
                }
            }

            const packageData = {
                title: packageForm.title.trim(),
                description: packageForm.description.trim(),
                fullDescription: packageForm.fullDescription || "",
                price: parseFloat(packageForm.price),
                durationType: packageForm.durationType,
                imageUrl: imageUrl || null,
                imagePath: imagePath || null,
                updatedAt: serverTimestamp()
            };

            if (isEditMode) {
                await updateDoc(doc(db, "packages", id), packageData);
                toast.success('Paket başarıyla güncellendi!');
            } else {
                packageData.createdAt = serverTimestamp();
                packageData.isActive = true;
                await addDoc(collection(db, "packages"), packageData);
                toast.success('Paket başarıyla eklendi!');
            }
            
            navigate('/paketlerimiz');
        } catch (error) {
            console.error('Paket kaydedilirken hata:', error);
            toast.error(isEditMode ? 'Paket güncellenirken hata oluştu' : 'Paket eklenirken hata oluştu');
        } finally {
            setIsUploading(false);
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

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="w-full py-6 px-4">
                    <div className="w-full">
                        {/* Header */}
                        <div className="mb-6">
                            <button
                                onClick={() => navigate('/paketlerimiz')}
                                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-3 transition-colors"
                            >
                                <FaArrowLeft className="h-4 w-4" />
                                <span>Paketlere Dön</span>
                            </button>
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                                {isEditMode ? 'Paket Düzenle' : 'Yeni Paket Ekle'}
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {isEditMode ? 'Paket bilgilerini düzenleyin' : 'Yeni bir satış paketi oluşturun'}
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-5 space-y-5">
                            {/* Image Upload with Drag & Drop */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Paket Resmi
                                </label>
                                <div
                                    onDragEnter={handleDragEnter}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                                        isDragging
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500'
                                    }`}
                                >
                                    {imagePreview ? (
                                        <div className="space-y-3">
                                            <div className="relative w-40 h-40 mx-auto rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setImagePreview(null);
                                                        setPackageForm({ ...packageForm, imageFile: null, imageUrl: "" });
                                                        if (fileInputRef.current) {
                                                            fileInputRef.current.value = '';
                                                        }
                                                    }}
                                                    className="absolute top-1.5 right-1.5 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg"
                                                >
                                                    <FaTimes className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Resmi değiştirmek için tıklayın veya sürükleyip bırakın
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <FaImage className="h-14 w-14 text-gray-400 mx-auto" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Resmi buraya sürükleyip bırakın
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    veya tıklayarak seçin
                                                </p>
                                            </div>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                PNG, JPG, GIF (Max. 5MB)
                                            </p>
                                        </div>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileInputChange}
                                        className="hidden"
                                    />
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Paket Başlığı <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={packageForm.title}
                                    onChange={(e) => setPackageForm({ ...packageForm, title: e.target.value })}
                                    className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="Örn: Premium Paket"
                                    required
                                />
                            </div>

                            {/* Short Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Kısa Açıklama
                                </label>
                                <textarea
                                    value={packageForm.description}
                                    onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="Paket hakkında kısa bir açıklama..."
                                />
                            </div>

                            {/* Full Description */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                                    Detaylı Açıklama
                                </label>
                                <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors overflow-hidden">
                                    <style>{`
                                        .quill-editor .ql-toolbar {
                                            border: none;
                                            border-bottom: 2px solid #e5e7eb;
                                            background: #f9fafb;
                                            padding: 12px 14px;
                                            border-radius: 8px 8px 0 0;
                                        }
                                        .dark .quill-editor .ql-toolbar {
                                            background: #374151;
                                            border-bottom-color: #4b5563;
                                        }
                                        .quill-editor .ql-container {
                                            border: none;
                                            font-size: 15px;
                                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                                        }
                                        .quill-editor .ql-editor {
                                            min-height: 350px;
                                            padding: 18px;
                                            color: #111827;
                                            line-height: 1.6;
                                            font-size: 14px;
                                        }
                                        .dark .quill-editor .ql-editor {
                                            color: #f3f4f6;
                                            background: #1f2937;
                                        }
                                        .quill-editor .ql-editor.ql-blank::before {
                                            color: #9ca3af;
                                            font-style: normal;
                                            font-size: 15px;
                                        }
                                        .quill-editor .ql-toolbar .ql-stroke {
                                            stroke: #4b5563;
                                        }
                                        .dark .quill-editor .ql-toolbar .ql-stroke {
                                            stroke: #9ca3af;
                                        }
                                        .quill-editor .ql-toolbar .ql-fill {
                                            fill: #4b5563;
                                        }
                                        .dark .quill-editor .ql-toolbar .ql-fill {
                                            fill: #9ca3af;
                                        }
                                        .quill-editor .ql-toolbar button:hover,
                                        .quill-editor .ql-toolbar button.ql-active {
                                            color: #4f46e5;
                                        }
                                        .dark .quill-editor .ql-toolbar button:hover,
                                        .dark .quill-editor .ql-toolbar button.ql-active {
                                            color: #818cf8;
                                        }
                                        .quill-editor .ql-toolbar .ql-picker-label {
                                            color: #4b5563;
                                        }
                                        .dark .quill-editor .ql-toolbar .ql-picker-label {
                                            color: #9ca3af;
                                        }
                                        .quill-editor .ql-toolbar .ql-picker-options {
                                            background: white;
                                            border: 1px solid #e5e7eb;
                                            border-radius: 8px;
                                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                                        }
                                        .dark .quill-editor .ql-toolbar .ql-picker-options {
                                            background: #374151;
                                            border-color: #4b5563;
                                        }
                                    `}</style>
                                    <div className="quill-editor">
                                        <ReactQuill
                                            theme="snow"
                                            value={packageForm.fullDescription}
                                            onChange={(value) => setPackageForm({ ...packageForm, fullDescription: value })}
                                            modules={quillModules}
                                            formats={quillFormats}
                                            placeholder="Paket hakkında detaylı açıklama yazın... Başlıklar, listeler, renkler ve resimler ekleyebilirsiniz."
                                        />
                                    </div>
                                </div>
                                <div className="mt-2 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5">
                                    <span className="text-blue-600 dark:text-blue-400 text-xs">💡</span>
                                    <div>
                                        <p className="font-medium text-blue-900 dark:text-blue-300 mb-0.5 text-xs">İpuçları:</p>
                                        <ul className="list-disc list-inside space-y-0.5 text-blue-800 dark:text-blue-400 text-xs">
                                            <li>Başlıklar için H1, H2, H3 kullanın</li>
                                            <li>Listeler için sıralı veya sırasız liste butonlarını kullanın</li>
                                            <li>Metinleri vurgulamak için renk ve arka plan rengi ekleyin</li>
                                            <li>Resim ve link ekleyerek içeriğinizi zenginleştirin</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Price and Duration */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Fiyat (₺) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={packageForm.price}
                                        onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })}
                                        className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Süre Tipi <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={packageForm.durationType}
                                        onChange={(e) => setPackageForm({ ...packageForm, durationType: e.target.value })}
                                        className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                        required
                                    >
                                        <option value="aylik">Aylık</option>
                                        <option value="yillik">Yıllık</option>
                                        <option value="suresiz">Süresiz</option>
                                    </select>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => navigate('/paketlerimiz')}
                                    className="flex-1 px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="flex-1 px-4 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>{isEditMode ? 'Güncelleniyor...' : 'Kaydediliyor...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaSave className="h-4 w-4" />
                                            <span>{isEditMode ? 'Güncelle' : 'Kaydet'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default PackageAddEditPage;

