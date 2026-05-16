import { useCallback } from 'react';
import { doc, getDoc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { User } from '../types';

/**
 * 🧠 HOOK: useUserPreferences (Algoritmo 70/30 Híbrido)
 * ---------------------------------------------------
 * Gestiona el tracking de categorías favoritas del usuario de forma híbrida.
 * - Guest: LocalStorage
 * - Admin/Socio/Customer: Firebase Firestore
 */

const LOCAL_STORAGE_KEY = 'delva_user_prefs_v1';

export const useUserPreferences = (currentUser: User | null) => {

    // 1. Obtener preferencias consolidadas
    const getPreferences = useCallback(async () => {
        if (currentUser) {
            // Caso Logueado: Prioridad Firebase
            const userDoc = await getDoc(doc(db, 'users', currentUser.id));
            if (userDoc.exists()) {
                return userDoc.data().categoryPrefs || {};
            }
        }
        // Caso Guest o Fallback: LocalStorage
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    }, [currentUser]);

    // 2. Registrar Vista (+1 punto)
    const trackView = useCallback(async (categoryId: string) => {
        if (!categoryId) return;

        if (currentUser) {
            // Logueado: Firebase increment
            const userRef = doc(db, 'users', currentUser.id);
            try {
                await updateDoc(userRef, {
                    [`categoryPrefs.${categoryId}`]: increment(1)
                });
            } catch (e) {
                // Si el campo no existe, lo creamos
                await setDoc(userRef, {
                    categoryPrefs: { [categoryId]: 1 }
                }, { merge: true });
            }
        } else {
            // Guest: LocalStorage
            const prefs = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
            prefs[categoryId] = (prefs[categoryId] || 0) + 1;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prefs));
        }
    }, [currentUser]);

    // 3. Sincronización (Guest -> User)
    const syncPreferences = useCallback(async (userId: string) => {
        const localPrefs = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        if (Object.keys(localPrefs).length === 0) return;

        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const dbPrefs = userDoc.data().categoryPrefs || {};

            // Fusión de puntos
            const mergedPrefs = { ...dbPrefs };
            Object.keys(localPrefs).forEach(catId => {
                mergedPrefs[catId] = (mergedPrefs[catId] || 0) + localPrefs[catId];
            });

            await updateDoc(userRef, { categoryPrefs: mergedPrefs });
            localStorage.removeItem(LOCAL_STORAGE_KEY); // Limpiamos tras sincronizar
        }
    }, []);

    return { trackView, getPreferences, syncPreferences };
};

export default useUserPreferences;
