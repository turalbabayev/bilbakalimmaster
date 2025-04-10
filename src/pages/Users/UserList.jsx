import React, { useState, useEffect } from "react";
import { firestore } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import Layout from "../../components/layout";

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("created_at");
    const [sortDirection, setSortDirection] = useState("desc");
    const [filterPurchased, setFilterPurchased] = useState("all");

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const usersCollection = collection(firestore, "users");
                const userSnapshot = await getDocs(usersCollection);
                
                // Elde edilen dokümanlarda dolaşıp veri dizisi oluşturuyoruz
                const usersData = userSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                setUsers(usersData);
                setLoading(false);
            } catch (err) {
                console.error("Kullanıcılar alınırken hata:", err);
                setError("Kullanıcı verileri yüklenirken bir hata oluştu.");
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    // Kullanıcı sıralama fonksiyonu
    const sortUsers = (users) => {
        return [...users].sort((a, b) => {
            // Null kontrolü yapıyoruz, çünkü bazı kullanıcılarda bu alanlar olmayabilir
            const aValue = a[sortBy] || "";
            const bValue = b[sortBy] || "";
            
            if (sortBy === "created_at" || sortBy === "purchase_date") {
                // Tarih alanları için
                const aDate = aValue ? new Date(aValue) : new Date(0);
                const bDate = bValue ? new Date(bValue) : new Date(0);
                
                return sortDirection === "asc" 
                    ? aDate - bDate 
                    : bDate - aDate;
            } else if (sortBy === "purchase_amount") {
                // Sayısal alanlar için
                const aNum = parseFloat(aValue) || 0;
                const bNum = parseFloat(bValue) || 0;
                
                return sortDirection === "asc" 
                    ? aNum - bNum 
                    : bNum - aNum;
            } else {
                // Metinsel alanlar için
                const aText = String(aValue).toLowerCase();
                const bText = String(bValue).toLowerCase();
                
                return sortDirection === "asc" 
                    ? aText.localeCompare(bText)
                    : bText.localeCompare(aText);
            }
        });
    };

    // Kullanıcı filtreleme fonksiyonu
    const filterUsers = (users) => {
        return users.filter(user => {
            // Satın alma durumuna göre filtreleme
            if (filterPurchased === "purchased" && !user.has_purchased) {
                return false;
            }
            if (filterPurchased === "not_purchased" && user.has_purchased) {
                return false;
            }
            
            // Arama terimine göre filtreleme
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                
                return (
                    (user.name && user.name.toLowerCase().includes(searchLower)) ||
                    (user.surname && user.surname.toLowerCase().includes(searchLower)) ||
                    (user.email && user.email.toLowerCase().includes(searchLower)) ||
                    (user.device_id && user.device_id.toLowerCase().includes(searchLower))
                );
            }
            
            return true;
        });
    };

    // Filtre ve sıralama uygulayarak gösterilecek kullanıcıları hesapla
    const filteredAndSortedUsers = sortUsers(filterUsers(users));

    // Kullanıcıları render etmek için yardımcı fonksiyon
    const renderUserRows = () => {
        if (filteredAndSortedUsers.length === 0) {
            return (
                <tr>
                    <td colSpan="7" className="text-center py-4 text-gray-500">
                        Gösterilecek kullanıcı bulunamadı
                    </td>
                </tr>
            );
        }
        
        return filteredAndSortedUsers.map(user => (
            <tr 
                key={user.id} 
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => setSelectedUser(user)}
            >
                <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                            <span className="text-indigo-500 dark:text-indigo-300 font-medium text-sm">
                                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                            </span>
                        </div>
                        <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.name || "İsimsiz"} {user.surname || ""}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.email || "Email yok"}
                            </div>
                        </div>
                    </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white truncate max-w-xs">
                        {user.device_id || "Yok"}
                    </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : "Belirsiz"}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {user.created_at ? new Date(user.created_at).toLocaleTimeString('tr-TR') : ""}
                    </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.has_purchased ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                        {user.has_purchased ? "Evet" : "Hayır"}
                    </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.purchase_amount ? `${user.purchase_amount} TL` : "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.purchase_date ? new Date(user.purchase_date).toLocaleDateString('tr-TR') : "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(user);
                        }}
                    >
                        Detay
                    </button>
                </td>
            </tr>
        ));
    };

    return (
        <Layout>
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-0">
                            Kullanıcılar
                        </h1>
                        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Ara..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <div className="absolute left-3 top-2.5 text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <select
                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={filterPurchased}
                                onChange={(e) => setFilterPurchased(e.target.value)}
                            >
                                <option value="all">Tüm Kullanıcılar</option>
                                <option value="purchased">Satın Alanlar</option>
                                <option value="not_purchased">Satın Almayanlar</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                ) : error ? (
                    <div className="p-6 text-center text-red-500">
                        <p>{error}</p>
                        <button 
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none"
                            onClick={() => window.location.reload()}
                        >
                            Yeniden Dene
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        <button 
                                            className="flex items-center space-x-1"
                                            onClick={() => {
                                                setSortDirection(sortBy === "name" && sortDirection === "asc" ? "desc" : "asc");
                                                setSortBy("name");
                                            }}
                                        >
                                            <span>Kullanıcı</span>
                                            {sortBy === "name" && (
                                                <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                                            )}
                                        </button>
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        <button 
                                            className="flex items-center space-x-1"
                                            onClick={() => {
                                                setSortDirection(sortBy === "device_id" && sortDirection === "asc" ? "desc" : "asc");
                                                setSortBy("device_id");
                                            }}
                                        >
                                            <span>Cihaz ID</span>
                                            {sortBy === "device_id" && (
                                                <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                                            )}
                                        </button>
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        <button 
                                            className="flex items-center space-x-1"
                                            onClick={() => {
                                                setSortDirection(sortBy === "created_at" && sortDirection === "asc" ? "desc" : "asc");
                                                setSortBy("created_at");
                                            }}
                                        >
                                            <span>Kayıt Tarihi</span>
                                            {sortBy === "created_at" && (
                                                <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                                            )}
                                        </button>
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        <button 
                                            className="flex items-center space-x-1"
                                            onClick={() => {
                                                setSortDirection(sortBy === "has_purchased" && sortDirection === "asc" ? "desc" : "asc");
                                                setSortBy("has_purchased");
                                            }}
                                        >
                                            <span>Satın Aldı mı?</span>
                                            {sortBy === "has_purchased" && (
                                                <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                                            )}
                                        </button>
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        <button 
                                            className="flex items-center space-x-1"
                                            onClick={() => {
                                                setSortDirection(sortBy === "purchase_amount" && sortDirection === "asc" ? "desc" : "asc");
                                                setSortBy("purchase_amount");
                                            }}
                                        >
                                            <span>Tutar</span>
                                            {sortBy === "purchase_amount" && (
                                                <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                                            )}
                                        </button>
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        <button 
                                            className="flex items-center space-x-1"
                                            onClick={() => {
                                                setSortDirection(sortBy === "purchase_date" && sortDirection === "asc" ? "desc" : "asc");
                                                setSortBy("purchase_date");
                                            }}
                                        >
                                            <span>Satın Alma Tarihi</span>
                                            {sortBy === "purchase_date" && (
                                                <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                                            )}
                                        </button>
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        İşlemler
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {renderUserRows()}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {/* Kullanıcı Detay Modalı */}
                {selectedUser && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Kullanıcı Detayları
                                </h2>
                                <button 
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                    onClick={() => setSelectedUser(null)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[70vh]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Kullanıcı ID</h3>
                                            <p className="mt-1 text-gray-900 dark:text-white">{selectedUser.id}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Ad</h3>
                                            <p className="mt-1 text-gray-900 dark:text-white">{selectedUser.name || "-"}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Soyad</h3>
                                            <p className="mt-1 text-gray-900 dark:text-white">{selectedUser.surname || "-"}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">E-posta</h3>
                                            <p className="mt-1 text-gray-900 dark:text-white">{selectedUser.email || "-"}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Hayvan Türü</h3>
                                            <p className="mt-1 text-gray-900 dark:text-white">{selectedUser.animal || "-"}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cihaz ID</h3>
                                            <p className="mt-1 text-gray-900 dark:text-white break-all">{selectedUser.device_id || "-"}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Kayıt Tarihi</h3>
                                            <p className="mt-1 text-gray-900 dark:text-white">
                                                {selectedUser.created_at 
                                                    ? new Date(selectedUser.created_at).toLocaleString('tr-TR')
                                                    : "-"
                                                }
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Satın Alma Durumu</h3>
                                            <div className="mt-1">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    selectedUser.has_purchased 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                    {selectedUser.has_purchased ? "Satın Alındı" : "Satın Alınmadı"}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Satın Alma Tutarı</h3>
                                            <p className="mt-1 text-gray-900 dark:text-white">
                                                {selectedUser.purchase_amount ? `${selectedUser.purchase_amount} TL` : "-"}
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Satın Alma Tarihi</h3>
                                            <p className="mt-1 text-gray-900 dark:text-white">
                                                {selectedUser.purchase_date 
                                                    ? new Date(selectedUser.purchase_date).toLocaleString('tr-TR')
                                                    : "-"
                                                }
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Satın Alma Referansı</h3>
                                            <p className="mt-1 text-gray-900 dark:text-white break-all">
                                                {selectedUser.purchase_reference || "-"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                                <button
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none"
                                    onClick={() => setSelectedUser(null)}
                                >
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default UserList; 