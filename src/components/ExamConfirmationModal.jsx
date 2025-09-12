import React, { useEffect, useRef, useState } from 'react';
import { FaCheck, FaTimes, FaArrowLeft, FaExclamationTriangle } from 'react-icons/fa';

const ExamConfirmationModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    topicStats, 
    questionCounts, 
    getGroupedTopics, 
    getCategoryQuestions, 
    getTotalQuestions,
    getDifficultyColor,
    getDifficultyLabel,
    CATEGORIES,
    CATEGORY_LIMITS,
    TOTAL_EXAM_QUESTIONS
}) => {
    const contentRef = useRef(null);
    const [hasScrolled, setHasScrolled] = useState(false);
    const [showScrollWarning, setShowScrollWarning] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setHasScrolled(false);
            setShowScrollWarning(false);
        }
    }, [isOpen]);

    const handleScroll = () => {
        if (contentRef.current) {
            const { scrollTop } = contentRef.current;
            // Kullanıcı herhangi bir scroll yaptıysa yeterli
            if (scrollTop > 0) {
                setHasScrolled(true);
            }
        }
    };

    const handleConfirm = () => {
        if (!hasScrolled) {
            setShowScrollWarning(true);
            // Modal'ı titret
            const modal = document.querySelector('.exam-confirmation-modal');
            if (modal) {
                modal.style.animation = 'shake 0.5s ease-in-out';
                setTimeout(() => {
                    modal.style.animation = '';
                }, 500);
            }
            // Titreşim efekti
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
            return;
        }
        onConfirm();
    };

    if (!isOpen) return null;

    const groupedTopics = getGroupedTopics();
    const totalQuestions = getTotalQuestions();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <style>
                {`
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                        20%, 40%, 60%, 80% { transform: translateX(5px); }
                    }
                `}
            </style>
            <div className="exam-confirmation-modal bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-700 to-purple-900 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">Sınav Oluşturma Onayı</h2>
                            <p className="text-purple-100 mt-1">Seçimlerinizi kontrol edin ve onaylayın</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-purple-200 p-2 rounded-lg hover:bg-purple-600 transition-colors"
                        >
                            <FaTimes className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div 
                    ref={contentRef}
                    className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]"
                    onScroll={handleScroll}
                >
                    {/* Genel Özet */}
                    <div className="bg-blue-50 rounded-xl p-6 mb-6">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-blue-600 mb-2">{totalQuestions}</div>
                            <div className="text-lg text-blue-800 font-medium">Toplam Soru Sayısı</div>
                            <div className="text-sm text-blue-600 mt-1">
                                Hedef: {TOTAL_EXAM_QUESTIONS} soru
                                {totalQuestions === TOTAL_EXAM_QUESTIONS && (
                                    <span className="ml-2 text-green-600 font-medium">✅ Tamamlandı</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Kategori Bazında Detaylar */}
                    <div className="space-y-6">
                        {CATEGORIES.map(category => {
                            const topicsInCategory = groupedTopics[category] || [];
                            const categoryTotal = getCategoryQuestions(category);
                            const categoryLimit = CATEGORY_LIMITS[category];
                            
                            if (topicsInCategory.length === 0) return null;

                            return (
                                <div key={category} className="bg-white border border-gray-200 rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-semibold text-gray-900">{category}</h3>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-gray-900">{categoryTotal}</div>
                                            <div className="text-sm text-gray-500">/ {categoryLimit} soru</div>
                                        </div>
                                    </div>

                                    {/* Zorluk Dağılımı */}
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        {['easy', 'medium', 'hard'].map(difficulty => {
                                            const total = topicsInCategory.reduce((sum, topic) => {
                                                const counts = questionCounts[topic.id] || { easy: 0, medium: 0, hard: 0 };
                                                return sum + (counts[difficulty] || 0);
                                            }, 0);
                                            
                                            return (
                                                <div key={difficulty} className="text-center p-3 rounded-lg border border-gray-200">
                                                    <div className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(difficulty)} mb-2`}>
                                                        {getDifficultyLabel(difficulty)}
                                                    </div>
                                                    <div className="text-xl font-bold text-gray-900">{total}</div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Konu Detayları */}
                                    <div className="space-y-3">
                                        {topicsInCategory.map(topic => {
                                            const counts = questionCounts[topic.id] || { easy: 0, medium: 0, hard: 0 };
                                            const topicTotal = (counts.easy || 0) + (counts.medium || 0) + (counts.hard || 0);
                                            
                                            if (topicTotal === 0) return null;

                                            return (
                                                <div key={topic.id} className="bg-gray-50 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-medium text-gray-900">{topic.name}</h4>
                                                            {topic.source === 'manual' && (
                                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">MANUEL</span>
                                                            )}
                                                        </div>
                                                        <div className="text-lg font-bold text-gray-900">{topicTotal} soru</div>
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-center gap-4 text-sm">
                                                        {['easy', 'medium', 'hard'].map(difficulty => {
                                                            const count = counts[difficulty] || 0;
                                                            if (count === 0) return null;
                                                            
                                                            return (
                                                                <div key={difficulty} className="flex items-center gap-1">
                                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(difficulty)}`}>
                                                                        {getDifficultyLabel(difficulty)}
                                                                    </span>
                                                                    <span className="font-bold text-gray-900 min-w-[1.5rem] text-center">{count}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Scroll Uyarısı */}
                {showScrollWarning && (
                    <div className="bg-red-50 border-t border-red-200 px-6 py-3">
                        <div className="flex items-center gap-2 text-red-700">
                            <FaExclamationTriangle className="w-4 h-4" />
                            <span className="text-sm font-medium">
                                Lütfen tüm detayları görmek için aşağı kaydırın!
                            </span>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FaArrowLeft className="w-4 h-4" />
                        Geri Dön
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                        >
                            <FaCheck className="w-4 h-4" />
                            Otomatik Soruları Seç
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExamConfirmationModal;
