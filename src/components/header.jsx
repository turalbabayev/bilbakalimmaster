import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

    // Aktif sayfa bağlantısını kontrol eder
    const isActive = (path) => {
        return location.pathname.startsWith(path);
    };

    return (
        <header className="bg-gradient-to-r from-indigo-600 to-blue-500 shadow-lg">
            <div className="container mx-auto px-4 py-3">
                <div className="flex justify-between items-center">
                    {/* Sol kısım - Logo ve başlık */}
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white/20 text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <span className="font-bold text-white text-xl">Admin Panel</span>
                    </div>

                    {/* Orta kısım - Ana Menü */}
                    <nav className="hidden md:flex items-center space-x-1">
                        <NavLink to="/home" isActive={isActive("/home")}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                            </svg>
                            Ana Sayfa
                        </NavLink>
                        
                        <NavLink to="/question" isActive={isActive("/question")}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                            </svg>
                            Sorular
                        </NavLink>
                        
                        <NavLink to="/announcements" isActive={isActive("/announcements")}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
                            </svg>
                            Duyurular
                        </NavLink>
                        
                        <NavLink to="/users" isActive={isActive("/users")}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                            </svg>
                            Kullanıcılar
                        </NavLink>
                    </nav>

                    {/* Sağ kısım - Kullanıcı Menüsü */}
                    <div className="flex items-center space-x-3">
                        {/* Bildirimler */}
                        <button className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors relative">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                            </svg>
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">3</span>
                        </button>
                        
                        {/* Profil Dropdown */}
                        <div className="relative">
                            <button 
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center space-x-2 focus:outline-none"
                            >
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <span className="text-white text-sm hidden lg:inline-block">Admin</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white hidden lg:inline-block" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                            
                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                                    <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profilim</Link>
                                    <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Ayarlar</Link>
                                    <button 
                                        onClick={handleSignOut} 
                                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                    >
                                        Çıkış Yap
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {/* Mobil Menü */}
                        <button className="md:hidden p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

// NavLink bileşeni - aktif bağlantı stillemesini sağlar
const NavLink = ({ children, to, isActive }) => {
    return (
        <Link
            to={to}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(to)
                    ? "bg-white/20 text-white"
                    : "text-indigo-100 hover:bg-white/10 hover:text-white"
            }`}
        >
            {children}
        </Link>
    );
};

export default Header;