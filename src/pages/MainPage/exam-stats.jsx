import React from 'react';
import Layout from '../../components/layout';
import { FaChartBar, FaArrowLeft, FaUsers, FaCheckCircle, FaClock, FaGraduationCap } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const ExamStatsPage = () => {
    const navigate = useNavigate();

    // Örnek istatistik verileri
    const stats = {
        totalExams: 25,
        totalParticipants: 1250,
        averageScore: 72.5,
        completionRate: 85,
        averageTime: 115,
        topPerformers: 125
    };

    // Örnek kategori başarı oranları
    const categoryStats = [
        { name: 'Matematik', success: 68 },
        { name: 'Fizik', success: 72 },
        { name: 'Kimya', success: 65 },
        { name: 'Biyoloji', success: 78 },
        { name: 'Türkçe', success: 82 },
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
                            <FaChartBar className="text-red-500" />
                            İstatistikler
                        </h1>
                    </div>

                    {/* İstatistik Kartları */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="bg-blue-100 rounded-lg p-3">
                                        <FaUsers className="h-6 w-6 text-blue-600" />
                                    </div>
                                </div>
                                <div className="ml-5">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Toplam Katılımcı
                                    </h3>
                                    <div className="mt-1 text-3xl font-semibold text-blue-600">
                                        {stats.totalParticipants}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="bg-green-100 rounded-lg p-3">
                                        <FaCheckCircle className="h-6 w-6 text-green-600" />
                                    </div>
                                </div>
                                <div className="ml-5">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Ortalama Başarı
                                    </h3>
                                    <div className="mt-1 text-3xl font-semibold text-green-600">
                                        %{stats.averageScore}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="bg-purple-100 rounded-lg p-3">
                                        <FaClock className="h-6 w-6 text-purple-600" />
                                    </div>
                                </div>
                                <div className="ml-5">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Ortalama Süre
                                    </h3>
                                    <div className="mt-1 text-3xl font-semibold text-purple-600">
                                        {stats.averageTime} dk
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Kategori Başarı Oranları */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
                        <h2 className="text-lg font-medium text-gray-900 mb-6">
                            Kategori Başarı Oranları
                        </h2>
                        <div className="space-y-4">
                            {categoryStats.map((category) => (
                                <div key={category.name}>
                                    <div className="flex justify-between text-sm font-medium text-gray-900 mb-1">
                                        <span>{category.name}</span>
                                        <span>%{category.success}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-indigo-600 h-2 rounded-full"
                                            style={{ width: `${category.success}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* En İyi Performans Gösterenler */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-medium text-gray-900">
                                En İyi Performans
                            </h2>
                            <div className="bg-green-100 rounded-lg p-2">
                                <FaGraduationCap className="h-5 w-5 text-green-600" />
                            </div>
                        </div>
                        <div className="text-center py-12 text-gray-500">
                            <p className="text-sm">
                                En iyi performans gösteren öğrencilerin listesi yakında burada olacak.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ExamStatsPage; 