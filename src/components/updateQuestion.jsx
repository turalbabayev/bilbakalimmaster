import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, update, onValue, remove } from "firebase/database";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const UpdateQuestion = ({ isOpen, onClose, soruRefPath, konuId, altKonuId }) => {
    const [soruMetni, setSoruMetni] = useState("");
    const [cevaplar, setCevaplar] = useState(["", "", "", "", ""]);
    const [dogruCevap, setDogruCevap] = useState("");
    const [aciklama, setAciklama] = useState("");
    const [altKonular, setAltKonular] = useState({});
    const [altDallar, setAltDallar] = useState({});
    const [selectedAltKonu, setSelectedAltKonu] = useState("");
    const [selectedAltDal, setSelectedAltDal] = useState("");
    const [isAltDal, setIsAltDal] = useState(false);
    const [mevcutSoruNumarasi, setMevcutSoruNumarasi] = useState(null);
    const [mevcutYol, setMevcutYol] = useState(null);

    // Quill editör modülleri ve formatları
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'font': [] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['clean']
        ],
    };

    const formats = [
        'header',
        'font',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list', 'bullet',
        'align'
    ];

    useEffect(() => {
        // Mevcut sorunun verilerini yükle
        if (soruRefPath) {
            const soruRef = ref(database, soruRefPath);
            
            // Soru yolunu parçalara ayırarak mevcut alt konu veya alt dalı belirle
            const pathParts = soruRefPath.split('/');
            console.log("Soru yolu parçaları:", pathParts);
            
            // Mevcut yolu belirle
            try {
                // konular/konuId/altkonular/altKonuId/sorular/soruId şeklindeyse
                if (pathParts.includes("sorular") && !pathParts.includes("altdallar")) {
                    const altKonuIndex = pathParts.indexOf("altkonular") + 1;
                    if (altKonuIndex > 0 && altKonuIndex < pathParts.length) {
                        const mevcutAltKonuId = pathParts[altKonuIndex];
                        setSelectedAltKonu(mevcutAltKonuId);
                        console.log("Mevcut alt konu ID:", mevcutAltKonuId);
                        setIsAltDal(false);
                    }
                }
                
                // konular/konuId/altkonular/altKonuId/altdallar/altDalId/sorular/soruId şeklindeyse
                if (pathParts.includes("altdallar")) {
                    const altDalIndex = pathParts.indexOf("altdallar") + 1;
                    if (altDalIndex > 0 && altDalIndex < pathParts.length) {
                        const mevcutAltDalId = pathParts[altDalIndex];
                        setSelectedAltDal(mevcutAltDalId);
                        console.log("Mevcut alt dal ID:", mevcutAltDalId);
                        setIsAltDal(true);
                    }
                }
                
                setMevcutYol(soruRefPath);
            } catch (error) {
                console.error("Soru yolu ayrıştırılırken hata:", error);
            }
            
            onValue(soruRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setSoruMetni(data.soruMetni || "");
                    setCevaplar(data.cevaplar || ["", "", "", "", ""]);
                    setDogruCevap(
                        data.dogruCevap
                            ? String.fromCharCode(data.cevaplar.indexOf(data.dogruCevap) + 65)
                            : ""
                    );
                    setAciklama(data.aciklama || "");
                    // Soru numarasını saklayalım
                    setMevcutSoruNumarasi(data.soruNumarasi || null);
                }
            });
        }

        // Alt konuları yükle
        const konularRef = ref(database, `konular/${konuId}`);
        onValue(konularRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.altkonular) {
                setAltKonular(data.altkonular);
            }
        });

        // Eğer altKonuId varsa, alt dalları yükle
        if (altKonuId) {
            setIsAltDal(true);
            const altDallarRef = ref(database, `konular/${konuId}/altkonular/${altKonuId}/altdallar`);
            onValue(altDallarRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setAltDallar(data);
                }
            });
        }
    }, [soruRefPath, konuId, altKonuId]);

    const handleUpdate = () => {
        if (!soruMetni || cevaplar.some((cevap) => !cevap) || !dogruCevap) {
            alert("Tüm alanları doldurmalısınız.");
            return;
        }

        const updatedQuestion = {
            soruMetni,
            cevaplar,
            dogruCevap: cevaplar[dogruCevap.charCodeAt(0) - 65],
            aciklama,
            report: 0,
            liked: 0,
            unliked: 0
        };

        // Mevcut soru numarası varsa, onu da ekleyelim
        if (mevcutSoruNumarasi) {
            updatedQuestion.soruNumarasi = mevcutSoruNumarasi;
        }

        let newPath;
        const timestamp = Date.now();

        // Eğer konum değişmediyse, aynı yere kaydet (soruId'yi değiştir)
        const mevcutKonumKullaniyor = 
            (isAltDal && selectedAltDal === mevcutYol?.split('/').find(part => part.includes("altdallar/") && !part.includes("sorular"))) ||
            (!isAltDal && selectedAltKonu === mevcutYol?.split('/').find(part => part.includes("altkonular/") && !part.includes("altdallar")));

        if (isAltDal) {
            if (!selectedAltDal) {
                alert("Lütfen bir alt dal seçin.");
                return;
            }
            newPath = `konular/${konuId}/altkonular/${altKonuId}/altdallar/${selectedAltDal}/sorular/${timestamp}`;
        } else {
            if (!selectedAltKonu) {
                alert("Lütfen bir alt konu seçin.");
                return;
            }
            newPath = `konular/${konuId}/altkonular/${selectedAltKonu}/sorular/${timestamp}`;
        }

        // Önce yeni konuma soruyu ekle
        const newSoruRef = ref(database, newPath);
        update(newSoruRef, updatedQuestion)
            .then(() => {
                // Başarılı olduktan sonra eski soruyu sil
                const oldSoruRef = ref(database, soruRefPath);
                return remove(oldSoruRef);
            })
            .then(() => {
                alert("Soru başarıyla güncellendi ve taşındı.");
                onClose();
            })
            .catch((error) => {
                console.error("Soru güncellenirken bir hata oluştu: ", error);
                alert("Soru güncellenirken bir hata oluştu!");
            });
    };

    if (!isOpen) return null;

    // Cevapları güncellemek için yardımcı fonksiyon
    const handleCevapChange = (index, value) => {
        setCevaplar(prevCevaplar => {
            const newCevaplar = [...prevCevaplar];
            newCevaplar[index] = value;
            return newCevaplar;
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-3/4 p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Soruyu Güncelle</h2>

                {/* Konum Seçimi */}
                <div className="mb-4">
                    <label className="block mb-2">
                        Soru Konumu:
                        {isAltDal ? (
                            <select
                                value={selectedAltDal}
                                onChange={(e) => setSelectedAltDal(e.target.value)}
                                className="w-full border rounded-md p-2 mt-1"
                            >
                                <option value="">Alt Dal Seçin</option>
                                {Object.entries(altDallar).map(([key, dal]) => (
                                    <option key={key} value={key}>
                                        {dal.baslik}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <select
                                value={selectedAltKonu}
                                onChange={(e) => setSelectedAltKonu(e.target.value)}
                                className="w-full border rounded-md p-2 mt-1"
                            >
                                <option value="">Alt Konu Seçin</option>
                                {Object.entries(altKonular).map(([key, konu]) => (
                                    <option key={key} value={key}>
                                        {konu.baslik}
                                    </option>
                                ))}
                            </select>
                        )}
                    </label>
                </div>

                <div className="mb-4">
                    <label className="block mb-2">
                        Soru Metni:
                        <div className="mt-1">
                            <ReactQuill 
                                theme="snow"
                                value={soruMetni}
                                onChange={setSoruMetni}
                                modules={modules}
                                formats={formats}
                                className="bg-white"
                            />
                        </div>
                    </label>
                </div>

                <div className="mb-4">
                    <label className="block mb-2">Cevaplar:</label>
                    {cevaplar.map((cevap, index) => (
                        <div key={index} className="mb-3">
                            <label className="block mb-1">{`Cevap ${String.fromCharCode(65 + index)}`}</label>
                            <textarea
                                value={cevap}
                                onChange={(e) => {
                                    const newCevaplar = [...cevaplar];
                                    newCevaplar[index] = e.target.value;
                                    setCevaplar(newCevaplar);
                                }}
                                placeholder={`Cevap ${String.fromCharCode(65 + index)}`}
                                className="w-full border rounded-md p-2 mt-1 mb-1"
                                rows="2"
                            />
                        </div>
                    ))}
                </div>

                <div className="mb-4">
                    <label className="block mb-2">
                        Doğru Cevap:
                        <input
                            value={dogruCevap}
                            onChange={(e) => setDogruCevap(e.target.value.toUpperCase())}
                            placeholder="Doğru cevap (A, B, C, D, E)"
                            className="w-full border rounded-md p-2 mt-1"
                        />
                    </label>
                </div>

                <div className="mb-4">
                    <label className="block mb-2">
                        Açıklama:
                        <div className="mt-1">
                            <ReactQuill
                                theme="snow"
                                value={aciklama}
                                onChange={setAciklama}
                                modules={modules}
                                formats={formats}
                                className="bg-white h-[200px] mb-12"
                            />
                        </div>
                    </label>
                </div>

                <div className="flex justify-end space-x-4 mt-16">
                    <button
                        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                        onClick={handleUpdate}
                    >
                        Güncelle
                    </button>
                    <button
                        className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                        onClick={onClose}
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateQuestion;
