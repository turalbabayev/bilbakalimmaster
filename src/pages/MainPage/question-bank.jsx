import React from 'react';
import Layout from '../../components/layout';
import { FaDatabase, FaArrowLeft, FaPlus, FaFilter } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const QuestionBankPage = () => {
    const navigate = useNavigate();

    // Örnek kategoriler
    const categories = [
        { id: 'mat', name: 'Matematik', count: 150 },
        { id: 'fen', name: 'Fen Bilimleri', count: 120 },
        { id: 'tur', name: 'Türkçe', count: 200 },
        { id: 'sos', name: 'Sosyal Bilimler', count: 180 },
    ];

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
                            <FaDatabase className="text-green-500" />
                            Soru Bankası
                        </h1>
                    </div>

                    {/* Üst Araç Çubuğu */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-4">
                                <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                                    <FaPlus className="h-4 w-4 mr-2" />
                                    Yeni Soru Ekle
                                </button>
                                <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                    <FaFilter className="h-4 w-4 mr-2" />
                                    Filtrele
                                </button>
                            </div>
                            <div className="w-full md:w-64">
                                <input
                                    type="search"
                                    placeholder="Soru ara..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Ana İçerik Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Sol Kategori Paneli */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <h2 className="font-semibold text-gray-800 mb-4">Kategoriler</h2>
                            <div className="space-y-2">
                                {categories.map(category => (
                                    <button
                                        key={category.id}
                                        className="w-full flex items-center justify-between px-3 py-2 text-left text-sm rounded-lg hover:bg-gray-50"
                                    >
                                        <span>{category.name}</span>
                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                                            {category.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sağ Soru Listesi */}
                        <div className="md:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <div className="text-center py-12 text-gray-500">
                                <FaDatabase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Soru Listesi Hazırlanıyor
                                </h3>
                                <p className="text-sm">
                                    Soru listesi ve detayları çok yakında burada olacak.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default QuestionBankPage; 