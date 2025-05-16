import React from 'react';
import Layout from '../../components/layout';
import { 
    FaBookReader, 
    FaPlus, 
    FaDatabase, 
    FaListAlt, 
    FaChartBar, 
    FaClipboardCheck 
} from 'react-icons/fa';

const DenemeSinavlariPage = () => {
    const sections = [
        {
            id: 'create',
            title: 'Sınav Oluşturma Paneli',
            icon: FaPlus,
            description: 'Yeni deneme sınavları oluşturun ve düzenleyin',
            color: 'bg-blue-500',
            link: '/deneme-sinavlari/olustur'
        },
        {
            id: 'questions',
            title: 'Soru Bankası Yönetimi',
            icon: FaDatabase,
            description: 'Soru havuzunu yönetin ve kategorilendirin',
            color: 'bg-green-500',
            link: '/deneme-sinavlari/soru-bankasi'
        },
        {
            id: 'exams',
            title: 'Sınav Listesi',
            icon: FaListAlt,
            description: 'Mevcut sınavları görüntüleyin ve yönetin',
            color: 'bg-purple-500',
            link: '/deneme-sinavlari/liste'
        },
        {
            id: 'results',
            title: 'Sonuçlar',
            icon: FaClipboardCheck,
            description: 'Sınav sonuçlarını ve değerlendirmeleri inceleyin',
            color: 'bg-orange-500',
            link: '/deneme-sinavlari/sonuclar'
        },
        {
            id: 'stats',
            title: 'İstatistikler',
            icon: FaChartBar,
            description: 'Detaylı analiz ve istatistikleri görüntüleyin',
            color: 'bg-red-500',
            link: '/deneme-sinavlari/istatistikler'
        }
    ];

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
                        <FaBookReader className="text-indigo-600" />
                        Deneme Sınavları Yönetimi
                    </h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sections.map((section) => {
                            const Icon = section.icon;
                            return (
                                <div
                                    key={section.id}
                                    className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-100"
                                >
                                    <div className={`h-2 ${section.color}`} />
                                    <div className="p-6">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className={`p-3 rounded-lg ${section.color} bg-opacity-10`}>
                                                <Icon className={`h-6 w-6 ${section.color.replace('bg-', 'text-')}`} />
                                            </div>
                                            <h2 className="text-xl font-semibold text-gray-800">
                                                {section.title}
                                            </h2>
                                        </div>
                                        <p className="text-gray-600 mb-6">
                                            {section.description}
                                        </p>
                                        <button
                                            onClick={() => window.location.href = section.link}
                                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Görüntüle
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default DenemeSinavlariPage; 