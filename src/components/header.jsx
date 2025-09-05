import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { FaBell, FaUsers, FaExclamationTriangle, FaChartBar, FaTools, FaChevronDown, FaFilePdf, FaVideo, FaMobileAlt, FaComments, FaPodcast, FaQuestionCircle } from 'react-icons/fa';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            alert("Başarıyla çıkış yaptınız.");
            navigate("/", { replace: true });
        } catch (error) {
            console.error("Çıkış yapılırken bir hata oluştu: ", error);
            alert("Çıkış yapılamadı. Lütfen tekrar deneyiniz.");
        }
    };

    const mainMenuItems = [
        { path: "/home", label: "Ana Sayfa" },
        { path: "/question", label: "Sorular" },
        { path: "/announcements", label: "Duyurular" },
        { path: "/games", label: "Oyunlar" },
        { path: "/notes", label: "Notlar" },
        { path: "/deneme-sinavlari", label: "Deneme Sınavları" },
        { path: "/bildirimler", label: "Bildirimler", icon: <FaBell className="inline-block mr-1" /> },
        { path: "/users", label: "Kullanıcılar", icon: <FaUsers className="inline-block mr-1" /> }
    ];

    const toolsMenuItems = [
        { path: "/konu-istatistikler", label: "Konu İstatistikleri", icon: <FaChartBar className="inline-block mr-1" /> },
        { path: "/pdf-bank", label: "PDF Bankası", icon: <FaFilePdf className="inline-block mr-1" /> },
        { path: "/toplanti-arsivi", label: "Toplantı Arşivi", icon: <FaVideo className="inline-block mr-1" /> },
        { path: "/mobile-settings", label: "Mobil Dinamik Ayarlar", icon: <FaMobileAlt className="inline-block mr-1" /> },
        { path: "/app-feedback", label: "Uygulama Geri Bildirimleri", icon: <FaComments className="inline-block mr-1" /> },
        { path: "/podcast-uniteleri", label: "Podcast Yönetimi", icon: <FaPodcast className="inline-block mr-1" /> },
        { path: "/faq", label: "Sıkça Sorulan Sorular", icon: <FaQuestionCircle className="inline-block mr-1" /> },
        { path: "/error-logs", label: "Hata Kayıtları", icon: <FaExclamationTriangle className="inline-block mr-1" /> }
    ];

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <header className="bg-white dark:bg-gray-900 shadow-lg">
            <div className="container mx-auto">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    {/* Mobile Menu Button */}
                    <div className="flex items-center justify-between p-4 lg:hidden">
                        <Link to="/home" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                            BilBakalım
                        </Link>
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline-none"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>

                    {/* Desktop Logo - Hidden on Mobile */}
                    <div className="hidden lg:flex lg:items-center lg:pl-4">
                        <Link to="/home" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                            BilBakalım
                        </Link>
                    </div>

                    {/* Navigation Menu */}
                    <nav className={`${isMobileMenuOpen ? 'block' : 'hidden'} lg:flex lg:items-center`}>
                        <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-1">
                            {/* Ana menü öğeleri */}
                            {mainMenuItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`px-4 py-3 lg:py-5 text-sm font-medium transition-colors duration-200 ${
                                        isActive(item.path)
                                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50'
                                        : 'text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50'
                                    }`}
                                >
                                    {item.icon && item.icon}
                                    {item.label}
                                </Link>
                            ))}

                            {/* Araçlar Dropdown - Desktop */}
                            <div className="relative hidden lg:block">
                                <button
                                    onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
                                    className={`px-4 py-5 text-sm font-medium transition-colors duration-200 flex items-center ${
                                        isActive('/konu-istatistikler') || isActive('/pdf-bank') || isActive('/toplanti-arsivi') || isActive('/error-logs') || isActive('/faq')
                                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50'
                                        : 'text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50'
                                    }`}
                                >
                                    <FaTools className="inline-block mr-1" />
                                    Araçlar
                                    <FaChevronDown className={`ml-1 transition-transform duration-200 ${isToolsDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isToolsDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                                        {toolsMenuItems.map((item) => (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => setIsToolsDropdownOpen(false)}
                                                className={`block px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                                                    isActive(item.path)
                                                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50'
                                                    : 'text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50'
                                                }`}
                                            >
                                                {item.icon && item.icon}
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Araçlar Dropdown - Mobile */}
                            <div className="lg:hidden">
                                <div className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                    <FaTools className="inline-block mr-1" />
                                    Araçlar
                                </div>
                                {toolsMenuItems.map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`block px-8 py-3 text-sm font-medium transition-colors duration-200 ${
                                            isActive(item.path)
                                            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50'
                                            : 'text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50'
                                        }`}
                                    >
                                        {item.icon && item.icon}
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </nav>

                    {/* Sign Out Button */}
                    <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} lg:flex lg:items-center lg:pr-4 p-4 lg:p-0`}>
                        <button
                            onClick={handleSignOut}
                            className="w-full lg:w-auto px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Çıkış Yap
                        </button>
                    </div>
                </div>
            </div>

            {/* Dropdown overlay - Desktop */}
            {isToolsDropdownOpen && (
                <div 
                    className="fixed inset-0 z-40 lg:block hidden" 
                    onClick={() => setIsToolsDropdownOpen(false)}
                />
            )}
        </header>
    );
};

export default Header;