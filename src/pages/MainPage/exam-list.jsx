import React from 'react';
import Layout from '../../components/layout';
import { FaListAlt, FaArrowLeft, FaEye, FaEdit, FaTrash, FaClock } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const ExamListPage = () => {
    const navigate = useNavigate();

    // Örnek sınav verileri
    const exams = [
        {
            id: 1,
            title: '2024 TYT Deneme Sınavı 1',
            status: 'active',
            startDate: '2024-03-20T10:00:00',
            duration: 135,
            totalQuestions: 120,
            participants: 45
        },
        {
            id: 2,
            title: '2024 AYT Matematik Denemesi',
            status: 'draft',
            startDate: '2024-03-25T14:00:00',
            duration: 180,
            totalQuestions: 80,
            participants: 0
        },
    ];

    const getStatusBadge = (status) => {
        const badges = {
            active: 'bg-green-100 text-green-800',
            draft: 'bg-gray-100 text-gray-800',
            completed: 'bg-blue-100 text-blue-800',
            expired: 'bg-red-100 text-red-800'
        };

        const labels = {
            active: 'Aktif',
            draft: 'Taslak',
            completed: 'Tamamlandı',
            expired: 'Süresi Doldu'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status]}`}>
                {labels[status]}
            </span>
        );
    };

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
                            <FaListAlt className="text-purple-500" />
                            Sınav Listesi
                        </h1>
                    </div>

                    {/* Sınav Listesi */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Sınav Adı
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Durum
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Başlangıç
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Süre
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Soru Sayısı
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Katılımcı
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            İşlemler
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {exams.map((exam) => (
                                        <tr key={exam.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {exam.title}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(exam.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">
                                                    {new Date(exam.startDate).toLocaleString('tr-TR', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500 flex items-center">
                                                    <FaClock className="h-4 w-4 mr-1 text-gray-400" />
                                                    {exam.duration} dk
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {exam.totalQuestions} soru
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {exam.participants} kişi
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-2">
                                                    <button className="text-gray-400 hover:text-gray-500">
                                                        <FaEye className="h-4 w-4" />
                                                    </button>
                                                    <button className="text-blue-400 hover:text-blue-500">
                                                        <FaEdit className="h-4 w-4" />
                                                    </button>
                                                    <button className="text-red-400 hover:text-red-500">
                                                        <FaTrash className="h-4 w-4" />
                                                    </button>
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

export default ExamListPage; 