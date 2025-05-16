import React from 'react';
import Layout from '../../components/layout';
import { FaBookReader } from 'react-icons/fa';

const DenemeSinavlariPage = () => {
    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
                        <FaBookReader className="text-indigo-600" />
                        Deneme Sınavları
                    </h1>

                    {/* Geçici İçerik */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <div className="text-center py-12">
                            <FaBookReader className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-lg font-medium text-gray-900">
                                Deneme Sınavları Yakında!
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Bu özellik çok yakında kullanıma açılacak. Şu anda geliştirme aşamasındadır.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default DenemeSinavlariPage; 