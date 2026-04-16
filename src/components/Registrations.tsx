import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Company, Equipment, Responsible } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Building2, HardDrive, UserCheck, ArrowLeft, Signature } from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

interface RegistrationsProps {
  onBack?: () => void;
}

export function Registrations({ onBack }: RegistrationsProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubCompanies = onSnapshot(
      collection(db, 'companies'), 
      (s) => setCompanies(s.docs.map(d => ({ id: d.id, ...d.data() } as Company))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'companies')
    );
    const unsubEquipments = onSnapshot(
      collection(db, 'equipments'), 
      (s) => setEquipments(s.docs.map(d => ({ id: d.id, ...d.data() } as Equipment))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'equipments')
    );
    const unsubResponsibles = onSnapshot(
      collection(db, 'responsibles'), 
      (s) => setResponsibles(s.docs.map(d => ({ id: d.id, ...d.data() } as Responsible))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'responsibles')
    );
    
    return () => {
      unsubCompanies();
      unsubEquipments();
      unsubResponsibles();
    };
  }, []);

  const addCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'companies'), { name: name.trim() });
      form.reset();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'companies');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEquipment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const brand = formData.get('brand') as string;
    const model = formData.get('model') as string;
    const serialNumber = formData.get('serialNumber') as string;
    const type = formData.get('type') as string;
    
    if (!brand.trim() || !model.trim() || !serialNumber.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'equipments'), {
        brand: brand.trim(),
        model: model.trim(),
        serialNumber: serialNumber.trim(),
        type
      });
      form.reset();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'equipments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [respSignature, setRespSignature] = useState('');

  const addResponsible = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'responsibles'), { 
        name: name.trim(),
        signature: respSignature 
      });
      form.reset();
      setRespSignature('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'responsibles');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async (col: string, id: string) => {
    try {
      await deleteDoc(doc(db, col, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${col}/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cadastros Base</h2>
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        )}
      </div>
      
      <Tabs defaultValue="companies" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Clientes
          </TabsTrigger>
          <TabsTrigger value="equipments" className="flex items-center gap-2">
            <HardDrive className="w-4 h-4" /> Equipamentos
          </TabsTrigger>
          <TabsTrigger value="responsibles" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" /> Responsáveis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Novo Cliente</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={addCompany} className="flex gap-2">
                <Input name="name" placeholder="Nome da Empresa" required disabled={isSubmitting} />
                <Button type="submit" disabled={isSubmitting}>
                  <Plus className="w-4 h-4 mr-2" /> 
                  {isSubmitting ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </form>
            </CardContent>
          </Card>
          <div className="grid gap-2">
            {companies.length === 0 ? (
              <p className="text-center py-4 text-slate-500 text-sm">Nenhum cliente cadastrado.</p>
            ) : (
              companies.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                  <span>{c.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => remove('companies', c.id)} className="text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="equipments" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Novo Equipamento</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={addEquipment} className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Marca</Label>
                  <Input name="brand" required disabled={isSubmitting} />
                </div>
                <div className="space-y-1">
                  <Label>Modelo</Label>
                  <Input name="model" required disabled={isSubmitting} />
                </div>
                <div className="space-y-1">
                  <Label>Nº de Série</Label>
                  <Input name="serialNumber" required disabled={isSubmitting} />
                </div>
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <select name="type" className="w-full h-10 border rounded-md px-3 bg-white" disabled={isSubmitting}>
                    <option value="chemical">Químico</option>
                    <option value="noise">Ruído</option>
                  </select>
                </div>
                <Button type="submit" className="col-span-2" disabled={isSubmitting}>
                  <Plus className="w-4 h-4 mr-2" /> 
                  {isSubmitting ? 'Adicionando...' : 'Adicionar Equipamento'}
                </Button>
              </form>
            </CardContent>
          </Card>
          <div className="grid gap-2">
            {equipments.length === 0 ? (
              <p className="text-center py-4 text-slate-500 text-sm">Nenhum equipamento cadastrado.</p>
            ) : (
              equipments.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                  <div>
                    <p className="font-medium">{e.brand} - {e.model}</p>
                    <p className="text-xs text-slate-500">S/N: {e.serialNumber} • {e.type === 'chemical' ? 'Químico' : 'Ruído'}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove('equipments', e.id)} className="text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="responsibles" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Novo Responsável</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={addResponsible} className="space-y-4">
                <div className="space-y-1">
                  <Label>Nome Completo</Label>
                  <Input name="name" placeholder="Nome Completo" required disabled={isSubmitting} />
                </div>
                <div className="space-y-1">
                  <Label>Assinatura Digital (para reutilização)</Label>
                  <div className="border rounded-lg p-2 bg-slate-50">
                    <SignaturePad onSave={setRespSignature} initialValue={respSignature} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <Plus className="w-4 h-4 mr-2" /> 
                  {isSubmitting ? 'Adicionando...' : 'Adicionar Responsável'}
                </Button>
              </form>
            </CardContent>
          </Card>
          <div className="grid gap-2">
            {responsibles.length === 0 ? (
              <p className="text-center py-4 text-slate-500 text-sm">Nenhum responsável cadastrado.</p>
            ) : (
              responsibles.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                  <div className="flex items-center gap-3">
                    <span>{r.name}</span>
                    {r.signature && <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Com Assinatura</Badge>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove('responsibles', r.id)} className="text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
