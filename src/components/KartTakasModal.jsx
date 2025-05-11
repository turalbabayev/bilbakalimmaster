import React, { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';

const KartItem = ({ kart, index, moveKart }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'kart',
        item: { index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    const [, drop] = useDrop(() => ({
        accept: 'kart',
        hover: (item) => {
            if (item.index !== index) {
                moveKart(item.index, index);
                item.index = index;
            }
        },
    }));

    return (
        <div
            ref={(node) => drag(drop(node))}
            className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md ${
                isDragging ? 'opacity-50' : 'opacity-100'
            } cursor-move transition-all duration-200 hover:shadow-lg`}
            style={{ minHeight: '200px' }}
        >
            <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                    Kart #{kart.kartNo}
                </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
                <div className="mb-2">
                    <strong>İçerik:</strong>
                    <div className="mt-1">{kart.content}</div>
                </div>
                <div>
                    <strong>Açıklama:</strong>
                    <div className="mt-1">{kart.explanation}</div>
                </div>
            </div>
        </div>
    );
};

const KartTakasModal = ({ isOpen, onClose, kartlar, onKartTakas }) => {
    const [secilenKartlar, setSecilenKartlar] = useState([...kartlar]);

    const moveKart = (fromIndex, toIndex) => {
        const yeniKartlar = [...secilenKartlar];
        const [tasinanKart] = yeniKartlar.splice(fromIndex, 1);
        yeniKartlar.splice(toIndex, 0, tasinanKart);
        setSecilenKartlar(yeniKartlar);
    };

    const handleTakasKaydet = async () => {
        try {
            const batch = writeBatch(db);
            
            // Kartların yeni sıralamasını kaydet
            secilenKartlar.forEach((kart, index) => {
                const kartRef = doc(db, `miniCards-konular/${kart.konuId}/cards`, kart.id);
                const originalKart = kartlar[index];
                
                if (kart.id !== originalKart.id) {
                    batch.update(kartRef, {
                        kartNo: originalKart.kartNo,
                        updatedAt: serverTimestamp()
                    });
                }
            });

            await batch.commit();
            toast.success('Kart sıralaması başarıyla güncellendi!');
            onClose();
            onKartTakas(); // Kartları yeniden yükle
        } catch (error) {
            console.error('Kart takas işleminde hata:', error);
            toast.error('Kartlar takaslanırken bir hata oluştu!');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 bg-black opacity-50"></div>
                <div className="relative bg-white dark:bg-gray-900 rounded-lg w-full max-w-4xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                            Kart Sıralamasını Değiştir
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Kartları sürükleyerek sıralamayı değiştirebilirsiniz. Değişiklikleri kaydetmek için "Değişiklikleri Kaydet" butonuna tıklayın.
                    </p>

                    <DndProvider backend={HTML5Backend}>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {secilenKartlar.map((kart, index) => (
                                <KartItem
                                    key={kart.id}
                                    kart={kart}
                                    index={index}
                                    moveKart={moveKart}
                                />
                            ))}
                        </div>
                    </DndProvider>

                    <div className="flex justify-end space-x-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleTakasKaydet}
                            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                        >
                            Değişiklikleri Kaydet
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KartTakasModal; 