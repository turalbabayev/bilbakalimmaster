import React from 'react';
import Layout from '../../components/layout';
import { FaPlus, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const CreateExamPage = () => {
    const navigate = useNavigate();

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={() => navigate('/deneme-sinavlari')}
                            className="flex items-center text-gray-600 hover:text-gray-800"
                        >
                            <FaArrowLeft className="h-5 w-5 mr-2" />
                            Geri
                        </button>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                            <FaPlus className="text-blue-500" />
                            Sınav Oluştur
                        </h1>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Sol Panel - Sınav Bilgileri */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                    Sınav Bilgileri
                                </h2>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Sınav Adı
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Örn: 2024 TYT Deneme Sınavı 1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Süre (Dakika)
                                    </label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="135"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Toplam Puan
                                    </label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="100"
                                    />
                                </div>
                            </div>

                            {/* Sağ Panel - Soru Seçimi */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                    Soru Seçimi
                                </h2>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <p className="text-sm text-gray-600">
                                        Henüz soru seçimi yapılmadı. Soru bankasından soru eklemek için aşağıdaki butonu kullanın.
                                    </p>
                                    <button className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                        Soru Ekle
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Alt Butonlar */}
                        <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                            <button
                                onClick={() => navigate('/deneme-sinavlari')}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                İptal
                            </button>
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                Sınavı Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default CreateExamPage; 