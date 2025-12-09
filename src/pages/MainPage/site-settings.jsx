import React from "react";
import Layout from "../../components/layout";
import { FaCog } from 'react-icons/fa';

const SiteSettingsPage = () => {
    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="container mx-auto py-8 px-4">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-3">
                                <FaCog className="text-indigo-600" />
                                Site Ayarları
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">Site genelinde dinamik ayarları yönetin</p>
                        </div>

                        {/* Content Placeholder */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12">
                            <div className="text-center">
                                <FaCog className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-spin" style={{ animationDuration: '3s' }} />
                                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Site Ayarları Sayfası
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400">
                                    Bu sayfa yakında doldurulacak.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default SiteSettingsPage;

