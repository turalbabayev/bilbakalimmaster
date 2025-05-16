import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FaUsers, FaApple, FaAndroid, FaUserSecret, FaGraduationCap } from 'react-icons/fa';

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingUserId, setUpdatingUserId] = useState(null);

    const fetchUsers = async () => {
        try {
            console.log('Kullanıcılar getiriliyor...');
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(usersRef);
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log('Getirilen kullanıcılar:', usersData);
            setUsers(usersData);
        } catch (error) {
            console.error('Kullanıcılar yüklenirken hata:', error);
            toast.error('Kullanıcılar yüklenirken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handlePremiumUpdate = async (userId, newPremiumStatus) => {
        setUpdatingUserId(userId);
        try {
            await updateDoc(doc(db, 'users', userId), {
                isPremium: newPremiumStatus
            });
            toast.success(`Kullanıcı ${newPremiumStatus ? 'premium' : 'ücretsiz'} üyeliğe geçirildi!`);
            fetchUsers(); // Listeyi yenile
        } catch (error) {
            console.error('Premium durumu güncellenirken hata:', error);
            toast.error('Premium durumu güncellenirken bir hata oluştu!');
        } finally {
            setUpdatingUserId(null);
        }
    };

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
                        <FaUsers className="text-indigo-600" />
                        Kullanıcılar
                    </h1>

                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : users.length === 0 ? (
                            <p className="text-center text-gray-500">Henüz hiç kullanıcı bulunmuyor.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Kullanıcı
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                E-posta
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Platform
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Uzmanlık Alanı
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Üyelik Durumu
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                İşlemler
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {users.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                                <span className="text-indigo-600 font-medium">
                                                                    {user.name ? user.name[0].toUpperCase() : '?'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                                                {user.name} {user.surname}
                                                                {user.isGuest && (
                                                                    <FaUserSecret className="text-gray-400" title="Misafir Kullanıcı" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-500">
                                                        {user.email}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-xl">
                                                        {user.device_type === 'iOS' ? (
                                                            <FaApple className="text-gray-700" title="iOS" />
                                                        ) : user.device_type === 'Android' ? (
                                                            <FaAndroid className="text-green-500" title="Android" />
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <FaGraduationCap className="mr-2" />
                                                        {user.expertise || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        user.isPremium 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {user.isPremium ? 'Premium' : 'Ücretsiz'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <button
                                                        onClick={() => handlePremiumUpdate(user.id, !user.isPremium)}
                                                        disabled={updatingUserId === user.id}
                                                        className={`inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white ${
                                                            user.isPremium 
                                                            ? 'bg-red-600 hover:bg-red-700' 
                                                            : 'bg-green-600 hover:bg-green-700'
                                                        } focus:outline-none transition ease-in-out duration-150 ${
                                                            updatingUserId === user.id ? 'opacity-50 cursor-not-allowed' : ''
                                                        }`}
                                                    >
                                                        {updatingUserId === user.id ? (
                                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                        ) : null}
                                                        {user.isPremium ? 'Ücretsiz Yap' : 'Premium Yap'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default UsersPage; 