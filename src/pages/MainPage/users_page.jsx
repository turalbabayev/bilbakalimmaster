import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { FaUsers } from 'react-icons/fa';

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const usersRef = collection(db, 'users');
                const snapshot = await getDocs(usersRef);
                const usersData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setUsers(usersData);
            } catch (error) {
                console.error('Kullanıcılar yüklenirken hata:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
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
                                                Kullanıcı Adı
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                E-posta
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Üyelik Tipi
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Kayıt Tarihi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {users.map((user) => (
                                            <tr key={user.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.displayName || 'İsimsiz Kullanıcı'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-500">
                                                        {user.email}
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
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {user.createdAt?.toDate().toLocaleDateString('tr-TR') || '-'}
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