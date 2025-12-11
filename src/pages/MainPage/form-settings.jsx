import React from "react";
import Layout from "../../components/layout";
import { FaWpforms } from "react-icons/fa";

const FormSettingsPage = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-10">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-3">
                <FaWpforms className="text-indigo-600" />
                Ön Katılım Talepleri
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Ön katılım taleplerini burada listeleyip yöneteceğiz. (İçerik yakında eklenecek)
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-10 text-center">
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Bu bölüm yakında yapılandırılacak. Lütfen daha sonra tekrar kontrol edin.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FormSettingsPage;

