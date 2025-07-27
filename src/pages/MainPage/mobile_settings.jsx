import React, { useState } from "react";
import Layout from "../../components/layout";
import { FaMobileAlt, FaSave, FaSync, FaExclamationTriangle, FaBell, FaWrench, FaImage } from "react-icons/fa";

const defaultBanner = "https://dummyimage.com/400x180/cccccc/222222&text=Banner+Görseli";

const MobileSettingsPage = () => {
  // Ayar state'leri
  const [homeMessage, setHomeMessage] = useState("Hoş geldin! Yeni güncellemeleri kaçırma.");
  const [banner, setBanner] = useState(defaultBanner);
  const [bannerFile, setBannerFile] = useState(null);
  const [buttonText, setButtonText] = useState("Başla");
  const [buttonColor, setButtonColor] = useState("#7c3aed");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState("");

  // Banner görseli yükleme (şimdilik sadece preview için)
  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setBanner(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Taslak kaydet fonksiyonu
  const handleSave = async () => {
    setSaving(true);
    setResult("");
    setTimeout(() => {
      setSaving(false);
      setResult("Ayarlar kaydedildi (taslak, Firestore bağlantısı eklenebilir)");
    }, 1000);
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto mt-10 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 flex flex-col md:flex-row gap-10">
        {/* Sol: Ayar Formları */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <FaMobileAlt className="text-3xl text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mobil Dinamik Ayarlar</h1>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 shadow flex items-center gap-4">
            <FaBell className="text-2xl text-blue-500" />
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">Ana Ekran Mesajı</label>
              <input
                type="text"
                value={homeMessage}
                onChange={e => setHomeMessage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                placeholder="Ana ekranda gösterilecek mesaj"
              />
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 shadow flex items-center gap-4">
            <FaImage className="text-2xl text-pink-500" />
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">Banner Görseli</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">(Yalnızca önizleme, yükleme entegrasyonu eklenebilir)</div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 shadow flex items-center gap-4">
            <FaMobileAlt className="text-2xl text-purple-500" />
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">Buton Metni</label>
              <input
                type="text"
                value={buttonText}
                onChange={e => setButtonText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                placeholder="Buton üzerinde yazacak metin"
              />
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mt-2">Buton Rengi</label>
              <input
                type="color"
                value={buttonColor}
                onChange={e => setButtonColor(e.target.value)}
                className="w-12 h-8 p-0 border-0 bg-transparent cursor-pointer"
                style={{marginLeft: 0}}
              />
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 shadow flex items-center gap-4">
            <FaWrench className="text-2xl text-orange-500" />
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">Bakım Modu</label>
              <div className="flex items-center gap-3">
                <span className="text-gray-700 dark:text-gray-300">{maintenanceMode ? "Açık" : "Kapalı"}</span>
                <button
                  onClick={() => setMaintenanceMode(v => !v)}
                  className={`w-12 h-6 flex items-center bg-gray-300 dark:bg-gray-600 rounded-full p-1 duration-300 focus:outline-none ${maintenanceMode ? 'bg-orange-500' : ''}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${maintenanceMode ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 shadow flex items-center gap-4">
            <FaSync className="text-2xl text-green-500" />
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">Zorunlu Güncelleme</label>
              <div className="flex items-center gap-3">
                <span className="text-gray-700 dark:text-gray-300">{forceUpdate ? "Açık" : "Kapalı"}</span>
                <button
                  onClick={() => setForceUpdate(v => !v)}
                  className={`w-12 h-6 flex items-center bg-gray-300 dark:bg-gray-600 rounded-full p-1 duration-300 focus:outline-none ${forceUpdate ? 'bg-green-500' : ''}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${forceUpdate ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900 rounded-xl p-4 flex items-center gap-3">
            <FaExclamationTriangle className="text-xl text-yellow-600" />
            <span className="text-yellow-800 dark:text-yellow-200 text-sm">Bu sayfa taslaktır, ayarlar Firestore'a kaydedilmemektedir.</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
          >
            <FaSave /> {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
          </button>
          {result && <div className="mt-6 text-lg font-medium text-green-600 dark:text-green-400">{result}</div>}
        </div>
        {/* Sağ: Mobil Ana Sayfa Mockup Preview */}
        <div className="flex-1 flex items-start justify-center">
          <div className="w-[320px] h-[650px] bg-gray-100 dark:bg-gray-800 rounded-3xl shadow-2xl border-4 border-gray-300 dark:border-gray-700 relative overflow-hidden flex flex-col">
            {/* Banner */}
            <div className="w-full h-[180px] bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
              <img src={banner} alt="Banner" className="object-cover w-full h-full" />
            </div>
            {/* Ana ekran mesajı */}
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-4 mt-6">{homeMessage}</h2>
              {/* Buton */}
              <button
                style={{ background: buttonColor }}
                className="w-full py-3 rounded-xl text-white font-semibold text-lg shadow-lg transition-all duration-200 mb-4"
              >
                {buttonText}
              </button>
              {/* Bakım veya güncelleme uyarısı */}
              {maintenanceMode && (
                <div className="w-full bg-orange-100 text-orange-800 rounded-lg px-3 py-2 text-center text-sm font-medium flex items-center gap-2 justify-center mb-2">
                  <FaWrench className="inline-block mr-1" /> Bakım Modu Aktif
                </div>
              )}
              {forceUpdate && (
                <div className="w-full bg-green-100 text-green-800 rounded-lg px-3 py-2 text-center text-sm font-medium flex items-center gap-2 justify-center">
                  <FaSync className="inline-block mr-1" /> Zorunlu Güncelleme Aktif
                </div>
              )}
            </div>
            {/* Alt bar */}
            <div className="w-full h-12 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <div className="w-16 h-2 bg-gray-400 dark:bg-gray-600 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MobileSettingsPage; 