/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { ChemicalForm } from './components/ChemicalForm';
import { NoiseForm } from './components/NoiseForm';
import { Registrations } from './components/Registrations';
import { Assessment } from './types';
import { Button } from './components/ui/button';
import { Plus, ClipboardList, LogOut, LogIn, Settings } from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, where, setDoc, doc, getDocFromServer, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/errorHandlers';
import { getBrasiliaNow } from './lib/timeUtils';

export default function App() {
  const [view, setView] = useState<'dashboard' | 'chemical' | 'noise' | 'registrations'>('dashboard');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);

  // Firestore listener
  useEffect(() => {
    const q = query(collection(db, 'assessments'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Assessment);
      setAssessments(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'assessments');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const saveAssessment = async (assessment: Assessment) => {
    try {
      const docRef = doc(db, 'assessments', assessment.id);
      // Ensure we don't overwrite with undefined signature if it's already there
      const existingDoc = assessments.find(a => a.id === assessment.id);
      
      // Sanitize data to remove undefined values which Firestore doesn't support
      const sanitize = (obj: any): any => {
        const result = { ...obj };
        Object.keys(result).forEach(key => {
          if (result[key] === undefined) {
            delete result[key];
          } else if (result[key] !== null && typeof result[key] === 'object' && !Array.isArray(result[key])) {
            result[key] = sanitize(result[key]);
          }
        });
        return result;
      };

      const finalAssessment = sanitize({
        ...assessment,
        userId: 'public',
        signature: assessment.signature || existingDoc?.signature || ''
      });

      await setDoc(docRef, finalAssessment);
      setView('dashboard');
      setEditingAssessment(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `assessments/${assessment.id}`);
    }
  };

  const deleteAssessment = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'assessments', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `assessments/${id}`);
    }
  };

  const handleEdit = (assessment: Assessment) => {
    setEditingAssessment(assessment);
    setView(assessment.type);
  };

  const handleNew = (type: 'chemical' | 'noise') => {
    setEditingAssessment(null);
    setView(type);
  };

  const handleBack = () => {
    setEditingAssessment(null);
    setView('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="bg-blue-600 p-2 rounded-lg">
              <ClipboardList className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-lg tracking-tight hidden sm:block">Higiene Ocupacional</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {view === 'dashboard' && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setView('registrations')}
                  className="mr-2"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Cadastros
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleNew('chemical')}
                  className="hidden sm:flex"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Avaliação química
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => handleNew('noise')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Avaliação ruído
                </Button>
              </>
            )}
            {view !== 'dashboard' && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                Voltar
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {view === 'dashboard' && (
          <Dashboard 
            assessments={assessments} 
            onEdit={handleEdit} 
            onDelete={deleteAssessment}
          />
        )}
        {view === 'registrations' && (
          <Registrations onBack={handleBack} />
        )}
        {view === 'chemical' && (
          <ChemicalForm 
            onSave={saveAssessment} 
            onCancel={handleBack} 
            initialData={editingAssessment || undefined}
          />
        )}
        {view === 'noise' && (
          <NoiseForm 
            onSave={saveAssessment} 
            onCancel={handleBack} 
            initialData={editingAssessment || undefined}
          />
        )}
      </main>

      {/* Floating Action Button for Mobile */}
      {view === 'dashboard' && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 sm:hidden">
           <Button 
            size="icon" 
            className="rounded-full w-12 h-12 shadow-lg bg-white text-blue-600 border border-blue-100"
            onClick={() => handleNew('chemical')}
          >
            <Plus className="w-6 h-6" />
          </Button>
          <Button 
            size="icon" 
            className="rounded-full w-14 h-14 shadow-xl bg-blue-600 hover:bg-blue-700"
            onClick={() => handleNew('noise')}
          >
            <Plus className="w-7 h-7" />
          </Button>
        </div>
      )}
    </div>
  );
}



