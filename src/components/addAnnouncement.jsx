import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

const AddAnnouncement = ({ isOpen, onClose, selectedType }) => {
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
        aktif: true,
        tarih: new Date().toISOString()
    });

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result.split(',')[1];
                setFormData(prev => ({
                    ...prev,
                    resim: base64String,
                    resimTuru: file.type
                }));
            };
            reader.readAsDataURL(file);
        }
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

        try {
            const docRef = await addDoc(collection(db, collectionName), formData);
            toast.success(`${selectedType} başarıyla eklendi!`);
            onClose();
        } catch (error) {
            console.error(`${selectedType} eklenirken bir hata oluştu:`, error);
            toast.error(`${selectedType} eklenirken bir hata oluştu!`);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                        Yeni {selectedType} Ekle
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Açıklama
                            </label>
                            <textarea
                                name="aciklama"
                                value={formData.aciklama}
                                onChange={handleInputChange}
                                required
                                rows="4"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                                placeholder="Duyuru açıklaması giriniz"
                            />
                        </div>
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
                            Resim (Opsiyonel)
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
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
                            Kaydet
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAnnouncement; 