// Bu script mevcut tüm sorulara numara eklemek için bir kerelik çalıştırılacaktır
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update } from "firebase/database";

// Firebase yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyBT4j073Owuy0bk0eMBRHnNeUZ1I8aCVEU",
  authDomain: "bilbakalim-28281.firebaseapp.com",
  databaseURL: "https://bilbakalim-28281-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "bilbakalim-28281",
  storageBucket: "bilbakalim-28281.firebasestorage.app",
  messagingSenderId: "926606297242",
  appId: "1:926606297242:web:74a8f3d5e924e0c8a6b723",
  measurementId: "G-PWH36GB2RM"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Tüm soruları numaralandır
async function numberAllQuestions() {
  try {
    // Tüm konuları al
    const konularRef = ref(database, 'konular');
    const konularSnapshot = await get(konularRef);
    const konular = konularSnapshot.val();

    if (!konular) {
      console.log('Konular bulunamadı!');
      return;
    }

    // Her konu için
    for (const konuId in konular) {
      const konu = konular[konuId];
      console.log(`Konu: ${konu.baslik} (${konuId}) işleniyor...`);
      
      // Alt konular varsa
      if (konu.altkonular) {
        // Her alt konu için
        for (const altKonuId in konu.altkonular) {
          const altKonu = konu.altkonular[altKonuId];
          console.log(`Alt Konu: ${altKonu.baslik} (${altKonuId}) işleniyor...`);
          
          // Alt konunun soruları varsa
          if (altKonu.sorular) {
            let soruNumarasi = 1;
            console.log(`${altKonu.baslik} için sorular numaralandırılıyor...`);
            
            // Her soru için numara ata
            for (const soruId in altKonu.sorular) {
              const soruPath = `konular/${konuId}/altkonular/${altKonuId}/sorular/${soruId}`;
              await update(ref(database, soruPath), { soruNumarasi: soruNumarasi });
              console.log(`${soruPath} için soruNumarasi = ${soruNumarasi} atandı.`);
              soruNumarasi++;
            }
          }
          
          // Alt dallar varsa
          if (altKonu.altdallar) {
            // Her alt dal için
            for (const altDalId in altKonu.altdallar) {
              const altDal = altKonu.altdallar[altDalId];
              console.log(`Alt Dal: ${altDal.baslik} (${altDalId}) işleniyor...`);
              
              // Alt dalın soruları varsa
              if (altDal.sorular) {
                let soruNumarasi = 1;
                console.log(`${altDal.baslik} için sorular numaralandırılıyor...`);
                
                // Her soru için numara ata
                for (const soruId in altDal.sorular) {
                  const soruPath = `konular/${konuId}/altkonular/${altKonuId}/altdallar/${altDalId}/sorular/${soruId}`;
                  await update(ref(database, soruPath), { soruNumarasi: soruNumarasi });
                  console.log(`${soruPath} için soruNumarasi = ${soruNumarasi} atandı.`);
                  soruNumarasi++;
                }
              }
            }
          }
        }
      }
    }
    
    console.log('Tüm sorular başarıyla numaralandırıldı!');
  } catch (error) {
    console.error('Sorular numaralandırılırken bir hata oluştu:', error);
  }
}

// Scripti çalıştır
numberAllQuestions()
  .then(() => {
    console.log('İşlem tamamlandı!');
    // 5 saniye sonra programı sonlandır (veritabanı işlemleri tamamlansın)
    setTimeout(() => process.exit(0), 5000);
  })
  .catch(err => {
    console.error('Hata:', err);
    process.exit(1);
  }); 