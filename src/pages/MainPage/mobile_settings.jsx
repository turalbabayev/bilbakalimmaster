import React, { useState, useEffect } from "react";
import Layout from "../../components/layout";
import { db } from "../../firebase";
import { 
    collection, 
    doc, 
    getDoc, 
    setDoc, 
    serverTimestamp 
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { 
    FaMobile,
    FaCog,
    FaSave,
    FaDownload,
    FaToggleOn,
    FaToggleOff,
    FaApple,
    FaGoogle,
    FaExclamationTriangle,
    FaCheckCircle,
    FaInfoCircle,
    FaChevronDown,
    FaChevronUp
} from "react-icons/fa";

const MobileSettingsPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        systemSettings: true // Sistem ayarları varsayılan olarak açık
    });
    const [settings, setSettings] = useState({
        minVersion: '1.2.0',
        currentVersion: '1.3.0',
        forceUpdate: false,
        updateMessage: 'Yeni özellikler için güncelleme gerekli',
        storeUrl: 'https://apps.apple.com/tr/app/bilbakalim/id123456789',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.bilbakalim.app'
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const settingsRef = doc(db, "app_settings", "version_control");
            const settingsDoc = await getDoc(settingsRef);
            
            if (settingsDoc.exists()) {
                setSettings(settingsDoc.data());
            } else {
                // Varsayılan ayarları oluştur
                await setDoc(settingsRef, {
                    ...settings,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Ayarlar yüklenirken hata:', error);
            toast.error('Ayarlar yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const settingsRef = doc(db, "app_settings", "version_control");
            await setDoc(settingsRef, {
                ...settings,
                updatedAt: serverTimestamp()
            });
            
            toast.success('Ayarlar başarıyla kaydedildi!');
        } catch (error) {
            console.error('Ayarlar kaydedilirken hata:', error);
            toast.error('Ayarlar kaydedilirken hata oluştu');
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const toggleForceUpdate = () => {
        setSettings(prev => ({
            ...prev,
            forceUpdate: !prev.forceUpdate
        }));
    };

    const toggleSection = (sectionName) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionName]: !prev[sectionName]
        }));
    };

    const validateVersion = (version) => {
        const versionRegex = /^\d+\.\d+\.\d+$/;
        return versionRegex.test(version);
    };

    const isVersionValid = validateVersion(settings.minVersion) && validateVersion(settings.currentVersion);

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <FaMobile className="text-3xl text-indigo-500" />
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mobil Uygulama Ayarları</h1>
                                <p className="text-gray-600 dark:text-gray-400">Mobil uygulama ayarlarını yönetin</p>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
                            <p className="mt-4 text-gray-600 dark:text-gray-400">Ayarlar yükleniyor...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Sistem Ayarları */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <div 
                                    className="p-6 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => toggleSection('systemSettings')}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <FaCog className="text-2xl text-indigo-500" />
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sistem Ayarları</h2>
                                                <p className="text-gray-600 dark:text-gray-400 mt-1">Uygulama versiyonu ve güncelleme ayarları</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {expandedSections.systemSettings ? (
                                                <FaChevronUp className="text-gray-400 text-lg" />
                                            ) : (
                                                <FaChevronDown className="text-gray-400 text-lg" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {expandedSections.systemSettings && (
                                    <div className="p-6 space-y-6">
                                        {/* Versiyon Ayarları */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                    Minimum Versiyon *
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={settings.minVersion}
                                                        onChange={(e) => handleInputChange('minVersion', e.target.value)}
                                                        className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                                                            validateVersion(settings.minVersion) 
                                                                ? 'border-green-300 dark:border-green-600' 
                                                                : 'border-red-300 dark:border-red-600'
                                                        }`}
                                                        placeholder="1.2.0"
                                                    />
                                                    {validateVersion(settings.minVersion) ? (
                                                        <FaCheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500" />
                                                    ) : (
                                                        <FaExclamationTriangle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Bu versiyonun altındaki uygulamalar güncelleme alacak
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                    Mevcut Versiyon *
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={settings.currentVersion}
                                                        onChange={(e) => handleInputChange('currentVersion', e.target.value)}
                                                        className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                                                            validateVersion(settings.currentVersion) 
                                                                ? 'border-green-300 dark:border-green-600' 
                                                                : 'border-red-300 dark:border-red-600'
                                                        }`}
                                                        placeholder="1.3.0"
                                                    />
                                                    {validateVersion(settings.currentVersion) ? (
                                                        <FaCheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500" />
                                                    ) : (
                                                        <FaExclamationTriangle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Uygulamanın en güncel versiyonu
                                                </p>
                                            </div>
                                        </div>

                                        {/* Zorunlu Güncelleme Toggle */}
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <FaDownload className="text-xl text-indigo-500" />
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900 dark:text-white">Zorunlu Güncelleme</h3>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            Aktif olduğunda kullanıcılar güncelleme yapmadan uygulamayı kullanamaz
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={toggleForceUpdate}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        settings.forceUpdate 
                                                            ? 'bg-indigo-100 dark:bg-indigo-900' 
                                                            : 'bg-gray-100 dark:bg-gray-600'
                                                    }`}
                                                >
                                                    {settings.forceUpdate ? (
                                                        <FaToggleOn className="text-2xl text-indigo-600" />
                                                    ) : (
                                                        <FaToggleOff className="text-2xl text-gray-400" />
                                                    )}
                                                </button>
                                            </div>
                                            
                                            {settings.forceUpdate && (
                                                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <FaExclamationTriangle className="text-yellow-600" />
                                                        <span className="text-sm text-yellow-800 dark:text-yellow-200">
                                                            Zorunlu güncelleme aktif! Kullanıcılar güncelleme yapmadan uygulamayı kullanamayacak.
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Güncelleme Mesajı */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Güncelleme Mesajı
                                            </label>
                                            <textarea
                                                value={settings.updateMessage}
                                                onChange={(e) => handleInputChange('updateMessage', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                rows="3"
                                                placeholder="Güncelleme gerektiğinde kullanıcılara gösterilecek mesaj"
                                            />
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Kullanıcılara güncelleme hakkında bilgi verecek mesaj
                                            </p>
                                        </div>

                                        {/* Store Linkleri */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                    App Store Linki
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <FaApple className="text-gray-400" />
                                                    <input
                                                        type="url"
                                                        value={settings.storeUrl}
                                                        onChange={(e) => handleInputChange('storeUrl', e.target.value)}
                                                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                        placeholder="https://apps.apple.com/tr/app/..."
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                    Play Store Linki
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <FaGoogle className="text-gray-400" />
                                                    <input
                                                        type="url"
                                                        value={settings.playStoreUrl}
                                                        onChange={(e) => handleInputChange('playStoreUrl', e.target.value)}
                                                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                        placeholder="https://play.google.com/store/apps/details?id=..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bilgi Kutusu */}
                                        <div className="bg-blue-50 dark:bg-blue-900 rounded-xl p-4">
                                            <div className="flex items-start gap-3">
                                                <FaInfoCircle className="text-blue-600 dark:text-blue-400 mt-1" />
                                                <div>
                                                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                                                        Nasıl Çalışır?
                                                    </h4>
                                                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                                                        <li>• Mobil uygulama her açılışta versiyon kontrolü yapar</li>
                                                        <li>• Eğer kullanıcının versiyonu minimum versiyonun altındaysa güncelleme istenir</li>
                                                        <li>• Zorunlu güncelleme aktifse kullanıcı güncelleme yapmadan uygulamayı kullanamaz</li>
                                                        <li>• Store linkleri güncelleme ekranında gösterilir</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Kaydet Butonu */}
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !isVersionValid}
                                    className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                                        saving || !isVersionValid
                                            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl'
                                    }`}
                                >
                                    {saving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Kaydediliyor...
                                        </>
                                    ) : (
                                        <>
                                            <FaSave />
                                            Ayarları Kaydet
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default MobileSettingsPage; 