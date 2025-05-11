import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import EditMotivationNote from './EditMotivationNote';

const MotivationNotesList = forwardRef(({ onAddClick }, ref) => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deletingNoteId, setDeletingNoteId] = useState(null);

    const fetchNotes = async () => {
        try {
            const notesRef = collection(db, 'motivation-notes');
            const q = query(notesRef, orderBy('siraNo', 'asc'));
            const snapshot = await getDocs(q);
            const notesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNotes(notesData);
        } catch (error) {
            console.error('Notlar alınırken hata:', error);
            toast.error('Notlar alınırken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    const yenidenNumaralandir = async (silinecekSiraNo) => {
        try {
            const batch = writeBatch(db);
            const notesRef = collection(db, 'motivation-notes');
            const q = query(notesRef, orderBy('siraNo', 'asc'));
            const snapshot = await getDocs(q);
            
            // Silinen nottan sonraki notları güncelle
            snapshot.docs.forEach(doc => {
                const noteData = doc.data();
                if (noteData.siraNo > silinecekSiraNo) {
                    batch.update(doc.ref, {
                        siraNo: noteData.siraNo - 1
                    });
                }
            });

            await batch.commit();
        } catch (error) {
            console.error('Notlar yeniden numaralandırılırken hata:', error);
            toast.error('Notlar yeniden numaralandırılırken bir hata oluştu!');
            throw error; // Hatayı yukarı fırlat
        }
    };

    const handleDelete = async (noteId, siraNo) => {
        if (deletingNoteId) return; // Zaten silme işlemi devam ediyorsa çık
        
        try {
            setDeletingNoteId(noteId);
            
            // Önce notu sil
            const noteRef = doc(db, 'motivation-notes', noteId);
            await deleteDoc(noteRef);
            
            // Sonra kalan notları yeniden numaralandır
            await yenidenNumaralandir(siraNo);
            
            toast.success('Not başarıyla silindi!');
            await fetchNotes(); // Notları yenile
        } catch (error) {
            console.error('Not silinirken hata:', error);
            toast.error('Not silinirken bir hata oluştu!');
        } finally {
            setDeletingNoteId(null);
        }
    };

    const handleEdit = (note) => {
        setSelectedNote(note);
        setIsEditModalOpen(true);
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    useImperativeHandle(ref, () => ({
        refreshNotes: fetchNotes
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (notes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                    Henüz hiç motivasyon notu eklenmemiş.
                </p>
                <button
                    onClick={onAddClick}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                    İlk Notu Ekle
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notes.map((note) => (
                    <div
                        key={note.id}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4"
                    >
                        <div className="flex items-start justify-between">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                {note.siraNo}. {note.baslik}
                            </h3>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleEdit(note)}
                                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => handleDelete(note.id, note.siraNo)}
                                    disabled={deletingNoteId === note.id}
                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                                >
                                    {deletingNoteId === note.id ? (
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div 
                            className="prose dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: note.icerik }}
                        />
                    </div>
                ))}
            </div>

            <EditMotivationNote
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedNote(null);
                }}
                note={selectedNote}
                onSuccess={fetchNotes}
            />
        </div>
    );
});

MotivationNotesList.displayName = 'MotivationNotesList';

export default MotivationNotesList; 