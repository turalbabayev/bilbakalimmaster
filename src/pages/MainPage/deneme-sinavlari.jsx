import React from 'react';
import Layout from '../../components/layout';
import { 
    FaPlus, 
    FaListAlt, 
    FaChartBar, 
    FaClipboardCheck,
    FaDatabase,
    FaCog,
    FaArrowRight
} from 'react-icons/fa';

const DenemeSinavlariPage = () => {
    const sections = [
        {
            id: 'create',
            title: 'Sınav Oluştur',
            description: 'Yeni sınav oluşturmaya başlayın',
            icon: FaPlus,
            link: '/create-exam',
            color: 'bg-blue-500 hover:bg-blue-600'
        },
        {
            id: 'pool',
            title: 'Soru Havuzu',
            description: 'Manuel soruları yönetin',
            icon: FaDatabase,
            link: '/soru-havuzu',
            color: 'bg-green-500 hover:bg-green-600'
        },
        {
            id: 'exams',
            title: 'Sınav Listesi',
            description: 'Mevcut sınavları görüntüleyin',
            icon: FaListAlt,
            link: '/deneme-sinavlari/liste',
            color: 'bg-purple-500 hover:bg-purple-600'
        },
        {
            id: 'results',
            title: 'Sonuçlar',
            description: 'Sınav sonuçlarını inceleyin',
            icon: FaClipboardCheck,
            link: '/deneme-sinavlari/sonuclar',
            color: 'bg-orange-500 hover:bg-orange-600'
        },
        {
            id: 'stats',
            title: 'İstatistikler',
            description: 'Detaylı analizler görün',
            icon: FaChartBar,
            link: '/deneme-sinavlari/liste',
            color: 'bg-red-500 hover:bg-red-600'
        },
        {
            id: 'settings',
            title: 'Ayarlar',
            description: 'Sistem ayarlarını yönetin',
            icon: FaCog,
            link: '/settings',
            color: 'bg-gray-500 hover:bg-gray-600',
            disabled: true
        }
    ];

    return (
        <Layout>
            <div className="min-h-screen bg-white">
                <div className="container mx-auto px-4 py-12">
                    <div className="max-w-6xl mx-auto">
                        {/* Header */}
                        <div className="text-left mb-8">
                            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                                Deneme Sınavları Yönetimi
                            </h1>
                            <p className="text-sm text-gray-600">
                                Sınavlarınızı kolayca oluşturun, yönetin ve analiz edin
                            </p>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sections.map((section) => {
                                const Icon = section.icon;
                                return (
                                    <div
                                        key={section.id}
                                        className={`group relative bg-white rounded-xl shadow-lg transition-all duration-500 border border-gray-100/50 overflow-hidden ${
                                            section.disabled 
                                                ? 'opacity-50 cursor-not-allowed' 
                                                : 'hover:shadow-xl hover:-translate-y-1'
                                        }`}
                                    >
                                        {/* Top color bar */}
                                        <div className="h-2 w-full bg-gray-600 rounded-t-xl"></div>
                                        
                                        {/* Subtle gradient overlay */}
                                        <div className={`absolute inset-0 bg-gradient-to-br ${section.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                                        
                                        <div className="relative p-6">
                                            {/* Icon */}
                                            <div className="mb-4">
                                                <div className={`w-12 h-12 rounded-xl ${section.color} flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                                                    <Icon className="h-6 w-6 text-white" />
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="mb-6">
                                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors duration-300">
                                                    {section.title}
                                                </h3>
                                                <p className="text-gray-600 leading-relaxed text-sm">
                                                    {section.description}
                                                </p>
                                            </div>

                                            {/* Button */}
                                            <button
                                                onClick={() => !section.disabled && (window.location.href = section.link)}
                                                disabled={section.disabled}
                                                className={`w-full flex items-center justify-center gap-2 font-medium py-2 px-3 rounded-xl border ${
                                                    section.disabled
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                                                        : 'bg-gray-900 text-white border-gray-900'
                                                }`}
                                            >
                                                <span>{section.disabled ? 'Yakında' : 'Başla'}</span>
                                                {!section.disabled && <FaArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />}
                                            </button>
                                        </div>

                                        {/* Subtle corner accent */}
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-gray-50 to-transparent rounded-bl-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    </div>
                                );
                            })}
                        </div>

                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default DenemeSinavlariPage;