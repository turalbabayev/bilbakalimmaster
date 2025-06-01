import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const AddAnnouncement = ({ isOpen, onClose, selectedType, editItem }) => {
    const [formData, setFormData] = useState({
        baslik: "",
        aciklama: "",
        kisaAciklama: "",
        uzunAciklama: "",
        ucret: 0,
        odemeSonrasiIcerik: "",
        target: "",
        resim: "",
        resimTuru: "",
        resimPreview: null,
        aktif: true,
        tarih: new Date().toISOString(),
        toplantiLinki: "",
        gosterimHedefi: "herkes",
        expertise: "tumUnvanlar"
    });

    useEffect(() => {
        if (editItem) {
            setFormData({
                ...editItem,
                resimPreview: editItem.resim ? `data:${editItem.resimTuru || 'image/png'};base64,${editItem.resim}` : null
            });
        } else {
            setFormData({
                baslik: "",
                aciklama: "",
                kisaAciklama: "",
                uzunAciklama: "",
                ucret: 0,
                odemeSonrasiIcerik: "",
                target: "",
                resim: "",
                resimTuru: "",
                resimPreview: null,
                aktif: true,
                tarih: new Date().toISOString(),
                toplantiLinki: "",
                gosterimHedefi: "herkes",
                expertise: "tumUnvanlar"
            });
        }
    }, [editItem]);

    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            ['link', 'image'],
            ['clean']
        ],
    };

    const quillFormats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'list', 'bullet',
        'color', 'background',
        'link', 'image'
    ];

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Resim boyutu kontrolü (2MB)
            const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
            if (file.size > MAX_FILE_SIZE) {
                toast.error("Resim boyutu çok büyük! Lütfen 2MB'dan küçük bir resim seçin veya sıkıştırın.");
                e.target.value = '';
                return;
            }

            try {
                // Resmi sıkıştır
                const compressedImage = await compressImage(file);
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = reader.result.split(',')[1];
                    setFormData(prev => ({
                        ...prev,
                        resim: base64String,
                        resimTuru: file.type,
                        resimPreview: reader.result
                    }));
                    toast.success("Resim başarıyla yüklendi ve sıkıştırıldı!");
                };
                reader.readAsDataURL(compressedImage);
            } catch (error) {
                console.error("Resim işlenirken hata:", error);
                toast.error("Resim işlenirken bir hata oluştu!");
            }
        }
    };

    // Resim sıkıştırma fonksiyonu
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Maksimum boyutlar
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;

                    // En boy oranını koru
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height = Math.round((height * MAX_WIDTH) / width);
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width = Math.round((width * MAX_HEIGHT) / height);
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Resmi sıkıştırılmış formatta al
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Canvas to Blob failed'));
                                return;
                            }
                            resolve(new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            }));
                        },
                        'image/jpeg',
                        0.7 // Kalite (0-1 arası)
                    );
                };
                img.onerror = reject;
                img.src = event.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let collectionName;
        switch (selectedType) {
            case "Duyuru":
                collectionName = "announcements";
                break;
            case "Bilgilendirme":
                collectionName = "informations";
                break;
            case "Etkinlik":
                collectionName = "events";
                break;
            default:
                toast.error("Geçersiz duyuru tipi!");
                return;
        }

        // Expertise değerlerini güncelle
        const expertiseLabels = {
            servisAsistani: 'Servis Asistanı',
            servisGorevlisi: 'Servis Görevlisi',
            servisYetkilisi: 'Servis Yetkilisi',
            yonetmenYardimcisi: 'Yönetmen Yardımcısı',
            yonetmen: 'Yönetmen',
            tumUnvanlar: 'Tüm Ünvanlar'
        };

        const updatedFormData = {
            ...formData,
            expertise: expertiseLabels[formData.expertise] || formData.expertise
        };

        try {
            if (editItem) {
                // Güncelleme işlemi
                const docRef = doc(db, collectionName, editItem.id);
                await updateDoc(docRef, updatedFormData);
                toast.success(`${selectedType} başarıyla güncellendi!`);
            } else {
                // Yeni ekleme işlemi
                await addDoc(collection(db, collectionName), updatedFormData);
                toast.success(`${selectedType} başarıyla eklendi!`);
            }
            onClose();
        } catch (error) {
            console.error(`${selectedType} ${editItem ? 'güncellenirken' : 'eklenirken'} bir hata oluştu:`, error);
            toast.error(`${selectedType} ${editItem ? 'güncellenirken' : 'eklenirken'} bir hata oluştu!`);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {editItem ? `${selectedType} Düzenle` : `Yeni ${selectedType} Ekle`}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Başlık
                        </label>
                        <input
                            type="text"
                            name="baslik"
                            value={formData.baslik}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            placeholder="Başlık giriniz"
                        />
                    </div>

                    {selectedType === "Duyuru" && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Açıklama
                                </label>
                                <div className="bg-white dark:bg-gray-700 rounded-lg">
                                    <ReactQuill
                                        theme="snow"
                                        value={formData.aciklama}
                                        onChange={(content) => setFormData(prev => ({ ...prev, aciklama: content }))}
                                        modules={quillModules}
                                        formats={quillFormats}
                                        className="h-64 mb-12"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Toplantı Linki (Opsiyonel)
                                </label>
                                <input
                                    type="url"
                                    name="toplantiLinki"
                                    value={formData.toplantiLinki}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="https://meet.google.com/..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Gösterim Hedefi
                                </label>
                                <div className="flex space-x-4">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            name="gosterimHedefi"
                                            value="herkes"
                                            checked={formData.gosterimHedefi === "herkes"}
                                            onChange={handleInputChange}
                                            className="form-radio h-4 w-4 text-indigo-600"
                                        />
                                        <span className="ml-2 text-gray-700 dark:text-gray-300">Herkese Göster</span>
                                    </label>
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            name="gosterimHedefi"
                                            value="premium"
                                            checked={formData.gosterimHedefi === "premium"}
                                            onChange={handleInputChange}
                                            className="form-radio h-4 w-4 text-indigo-600"
                                        />
                                        <span className="ml-2 text-gray-700 dark:text-gray-300">Sadece Premium</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Ünvan Bazlı Gösterim
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="expertise"
                                            value="tumUnvanlar"
                                            checked={formData.expertise === "tumUnvanlar"}
                                            onChange={handleInputChange}
                                            className="form-radio h-4 w-4 text-indigo-600"
                                        />
                                        <span className="ml-2 text-gray-700 dark:text-gray-300">Tüm Ünvanlar</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="expertise"
                                            value="servisAsistani"
                                            checked={formData.expertise === "servisAsistani"}
                                            onChange={handleInputChange}
                                            className="form-radio h-4 w-4 text-indigo-600"
                                        />
                                        <span className="ml-2 text-gray-700 dark:text-gray-300">Servis Asistanı</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="expertise"
                                            value="servisGorevlisi"
                                            checked={formData.expertise === "servisGorevlisi"}
                                            onChange={handleInputChange}
                                            className="form-radio h-4 w-4 text-indigo-600"
                                        />
                                        <span className="ml-2 text-gray-700 dark:text-gray-300">Servis Görevlisi</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="expertise"
                                            value="servisYetkilisi"
                                            checked={formData.expertise === "servisYetkilisi"}
                                            onChange={handleInputChange}
                                            className="form-radio h-4 w-4 text-indigo-600"
                                        />
                                        <span className="ml-2 text-gray-700 dark:text-gray-300">Servis Yetkilisi</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="expertise"
                                            value="yonetmenYardimcisi"
                                            checked={formData.expertise === "yonetmenYardimcisi"}
                                            onChange={handleInputChange}
                                            className="form-radio h-4 w-4 text-indigo-600"
                                        />
                                        <span className="ml-2 text-gray-700 dark:text-gray-300">Yönetmen Yardımcısı</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="expertise"
                                            value="yonetmen"
                                            checked={formData.expertise === "yonetmen"}
                                            onChange={handleInputChange}
                                            className="form-radio h-4 w-4 text-indigo-600"
                                        />
                                        <span className="ml-2 text-gray-700 dark:text-gray-300">Yönetmen</span>
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    {(selectedType === "Bilgilendirme" || selectedType === "Etkinlik") && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Kısa Açıklama
                            </label>
                            <textarea
                                name="kisaAciklama"
                                value={formData.kisaAciklama}
                                onChange={handleInputChange}
                                required
                                rows="2"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                                placeholder="Kısa açıklama giriniz"
                            />
                        </div>
                    )}

                    {selectedType === "Etkinlik" && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Uzun Açıklama
                                </label>
                                <textarea
                                    name="uzunAciklama"
                                    value={formData.uzunAciklama}
                                    onChange={handleInputChange}
                                    required
                                    rows="4"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                                    placeholder="Detaylı açıklama giriniz"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Ücret (TL)
                                </label>
                                <input
                                    type="number"
                                    name="ucret"
                                    value={formData.ucret}
                                    onChange={handleInputChange}
                                    required
                                    min="0"
                                    step="0.01"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Ödeme Sonrası İçerik
                                </label>
                                <textarea
                                    name="odemeSonrasiIcerik"
                                    value={formData.odemeSonrasiIcerik}
                                    onChange={handleInputChange}
                                    rows="3"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                                    placeholder="Ödeme sonrası gösterilecek içerik (opsiyonel)"
                                />
                            </div>
                        </>
                    )}

                    {selectedType === "Bilgilendirme" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Hedef Sayfa
                            </label>
                            <input
                                type="text"
                                name="target"
                                value={formData.target}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                placeholder="Örn: /sorular, /profil, vb."
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Resim (Opsiyonel - Max 2MB)
                        </label>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="relative flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                {formData.resimPreview && (
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, resim: "", resimTuru: "", resimPreview: null }))}
                                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                    >
                                        Resmi Sil
                                    </button>
                                )}
                            </div>
                            {formData.resimPreview && (
                                <div className="mt-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        Resim önizleme:
                                    </p>
                                    <div className="relative">
                                        <img
                                            src={formData.resimPreview}
                                            alt="Önizleme"
                                            className="max-w-full h-auto rounded-lg shadow-md"
                                            style={{ maxHeight: '300px' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            name="aktif"
                            checked={formData.aktif}
                            onChange={(e) => setFormData(prev => ({ ...prev, aktif: e.target.checked }))}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                            Aktif
                        </label>
                    </div>

                    <div className="flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            {editItem ? 'Güncelle' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAnnouncement; 