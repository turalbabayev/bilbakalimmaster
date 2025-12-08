import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout';
import { FaPlus, FaArrowLeft, FaEdit, FaTimes, FaSave } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, getDocs, collectionGroup, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { db } from '../../firebase';
import CreateExamModal from '../../components/CreateExamModal';
import { Editor } from '@tinymce/tinymce-react';
import statsService from '../../services/statsService';

const CreateExamPage = () => {
    const navigate = useNavigate();
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [showManualQuestionModal, setShowManualQuestionModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [questionForm, setQuestionForm] = useState({
        questionText: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        optionE: '',
        correctAnswer: 'A',
        explanation: '',
        difficulty: 'medium',
        topicName: ''
    });
    const [konular, setKonular] = useState([]);
    const [konuIstatistikleri, setKonuIstatistikleri] = useState({});
    const [loading, setLoading] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState('');
    const [selectedTopicId, setSelectedTopicId] = useState('');
    const [showJsonInput, setShowJsonInput] = useState(false);
    const [jsonInput, setJsonInput] = useState('');

    const resetForm = () => {
        setQuestionForm({
            questionText: '',
            optionA: '',
            optionB: '',
            optionC: '',
            optionD: '',
            optionE: '',
            correctAnswer: 'A',
            explanation: '',
            difficulty: 'medium',
            topicName: ''
        });
        setSelectedTopic('');
        setSelectedTopicId('');
        setShowJsonInput(false);
        setJsonInput('');
    };

    const handleSubmitQuestion = async (e) => {
        e.preventDefault();
        
        if (!questionForm.questionText.trim() || !questionForm.optionA.trim() || 
            !questionForm.optionB.trim() || !questionForm.optionC.trim() || 
            !questionForm.optionD.trim() || !questionForm.optionE.trim() || !selectedTopic || !selectedTopicId) {
            toast.error('Lütfen tüm zorunlu alanları doldurun!');
            return;
        }

        setIsSubmitting(true);
        try {
            const docRef = await addDoc(collection(db, 'manual-questions'), {
                soruMetni: questionForm.questionText.trim(),
                cevaplar: [
                    questionForm.optionA.trim(),
                    questionForm.optionB.trim(),
                    questionForm.optionC.trim(),
                    questionForm.optionD.trim(),
                    questionForm.optionE.trim()
                ],
                dogruCevap: questionForm.correctAnswer,
                aciklama: questionForm.explanation.trim(),
                difficulty: questionForm.difficulty,
                topicName: selectedTopic,
                topicId: selectedTopicId, // Konunun Firestore ID'si
                createdAt: serverTimestamp(),
                isActive: true
            });

            // Document ID'yi de kaydet
            await updateDoc(docRef, {
                id: docRef.id
            });

            // Genel istatistikleri güncelle (soru sayısını artır - arka planda son 30 gün de güncellenir)
            try {
                const createdAt = serverTimestamp();
                await statsService.incrementSoruCount(1, createdAt);
            } catch (statsError) {
                console.error("Genel istatistikler güncellenirken hata:", statsError);
            }

            toast.success('Soru başarıyla eklendi!');
            resetForm();
            setShowManualQuestionModal(false);
        } catch (error) {
            console.error('Soru eklenirken hata:', error);
            toast.error('Soru eklenirken bir hata oluştu!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitJson = async (e) => {
        e.preventDefault();
        
        if (!selectedTopic || !selectedTopicId || !jsonInput.trim()) {
            toast.error('Lütfen konu seçin ve JSON verisini girin!');
            return;
        }

        setIsSubmitting(true);
        try {
            const questions = JSON.parse(jsonInput);
            
            if (!Array.isArray(questions)) {
                toast.error('JSON verisi bir array olmalıdır!');
                return;
            }

            let successCount = 0;
            for (const question of questions) {
                const docRef = await addDoc(collection(db, 'manual-questions'), {
                    soruMetni: question.soruMetni || '',
                    cevaplar: question.cevaplar || [],
                    dogruCevap: question.dogruCevap || 'A',
                    aciklama: question.aciklama || '',
                    difficulty: question.difficulty || 'medium',
                    topicName: selectedTopic,
                    topicId: selectedTopicId, // Konunun Firestore ID'si
                    createdAt: serverTimestamp(),
                    isActive: true
                });

                // Document ID'yi de kaydet
                await updateDoc(docRef, {
                    id: docRef.id
                });
                
                successCount++;
            }

            // Genel istatistikleri güncelle (toplu soru ekleme)
            if (successCount > 0) {
                try {
                    await statsService.incrementSoruCount(successCount);
                } catch (statsError) {
                    console.error("Genel istatistikler güncellenirken hata:", statsError);
                }
            }

            toast.success(`${successCount} soru başarıyla eklendi!`);
            resetForm();
            setShowManualQuestionModal(false);
        } catch (error) {
            console.error('JSON işlenirken hata:', error);
            toast.error('JSON formatı hatalı veya işlenirken bir hata oluştu!');
        } finally {
            setIsSubmitting(false);
        }
    };

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
            <div className="min-h-screen bg-white">
                <div className="container mx-auto px-4 py-12">
                    <div className="max-w-6xl mx-auto">
                        {/* Header */}
                        <div className="text-left mb-8">
                            <div className="flex items-center mb-4">
                                <button 
                                    onClick={() => navigate('/deneme-sinavlari')}
                                    className="mr-4 p-2 text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    <FaArrowLeft className="h-5 w-5" />
                                </button>
                                <h1 className="text-2xl font-semibold text-gray-900">
                                    Sınav Oluştur
                                </h1>
                            </div>
                            <p className="text-sm text-gray-600">
                                Yeni bir sınav oluşturmak için yöntem seçin
                            </p>
                        </div>

                        {/* Ana İçerik */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Sol Panel - Sınav Oluşturma */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-xl shadow-lg p-8">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Sınav Türü Seçin</h2>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Soru Bankasından Seç - DEVRE DIŞI */}
                                        <div className="group relative bg-white rounded-xl shadow-lg border border-gray-100/50 overflow-hidden opacity-50 cursor-not-allowed">
                                            <div className="h-2 w-full bg-gray-400 rounded-t-xl"></div>
                                            <div className="p-6">
                                                <div className="text-center">
                                                    <div className="w-12 h-12 rounded-xl bg-gray-400 flex items-center justify-center mx-auto mb-4">
                                                        <FaPlus className="h-6 w-6 text-white" />
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-gray-500 mb-2">
                                                        Soru Bankasından Seç
                                                    </h3>
                                                    <p className="text-sm text-gray-400">
                                                        Bu özellik geçici olarak devre dışı bırakılmıştır
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Manuel Soru Gir */}
                                        <div 
                                            onClick={() => setShowManualQuestionModal(true)}
                                            className="group relative bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border border-gray-100/50 overflow-hidden cursor-pointer"
                                        >
                                            <div className="h-2 w-full bg-green-500 rounded-t-xl"></div>
                                            <div className="p-6">
                                                <div className="text-center">
                                                    <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                                        <FaEdit className="h-6 w-6 text-white" />
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors duration-300">
                                                        Manuel Soru Gir
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        Tek tek soru ekleyerek soru havuzunu genişletin
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Yeni Akış: Sınav Oluştur - AKTİF */}
                                        <div
                                            onClick={() => navigate('/create-exam/new')}
                                            className="group relative bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border border-gray-100/50 overflow-hidden cursor-pointer"
                                        >
                                            <div className="h-2 w-full bg-blue-500 rounded-t-xl"></div>
                                            <div className="p-6">
                                                <div className="text-center">
                                                    <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                                        <FaPlus className="h-6 w-6 text-white" />
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors duration-300">
                                                        Sınav Oluştur
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        Yeni adım adım sınav oluşturma sistemi
                                                    </p>
                                                    <div className="mt-3 inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                                        ÖNERİLEN
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                            </div>
                        </div>
                    </div>

                            {/* Sağ Panel - İstatistikler */}
                            <div className="space-y-6">
                                {/* Toplam Konu Sayısı */}
                                <div className="bg-white rounded-xl shadow-lg p-6">
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
                                <div className="bg-white rounded-xl shadow-lg p-6">
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

                {/* Manuel Soru Girme Modal */}
                {showManualQuestionModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[98vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <FaEdit className="text-green-600" />
                                        Manuel Soru Ekle
                                    </h2>
                                    <button
                                        onClick={() => {
                                            setShowManualQuestionModal(false);
                                            resetForm();
                                        }}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                                    >
                                        <FaTimes className="text-gray-500" />
                                    </button>
                                </div>
                            </div>
                            
                            <form onSubmit={showJsonInput ? handleSubmitJson : handleSubmitQuestion} className="p-6 space-y-6 overflow-y-auto max-h-[calc(98vh-200px)]">
                                {/* Giriş Türü Seçimi */}
                                <div className="flex gap-4 mb-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowJsonInput(false)}
                                        className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                                            !showJsonInput 
                                                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-2 border-green-500' 
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600'
                                        }`}
                                    >
                                        Manuel Giriş
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowJsonInput(true)}
                                        className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                                            showJsonInput 
                                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-2 border-blue-500' 
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600'
                                        }`}
                                    >
                                        JSON Yükle
                                    </button>
                                </div>

                                {/* Konu Seçimi */}
                                <div>
                                    <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                        Konu Seçin *
                                    </label>
                                    <select
                                        value={selectedTopic}
                                        onChange={(e) => {
                                            const selectedKonu = konular.find(k => k.baslik === e.target.value);
                                            setSelectedTopic(e.target.value);
                                            setSelectedTopicId(selectedKonu ? selectedKonu.id : '');
                                        }}
                                        className={`w-full px-4 py-3 rounded-xl border-2 ${!selectedTopic ? 'border-red-400 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200`}
                                        required
                                    >
                                        <option value="">Konu seçin</option>
                                        {konular.map((konu) => (
                                            <option key={konu.id} value={konu.baslik}>
                                                {konu.baslik}
                                            </option>
                                        ))}
                                    </select>
                                    {!selectedTopic && (
                                        <p className="mt-2 text-sm text-red-500 dark:text-red-400">
                                            Lütfen bir konu seçin. Bu alanın doldurulması zorunludur.
                                        </p>
                                    )}
                                </div>

                                {showJsonInput ? (
                                    /* JSON Yükleme Formu */
                                    <div>
                                        <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
                                            JSON Verisi *
                                        </label>
                                        <textarea
                                            value={jsonInput}
                                            onChange={(e) => setJsonInput(e.target.value)}
                                            className="w-full h-96 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                            placeholder={`[
  {
    "soruMetni": "Türkiye'nin başkenti neresidir?",
    "cevaplar": ["Ankara", "İstanbul", "İzmir", "Antalya", "Bursa"],
    "dogruCevap": "A",
    "aciklama": "Türkiye Cumhuriyeti'nin başkenti 1923'ten beri Ankara'dır.",
    "difficulty": "easy"
  },
  {
    "soruMetni": "Hangi element periyodik tabloda 'Au' sembolü ile gösterilir?",
    "cevaplar": ["Gümüş", "Altın", "Alüminyum", "Argon", "Arsenik"],
    "dogruCevap": "B",
    "aciklama": "Au, Latince 'aurum' kelimesinden gelir ve altını temsil eder.",
    "difficulty": "medium"
  }
]`}
                                            required
                                        />
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                            JSON formatında soru listesi girin. Difficulty: "easy", "medium", "hard" olabilir.
                                        </p>
                                    </div>
                                ) : (
                                    /* Manuel Giriş Formu */
                                    <>
                                        {/* Soru Metni */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Soru Metni *
                                        </label>
                                        <Editor
                                            apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
                                            value={questionForm.questionText}
                                            onEditorChange={(content) => setQuestionForm(prev => ({ ...prev, questionText: content }))}
                                            init={{
                                                height: 300,
                                                menubar: false,
                                                plugins: [
                                                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                                    'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                                                ],
                                                toolbar: 'undo redo | blocks | ' +
                                                    'bold italic forecolor | alignleft aligncenter ' +
                                                    'alignright alignjustify | bullist numlist outdent indent | ' +
                                                    'removeformat | help',
                                                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                                                language: 'tr',
                                                language_url: '/tinymce/langs/tr.js'
                                            }}
                                            className="border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden"
                                        />
                                    </div>

                                    {/* Seçenekler */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                            Seçenekler *
                                        </label>
                                        <div className="space-y-4">
                                            {[
                                                { key: 'A', value: questionForm.optionA, setter: 'optionA' },
                                                { key: 'B', value: questionForm.optionB, setter: 'optionB' },
                                                { key: 'C', value: questionForm.optionC, setter: 'optionC' },
                                                { key: 'D', value: questionForm.optionD, setter: 'optionD' },
                                                { key: 'E', value: questionForm.optionE, setter: 'optionE' }
                                            ].map(({ key, value, setter }) => (
                                                <div key={key} className="flex items-start gap-4">
                                                    <div className="flex-shrink-0 pt-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setQuestionForm(prev => ({ ...prev, correctAnswer: key }))}
                                                            className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium transition-all duration-200 ${
                                                                questionForm.correctAnswer === key
                                                                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 ring-2 ring-green-500'
                                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                            }`}
                                                        >
                                                            {key}
                                                        </button>
                                                    </div>
                                                    <div className="flex-1">
                                                        <input
                                                            type="text"
                                                            value={value}
                                                            onChange={(e) => setQuestionForm(prev => ({ ...prev, [setter]: e.target.value }))}
                                                            placeholder={`${key} seçeneğini girin`}
                                                            className={`w-full px-4 py-3 rounded-xl border-2 ${
                                                                questionForm.correctAnswer === key
                                                                    ? 'border-green-200 dark:border-green-800'
                                                                    : 'border-gray-200 dark:border-gray-700'
                                                            } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200`}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Doğru Cevap */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Doğru Cevap: <span className="text-green-600 font-bold">{questionForm.correctAnswer}</span>
                                        </label>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Yukarıdaki daire şeklindeki butonlara tıklayarak doğru cevabı seçebilirsiniz.
                                        </p>
                                    </div>

                                    {/* Açıklama */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Açıklama
                                        </label>
                                        <Editor
                                            apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
                                            value={questionForm.explanation}
                                            onEditorChange={(content) => setQuestionForm(prev => ({ ...prev, explanation: content }))}
                                            init={{
                                                height: 200,
                                                menubar: false,
                                                plugins: [
                                                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                                    'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                                                ],
                                                toolbar: 'undo redo | blocks | ' +
                                                    'bold italic forecolor | alignleft aligncenter ' +
                                                    'alignright alignjustify | bullist numlist outdent indent | ' +
                                                    'removeformat | help',
                                                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                                                language: 'tr',
                                                language_url: '/tinymce/langs/tr.js'
                                            }}
                                            className="border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden"
                                        />
                                    </div>

                                    {/* Zorluk Seviyesi */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                            Zorluk Seviyesi
                                        </label>
                                        <select
                                            value={questionForm.difficulty}
                                            onChange={(e) => setQuestionForm(prev => ({ ...prev, difficulty: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        >
                                            <option value="easy">Kolay</option>
                                            <option value="medium">Orta</option>
                                            <option value="hard">Zor</option>
                                        </select>
                                    </div>
                                </>
                                )}

                                {/* Butonlar */}
                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowManualQuestionModal(false);
                                            resetForm();
                                        }}
                                        className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Kaydediliyor...
                                            </>
                                        ) : (
                                            <>
                                                <FaSave />
                                                Soruyu Kaydet
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default CreateExamPage; 