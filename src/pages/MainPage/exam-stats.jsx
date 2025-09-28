import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout';
import { 
    FaChartBar, 
    FaArrowLeft, 
    FaUsers, 
    FaCheckCircle, 
    FaClock, 
    FaSpinner, 
    FaQuestionCircle,
    FaCalendarAlt,
    FaDownload
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType, ImageRun } from 'docx';
import { saveAs } from 'file-saver';

const ExamStatsPage = () => {
    const navigate = useNavigate();
    const { examId } = useParams();
    const [exam, setExam] = useState(null);
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);
    const [showDetailedStats, setShowDetailedStats] = useState(false);
    const [showIncorrectQuestions, setShowIncorrectQuestions] = useState(false);
    const [showPerformanceAnalysis, setShowPerformanceAnalysis] = useState(false);
    const [showQuestionDetail, setShowQuestionDetail] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [downloadModalId, setDownloadModalId] = useState('');
    const [downloadFilename, setDownloadFilename] = useState('');

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
                console.log('Sınav verisi:', data); // Debug için
                
                // Bu sınava ait sonuçları çek
                const resultsQuery = query(
                    collection(db, 'exam_results'),
                    where('examId', '==', examId)
                );
                const resultsSnap = await getDocs(resultsQuery);
                const examResults = resultsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                
                setExam({ 
                    id: examSnap.id, 
                    ...data, 
                    results: examResults 
                });

                // Kullanıcı bilgilerini yükle
                const uniqueUserIds = [...new Set(examResults.map(result => result.userId))];
                const usersData = {};
                
                for (const userId of uniqueUserIds) {
                    try {
                        const userDoc = doc(db, 'users', userId);
                        const userSnap = await getDoc(userDoc);
                        if (userSnap.exists()) {
                            const userData = userSnap.data();
                            usersData[userId] = {
                                name: userData.name || 'Bilinmeyen',
                                surname: userData.surname || 'Kullanıcı',
                                character: userData.character || null
                            };
                        } else {
                            usersData[userId] = {
                                name: 'Bilinmeyen',
                                surname: 'Kullanıcı'
                            };
                        }
                    } catch (error) {
                        console.error('User yüklenirken hata:', error);
                        usersData[userId] = {
                            name: 'Bilinmeyen',
                            surname: 'Kullanıcı'
                        };
                    }
                }
                
                setUsers(usersData);
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

    // Güvenli tarih dönüştürme fonksiyonu
    const safeToDate = (dateValue) => {
        if (!dateValue) return null;
        
        // Eğer zaten Date objesi ise
        if (dateValue instanceof Date) {
            return isNaN(dateValue.getTime()) ? null : dateValue;
        }
        
        // Eğer Firestore Timestamp ise
        if (dateValue && typeof dateValue.toDate === 'function') {
            try {
                return dateValue.toDate();
            } catch (error) {
                console.error('Timestamp dönüştürme hatası:', error);
                return null;
            }
        }
        
        // Eğer string ise
        if (typeof dateValue === 'string') {
            const date = new Date(dateValue);
            return isNaN(date.getTime()) ? null : date;
        }
        
        // Eğer number ise (timestamp)
        if (typeof dateValue === 'number') {
            const date = new Date(dateValue);
            return isNaN(date.getTime()) ? null : date;
        }
        
        return null;
    };

    // Tarih formatına çevirme
    const formatDate = (date) => {
        if (!date) return 'Belirtilmemiş';
        
        const safeDate = safeToDate(date);
        if (!safeDate) return 'Geçersiz tarih';
        
        return safeDate.toLocaleDateString('tr-TR');
    };

    const formatTime = (date) => {
        if (!date) return '';
        
        const safeDate = safeToDate(date);
        if (!safeDate) return '';
        
        return safeDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <Layout>
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-center py-12">
                            <FaSpinner className="animate-spin h-8 w-8 text-blue-500 mr-3" />
                            <span className="text-gray-600 text-lg">İstatistikler yükleniyor...</span>
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
                    <div className="max-w-7xl mx-auto">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                            <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Sınav bulunamadı</h3>
                            <p className="text-gray-600 mb-6">İstediğiniz sınavın istatistikleri mevcut değil.</p>
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

    // Gerçek istatistikleri hesapla
    const stats = {
        totalQuestions: exam.totalQuestions || 0,
        totalParticipants: exam.participants || 0,
        duration: exam.duration || 0,
        status: exam.status || 'draft',
        createdAt: safeToDate(exam.createdAt),
        startDateTime: safeToDate(exam.startDateTime),
        endDateTime: safeToDate(exam.endDateTime),
        averageScore: 0,
        successRate: 0
    };

    // Puan istatistiklerini hesapla
    if (exam.results && Array.isArray(exam.results) && exam.results.length > 0) {
        // Puan hesaplama: her doğru cevap 1 puan
        const scores = exam.results.map(result => result.correctAnswers || 0);
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        stats.averageScore = totalScore / scores.length;
        
        // Başarı oranı (toplam soruların yarısından fazla doğru cevap alanların yüzdesi)
        const passingScore = Math.ceil(stats.totalQuestions / 2);
        const successfulParticipants = scores.filter(score => score >= passingScore).length;
        stats.successRate = (successfulParticipants / scores.length) * 100;
        
        // Katılımcı sayısını güncelle
        stats.totalParticipants = exam.results.length;
    }

    // Standart sapma hesapla
    const calculateStandardDeviation = () => {
        if (!exam.results || exam.results.length === 0) return 0;
        
        const scores = exam.results.map(r => r.correctAnswers || 0);
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        return Math.sqrt(variance);
    };

    // Medyan hesapla
    const calculateMedian = () => {
        if (!exam.results || exam.results.length === 0) return 0;
        
        const scores = exam.results.map(r => r.correctAnswers || 0).sort((a, b) => a - b);
        const middle = Math.floor(scores.length / 2);
        
        if (scores.length % 2 === 0) {
            return (scores[middle - 1] + scores[middle]) / 2;
        } else {
            return scores[middle];
        }
    };

    // HTML entity'lerini decode et
    const decodeHtmlEntities = (text) => {
        if (!text) return '';
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    };

    // HTML içeriğini güvenli şekilde render et (resimler dahil)
    const renderHtmlContent = (htmlContent) => {
        if (!htmlContent) return '';
        
        // HTML entity'lerini decode et
        return decodeHtmlEntities(htmlContent);
    };

    // Liderlik tablosunu hesapla
    const getLeaderboard = () => {
        if (!exam.results || exam.results.length === 0) return [];

        return exam.results
            .map(result => {
                const user = users[result.userId];
                const userName = user ? `${user.name} ${user.surname}`.trim() : 'Bilinmeyen Kullanıcı';
                
                return {
                    id: result.id,
                    userId: result.userId,
                    userName: userName,
                    score: result.correctAnswers || 0,
                    totalQuestions: result.totalQuestions || 0,
                    percentage: result.totalQuestions > 0 ? ((result.correctAnswers || 0) / result.totalQuestions * 100).toFixed(1) : 0,
                    completedAt: result.completedAt || result.createdAt,
                    duration: result.duration || 0,
                    character: user?.character || null
                };
            })
            .sort((a, b) => {
                // Önce puana göre, sonra yüzdeye göre sırala
                if (b.score !== a.score) return b.score - a.score;
                return parseFloat(b.percentage) - parseFloat(a.percentage);
            });
    };

    // PDF indirme fonksiyonları
    const downloadModalAsPDF = async (modalId, filename) => {
        try {
            const element = document.getElementById(modalId);
            if (!element) {
                toast.error('Modal bulunamadı!');
                return;
            }

            // Modal'ı geçici olarak görünür yap ve scroll'u sıfırla
            const originalDisplay = element.style.display;
            const originalPosition = element.style.position;
            const originalLeft = element.style.left;
            const originalTop = element.style.top;
            const originalMaxHeight = element.style.maxHeight;
            const originalOverflow = element.style.overflow;

            element.style.display = 'block';
            element.style.position = 'absolute';
            element.style.left = '-9999px';
            element.style.top = '0';
            element.style.maxHeight = 'none';
            element.style.overflow = 'visible';

            // Scroll container'ı bul ve scroll'u sıfırla
            const scrollContainer = element.querySelector('.overflow-y-auto');
            if (scrollContainer) {
                scrollContainer.style.overflow = 'visible';
                scrollContainer.style.maxHeight = 'none';
            }

            // Biraz bekle ki DOM güncellensin
            await new Promise(resolve => setTimeout(resolve, 100));

            // Canvas oluştur
            const canvas = await html2canvas(element, {
                scale: 1.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                height: element.scrollHeight,
                width: element.scrollWidth,
                scrollX: 0,
                scrollY: 0
            });

            // PDF oluştur
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const imgWidth = 210; // A4 genişliği
            const pageHeight = 295; // A4 yüksekliği
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;

            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Modal'ı eski haline getir
            element.style.display = originalDisplay;
            element.style.position = originalPosition;
            element.style.left = originalLeft;
            element.style.top = originalTop;
            element.style.maxHeight = originalMaxHeight;
            element.style.overflow = originalOverflow;

            if (scrollContainer) {
                scrollContainer.style.overflow = 'auto';
                scrollContainer.style.maxHeight = 'calc(95vh - 200px)';
            }

            // PDF'i indir
            pdf.save(filename);
            toast.success('PDF başarıyla indirildi!');

        } catch (error) {
            console.error('PDF indirme hatası:', error);
            toast.error('PDF indirilirken hata oluştu!');
        }
    };

    // Resim URL'lerini HTML'den çıkar
    const extractImageUrls = (html) => {
        if (!html) return [];
        const imgRegex = /<img[^>]+src="([^"]+)"/g;
        const urls = [];
        let match;
        while ((match = imgRegex.exec(html)) !== null) {
            urls.push(match[1]);
        }
        return urls;
    };

    // Resmi arrayBuffer'a çevir
    const imageToArrayBuffer = async (url) => {
        try {
            if (!url) return null;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const blob = await response.blob();
            if (!blob || blob.size === 0) {
                throw new Error('Boş resim');
            }
            
            return await blob.arrayBuffer();
        } catch (error) {
            console.error('Resim yükleme hatası:', error);
            return null;
        }
    };

    // Metinsel DOCX oluşturma fonksiyonu
    const createTextualDOCX = async (filename) => {
        try {
            const paragraphs = [];

            // Başlık
            paragraphs.push(
                new Paragraph({
                    text: "Yanlış Yapılan Sorular Raporu",
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                })
            );

            // Sınav bilgisi
            paragraphs.push(
                new Paragraph({
                    text: `Sınav: ${exam?.title || exam?.name || exam?.examName || 'Bilinmeyen Sınav'}`,
                    heading: HeadingLevel.HEADING_2,
                })
            );

            paragraphs.push(
                new Paragraph({
                    text: `Tarih: ${new Date().toLocaleDateString('tr-TR')}`,
                })
            );

            paragraphs.push(
                new Paragraph({
                    text: `Toplam Soru: ${getMostIncorrectQuestions().length}`,
                })
            );

            paragraphs.push(new Paragraph({ text: "" })); // Boş satır

            // Sorular
            getMostIncorrectQuestions().forEach((question, index) => {
                // Soru numarası ve kategori
                paragraphs.push(
                    new Paragraph({
                        text: `Soru ${question.questionNumber} - ${question.category}`,
                        heading: HeadingLevel.HEADING_3,
                    })
                );

                // Soru metni
                const questionText = decodeHtmlEntities(question.questionText?.replace(/<[^>]*>/g, '') || 'Soru metni bulunamadı');
                paragraphs.push(
                    new Paragraph({
                        text: questionText,
                        spacing: { after: 200 },
                    })
                );

                // Soru metnindeki resimleri ekle
                const questionImages = extractImageUrls(question.questionText || '');
                for (const imageUrl of questionImages) {
                    try {
                        const arrayBuffer = await imageToArrayBuffer(imageUrl);
                        if (arrayBuffer) {
                            paragraphs.push(
                                new Paragraph({
                                    children: [
                                        new ImageRun({
                                            data: arrayBuffer,
                                            transformation: {
                                                width: 400,
                                                height: 300,
                                            },
                                        }),
                                    ],
                                    alignment: AlignmentType.CENTER,
                                    spacing: { after: 200 },
                                })
                            );
                        }
                    } catch (error) {
                        console.error('Soru resmi yüklenirken hata:', error);
                    }
                }

                // Seçenekler
                if (question.cevaplar && question.cevaplar.length > 0) {
                    paragraphs.push(
                        new Paragraph({
                            text: "Seçenekler:",
                            heading: HeadingLevel.HEADING_4,
                        })
                    );

                    for (let optionIndex = 0; optionIndex < question.cevaplar.length; optionIndex++) {
                        const option = question.cevaplar[optionIndex];
                        const letter = String.fromCharCode(65 + optionIndex);
                        const isCorrect = letter === question.correctAnswer;
                        const optionText = decodeHtmlEntities(option?.replace(/<[^>]*>/g, '') || '');
                        
                        const optionParagraph = new Paragraph({
                            children: [
                                new TextRun({
                                    text: `${letter}) ${optionText}`,
                                    bold: isCorrect,
                                }),
                                ...(isCorrect ? [
                                    new TextRun({
                                        text: " ✓",
                                        bold: true,
                                        color: "00AA00",
                                    })
                                ] : [])
                            ],
                            indent: { left: 400 },
                        });
                        
                        paragraphs.push(optionParagraph);

                        // Seçenekteki resimleri ekle
                        const optionImages = extractImageUrls(option || '');
                        for (const imageUrl of optionImages) {
                            try {
                                const arrayBuffer = await imageToArrayBuffer(imageUrl);
                                if (arrayBuffer) {
                                    paragraphs.push(
                                        new Paragraph({
                                            children: [
                                                new ImageRun({
                                                    data: arrayBuffer,
                                                    transformation: {
                                                        width: 300,
                                                        height: 200,
                                                    },
                                                }),
                                            ],
                                            alignment: AlignmentType.CENTER,
                                            indent: { left: 400 },
                                            spacing: { after: 100 },
                                        })
                                    );
                                }
                            } catch (error) {
                                console.error('Seçenek resmi yüklenirken hata:', error);
                            }
                        }
                    }

                    paragraphs.push(new Paragraph({ text: "" })); // Boş satır
                }

                // Açıklama
                if (question.aciklama) {
                    paragraphs.push(
                        new Paragraph({
                            text: "Açıklama:",
                            heading: HeadingLevel.HEADING_4,
                        })
                    );
                    
                    const explanationText = decodeHtmlEntities(question.aciklama.replace(/<[^>]*>/g, ''));
                    paragraphs.push(
                        new Paragraph({
                            text: explanationText,
                            indent: { left: 400 },
                            spacing: { after: 200 },
                        })
                    );

                    // Açıklamadaki resimleri ekle
                    const explanationImages = extractImageUrls(question.aciklama || '');
                    for (const imageUrl of explanationImages) {
                        try {
                            const arrayBuffer = await imageToArrayBuffer(imageUrl);
                            if (arrayBuffer) {
                                paragraphs.push(
                                    new Paragraph({
                                        children: [
                                            new ImageRun({
                                                data: arrayBuffer,
                                                transformation: {
                                                    width: 400,
                                                    height: 300,
                                                },
                                            }),
                                        ],
                                        alignment: AlignmentType.CENTER,
                                        indent: { left: 400 },
                                        spacing: { after: 200 },
                                    })
                                );
                            }
                        } catch (error) {
                            console.error('Açıklama resmi yüklenirken hata:', error);
                        }
                    }
                }

                // İstatistikler
                paragraphs.push(
                    new Paragraph({
                        text: `Doğru: ${question.correctCount} | Yanlış: ${question.incorrectCount} | Oran: %${question.incorrectPercentage.toFixed(1)}`,
                        italics: true,
                        color: "666666",
                    })
                );

                // Ayırıcı çizgi (son soru değilse)
                if (index < getMostIncorrectQuestions().length - 1) {
                    paragraphs.push(
                        new Paragraph({
                            text: "────────────────────────────────────────",
                            alignment: AlignmentType.CENTER,
                            color: "CCCCCC",
                        })
                    );
                    paragraphs.push(new Paragraph({ text: "" })); // Boş satır
                }
            });

            // DOCX oluştur
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: paragraphs,
                }],
            });

            // DOCX'i indir
            const blob = await Packer.toBlob(doc);
            saveAs(blob, filename);
            
            toast.success('Metinsel DOCX başarıyla indirildi!');

        } catch (error) {
            console.error('Metinsel DOCX oluşturma hatası:', error);
            toast.error('Metinsel DOCX oluşturulurken hata oluştu!');
        }
    };

    // İndirme modalını aç
    const openDownloadModal = (modalId, filename) => {
        setDownloadModalId(modalId);
        setDownloadFilename(filename);
        setShowDownloadModal(true);
    };

    // En çok yanlış yapılan soruları hesapla
    const getMostIncorrectQuestions = () => {
        if (!exam.results || exam.results.length === 0) return [];

        const questionStats = {};
        
        // Her sonucu analiz et
        exam.results.forEach(result => {
            // questionAnalysis array'ini kullan
            if (result.questionAnalysis && Array.isArray(result.questionAnalysis)) {
                result.questionAnalysis.forEach((questionData, index) => {
                    const questionId = `question_${index + 1}`;
                    const questionNumber = index + 1;
                    
                    if (!questionStats[questionId]) {
                        questionStats[questionId] = {
                            questionId,
                            questionNumber,
                            correctCount: 0,
                            incorrectCount: 0,
                            totalAttempts: 0,
                            questionText: questionData.questionText || '',
                            category: questionData.category || '',
                            difficulty: questionData.difficulty || '',
                            userAnswer: questionData.userAnswer || '',
                            correctAnswer: questionData.correctAnswer || '',
                            cevaplar: questionData.options || questionData.cevaplar || [],
                            aciklama: questionData.explanation || questionData.aciklama || ''
                        };
                    }
                    
                    questionStats[questionId].totalAttempts++;
                    
                    if (questionData.isCorrect) {
                        questionStats[questionId].correctCount++;
                    } else {
                        questionStats[questionId].incorrectCount++;
                    }
                });
            }
            // Eğer questionAnalysis yoksa, sadece genel istatistikleri kullan
            else {
                console.log('questionAnalysis bulunamadı, sadece genel istatistikler mevcut');
            }
        });

        // Yanlış oranını hesapla ve sırala
        const questionsArray = Object.values(questionStats).map(question => ({
            ...question,
            incorrectPercentage: question.totalAttempts > 0 ? (question.incorrectCount / question.totalAttempts) * 100 : 0
        }));

        // Yanlış sayısı doğru sayısından fazla olan soruları filtrele ve yanlış oranına göre sırala
        return questionsArray
            .filter(q => q.totalAttempts > 0 && q.incorrectCount > q.correctCount)
            .sort((a, b) => b.incorrectPercentage - a.incorrectPercentage);
    };

    // Puan dağılımını hesapla
    const getScoreDistribution = () => {
        if (!exam.results || exam.results.length === 0) return [];
        
        const scores = exam.results.map(r => r.correctAnswers || 0);
        const totalQuestions = stats.totalQuestions;
        
        const ranges = [
            { label: '0-20%', min: 0, max: Math.ceil(totalQuestions * 0.2) },
            { label: '21-40%', min: Math.ceil(totalQuestions * 0.2) + 1, max: Math.ceil(totalQuestions * 0.4) },
            { label: '41-60%', min: Math.ceil(totalQuestions * 0.4) + 1, max: Math.ceil(totalQuestions * 0.6) },
            { label: '61-80%', min: Math.ceil(totalQuestions * 0.6) + 1, max: Math.ceil(totalQuestions * 0.8) },
            { label: '81-100%', min: Math.ceil(totalQuestions * 0.8) + 1, max: totalQuestions }
        ];
        
        return ranges.map(range => {
            const count = scores.filter(score => score >= range.min && score <= range.max).length;
            const percentage = exam.results.length > 0 ? (count / exam.results.length) * 100 : 0;
            
            return {
                ...range,
                count,
                percentage
            };
        });
    };

    // Soru kategorilerini analiz et
    const categoryStats = [];
    let actualTotalQuestions = 0;
    
    if (exam.questions || exam.selectedQuestions) {
        const questionsData = exam.questions || exam.selectedQuestions || {};
        Object.entries(questionsData).forEach(([categoryName, categoryData]) => {
            if (categoryData && typeof categoryData === 'object') {
                const categoryQuestions = categoryData.questions || categoryData;
                const totalQuestions = Object.values(categoryQuestions).reduce((total, difficulty) => {
                    return total + (Array.isArray(difficulty) ? difficulty.length : 0);
                }, 0);
                
                if (totalQuestions > 0) {
                    categoryStats.push({
                        name: categoryName,
                        questionCount: totalQuestions
                    });
                    actualTotalQuestions += totalQuestions;
                }
            }
        });
        
        // Yüzde hesaplamalarını güncelle
        categoryStats.forEach(category => {
            category.percentage = Math.round((category.questionCount / actualTotalQuestions) * 100);
        });
    }
    
    // Gerçek toplam soru sayısını güncelle
    stats.totalQuestions = actualTotalQuestions;

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div>
                        <button
                            onClick={() => navigate(`/deneme-sinavlari/detay/${examId}`)}
                                    className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors mb-4 group"
                                >
                                    <div className="bg-gray-100 group-hover:bg-gray-200 rounded-lg p-2 mr-3 transition-colors">
                                        <FaArrowLeft className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium">Detaya Dön</span>
                        </button>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-3">
                                        <FaChartBar className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold text-gray-900">
                                            {exam.name || 'Sınav İstatistikleri'}
                            </h1>
                                        <p className="text-gray-600 mt-1">
                                            Performans analizi ve detaylı istatistikler
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ana İstatistikler */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-200">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="bg-blue-100 rounded-xl p-3">
                                        <FaQuestionCircle className="h-6 w-6 text-blue-600" />
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-sm font-medium text-gray-600 mb-1">Toplam Soru</h3>
                                    <p className="text-3xl font-bold text-gray-900">{stats.totalQuestions}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-200">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="bg-green-100 rounded-xl p-3">
                                        <FaUsers className="h-6 w-6 text-green-600" />
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-sm font-medium text-gray-600 mb-1">Katılımcı</h3>
                                    <p className="text-3xl font-bold text-gray-900">{stats.totalParticipants}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-200">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="bg-orange-100 rounded-xl p-3">
                                        <FaClock className="h-6 w-6 text-orange-600" />
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-sm font-medium text-gray-600 mb-1">Süre</h3>
                                    <p className="text-3xl font-bold text-gray-900">{stats.duration}dk</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-200">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="bg-purple-100 rounded-xl p-3">
                                        <FaCheckCircle className="h-6 w-6 text-purple-600" />
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-sm font-medium text-gray-600 mb-1">Durum</h3>
                                    <p className="text-lg font-bold text-gray-900">
                                        {(() => {
                                            switch (stats.status) {
                                                case 'active': return '🟢 Aktif';
                                                case 'draft': return '📝 Taslak';
                                                case 'scheduled': return '⏰ Planlandı';
                                                case 'expired': return '❌ Süresi Doldu';
                                                case 'cancelled': return '⚠️ İptal';
                                                default: return '❓ Bilinmiyor';
                                            }
                                        })()}
                                    </p>
                                    </div>
                                </div>
                            </div>
                        </div>


                    {/* Hızlı Erişim Butonları */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <button
                            onClick={() => setShowDetailedStats(true)}
                            className="group bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all duration-300 text-left"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="bg-blue-100 rounded-xl p-3 group-hover:bg-blue-200 transition-colors">
                                    <FaChartBar className="h-6 w-6 text-blue-600" />
                    </div>
                                <div className="text-blue-600 group-hover:text-blue-700">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Detaylı İstatistikler</h3>
                            <p className="text-sm text-gray-600">Ortalama puan, başarı oranı ve kategori dağılımı</p>
                        </button>

                        <button
                            onClick={() => setShowIncorrectQuestions(true)}
                            className="group bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-lg hover:border-red-200 transition-all duration-300 text-left"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="bg-red-100 rounded-xl p-3 group-hover:bg-red-200 transition-colors">
                                    <FaQuestionCircle className="h-6 w-6 text-red-600" />
                                </div>
                                <div className="text-red-600 group-hover:text-red-700">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Yanlış Yapılan Sorular</h3>
                            <p className="text-sm text-gray-600">En çok yanlış yapılan sorular ve analizleri</p>
                        </button>

                        <button
                            onClick={() => setShowPerformanceAnalysis(true)}
                            className="group bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-lg hover:border-purple-200 transition-all duration-300 text-left"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="bg-purple-100 rounded-xl p-3 group-hover:bg-purple-200 transition-colors">
                                    <FaCheckCircle className="h-6 w-6 text-purple-600" />
                                </div>
                                <div className="text-purple-600 group-hover:text-purple-700">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Performans Analizi</h3>
                            <p className="text-sm text-gray-600">Standart sapma, medyan ve puan dağılımı</p>
                        </button>

                        <button
                            onClick={() => setShowLeaderboard(true)}
                            className="group bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-lg hover:border-yellow-200 transition-all duration-300 text-left"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="bg-yellow-100 rounded-xl p-3 group-hover:bg-yellow-200 transition-colors">
                                    <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                    </svg>
                                </div>
                                <div className="text-yellow-600 group-hover:text-yellow-700">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Liderlik Tablosu</h3>
                            <p className="text-sm text-gray-600">En yüksek puanlar ve kullanıcı sıralaması</p>
                        </button>
                    </div>

                    {/* Modallar */}
                    {/* Detaylı İstatistikler Modal */}
                    {showDetailedStats && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div id="detailed-stats-modal" className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="bg-white/20 rounded-2xl p-3">
                                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold">Detaylı İstatistikler</h2>
                                                <p className="text-blue-100 mt-1">
                                                    <span className="font-semibold">{exam?.title || exam?.name || exam?.examName || 'Sınav'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => openDownloadModal('detailed-stats-modal', `Detayli_Istatistikler_${exam?.title || 'Sinav'}.pdf`)}
                                                className="bg-white/20 hover:bg-white/30 rounded-xl p-3 transition-colors"
                                                title="PDF İndir"
                                            >
                                                <FaDownload className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => setShowDetailedStats(false)}
                                                className="bg-white/20 hover:bg-white/30 rounded-xl p-3 transition-colors"
                                            >
                                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Kullanıcı İstatistikleri */}
                                        <div className="bg-gray-50 rounded-xl p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kullanıcı İstatistikleri</h3>
                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">Toplam Katılımcı</span>
                                                    <span className="text-2xl font-bold text-gray-900">{stats.totalParticipants}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">Puan Ortalaması</span>
                                                    <span className="text-2xl font-bold text-green-600">
                                                        {stats.averageScore ? stats.averageScore.toFixed(1) : '0.0'} / {stats.totalQuestions}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">Başarı Oranı</span>
                                                    <span className="text-2xl font-bold text-blue-600">
                                                        {stats.successRate ? stats.successRate.toFixed(1) : '0.0'}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Kategori Dağılımı */}
                                        <div className="bg-gray-50 rounded-xl p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kategori Dağılımı</h3>
                                            <div className="space-y-3">
                                {categoryStats.map((category) => (
                                    <div key={category.name}>
                                                        <div className="flex justify-between text-sm font-medium text-gray-900 mb-1">
                                            <span>{category.name}</span>
                                                            <span>{category.questionCount} soru</span>
                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${category.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Yanlış Yapılan Sorular Modal */}
                    {showIncorrectQuestions && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div id="incorrect-questions-modal" className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-red-500 to-pink-600 p-8 text-white">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="bg-white/20 rounded-2xl p-3">
                                                <FaQuestionCircle className="h-8 w-8" />
                            </div>
                                            <div>
                                                <h2 className="text-3xl font-bold">En Çok Yanlış Yapılan Sorular</h2>
                                                <p className="text-red-100 mt-1">
                                                    <span className="font-semibold">{exam?.title || exam?.name || exam?.examName || 'Sınav'}</span> • {getMostIncorrectQuestions().length} soru bulundu
                                                </p>
                        </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => openDownloadModal('incorrect-questions-modal', `Yanlis_Yapilan_Sorular_${exam?.title || 'Sinav'}.pdf`)}
                                                className="bg-white/20 hover:bg-white/30 rounded-xl p-3 transition-colors"
                                                title="PDF İndir"
                                            >
                                                <FaDownload className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => setShowIncorrectQuestions(false)}
                                                className="bg-white/20 hover:bg-white/30 rounded-xl p-3 transition-colors"
                                            >
                                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Content */}
                                <div className="p-8 max-h-[calc(95vh-200px)] overflow-y-auto">
                                    {getMostIncorrectQuestions().length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                                                <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Harika!</h3>
                                            <p className="text-gray-600">Tüm sorular başarıyla cevaplanmış. Yanlış yapılan soru bulunmuyor.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {getMostIncorrectQuestions().map((question, index) => (
                                                <div key={question.questionId || index} className="group bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 hover:border-red-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
                                                    {/* Card Header */}
                                                    <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 border-b border-gray-100">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center space-x-2">
                                                                <div className="bg-red-500 text-white rounded-lg w-8 h-8 flex items-center justify-center text-sm font-bold shadow-md">
                                                                    {index + 1}
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm font-bold text-gray-900">Soru {question.questionNumber}</h4>
                                                                    <div className="flex items-center space-x-1 mt-1">
                                                                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                                                            {question.category}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-xl font-bold text-red-600">{question.incorrectCount}</div>
                                                                <div className="text-xs text-gray-600">Yanlış</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Card Body */}
                                                    <div className="p-4">
                                                        {/* Question Text */}
                                                        <div className="mb-4">
                                                            <p className="text-gray-800 text-sm leading-relaxed line-clamp-2">
                                                                {decodeHtmlEntities(question.questionText?.replace(/<[^>]*>/g, '') || 'Soru metni bulunamadı')}
                            </p>
                        </div>

                                                        {/* Stats */}
                                                        <div className="grid grid-cols-2 gap-2 mb-4">
                                                            <div className="bg-green-50 rounded-lg p-3 text-center">
                                                                <div className="text-lg font-bold text-green-600 mb-1">{question.correctCount}</div>
                                                                <div className="text-xs text-green-700 font-medium">Doğru</div>
                    </div>
                                                            <div className="bg-red-50 rounded-lg p-3 text-center">
                                                                <div className="text-lg font-bold text-red-600 mb-1">{question.incorrectCount}</div>
                                                                <div className="text-xs text-red-700 font-medium">Yanlış</div>
                                                            </div>
                                                        </div>

                                                        {/* Progress Bar */}
                                                        <div className="mb-3">
                                                            <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                                                                <span>Yanlış Oranı</span>
                                                                <span>%{question.incorrectPercentage.toFixed(1)}</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                                <div 
                                                                    className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full transition-all duration-1000 ease-out"
                                                                    style={{ width: `${question.incorrectPercentage}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Total Attempts */}
                                                        <div className="text-center mb-3">
                                                            <span className="text-xs text-gray-500">
                                                                {question.totalAttempts} deneme
                                                            </span>
                                                        </div>

                                                        {/* Detail Button */}
                                                        <button
                                                            onClick={() => {
                                                                setSelectedQuestion(question);
                                                                setShowQuestionDetail(true);
                                                            }}
                                                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-all duration-200 flex items-center justify-center space-x-1"
                                                        >
                                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                            <span>Detay</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Soru Detay Modal */}
                    {showQuestionDetail && selectedQuestion && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="bg-white/20 rounded-2xl p-3">
                                                <FaQuestionCircle className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold">Soru Detayı</h2>
                                                <p className="text-blue-100 mt-1">
                                                    Soru #{selectedQuestion.questionNumber} - {selectedQuestion.category}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowQuestionDetail(false)}
                                            className="bg-white/20 hover:bg-white/30 rounded-xl p-3 transition-colors"
                                        >
                                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Content */}
                                <div className="p-8 max-h-[calc(95vh-200px)] overflow-y-auto">
                                    <div className="space-y-8">
                                        {/* Question Text */}
                                        <div className="bg-gray-50 rounded-2xl p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                                <div className="bg-blue-100 rounded-lg p-2 mr-3">
                                                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                Soru Metni
                                            </h3>
                                            <div className="prose max-w-none">
                                                <div 
                                                    className="text-gray-800 leading-relaxed text-lg"
                                                    dangerouslySetInnerHTML={{ 
                                                        __html: renderHtmlContent(selectedQuestion.questionText || 'Soru metni bulunamadı') 
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Options */}
                                        {selectedQuestion.cevaplar && selectedQuestion.cevaplar.length > 0 && (
                                            <div className="bg-gray-50 rounded-2xl p-6">
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                                    <div className="bg-green-100 rounded-lg p-2 mr-3">
                                                        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                        </svg>
                                                    </div>
                                                    Seçenekler
                                                </h3>
                                                <div className="space-y-3">
                                                    {selectedQuestion.cevaplar.map((option, index) => {
                                                        const letter = String.fromCharCode(65 + index);
                                                        const isCorrect = letter === selectedQuestion.correctAnswer;
                                                        return (
                                                            <div key={index} className={`p-4 rounded-xl border-2 transition-all ${
                                                                isCorrect 
                                                                    ? 'bg-green-50 border-green-200 shadow-md' 
                                                                    : 'bg-white border-gray-200 hover:border-gray-300'
                                                            }`}>
                                                                <div className="flex items-center space-x-3">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                                                        isCorrect 
                                                                            ? 'bg-green-500 text-white' 
                                                                            : 'bg-gray-200 text-gray-700'
                                                                    }`}>
                                                                        {letter}
                                                                    </div>
                                                                    <div 
                                                                        className={`flex-1 ${
                                                                            isCorrect ? 'text-green-800 font-medium' : 'text-gray-700'
                                                                        }`}
                                                                        dangerouslySetInnerHTML={{ 
                                                                            __html: renderHtmlContent(option || '') 
                                                                        }}
                                                                    />
                                                                    {isCorrect && (
                                                                        <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                                                            Doğru Cevap
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Explanation */}
                                        {selectedQuestion.aciklama && (
                                            <div className="bg-gray-50 rounded-2xl p-6">
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                                    <div className="bg-purple-100 rounded-lg p-2 mr-3">
                                                        <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    Açıklama
                                                </h3>
                                                <div className="prose max-w-none">
                                                    <div 
                                                        className="text-gray-800 leading-relaxed"
                                                        dangerouslySetInnerHTML={{ 
                                                            __html: renderHtmlContent(selectedQuestion.aciklama || 'Açıklama bulunamadı') 
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Statistics */}
                                        <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                                <div className="bg-red-100 rounded-lg p-2 mr-3">
                                                    <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                </div>
                                                İstatistikler
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="text-center">
                                                    <div className="text-3xl font-bold text-green-600 mb-2">{selectedQuestion.correctCount}</div>
                                                    <div className="text-sm text-gray-600">Doğru Cevap</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-3xl font-bold text-red-600 mb-2">{selectedQuestion.incorrectCount}</div>
                                                    <div className="text-sm text-gray-600">Yanlış Cevap</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-3xl font-bold text-blue-600 mb-2">%{selectedQuestion.incorrectPercentage.toFixed(1)}</div>
                                                    <div className="text-sm text-gray-600">Yanlış Oranı</div>
                                                </div>
                                            </div>
                                            <div className="mt-4 text-center">
                                                <span className="text-sm text-gray-500">
                                                    Toplam {selectedQuestion.totalAttempts} deneme
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Performans Analizi Modal */}
                    {showPerformanceAnalysis && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div id="performance-analysis-modal" className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="bg-white/20 rounded-2xl p-3">
                                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold">Detaylı Performans Analizi</h2>
                                                <p className="text-green-100 mt-1">
                                                    <span className="font-semibold">{exam?.title || exam?.name || exam?.examName || 'Sınav'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => openDownloadModal('performance-analysis-modal', `Performans_Analizi_${exam?.title || 'Sinav'}.pdf`)}
                                                className="bg-white/20 hover:bg-white/30 rounded-xl p-3 transition-colors"
                                                title="PDF İndir"
                                            >
                                                <FaDownload className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => setShowPerformanceAnalysis(false)}
                                                className="bg-white/20 hover:bg-white/30 rounded-xl p-3 transition-colors"
                                            >
                                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                        {/* En Yüksek Puan */}
                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <div className="bg-green-500 rounded-full p-2">
                                                    <FaCheckCircle className="h-4 w-4 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">En Yüksek Puan</p>
                                                    <p className="text-2xl font-bold text-green-600">
                                                        {Math.max(...exam.results.map(r => r.correctAnswers || 0))}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500">/ {stats.totalQuestions} soru</div>
                                        </div>

                                        {/* En Düşük Puan */}
                                        <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-4">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <div className="bg-red-500 rounded-full p-2">
                                                    <FaQuestionCircle className="h-4 w-4 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">En Düşük Puan</p>
                                                    <p className="text-2xl font-bold text-red-600">
                                                        {Math.min(...exam.results.map(r => r.correctAnswers || 0))}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500">/ {stats.totalQuestions} soru</div>
                                        </div>

                                        {/* Standart Sapma */}
                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <div className="bg-blue-500 rounded-full p-2">
                                                    <FaChartBar className="h-4 w-4 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">Standart Sapma</p>
                                                    <p className="text-2xl font-bold text-blue-600">
                                                        {calculateStandardDeviation().toFixed(1)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500">Puan dağılımı</div>
                                        </div>

                                        {/* Medyan */}
                                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <div className="bg-purple-500 rounded-full p-2">
                                                    <FaUsers className="h-4 w-4 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-600">Medyan Puan</p>
                                                    <p className="text-2xl font-bold text-purple-600">
                                                        {calculateMedian().toFixed(1)}
                            </p>
                        </div>
                    </div>
                                            <div className="text-xs text-gray-500">Orta değer</div>
                                        </div>
                                    </div>

                                    {/* Puan Dağılımı */}
                                    <div className="bg-gray-50 rounded-xl p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Puan Dağılımı</h3>
                                        <div className="space-y-3">
                                            {getScoreDistribution().map((range, index) => (
                                                <div key={index} className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-20 text-sm text-gray-600">{range.label}</div>
                                                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                                                            <div
                                                                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                                                                style={{ width: `${range.percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="w-16 text-right text-sm font-medium text-gray-900">
                                                        {range.count} kişi
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Liderlik Tablosu Modal */}
                    {showLeaderboard && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div id="leaderboard-modal" className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-yellow-500 to-orange-600 p-6 text-white">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="bg-white/20 rounded-2xl p-3">
                                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold">Liderlik Tablosu</h2>
                                                <p className="text-yellow-100 mt-1">
                                                    <span className="font-semibold">{exam?.title || exam?.name || exam?.examName || 'Sınav'}</span> • {getLeaderboard().length} katılımcı
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => openDownloadModal('leaderboard-modal', `Liderlik_Tablosu_${exam?.title || 'Sinav'}.pdf`)}
                                                className="bg-white/20 hover:bg-white/30 rounded-xl p-3 transition-colors"
                                                title="PDF İndir"
                                            >
                                                <FaDownload className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => setShowLeaderboard(false)}
                                                className="bg-white/20 hover:bg-white/30 rounded-xl p-3 transition-colors"
                                            >
                                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Content */}
                                <div className="p-6 max-h-[calc(95vh-200px)] overflow-y-auto">
                                    {getLeaderboard().length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                                                <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Henüz Katılımcı Yok</h3>
                                            <p className="text-gray-600">Bu sınava henüz kimse katılmamış.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Top 3 Özel Tasarım */}
                                            {getLeaderboard().slice(0, 3).map((user, index) => (
                                                <div key={user.id} className={`relative rounded-2xl p-6 ${
                                                    index === 0 ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-300' :
                                                    index === 1 ? 'bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-gray-300' :
                                                    'bg-gradient-to-r from-orange-100 to-orange-200 border-2 border-orange-300'
                                                }`}>
                                                    {/* Sıralama Badge */}
                                                    <div className={`absolute -top-3 -left-3 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                                                        index === 0 ? 'bg-yellow-500' :
                                                        index === 1 ? 'bg-gray-500' :
                                                        'bg-orange-500'
                                                    }`}>
                                                        {index + 1}
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-4">
                                                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${
                                                                index === 0 ? 'bg-yellow-500 text-white' :
                                                                index === 1 ? 'bg-gray-500 text-white' :
                                                                'bg-orange-500 text-white'
                                                            }`}>
                                                                {user.character?.image ? (
                                                                    <img 
                                                                        src={`/${user.character.image.split('/').pop()}`}
                                                                        alt={user.userName}
                                                                        className="w-12 h-12 rounded-full object-cover"
                                                                        onError={(e) => {
                                                                            e.target.style.display = 'none';
                                                                            e.target.nextSibling.style.display = 'flex';
                                                                        }}
                                                                    />
                                                                ) : null}
                                                                <div 
                                                                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${user.character?.image ? 'hidden' : ''}`}
                                                                >
                                                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <h3 className="text-xl font-bold text-gray-900">{user.userName}</h3>
                                                                <p className="text-sm text-gray-600">
                                                                    {user.score}/{user.totalQuestions} soru doğru
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-3xl font-bold text-gray-900">%{user.percentage}</div>
                                                            <div className="text-sm text-gray-600">Başarı Oranı</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Diğer Katılımcılar */}
                                            {getLeaderboard().slice(3).map((user, index) => (
                                                <div key={user.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-4">
                                                            <div className="relative">
                                                                {user.character?.image ? (
                                                                    <img 
                                                                        src={`/${user.character.image.split('/').pop()}`}
                                                                        alt={user.userName}
                                                                        className="w-10 h-10 rounded-full object-cover"
                                                                        onError={(e) => {
                                                                            e.target.style.display = 'none';
                                                                            e.target.nextSibling.style.display = 'flex';
                                                                        }}
                                                                    />
                                                                ) : null}
                                                                <div 
                                                                    className={`w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold ${user.character?.image ? 'hidden' : ''}`}
                                                                >
                                                                    {index + 4}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900">{user.userName}</h4>
                                                                <p className="text-sm text-gray-600">
                                                                    {user.score}/{user.totalQuestions} soru doğru
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xl font-bold text-gray-900">%{user.percentage}</div>
                                                            <div className="text-xs text-gray-500">Başarı Oranı</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* İndirme Seçenekleri Modal */}
                    {showDownloadModal && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white rounded-t-3xl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-white/20 rounded-xl p-2">
                                                <FaDownload className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold">İndirme Seçenekleri</h2>
                                                <p className="text-blue-100 text-sm">Nasıl indirmek istiyorsunuz?</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowDownloadModal(false)}
                                            className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
                                        >
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <div className="space-y-4">
                                        {/* Resim Olarak İndir */}
                                        <button
                                            onClick={() => {
                                                downloadModalAsPDF(downloadModalId, downloadFilename);
                                                setShowDownloadModal(false);
                                            }}
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group text-left"
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">Resim Olarak İndir</h3>
                                                    <p className="text-sm text-gray-600">Modalın görsel halini PDF olarak indir</p>
                                                </div>
                                            </div>
                                        </button>

                                        {/* Metinsel DOCX (sadece Yanlış Yapılan Sorular için) */}
                                        {downloadModalId === 'incorrect-questions-modal' && (
                                            <button
                                                onClick={() => {
                                                    createTextualDOCX(downloadFilename.replace('.pdf', '_Metinsel.docx'));
                                                    setShowDownloadModal(false);
                                                }}
                                                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all duration-200 group text-left"
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                                        <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900 group-hover:text-green-700">Metinsel DOCX İndir</h3>
                                                        <p className="text-sm text-gray-600">Soruları metin formatında düzenli Word belgesi olarak indir</p>
                                                    </div>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </Layout>
    );
};

export default ExamStatsPage; 