import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout';
import { FaPlus, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, getDocs, collectionGroup, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { db } from '../../firebase';
import CreateExamModal from '../../components/CreateExamModal';

const CreateExamPage = () => {
    const navigate = useNavigate();
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [konular, setKonular] = useState([]);
    const [konuIstatistikleri, setKonuIstatistikleri] = useState({});
    const [loading, setLoading] = useState(false);

    // Konuları ve istatistikleri yükle
    useEffect(() => {
        setLoading(true);
        
        const unsubscribe = onSnapshot(collection(db, "konular"), async (snapshot) => {
            const konularData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setKonular(konularData);
            
            // Her konu için soru sayısını hesapla
            const istatistikler = {};
            
            for (const konu of konularData) {
                try {
                    const sorularRef = collectionGroup(db, "sorular");
                    const sorularSnap = await getDocs(sorularRef);
                    
                    let soruSayisi = 0;
                    sorularSnap.forEach(doc => {
                        const konuId = doc.ref.parent.parent.parent.parent.id;
                        if (konuId === konu.id) {
                            soruSayisi++;
                        }
                    });
                    
                    istatistikler[konu.id] = { soruSayisi };
                } catch (error) {
                    console.error(`Konu ${konu.id} için soru sayısı hesaplanırken hata:`, error);
                    istatistikler[konu.id] = { soruSayisi: 0 };
                }
            }
            
            setKonuIstatistikleri(istatistikler);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Modal tamamlama işlemi
    const handleModalComplete = async (examData) => {
        console.log('Sınav oluşturma verileri:', examData);
        
        try {
            // Firestore'a kaydetmek için sınav verilerini hazırla
            const examToSave = {
                name: examData.name,
                duration: examData.duration,
                targetAudience: examData.targetAudience,
                selectedExpertise: examData.selectedExpertise || [],
                questions: examData.questions,
                totalQuestions: examData.totalQuestions,
                
                // Yayın zamanlama bilgileri
                publishType: examData.publishType, // 'immediate' veya 'scheduled'
                startDateTime: examData.startDateTime,
                endDateTime: examData.endDateTime,
                publishUnit: examData.publishUnit, // 'permanent', 'days', 'hours'
                publishDuration: examData.publishDuration,
                
                // Sistem bilgileri
                status: examData.publishType === 'immediate' ? 'aktif' : 'beklemede',
                createdAt: serverTimestamp(),
                createdBy: 'admin', // İleride kullanıcı sisteminden alınacak
                participants: 0,
                results: []
            };

            // Firestore'a kaydet
            const docRef = await addDoc(collection(db, 'examlar'), examToSave);
            
            console.log('Sınav başarıyla kaydedildi, ID:', docRef.id);
            
            if (examData.publishType === 'immediate') {
                toast.success(`Sınav başarıyla oluşturuldu ve yayınlandı! ID: ${docRef.id}`);
            } else {
                const startDate = new Date(examData.startDateTime).toLocaleDateString('tr-TR');
                const startTime = new Date(examData.startDateTime).toLocaleTimeString('tr-TR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                toast.success(`Sınav başarıyla oluşturuldu! ${startDate} ${startTime} tarihinde yayınlanacak.`);
            }
            
            // Ana sayfaya dön
            navigate('/deneme-sinavlari');
            
        } catch (error) {
            console.error('Sınav kaydedilirken hata oluştu:', error);
            toast.error('Sınav kaydedilemedi. Lütfen tekrar deneyin.');
        }
    };

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center">
                        <button 
                            onClick={() => navigate('/deneme-sinavlari')}
                            className="mr-4 p-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            <FaArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Sınav Oluştur</h1>
                            <p className="text-gray-600 mt-2">Yeni bir sınav oluşturmak için soruları seçin</p>
                        </div>
                    </div>
                </div>

                {/* Ana İçerik */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sol Panel - Sınav Oluşturma */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Sınav Türü Seçin</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Soru Bankasından Seç */}
                                <div 
                                    onClick={() => setIsQuestionModalOpen(true)}
                                    className="p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                >
                                    <div className="text-center">
                                        <FaPlus className="h-12 w-12 text-gray-400 group-hover:text-blue-500 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-900 mb-2">
                                            Soru Bankasından Seç
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Mevcut sorulardan seçerek sınav oluşturun
                                        </p>
                                    </div>
                                </div>

                                {/* Manuel Soru Gir (Gelecekte) */}
                                <div className="p-6 border-2 border-dashed border-gray-200 rounded-lg opacity-50 cursor-not-allowed">
                                    <div className="text-center">
                                        <FaPlus className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-500 mb-2">
                                            Manuel Soru Gir
                                        </h3>
                                        <p className="text-sm text-gray-400">
                                            Yakında kullanılabilir
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sağ Panel - İstatistikler */}
                    <div className="space-y-6">
                        {/* Toplam Konu Sayısı */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Konu İstatistikleri</h3>
                            
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Toplam Konu:</span>
                                    <span className="font-semibold text-blue-600">{konular.length}</span>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Toplam Soru:</span>
                                    <span className="font-semibold text-green-600">
                                        {Object.values(konuIstatistikleri).reduce((total, stat) => total + stat.soruSayisi, 0)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* En Çok Soru Olan Konular */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">En Çok Soru Olan Konular</h3>
                            
                            <div className="space-y-2">
                                {konular
                                    .map(konu => ({
                                        ...konu,
                                        soruSayisi: konuIstatistikleri[konu.id]?.soruSayisi || 0
                                    }))
                                    .sort((a, b) => b.soruSayisi - a.soruSayisi)
                                    .slice(0, 5)
                                    .map(konu => (
                                        <div key={konu.id} className="flex justify-between items-center py-2">
                                            <span className="text-sm text-gray-600 truncate">{konu.baslik}</span>
                                            <span className="text-sm font-medium text-blue-600">{konu.soruSayisi}</span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                </div>

                {/* Soru Seçim Modal'ı */}
                <CreateExamModal
                    isOpen={isQuestionModalOpen}
                    onClose={() => setIsQuestionModalOpen(false)}
                    konular={konular}
                    konuIstatistikleri={konuIstatistikleri}
                    loading={loading}
                    onComplete={handleModalComplete}
                />
            </div>
        </Layout>
    );
};

export default CreateExamPage; 