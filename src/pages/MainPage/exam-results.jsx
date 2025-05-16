import React from 'react';
import Layout from '../../components/layout';
import { FaClipboardCheck, FaArrowLeft, FaSearch, FaDownload } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const ExamResultsPage = () => {
    const navigate = useNavigate();

    // Örnek sonuç verileri
    const results = [
        {
            id: 1,
            examTitle: '2024 TYT Deneme Sınavı 1',
            studentName: 'Ahmet Yılmaz',
            score: 85.5,
            correctAnswers: 102,
            wrongAnswers: 18,
            completionTime: '125',
            completionDate: '2024-03-15T14:30:00'
        },
        {
            id: 2,
            examTitle: '2024 TYT Deneme Sınavı 1',
            studentName: 'Ayşe Demir',
            score: 92.0,
            correctAnswers: 108,
            wrongAnswers: 12,
            completionTime: '115',
            completionDate: '2024-03-15T15:45:00'
        },
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
                            <FaClipboardCheck className="text-orange-500" />
                            Sınav Sonuçları
                        </h1>
                    </div>

                    {/* Üst Araç Çubuğu */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="w-full md:w-64">
                                <div className="relative">
                                    <input
                                        type="search"
                                        placeholder="Sonuç ara..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                </div>
                            </div>
                            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                <FaDownload className="h-4 w-4 mr-2" />
                                Sonuçları İndir
                            </button>
                        </div>
                    </div>

                    {/* Sonuç Listesi */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Öğrenci
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Sınav
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Puan
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Doğru/Yanlış
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Süre
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tarih
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {results.map((result) => (
                                        <tr key={result.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {result.studentName}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">
                                                    {result.examTitle}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-gray-900">
                                                    {result.score.toFixed(1)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">
                                                    <span className="text-green-600">{result.correctAnswers}</span>
                                                    {' / '}
                                                    <span className="text-red-600">{result.wrongAnswers}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">
                                                    {result.completionTime} dk
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">
                                                    {new Date(result.completionDate).toLocaleString('tr-TR', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ExamResultsPage; 