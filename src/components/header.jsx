import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { FaBell, FaUsers, FaExclamationTriangle, FaChartBar, FaFilePdf, FaVideo, FaMobileAlt, FaComments, FaPodcast, FaQuestionCircle, FaGamepad, FaHome, FaStickyNote, FaGraduationCap, FaBullhorn, FaSignOutAlt, FaChevronRight, FaChevronLeft, FaBook, FaBars, FaTimes, FaCreditCard, FaBox, FaCog } from 'react-icons/fa';
import { SidebarContext } from './layout';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isSidebarOpen, setIsSidebarOpen } = useContext(SidebarContext);

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

    const menuCategories = [
        {
            title: "Ana Menü",
            items: [
                { path: "/home", label: "Ana Sayfa", icon: <FaHome /> },
                { path: "/soru-bankasi-yonetimi", label: "Soru Bankası Yönetimi", icon: <FaBook /> },
                { path: "/question", label: "Sorular", icon: <FaQuestionCircle /> },
                { path: "/announcements", label: "Duyurular", icon: <FaBullhorn /> },
                { path: "/notes", label: "Notlar", icon: <FaStickyNote /> },
                { path: "/deneme-sinavlari", label: "Deneme Sınavları", icon: <FaGraduationCap /> }
            ]
        },
        {
            title: "Satış Sayfası Yönetimi",
            items: [
                { path: "/paketlerimiz", label: "Paketlerimiz", icon: <FaBox /> },
                { path: "/odemeler", label: "Ödemeler", icon: <FaCreditCard /> },
                { path: "/site-ayarlari", label: "Site Ayarları", icon: <FaCog /> }
            ]
        },
        {
            title: "Yönetim",
            items: [
                { path: "/bildirimler", label: "Bildirimler", icon: <FaBell /> },
                { path: "/users", label: "Kullanıcılar", icon: <FaUsers /> }
            ]
        },
        {
            title: "İçerik",
            items: [
                { path: "/games", label: "Oyunlar", icon: <FaGamepad /> },
                { path: "/pdf-bank", label: "PDF Bankası", icon: <FaFilePdf /> },
                { path: "/toplanti-arsivi", label: "Toplantı Arşivi", icon: <FaVideo /> },
                { path: "/podcast-uniteleri", label: "Podcast Yönetimi", icon: <FaPodcast /> }
            ]
        },
        {
            title: "İstatistikler",
            items: [
                { path: "/konu-istatistikler", label: "Konu İstatistikleri", icon: <FaChartBar /> }
            ]
        },
        {
            title: "Ayarlar & Destek",
            items: [
                { path: "/mobile-settings", label: "Mobil Dinamik Ayarlar", icon: <FaMobileAlt /> },
                { path: "/app-feedback", label: "Uygulama Geri Bildirimleri", icon: <FaComments /> },
                { path: "/faq", label: "Sıkça Sorulan Sorular", icon: <FaQuestionCircle /> },
                { path: "/error-logs", label: "Hata Kayıtları", icon: <FaExclamationTriangle /> }
            ]
        }
    ];

    const isActive = (path) => {
        return location.pathname === path;
    };


    // ESC tuşu ile sidebar'ı daralt (sadece desktop'ta)
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape' && isSidebarOpen && window.innerWidth >= 1024) {
                setIsSidebarOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isSidebarOpen]);


    return (
        <>
            {/* Mobile Header - Sadece mobilde göster */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50 flex items-center justify-between px-4 shadow-sm">
                <Link to="/home" className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    BilBakalım
                </Link>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Menüyü aç/kapat"
                >
                    {isSidebarOpen ? <FaTimes className="h-6 w-6" /> : <FaBars className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isSidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Mobile Menu Drawer */}
            <div
                className={`lg:hidden fixed top-16 left-0 right-0 bottom-0 bg-white dark:bg-gray-800 z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <nav className="p-4 space-y-6">
                    {menuCategories.map((category, categoryIndex) => (
                        <div key={categoryIndex}>
                            {/* Kategori Başlığı */}
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                                {category.title}
                            </h3>
                            
                            {/* Kategori Öğeleri */}
                            <div className="space-y-1">
                                {category.items.map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                                            isActive(item.path)
                                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/50'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <span className={`text-lg mr-3 ${isActive(item.path) ? 'text-white' : 'text-gray-500'}`}>
                                            {item.icon}
                                        </span>
                                        <span className="flex-1 text-sm font-medium">{item.label}</span>
                                        {isActive(item.path) && (
                                            <FaChevronRight className="text-xs" />
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {/* Sign Out Button - Mobile */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                        <button
                            onClick={async () => {
                                await handleSignOut();
                                setIsSidebarOpen(false);
                            }}
                            className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-red-500/50"
                        >
                            <FaSignOutAlt className="mr-2" />
                            <span>Çıkış Yap</span>
                        </button>
                    </div>
                </nav>
            </div>

            {/* Desktop Sidebar */}
            <aside
                className={`hidden lg:flex fixed top-0 left-0 h-full dark:from-gray-900 dark:to-gray-800 z-50 transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-700 ${
                    isSidebarOpen ? 'w-64' : 'w-16'
                }`}
                style={{ backgroundColor: '#f7f9fa' }}
            >
                <div className="flex flex-col h-full">
                    {/* Logo Section */}
                    <div className={`border-b border-gray-200 dark:border-gray-700 transition-all duration-300 ${isSidebarOpen ? 'p-4 lg:p-6' : 'p-4'}`}>
                        <div className="flex items-center justify-between">
                            {isSidebarOpen ? (
                                <>
                                    <Link 
                                        to="/home" 
                                        className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
                                        onClick={() => {
                                            // Mobile'da tıklanınca kapat
                                            if (window.innerWidth < 1024) {
                                                setIsSidebarOpen(false);
                                            }
                                        }}
                                    >
                                        BilBakalım
                                    </Link>
                                    <button
                                        onClick={() => setIsSidebarOpen(false)}
                                        className="sidebar-toggle p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        aria-label="Menüyü kapat"
                                    >
                                        <FaChevronLeft className="h-5 w-5" />
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="sidebar-toggle w-full flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    aria-label="Menüyü genişlet"
                                >
                                    <FaChevronRight className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Navigation Menu */}
                    <nav className="flex-1 overflow-y-auto py-4 px-2 overscroll-contain">
                        {menuCategories.map((category, categoryIndex) => (
                            <div key={categoryIndex} className={categoryIndex > 0 ? 'mt-6' : ''}>
                                {/* Kategori Başlığı */}
                                {isSidebarOpen && (
                                    <div className="px-4 mb-2">
                                        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {category.title}
                                        </h3>
                                    </div>
                                )}
                                
                                {/* Kategori Öğeleri */}
                                <div className="space-y-1">
                                    {category.items.map((item) => (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => {
                                                // Mobile'da tıklanınca kapat
                                                if (window.innerWidth < 1024) {
                                                    setIsSidebarOpen(false);
                                                }
                                            }}
                                            className={`flex items-center rounded-lg transition-all duration-200 group ${
                                                isSidebarOpen ? 'px-3 lg:px-4 py-2.5 lg:py-3' : 'px-2 py-3 justify-center'
                                            } ${
                                                isActive(item.path)
                                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/50'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                                            }`}
                                            title={!isSidebarOpen ? item.label : ''}
                                        >
                                            <span className={`text-base lg:text-lg flex-shrink-0 ${isSidebarOpen ? 'mr-2 lg:mr-3' : ''} ${isActive(item.path) ? 'text-white' : 'text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                                                {item.icon}
                                            </span>
                                            {isSidebarOpen && (
                                                <>
                                                    <span className="flex-1 text-xs lg:text-sm font-medium truncate">{item.label}</span>
                                                    {isActive(item.path) && (
                                                        <FaChevronRight className="text-xs flex-shrink-0 ml-1" />
                                                    )}
                                                </>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* Sign Out Button */}
                    <div className={`border-t border-gray-200 dark:border-gray-700 ${isSidebarOpen ? 'p-4' : 'p-2'}`}>
                        <button
                            onClick={async () => {
                                await handleSignOut();
                            }}
                            className={`w-full flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-red-500/50 hover:shadow-xl hover:shadow-red-500/50 ${
                                isSidebarOpen ? 'px-4 py-3' : 'px-2 py-3'
                            }`}
                            title={!isSidebarOpen ? 'Çıkış Yap' : ''}
                        >
                            <FaSignOutAlt className={isSidebarOpen ? 'mr-2' : ''} />
                            {isSidebarOpen && <span>Çıkış Yap</span>}
                        </button>
                    </div>
                </div>
            </aside>

        </>
    );
};

export default Header;