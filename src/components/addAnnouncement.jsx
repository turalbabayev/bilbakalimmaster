import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

const AddAnnouncement = ({ isOpen, onClose }) => {
    const [duyuruTipi, setDuyuruTipi] = useState("Duyuru");
    const [duyuruAdi, setDuyuruAdi] = useState("");
    const [duyuruAciklamasi, setDuyuruAciklamasi] = useState("");
    const [resimFile, setResimFile] = useState(null);
    const [resimPreview, setResimPreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Etkinlik alanları
    const [etkinlikKisaAciklama, setEtkinlikKisaAciklama] = useState("");
    const [etkinlikUzunAciklama, setEtkinlikUzunAciklama] = useState("");
    const [etkinlikUcreti, setEtkinlikUcreti] = useState("");
    const [odemeSonrasiIcerik, setOdemeSonrasiIcerik] = useState("");
    
    // Bilgilendirme alanları
    const [bilgilendirmeKisaAciklama, setBilgilendirmeKisaAciklama] = useState("");
    const [targetSayfa] = useState("Deneme Sayfası");

    const handleResimSecimi = (e) => {
        if (e.target.files[0]) {
            const file = e.target.files[0];
            setResimFile(file);
            
            // Resim önizleme
            const reader = new FileReader();
            reader.onloadend = () => {
                setResimPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDuyuruEkle = async () => {
        // Form doğrulama
        if (duyuruTipi === "Duyuru" && (!duyuruAdi || !duyuruAciklamasi)) {
            toast.error("Lütfen duyuru adı ve açıklaması alanlarını doldurun.");
            return;
        } else if (duyuruTipi === "Etkinlik" && 
            (!duyuruAdi || !etkinlikKisaAciklama || !etkinlikUzunAciklama || !etkinlikUcreti)) {
            toast.error("Lütfen tüm etkinlik alanlarını doldurun.");
            return;
        } else if (duyuruTipi === "Bilgilendirme" && 
            (!duyuruAdi || !bilgilendirmeKisaAciklama)) {
            toast.error("Lütfen bilgilendirme adı ve kısa açıklama alanlarını doldurun.");
            return;
        }

        setIsSubmitting(true);
        
        try {
            // Base64 formatında resim verisi oluştur
            let resimBase64 = null;
            
            if (resimFile) {
                const reader = new FileReader();
                resimBase64 = await new Promise((resolve) => {
                    reader.onloadend = () => {
                        // data:image/png;base64, gibi önek kısmını kaldır
                        const fullBase64 = reader.result;
                        const base64WithoutPrefix = fullBase64.split(',')[1];
                        resolve(base64WithoutPrefix);
                    };
                    reader.readAsDataURL(resimFile);
                });
            }
            
            // Ortak alanlar
            const yeniDuyuru = {
                tip: duyuruTipi,
                baslik: duyuruAdi,
                resim: resimBase64,
                resimTuru: resimFile ? resimFile.type : null,
                tarih: new Date(),
                aktif: true
            };
            
            // Duyuru tipine göre özel alanlar
            if (duyuruTipi === "Duyuru") {
                yeniDuyuru.aciklama = duyuruAciklamasi;
            } else if (duyuruTipi === "Etkinlik") {
                yeniDuyuru.kisaAciklama = etkinlikKisaAciklama;
                yeniDuyuru.uzunAciklama = etkinlikUzunAciklama;
                yeniDuyuru.ucret = etkinlikUcreti;
                yeniDuyuru.odemeSonrasiIcerik = odemeSonrasiIcerik;
            } else if (duyuruTipi === "Bilgilendirme") {
                yeniDuyuru.kisaAciklama = bilgilendirmeKisaAciklama;
                yeniDuyuru.target = targetSayfa;
            }

            // Firebase'e kaydet
            await addDoc(collection(db, "duyurular"), yeniDuyuru);
            
            toast.success("Duyuru başarıyla eklendi!");
            // Formu temizle
            setDuyuruTipi("Duyuru");
            setDuyuruAdi("");
            setDuyuruAciklamasi("");
            setEtkinlikKisaAciklama("");
            setEtkinlikUzunAciklama("");
            setEtkinlikUcreti("");
            setOdemeSonrasiIcerik("");
            setBilgilendirmeKisaAciklama("");
            setResimFile(null);
            setResimPreview(null);
            onClose();
        } catch (error) {
            console.error("Duyuru eklenirken bir hata oluştu:", error);
            toast.error("Duyuru eklenirken bir hata oluştu!");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderFormFields = () => {
        switch (duyuruTipi) {
            case "Duyuru":
                return (
                    <>
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                Duyuru Adı:
                            </label>
                            <input
                                type="text"
                                value={duyuruAdi}
                                onChange={(e) => setDuyuruAdi(e.target.value)}
                                placeholder="Duyuru başlığını girin"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                Duyuru Açıklaması:
                            </label>
                            <textarea
                                value={duyuruAciklamasi}
                                onChange={(e) => setDuyuruAciklamasi(e.target.value)}
                                rows="4"
                                placeholder="Duyuru açıklamasını girin"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                            />
                        </div>
                    </>
                );
            case "Etkinlik":
                return (
                    <>
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                Etkinlik Adı:
                            </label>
                            <input
                                type="text"
                                value={duyuruAdi}
                                onChange={(e) => setDuyuruAdi(e.target.value)}
                                placeholder="Etkinlik adını girin"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                Etkinlik Kısa Açıklaması:
                            </label>
                            <textarea
                                value={etkinlikKisaAciklama}
                                onChange={(e) => setEtkinlikKisaAciklama(e.target.value)}
                                rows="2"
                                placeholder="Etkinliğin kısa açıklamasını girin"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                Etkinlik Uzun Açıklaması:
                            </label>
                            <textarea
                                value={etkinlikUzunAciklama}
                                onChange={(e) => setEtkinlikUzunAciklama(e.target.value)}
                                rows="4"
                                placeholder="Etkinliğin detaylı açıklamasını girin"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                Etkinlik Ücreti (TL):
                            </label>
                            <input
                                type="number"
                                value={etkinlikUcreti}
                                onChange={(e) => setEtkinlikUcreti(e.target.value)}
                                placeholder="Etkinlik ücretini girin"
                                min="0"
                                step="0.01"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                Ödeme Sonrası Gösterilecek İçerik:
                            </label>
                            <textarea
                                value={odemeSonrasiIcerik}
                                onChange={(e) => setOdemeSonrasiIcerik(e.target.value)}
                                rows="4"
                                placeholder="Ödeme yapıldıktan sonra kullanıcıya gösterilecek içeriği girin"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                            />
                        </div>
                    </>
                );
            case "Bilgilendirme":
                return (
                    <>
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                Bilgilendirme Adı:
                            </label>
                            <input
                                type="text"
                                value={duyuruAdi}
                                onChange={(e) => setDuyuruAdi(e.target.value)}
                                placeholder="Bilgilendirme başlığını girin"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                Bilgilendirme Kısa Açıklaması:
                            </label>
                            <textarea
                                value={bilgilendirmeKisaAciklama}
                                onChange={(e) => setBilgilendirmeKisaAciklama(e.target.value)}
                                rows="4"
                                placeholder="Bilgilendirme açıklamasını girin"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                                Hedef Sayfa (Uygulamada Yönlendirilecek Sayfa):
                            </label>
                            <input
                                type="text"
                                value={targetSayfa}
                                disabled
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 mt-1 italic">Bu alan değiştirilemez.</p>
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b pb-3 border-gray-200 dark:border-gray-700">
                    {duyuruTipi === "Duyuru" ? "Yeni Duyuru Ekle" : 
                     duyuruTipi === "Etkinlik" ? "Yeni Etkinlik Ekle" : 
                     "Yeni Bilgilendirme Ekle"}
                </h2>
                
                <div className="space-y-5">
                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                            Tip Seçin:
                        </label>
                        <select 
                            value={duyuruTipi}
                            onChange={(e) => setDuyuruTipi(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                        >
                            <option value="Duyuru">Duyuru</option>
                            <option value="Etkinlik">Etkinlik</option>
                            <option value="Bilgilendirme">Bilgilendirme</option>
                        </select>
                    </div>
                    
                    {renderFormFields()}
                    
                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                            {duyuruTipi === "Duyuru" ? "Duyuru Resmi" : 
                             duyuruTipi === "Etkinlik" ? "Etkinlik Resmi" : 
                             "Bilgilendirme Resmi"}:
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleResimSecimi}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all"
                        />
                        
                        {resimPreview && (
                            <div className="mt-3">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Önizleme:</p>
                                <img 
                                    src={resimPreview} 
                                    alt="Resim önizleme" 
                                    className="max-h-40 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700" 
                                />
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        İptal
                    </button>
                    <button
                        className={`bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all font-medium flex items-center justify-center ${
                            isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                        onClick={handleDuyuruEkle}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Ekleniyor...
                            </>
                        ) : (
                            `${duyuruTipi} Ekle`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddAnnouncement; 