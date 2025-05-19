import React, { useState, useEffect } from 'react';
import { db } from "../firebase";
import { doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { toast } from 'react-hot-toast';

const BulkColorMindCards = ({ isOpen, onClose, cards, selectedKonu, onSuccess }) => {
    const [selectedCards, setSelectedCards] = useState([]);
    const [selectedTarget, setSelectedTarget] = useState('content'); // 'content' veya 'title'
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [startRange, setStartRange] = useState(1);
    const [endRange, setEndRange] = useState(10);
    const [selectedHeading, setSelectedHeading] = useState('p'); // Varsayılan olarak paragraf

    // Seçili kartların rengini kontrol et
    useEffect(() => {
        if (selectedCards.length > 0) {
            const firstSelectedCard = cards.find(card => card.id === selectedCards[0]);
            if (firstSelectedCard) {
                const currentColor = selectedTarget === 'content' 
                    ? firstSelectedCard.contentColor 
                    : firstSelectedCard.titleColor;
                
                if (currentColor) {
                    setSelectedColor(currentColor);
                }
            }
        }
    }, [selectedCards, selectedTarget]);

    // Target değiştiğinde rengi sıfırla
    useEffect(() => {
        setSelectedColor('#000000');
    }, [selectedTarget]);

    const handleSelectAll = () => {
        setSelectedCards(cards.map(card => card.id));
    };

    const handleDeselectAll = () => {
        setSelectedCards([]);
    };

    const handleSelectRange = () => {
        const selectedInRange = cards
            .filter(card => card.kartNo >= startRange && card.kartNo <= endRange)
            .map(card => card.id);
        setSelectedCards(selectedInRange);
    };

    const handleSelectEven = () => {
        const evenCards = cards
            .filter(card => card.kartNo % 2 === 0)
            .map(card => card.id);
        setSelectedCards(evenCards);
    };

    const handleSelectOdd = () => {
        const oddCards = cards
            .filter(card => card.kartNo % 2 === 1)
            .map(card => card.id);
        setSelectedCards(oddCards);
    };

    const handleCardSelect = (cardId) => {
        setSelectedCards(prev => {
            if (prev.includes(cardId)) {
                return prev.filter(id => id !== cardId);
            } else {
                return [...prev, cardId];
            }
        });
    };

    const handleColorChange = async () => {
        if (selectedCards.length === 0) {
            toast.error('Lütfen en az bir kart seçin!');
            return;
        }

        try {
            const batch = writeBatch(db);
            const konuRef = doc(db, "miniCards-konular", selectedKonu);

            selectedCards.forEach(cardId => {
                const cardRef = doc(konuRef, "cards", cardId);
                const card = cards.find(c => c.id === cardId);
                const updateData = {};
                
                if (selectedTarget === 'content') {
                    // HTML içeriğindeki paragrafları seçilen başlık etiketiyle değiştir
                    const contentWithHeading = card.content.replace(
                        /<p[^>]*>(.*?)<\/p>/g,
                        `<${selectedHeading}>$1</${selectedHeading}>`
                    );
                    updateData.contentColor = selectedColor;
                    updateData.content = contentWithHeading;
                } else {
                    // Başlık için de aynı işlemi yap
                    const titleWithHeading = card.altKonu.replace(
                        /<p[^>]*>(.*?)<\/p>/g,
                        `<${selectedHeading}>$1</${selectedHeading}>`
                    );
                    updateData.titleColor = selectedColor;
                    updateData.altKonu = titleWithHeading;
                }

                updateData.updatedAt = serverTimestamp();

                batch.update(cardRef, updateData);
            });

            await batch.commit();
            toast.success(`Seçili kartların ${selectedTarget === 'content' ? 'içerik' : 'başlık'} rengi ve boyutu güncellendi!`);
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Güncelleme sırasında hata:', error);
            toast.error('Güncelleme sırasında bir hata oluştu!');
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md"></div>
            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[calc(100vh-40px)] flex flex-col">
                    {/* Sabit Başlık */}
                    <div className="p-8 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Toplu Kart Düzenleme
                        </h2>
                    </div>

                    {/* Sabit Araçlar */}
                    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                        {/* Renk ve Başlık Seçici */}
                        <div className="px-8 py-4 flex flex-wrap gap-4 items-center border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => setSelectedTarget('content')}
                                    className={`px-4 py-2 rounded-lg ${
                                        selectedTarget === 'content'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    İçerik Rengi
                                </button>
                                <button
                                    onClick={() => setSelectedTarget('title')}
                                    className={`px-4 py-2 rounded-lg ${
                                        selectedTarget === 'title'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    Başlık Rengi
                                </button>
                            </div>

                            <input
                                type="color"
                                value={selectedColor}
                                onChange={(e) => setSelectedColor(e.target.value)}
                                className="w-20 h-10 rounded cursor-pointer"
                            />

                            <div className="flex items-center space-x-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Yazı Boyutu:
                                </label>
                                <select
                                    value={selectedHeading}
                                    onChange={(e) => setSelectedHeading(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="p">Normal Metin</option>
                                    <option value="h1">En Büyük (H1)</option>
                                    <option value="h2">Büyük (H2)</option>
                                    <option value="h3">Orta (H3)</option>
                                    <option value="h4">Küçük (H4)</option>
                                    <option value="h5">Daha Küçük (H5)</option>
                                    <option value="h6">En Küçük (H6)</option>
                                </select>
                            </div>
                        </div>

                        {/* Kart Seçim Araçları */}
                        <div className="px-8 py-4 bg-gray-50 dark:bg-gray-800">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Kart Seçim Araçları
                            </h3>
                            
                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={handleSelectAll}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Tümünü Seç
                                </button>
                                <button
                                    onClick={handleDeselectAll}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                >
                                    Seçimi Temizle
                                </button>
                                <button
                                    onClick={handleSelectEven}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                >
                                    Çift Numaralıları Seç
                                </button>
                                <button
                                    onClick={handleSelectOdd}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                >
                                    Tek Numaralıları Seç
                                </button>
                            </div>

                            <div className="flex items-center space-x-4 mt-4">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="number"
                                        value={startRange}
                                        onChange={(e) => setStartRange(parseInt(e.target.value))}
                                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        min="1"
                                    />
                                    <span className="text-gray-600 dark:text-gray-400">ile</span>
                                    <input
                                        type="number"
                                        value={endRange}
                                        onChange={(e) => setEndRange(parseInt(e.target.value))}
                                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        min={startRange}
                                    />
                                    <span className="text-gray-600 dark:text-gray-400">arası</span>
                                </div>
                                <button
                                    onClick={handleSelectRange}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    Aralığı Seç
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Kart Listesi */}
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Kartlar ({selectedCards.length} seçili)
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {cards.map(card => (
                                <div
                                    key={card.id}
                                    onClick={() => handleCardSelect(card.id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                        selectedCards.includes(card.id)
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                                    }`}
                                >
                                    <h3 
                                        className="font-semibold mb-2"
                                        style={{ color: card.titleColor || 'inherit' }}
                                        dangerouslySetInnerHTML={{ __html: card.altKonu }}
                                    />
                                    <div 
                                        className="prose dark:prose-invert max-w-none"
                                        style={{ color: card.contentColor || 'inherit' }}
                                        dangerouslySetInnerHTML={{ __html: card.content }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sabit Footer */}
                    <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end space-x-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleColorChange}
                            disabled={selectedCards.length === 0}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Rengi Uygula
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkColorMindCards; 