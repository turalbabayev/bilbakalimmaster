import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout';
import { 
    FaArrowLeft, 
    FaSave, 
    FaSpinner,
    FaClock,
    FaUsers,
    FaGraduationCap,
    FaCalendarAlt,
    FaEdit,
    FaInfoCircle,
    FaCheckCircle,
    FaExclamationTriangle
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const ExamEditPage = () => {
    const navigate = useNavigate();
    const { examId } = useParams();
    
    // State yönetimi
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        duration: 60,
        targetAudience: 'herkes',
        selectedExpertise: [],
        publishType: 'immediate',
        publishDuration: 2,
        publishUnit: 'hours',
        startDateTime: '',
        endDateTime: ''
    });

    // Ünvan seçenekleri
    const expertiseOptions = [
        'Servis Asistanı',
        'Servis Görevlisi', 
        'Servis Yetkilisi',
        'Yönetmen Yardımcısı',
        'Yönetmen'
    ];

    // Sınavı yükle
    useEffect(() => {
        if (examId) {
            loadExam();
        }
    }, [examId]);

    const loadExam = async () => {
        try {
            setLoading(true);
            const examRef = doc(db, 'examlar', examId);
            const examSnap = await getDoc(examRef);
            
            if (examSnap.exists()) {
                const data = examSnap.data();
                setExam({ id: examSnap.id, ...data });
                
                // Sınav durumunu kontrol et
                const currentTime = new Date();
                let examStatus = 'draft';
                
                if (data.status === 'active') {
                    examStatus = 'active';
                } else if (data.status === 'scheduled' && data.startDate) {
                    const startDate = data.startDate.toDate ? data.startDate.toDate() : new Date(data.startDate);
                    if (currentTime >= startDate) {
                        examStatus = 'active';
                    }
                } else if (data.status === 'completed') {
                    examStatus = 'completed';
                }
                
                // Aktif veya tamamlanmış sınavları düzenlemesini engelle
                if (examStatus === 'active' || examStatus === 'completed') {
                    toast.error(
                        examStatus === 'active' 
                            ? 'Aktif sınavlar düzenlenemez!' 
                            : 'Tamamlanmış sınavlar düzenlenemez!'
                    );
                    navigate(`/deneme-sinavlari/detay/${examId}`);
                    return;
                }
                
                // Form verilerini doldur
                setFormData({
                    name: data.name || '',
                    duration: data.duration || 60,
                    targetAudience: data.targetAudience || 'herkes',
                    selectedExpertise: data.selectedExpertise || [],
                    publishType: data.publishType || 'immediate',
                    publishDuration: data.publishDuration || 2,
                    publishUnit: data.publishUnit || 'hours',
                    startDateTime: data.startDateTime ? 
                        (data.startDateTime.toDate ? data.startDateTime.toDate() : new Date(data.startDateTime))
                            .toISOString().slice(0, 16) : '',
                    endDateTime: data.endDateTime ? 
                        (data.endDateTime.toDate ? data.endDateTime.toDate() : new Date(data.endDateTime))
                            .toISOString().slice(0, 16) : ''
                });
            } else {
                toast.error('Sınav bulunamadı');
                navigate('/deneme-sinavlari/liste');
            }
        } catch (error) {
            console.error('Sınav yüklenirken hata:', error);
            toast.error('Sınav yüklenirken hata oluştu');
            navigate('/deneme-sinavlari/liste');
        } finally {
            setLoading(false);
        }
    };

    // Form değişiklikleri
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            
            // PublishType değiştiğinde tarihleri temizle
            if (name === 'publishType') {
                if (value === 'immediate') {
                    newData.startDateTime = '';
                    newData.endDateTime = '';
                }
            }
            
            // Eğer başlangıç tarihi, yayın süresi veya birim değişirse bitiş tarihini otomatik hesapla
            if ((name === 'startDateTime' || name === 'publishDuration' || name === 'publishUnit') && 
                (newData.publishType === 'scheduled' || prev.publishType === 'scheduled')) {
                
                const startDateTime = name === 'startDateTime' ? value : prev.startDateTime;
                const publishDuration = name === 'publishDuration' ? parseInt(value) : prev.publishDuration;
                const publishUnit = name === 'publishUnit' ? value : prev.publishUnit;
                
                if (startDateTime && publishDuration > 0 && newData.publishType === 'scheduled') {
                    const start = new Date(startDateTime);
                    let multiplier = 1;
                    
                    switch (publishUnit) {
                        case 'minutes':
                            multiplier = 60 * 1000; // Dakika → milisaniye
                            break;
                        case 'hours':
                            multiplier = 60 * 60 * 1000; // Saat → milisaniye
                            break;
                        case 'days':
                            multiplier = 24 * 60 * 60 * 1000; // Gün → milisaniye
                            break;
                        case 'weeks':
                            multiplier = 7 * 24 * 60 * 60 * 1000; // Hafta → milisaniye
                            break;
                        default:
                            multiplier = 60 * 60 * 1000; // Varsayılan: saat
                    }
                    
                    const durationInMs = publishDuration * multiplier;
                    const endDate = new Date(start.getTime() + durationInMs);
                    newData.endDateTime = endDate.toISOString().slice(0, 16);
                }
            }
            
            return newData;
        });
    };

    const handleTargetAudienceChange = (value) => {
        setFormData(prev => ({
            ...prev,
            targetAudience: value,
            selectedExpertise: value === 'seciliUnvanlar' ? prev.selectedExpertise : []
        }));
    };

    const handleExpertiseToggle = (expertise) => {
        setFormData(prev => ({
            ...prev,
            selectedExpertise: prev.selectedExpertise.includes(expertise)
                ? prev.selectedExpertise.filter(e => e !== expertise)
                : [...prev.selectedExpertise, expertise]
        }));
    };

    // Sınavı kaydet
    const handleSave = async () => {
        try {
            // Validasyon
            if (!formData.name.trim()) {
                toast.error('Sınav adı boş olamaz');
                return;
            }

            if (formData.duration < 1) {
                toast.error('Sınav süresi en az 1 dakika olmalıdır');
                return;
            }

            if (formData.targetAudience === 'seciliUnvanlar' && formData.selectedExpertise.length === 0) {
                toast.error('Hedef kitle olarak seçili ünvanlar seçtiyseniz en az bir ünvan seçmelisiniz');
                return;
            }

            // Zamanlanmış yayın için özel validasyon
            if (formData.publishType === 'scheduled') {
                if (!formData.startDateTime) {
                    toast.error('Zamanlanmış yayın için başlangıç tarihi gereklidir');
                    return;
                }
                
                const startDate = new Date(formData.startDateTime);
                const now = new Date();
                
                if (startDate <= now) {
                    toast.error('Başlangıç tarihi gelecekte bir tarih olmalıdır');
                    return;
                }
                
                if (!formData.publishDuration || formData.publishDuration < 1) {
                    toast.error('Yayın süresi en az 1 olmalıdır');
                    return;
                }
            }

            setSaving(true);
            
            const updateData = {
                ...formData,
                updatedAt: new Date()
            };

            // Zamanlanmış yayın için tarih objelerine dönüştür
            if (formData.publishType === 'scheduled' && formData.startDateTime) {
                updateData.startDateTime = new Date(formData.startDateTime);
                if (formData.endDateTime) {
                    updateData.endDateTime = new Date(formData.endDateTime);
                }
            }

            await updateDoc(doc(db, 'examlar', examId), updateData);
            
            toast.success('Sınav başarıyla güncellendi');
            navigate(`/deneme-sinavlari/detay/${examId}`);
        } catch (error) {
            console.error('Sınav güncellenirken hata:', error);
            toast.error('Sınav güncellenirken hata oluştu');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center justify-center py-12">
                            <FaSpinner className="animate-spin h-8 w-8 text-blue-500 mr-3" />
                            <span className="text-gray-600 text-lg">Sınav bilgileri yükleniyor...</span>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!exam) {
        return (
            <Layout>
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                            <FaExclamationTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Sınav bulunamadı</h3>
                            <p className="text-gray-600 mb-6">İstediğiniz sınav mevcut değil veya silinmiş olabilir.</p>
                            <button
                                onClick={() => navigate('/deneme-sinavlari/liste')}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Sınav Listesine Dön
                            </button>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={() => navigate(`/deneme-sinavlari/detay/${examId}`)}
                            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            <FaArrowLeft className="h-5 w-5 mr-2" />
                            Detaya Dön
                        </button>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <FaEdit className="text-blue-600" />
                                Sınav Düzenle
                            </h1>
                            <p className="text-gray-600 mt-1">Sınav bilgilerini güncelleyin</p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>

                    <div className="space-y-8">
                        {/* Temel Bilgiler */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                                <FaInfoCircle className="text-blue-500" />
                                Temel Bilgiler
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Sınav Adı */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Sınav Adı <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Örn: Genel Tıp Bilgisi Sınavı"
                                        required
                                    />
                                </div>

                                {/* Süre */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Sınav Süresi (Dakika) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <FaClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="number"
                                            name="duration"
                                            value={formData.duration}
                                            onChange={handleInputChange}
                                            min="1"
                                            max="1440"
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hedef Kitle */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                                <FaUsers className="text-green-500" />
                                Hedef Kitle
                            </h3>

                            <div className="space-y-4">
                                {/* Hedef Kitle Seçimi */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <label className="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="targetAudience"
                                            value="herkes"
                                            checked={formData.targetAudience === 'herkes'}
                                            onChange={(e) => handleTargetAudienceChange(e.target.value)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <div className="ml-3">
                                            <div className="text-sm font-medium text-gray-900">Herkes</div>
                                            <div className="text-xs text-gray-600">Tüm kullanıcılar</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="targetAudience"
                                            value="tumUnvanlar"
                                            checked={formData.targetAudience === 'tumUnvanlar'}
                                            onChange={(e) => handleTargetAudienceChange(e.target.value)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <div className="ml-3">
                                            <div className="text-sm font-medium text-gray-900">Tüm Ünvanlar</div>
                                            <div className="text-xs text-gray-600">Bütün ünvan sahipleri</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="targetAudience"
                                            value="seciliUnvanlar"
                                            checked={formData.targetAudience === 'seciliUnvanlar'}
                                            onChange={(e) => handleTargetAudienceChange(e.target.value)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <div className="ml-3">
                                            <div className="text-sm font-medium text-gray-900">Seçili Ünvanlar</div>
                                            <div className="text-xs text-gray-600">Belirli ünvanlar</div>
                                        </div>
                                    </label>
                                </div>

                                {/* Ünvan Seçimi */}
                                {formData.targetAudience === 'seciliUnvanlar' && (
                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
                                            <FaGraduationCap />
                                            Ünvan Seçimi
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {expertiseOptions.map((expertise) => (
                                                <label
                                                    key={expertise}
                                                    className="flex items-center p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.selectedExpertise.includes(expertise)}
                                                        onChange={() => handleExpertiseToggle(expertise)}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <span className="ml-3 text-sm text-gray-900">{expertise}</span>
                                                </label>
                                            ))}
                                        </div>
                                        
                                        {formData.selectedExpertise.length > 0 && (
                                            <div className="mt-3 p-2 bg-white rounded border border-blue-200">
                                                <div className="text-xs text-blue-700">
                                                    <strong>Seçili Ünvanlar:</strong> {formData.selectedExpertise.join(', ')}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Yayın Ayarları */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                                <FaCalendarAlt className="text-purple-500" />
                                Yayın Ayarları
                            </h3>

                            <div className="space-y-4">
                                {/* Yayın Türü */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="publishType"
                                            value="immediate"
                                            checked={formData.publishType === 'immediate'}
                                            onChange={handleInputChange}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <div className="ml-3">
                                            <div className="text-sm font-medium text-gray-900">Hemen Yayınla</div>
                                            <div className="text-xs text-gray-600">Sınav hemen aktif olur</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="publishType"
                                            value="scheduled"
                                            checked={formData.publishType === 'scheduled'}
                                            onChange={handleInputChange}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <div className="ml-3">
                                            <div className="text-sm font-medium text-gray-900">Zamanlanmış</div>
                                            <div className="text-xs text-gray-600">Belirli süre aktif kalır</div>
                                        </div>
                                    </label>
                                </div>

                                {/* Yayın Süresi */}
                                {formData.publishType === 'scheduled' && (
                                    <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                        <h4 className="text-sm font-medium text-purple-900 mb-3">Zamanlanmış Yayın Ayarları</h4>
                                        
                                        {/* Başlangıç Tarihi */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Başlangıç Tarihi ve Saati *
                                            </label>
                                            <input
                                                type="datetime-local"
                                                name="startDateTime"
                                                value={formData.startDateTime}
                                                onChange={handleInputChange}
                                                min={new Date().toISOString().slice(0, 16)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                required
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Sınavın başlayacağı tarih ve saati seçin
                                            </p>
                                        </div>
                                        
                                        {/* Yayın Süresi */}
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Yayın Süresi *
                                                </label>
                                                <input
                                                    type="number"
                                                    name="publishDuration"
                                                    value={formData.publishDuration}
                                                    onChange={handleInputChange}
                                                    min="1"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Birim</label>
                                                <select
                                                    name="publishUnit"
                                                    value={formData.publishUnit}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                >
                                                    <option value="minutes">Dakika</option>
                                                    <option value="hours">Saat</option>
                                                    <option value="days">Gün</option>
                                                    <option value="weeks">Hafta</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        {/* Hızlı Seçim Butonları */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Hızlı Seçim</label>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => {
                                                            const newData = { ...prev, publishDuration: 1, publishUnit: 'hours' };
                                                            if (newData.startDateTime) {
                                                                const start = new Date(newData.startDateTime);
                                                                const end = new Date(start.getTime() + 60 * 60 * 1000);
                                                                newData.endDateTime = end.toISOString().slice(0, 16);
                                                            }
                                                            return newData;
                                                        });
                                                    }}
                                                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                                                >
                                                    1 Saat
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => {
                                                            const newData = { ...prev, publishDuration: 6, publishUnit: 'hours' };
                                                            if (newData.startDateTime) {
                                                                const start = new Date(newData.startDateTime);
                                                                const end = new Date(start.getTime() + 6 * 60 * 60 * 1000);
                                                                newData.endDateTime = end.toISOString().slice(0, 16);
                                                            }
                                                            return newData;
                                                        });
                                                    }}
                                                    className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors"
                                                >
                                                    6 Saat
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => {
                                                            const newData = { ...prev, publishDuration: 1, publishUnit: 'days' };
                                                            if (newData.startDateTime) {
                                                                const start = new Date(newData.startDateTime);
                                                                const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
                                                                newData.endDateTime = end.toISOString().slice(0, 16);
                                                            }
                                                            return newData;
                                                        });
                                                    }}
                                                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors"
                                                >
                                                    1 Gün
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => {
                                                            const newData = { ...prev, publishDuration: 1, publishUnit: 'weeks' };
                                                            if (newData.startDateTime) {
                                                                const start = new Date(newData.startDateTime);
                                                                const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
                                                                newData.endDateTime = end.toISOString().slice(0, 16);
                                                            }
                                                            return newData;
                                                        });
                                                    }}
                                                    className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm hover:bg-orange-200 transition-colors"
                                                >
                                                    1 Hafta
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Bitiş Tarihi (Otomatik Hesaplanmış) */}
                                        {formData.endDateTime && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Bitiş Tarihi ve Saati (Otomatik)
                                                </label>
                                                <input
                                                    type="datetime-local"
                                                    value={formData.endDateTime}
                                                    disabled
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Bu tarih başlangıç tarihi ve yayın süresine göre otomatik hesaplanır
                                                </p>
                                            </div>
                                        )}
                                        
                                        {/* Bilgilendirme */}
                                        <div className="mt-3 p-3 bg-purple-100 border border-purple-200 rounded-lg">
                                            <div className="flex items-start">
                                                <FaInfoCircle className="h-4 w-4 text-purple-600 mt-0.5 mr-2" />
                                                <div className="text-xs text-purple-700">
                                                    <p className="font-medium mb-1">Zamanlanmış Yayın:</p>
                                                    <p>• Sınav belirlediğiniz tarihte otomatik olarak başlar</p>
                                                    <p>• Bitiş tarihi yayın süresine göre hesaplanır</p>
                                                    <p>• Süre dolduğunda sınav otomatik olarak kapanır</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Güncelleme Uyarısı */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <FaExclamationTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                                <div>
                                    <h4 className="text-sm font-medium text-yellow-800 mb-1">Önemli Uyarı</h4>
                                    <p className="text-sm text-yellow-700">
                                        Sınav düzenlemesi yaptığınızda, mevcut katılımcılar ve sonuçlar etkilenebilir. 
                                        Aktif bir sınavı düzenlerken dikkatli olun.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ExamEditPage; 