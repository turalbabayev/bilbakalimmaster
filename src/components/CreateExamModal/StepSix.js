import React, { useState } from 'react';
import { FaUser, FaClock, FaUsers, FaCheck, FaTimes, FaCalendarAlt, FaPlayCircle, FaHourglass } from 'react-icons/fa';

const StepSix = ({ selectedQuestions, onBack, onComplete }) => {
    const [examData, setExamData] = useState({
        name: '',
        duration: 60,
        targetAudience: 'herkes', // 'herkes', 'tumUnvanlar', 'seciliUnvanlar'
        selectedExpertise: [], // Seçili ünvanlar
        publishType: 'immediate', // 'immediate', 'scheduled'
        startDate: '',
        startTime: '',
        publishDuration: 30, // Kaç gün yayında kalacak (gün cinsinden)
        publishUnit: 'days' // 'days', 'hours', 'permanent'
    });

    // Ünvan seçenekleri
    const expertiseOptions = [
        'Servis Asistanı',
        'Servis Görevlisi', 
        'Servis Yetkilisi',
        'Yönetmen Yardımcısı',
        'Yönetmen'
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setExamData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleTargetAudienceChange = (value) => {
        setExamData(prev => ({
            ...prev,
            targetAudience: value,
            selectedExpertise: value === 'seciliUnvanlar' ? prev.selectedExpertise : []
        }));
    };

    const handleExpertiseToggle = (expertise) => {
        setExamData(prev => ({
            ...prev,
            selectedExpertise: prev.selectedExpertise.includes(expertise)
                ? prev.selectedExpertise.filter(e => e !== expertise)
                : [...prev.selectedExpertise, expertise]
        }));
    };

    const handlePublishTypeChange = (type) => {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().slice(0, 5);
        
        setExamData(prev => ({
            ...prev,
            publishType: type,
            startDate: type === 'scheduled' ? currentDate : '',
            startTime: type === 'scheduled' ? currentTime : ''
        }));
    };

    const handleSubmit = () => {
        if (!examData.name.trim()) {
            alert('Lütfen sınav adını girin');
            return;
        }
        
        if (examData.duration <= 0) {
            alert('Lütfen geçerli bir süre girin');
            return;
        }

        if (examData.targetAudience === 'seciliUnvanlar' && examData.selectedExpertise.length === 0) {
            alert('Lütfen en az bir ünvan seçin');
            return;
        }

        if (examData.publishType === 'scheduled') {
            if (!examData.startDate || !examData.startTime) {
                alert('Lütfen başlangıç tarih ve saatini girin');
                return;
            }
            
            const startDateTime = new Date(`${examData.startDate}T${examData.startTime}`);
            const now = new Date();
            
            if (startDateTime <= now) {
                alert('Başlangıç tarihi gelecekte bir zaman olmalıdır');
                return;
            }
        }

        if (examData.publishUnit !== 'permanent' && examData.publishDuration <= 0) {
            alert('Lütfen geçerli bir yayın süresi girin');
            return;
        }

        // Toplam soru sayısını hesapla
        const totalQuestions = selectedQuestions && typeof selectedQuestions === 'object' ? 
            Object.values(selectedQuestions).reduce((total, category) => {
                if (category.questions) {
                    const allQuestions = [
                        ...(category.questions.easy || []),
                        ...(category.questions.medium || []),
                        ...(category.questions.hard || []),
                        ...(category.questions.unspecified || [])
                    ];
                    return total + allQuestions.length;
                }
                return total;
            }, 0) : 0;

        // Başlangıç ve bitiş tarihlerini hesapla
        let startDateTime, endDateTime;
        
        if (examData.publishType === 'immediate') {
            startDateTime = new Date();
        } else {
            startDateTime = new Date(`${examData.startDate}T${examData.startTime}`);
        }

        if (examData.publishUnit === 'permanent') {
            endDateTime = null; // Süresiz
        } else {
            endDateTime = new Date(startDateTime);
            if (examData.publishUnit === 'days') {
                endDateTime.setDate(endDateTime.getDate() + parseInt(examData.publishDuration));
            } else if (examData.publishUnit === 'hours') {
                endDateTime.setHours(endDateTime.getHours() + parseInt(examData.publishDuration));
            }
        }

        const finalExamData = {
            ...examData,
            questions: selectedQuestions,
            totalQuestions: totalQuestions,
            startDateTime: startDateTime.toISOString(),
            endDateTime: endDateTime ? endDateTime.toISOString() : null,
            createdAt: new Date().toISOString()
        };

        onComplete(finalExamData);
    };

    // Toplam soru sayısını hesapla (özet için)
    const getTotalQuestions = () => {
        if (!selectedQuestions || typeof selectedQuestions !== 'object') return 0;
        
        return Object.values(selectedQuestions).reduce((total, category) => {
            if (category.questions) {
                const allQuestions = [
                    ...(category.questions.easy || []),
                    ...(category.questions.medium || []),
                    ...(category.questions.hard || []),
                    ...(category.questions.unspecified || [])
                ];
                return total + allQuestions.length;
            }
            return total;
        }, 0);
    };

    return (
        <div className="space-y-6">
            {/* Başlık */}
            <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Sınav Bilgileri</h3>
                <p className="text-gray-600">
                    Son olarak sınavınız için gerekli bilgileri girin
                </p>
            </div>

            {/* Sınav Adı */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaUser className="inline mr-2" />
                    Sınav Adı
                </label>
                <input
                    type="text"
                    name="name"
                    value={examData.name}
                    onChange={handleInputChange}
                    placeholder="Örn: Bankacılık Genel Yeterlilik Sınavı"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Sınav Süresi */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaClock className="inline mr-2" />
                    Sınav Süresi (Dakika)
                </label>
                <input
                    type="number"
                    name="duration"
                    value={examData.duration}
                    onChange={handleInputChange}
                    min="1"
                    max="300"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Yayın Zamanlaması */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    <FaCalendarAlt className="inline mr-2" />
                    Sınav Ne Zaman Başlasın?
                </label>
                
                <div className="space-y-3">
                    {/* Hemen Yayınla */}
                    <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                            type="radio"
                            name="publishType"
                            value="immediate"
                            checked={examData.publishType === 'immediate'}
                            onChange={(e) => handlePublishTypeChange(e.target.value)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                                <FaPlayCircle className="mr-2 text-green-600" />
                                Hemen Yayınla
                            </div>
                            <div className="text-xs text-gray-500">Sınav şimdi başlar ve katılımcılar hemen katılabilir</div>
                        </div>
                    </label>

                    {/* Zamanla */}
                    <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                            type="radio"
                            name="publishType"
                            value="scheduled"
                            checked={examData.publishType === 'scheduled'}
                            onChange={(e) => handlePublishTypeChange(e.target.value)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                                <FaCalendarAlt className="mr-2 text-blue-600" />
                                İleri Bir Tarihte Başlat
                            </div>
                            <div className="text-xs text-gray-500">Belirli bir tarih ve saatte başlamasını istiyorum</div>
                        </div>
                    </label>
                </div>

                {/* Tarih ve Saat Seçimi */}
                {examData.publishType === 'scheduled' && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 mb-3">Başlangıç Tarihi ve Saati</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-blue-700 mb-1">Tarih</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={examData.startDate}
                                    onChange={handleInputChange}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-blue-700 mb-1">Saat</label>
                                <input
                                    type="time"
                                    name="startTime"
                                    value={examData.startTime}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Yayın Süresi */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    <FaHourglass className="inline mr-2" />
                    Sınav Ne Kadar Süre Yayında Kalsın?
                </label>
                
                <div className="space-y-3">
                    {/* Süresiz */}
                    <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                            type="radio"
                            name="publishUnit"
                            value="permanent"
                            checked={examData.publishUnit === 'permanent'}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">Süresiz</div>
                            <div className="text-xs text-gray-500">Manuel olarak kapatılana kadar yayında kalır</div>
                        </div>
                    </label>

                    {/* Belirli Gün Sayısı */}
                    <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                            type="radio"
                            name="publishUnit"
                            value="days"
                            checked={examData.publishUnit === 'days'}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div className="ml-3 flex-1">
                            <div className="text-sm font-medium text-gray-900">Belirli Gün Sayısı</div>
                            <div className="text-xs text-gray-500">Belirlediğiniz gün sayısı kadar yayında kalır</div>
                        </div>
                    </label>

                    {/* Belirli Saat Sayısı */}
                    <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                            type="radio"
                            name="publishUnit"
                            value="hours"
                            checked={examData.publishUnit === 'hours'}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div className="ml-3 flex-1">
                            <div className="text-sm font-medium text-gray-900">Belirli Saat Sayısı</div>
                            <div className="text-xs text-gray-500">Belirlediğiniz saat sayısı kadar yayında kalır</div>
                        </div>
                    </label>
                </div>

                {/* Süre Girişi */}
                {examData.publishUnit !== 'permanent' && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h4 className="text-sm font-medium text-yellow-900 mb-3">
                            Yayın Süresi ({examData.publishUnit === 'days' ? 'Gün' : 'Saat'})
                        </h4>
                        <div className="flex items-center space-x-3">
                            <input
                                type="number"
                                name="publishDuration"
                                value={examData.publishDuration}
                                onChange={handleInputChange}
                                min="1"
                                max={examData.publishUnit === 'days' ? "365" : "8760"}
                                className="w-24 px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            />
                            <span className="text-sm text-yellow-700">
                                {examData.publishUnit === 'days' ? 'gün' : 'saat'} boyunca yayında kalacak
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Hedef Kitle */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    <FaUsers className="inline mr-2" />
                    Bu Sınav Kimlere Yönelik?
                </label>
                
                <div className="space-y-3">
                    {/* Herkes Seçeneği */}
                    <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                            type="radio"
                            name="targetAudience"
                            value="herkes"
                            checked={examData.targetAudience === 'herkes'}
                            onChange={(e) => handleTargetAudienceChange(e.target.value)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">Herkes</div>
                            <div className="text-xs text-gray-500">Tüm kullanıcılar bu sınava katılabilir</div>
                        </div>
                    </label>

                    {/* Tüm Ünvanlar Seçeneği */}
                    <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                            type="radio"
                            name="targetAudience"
                            value="tumUnvanlar"
                            checked={examData.targetAudience === 'tumUnvanlar'}
                            onChange={(e) => handleTargetAudienceChange(e.target.value)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">Tüm Ünvanlar</div>
                            <div className="text-xs text-gray-500">Sadece ünvanı olan kullanıcılar katılabilir</div>
                        </div>
                    </label>

                    {/* Seçili Ünvanlar Seçeneği */}
                    <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                            type="radio"
                            name="targetAudience"
                            value="seciliUnvanlar"
                            checked={examData.targetAudience === 'seciliUnvanlar'}
                            onChange={(e) => handleTargetAudienceChange(e.target.value)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">Belirli Ünvanlar</div>
                            <div className="text-xs text-gray-500">Sadece seçili ünvanlardaki kullanıcılar katılabilir</div>
                        </div>
                    </label>
                </div>

                {/* Ünvan Seçimi */}
                {examData.targetAudience === 'seciliUnvanlar' && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 mb-3">Ünvan Seçimi</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {expertiseOptions.map((expertise) => (
                                <label
                                    key={expertise}
                                    className="flex items-center p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={examData.selectedExpertise.includes(expertise)}
                                        onChange={() => handleExpertiseToggle(expertise)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="ml-3 text-sm text-gray-900">{expertise}</span>
                                </label>
                            ))}
                        </div>
                        
                        {examData.selectedExpertise.length > 0 && (
                            <div className="mt-3 p-2 bg-white rounded border border-blue-200">
                                <div className="text-xs text-blue-700">
                                    <strong>Seçili Ünvanlar:</strong> {examData.selectedExpertise.join(', ')}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Sınav Özeti */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Sınav Özeti</h4>
                <div className="space-y-2 text-sm text-gray-600">
                    <div><strong>Sınav Adı:</strong> {examData.name || 'Henüz girilmedi'}</div>
                    <div><strong>Süre:</strong> {examData.duration} dakika</div>
                    <div><strong>Toplam Soru:</strong> {getTotalQuestions()} adet</div>
                    <div>
                        <strong>Hedef Kitle:</strong> {
                            examData.targetAudience === 'herkes' ? 'Herkes' :
                            examData.targetAudience === 'tumUnvanlar' ? 'Tüm Ünvanlar' :
                            examData.selectedExpertise.length > 0 ? 
                                examData.selectedExpertise.join(', ') : 
                                'Ünvan seçimi yapılmadı'
                        }
                    </div>
                    <div>
                        <strong>Başlangıç:</strong> {
                            examData.publishType === 'immediate' ? 'Hemen başlayacak' :
                            examData.startDate && examData.startTime ? 
                                `${new Date(examData.startDate).toLocaleDateString('tr-TR')} ${examData.startTime}` :
                                'Tarih/saat seçilmedi'
                        }
                    </div>
                    <div>
                        <strong>Yayın Süresi:</strong> {
                            examData.publishUnit === 'permanent' ? 'Süresiz' :
                            examData.publishUnit === 'days' ? `${examData.publishDuration} gün` :
                            `${examData.publishDuration} saat`
                        }
                    </div>
                    {examData.publishType === 'scheduled' && examData.startDate && examData.startTime && 
                     examData.publishUnit !== 'permanent' && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                            <div className="text-xs text-blue-700">
                                <strong>Bitiş Tarihi:</strong> {
                                    (() => {
                                        const start = new Date(`${examData.startDate}T${examData.startTime}`);
                                        const end = new Date(start);
                                        if (examData.publishUnit === 'days') {
                                            end.setDate(end.getDate() + parseInt(examData.publishDuration));
                                        } else {
                                            end.setHours(end.getHours() + parseInt(examData.publishDuration));
                                        }
                                        return `${end.toLocaleDateString('tr-TR')} ${end.toTimeString().slice(0, 5)}`;
                                    })()
                                }
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Butonlar */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <button
                    onClick={onBack}
                    className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                    <FaTimes className="h-4 w-4 mr-1" />
                    Geri
                </button>
                
                <button
                    onClick={handleSubmit}
                    className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                    <FaCheck className="h-4 w-4 mr-2" />
                    Sınavı Oluştur
                </button>
            </div>
        </div>
    );
};

export default StepSix; 