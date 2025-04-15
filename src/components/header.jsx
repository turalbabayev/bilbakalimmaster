import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { Dialog } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

    const menuItems = [
        { path: "/home", label: "Ana Sayfa" },
        { path: "/question", label: "Sorular" },
        { path: "/announcements", label: "Duyurular" },
        { path: "/games", label: "Oyunlar" },
        { path: "/notes", label: "Notlar" },
        { path: "/deneme-sinavlari", label: "Deneme Sınavları" }
    ];

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <header className="bg-gray-800">
            <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
                <div className="flex lg:flex-1">
                    <Link to="/" className="-m-1.5 p-1.5">
                        <span className="text-white font-bold text-xl">BilBakalım</span>
                    </Link>
                </div>
                <div className="flex lg:hidden">
                    <button
                        type="button"
                        className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-400"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <span className="sr-only">Open main menu</span>
                        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                    </button>
                </div>
                <div className="hidden lg:flex lg:gap-x-12">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`${
                                location.pathname === item.path
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            } rounded-md px-3 py-2 text-sm font-medium`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
                <div className="hidden lg:flex lg:flex-1 lg:justify-end">
                    <button
                        onClick={handleSignOut}
                        className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md flex items-center gap-2 transition-colors duration-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Çıkış Yap
                    </button>
                </div>
            </nav>
            <Dialog as="div" className="lg:hidden" open={isMobileMenuOpen} onClose={setIsMobileMenuOpen}>
                <div className="fixed inset-0 z-10" />
                <Dialog.Panel className="fixed inset-y-0 right-0 z-10 w-full overflow-y-auto bg-gray-800 px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
                    <div className="flex items-center justify-between">
                        <Link to="/" className="-m-1.5 p-1.5">
                            <span className="text-white font-bold text-xl">BilBakalım</span>
                        </Link>
                        <button
                            type="button"
                            className="-m-2.5 rounded-md p-2.5 text-gray-400"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <span className="sr-only">Close menu</span>
                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="mt-6 flow-root">
                        <div className="-my-6 divide-y divide-gray-500/10">
                            <div className="space-y-2 py-6">
                                {menuItems.map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 ${
                                            location.pathname === item.path
                                                ? 'bg-gray-900 text-white'
                                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                        }`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                            <div className="py-6">
                                <button
                                    onClick={handleSignOut}
                                    className="w-full text-left -mx-3 rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-white bg-red-600 hover:bg-red-700 flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Çıkış Yap
                                </button>
                            </div>
                        </div>
                    </div>
                </Dialog.Panel>
            </Dialog>
        </header>
    );
};

export default Header;