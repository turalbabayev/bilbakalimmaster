import React from "react";
import Layout from "../../components/layout";

function GamesPage() {
    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="container mx-auto py-8 px-4">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Oyunlar</h1>
                        <button
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md transition-all duration-200 flex items-center"
                            onClick={() => {/* Yeni oyun ekleme modalını aç */}}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Yeni Oyun Ekle
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Oyun kartları buraya gelecek */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <p className="text-gray-600 dark:text-gray-400 text-center">
                                Henüz oyun eklenmemiş.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default GamesPage; 