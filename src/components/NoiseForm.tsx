import { useState, useEffect, useRef } from 'react';
import { NoiseAssessment, Company, Equipment, Responsible } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SignaturePad } from './SignaturePad';
import { ReportPreview } from './ReportPreview';
import { FileText, Save, X, Download, Pause, Play, CheckCircle, Clock, Timer, AlertCircle } from 'lucide-react';
import { generateNoisePDF } from '../lib/pdfGenerator';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { calculateTimeMetrics, formatDuration, calculateTotalPauseSeconds, getBrasiliaISOString, getBrasiliaNow, formatForDateTimeLocal, parseDateTimeLocalToBrasiliaISO } from '../lib/timeUtils';

interface NoiseFormProps {
  onSave: (assessment: NoiseAssessment) => void;
  onCancel: () => void;
  initialData?: Partial<NoiseAssessment>;
}

export function NoiseForm({ onSave, onCancel, initialData }: NoiseFormProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubC = onSnapshot(
      collection(db, 'companies'), 
      s => setCompanies(s.docs.map(d => ({ id: d.id, ...d.data() } as Company))),
      err => handleFirestoreError(err, OperationType.LIST, 'companies')
    );
    const unsubE = onSnapshot(
      collection(db, 'equipments'), 
      s => setEquipments(s.docs.map(d => ({ id: d.id, ...d.data() } as Equipment))),
      err => handleFirestoreError(err, OperationType.LIST, 'equipments')
    );
    const unsubR = onSnapshot(
      collection(db, 'responsibles'), 
      s => setResponsibles(s.docs.map(d => ({ id: d.id, ...d.data() } as Responsible))),
      err => handleFirestoreError(err, OperationType.LIST, 'responsibles')
    );
    return () => { unsubC(); unsubE(); unsubR(); };
  }, []);

  const [formData, setFormData] = useState<Partial<NoiseAssessment>>({
    id: initialData?.id || Math.random().toString(36).substr(2, 9),
    type: 'noise',
    status: 'open',
    createdAt: getBrasiliaNow().getTime(),
    workerName: '',
    companyId: '',
    companyName: '',
    sector: '',
    role: '',
    local: '',
    startTime: getBrasiliaISOString(),
    estimatedDuration: '01:00',
    pauses: [],
    isPaused: false,
    isStarted: false,
    equipmentId: '',
    equipmentNumber: '',
    equipmentModel: '',
    responsibleId: '',
    responsibleName: '',
    endTime: '',
    reportNumber: '',
    signature: '',
    dosimetryReport: {
      samplingTime: '',
      measuredDose: '',
      calibrationInitial: '',
      calibrationFinal: '',
      lavg: '',
      dose8h: '',
      nen: '',
      ...initialData?.dosimetryReport
    },
    ...initialData
  } as any);

  const [timeMetrics, setTimeMetrics] = useState({
    elapsed: '00:00:00',
    remaining: '00:00:00'
  });

  useEffect(() => {
    if (!formData.isStarted || formData.status === 'completed') return;

    const interval = setInterval(() => {
      const metrics = calculateTimeMetrics(
        formData.startTime!,
        formData.estimatedDuration!,
        formData.pauses || [],
        formData.isPaused || false,
        formData.status || 'open',
        formData.endTime
      );
      setTimeMetrics({
        elapsed: metrics.elapsed,
        remaining: metrics.remaining
      });
      
      // Update samplingTime field for the report
      setFormData(prev => ({ 
        ...prev, 
        samplingTime: metrics.elapsed,
        dosimetryReport: {
          ...prev.dosimetryReport!,
          samplingTime: metrics.elapsed
        }
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [formData.isStarted, formData.startTime, formData.estimatedDuration, formData.pauses, formData.isPaused, formData.status, formData.endTime]);

  // Initial calculation for static display
  useEffect(() => {
    const metrics = calculateTimeMetrics(
      formData.startTime!,
      formData.estimatedDuration!,
      formData.pauses || [],
      formData.isPaused || false,
      formData.status || 'open',
      formData.endTime
    );
    setTimeMetrics({
      elapsed: metrics.elapsed,
      remaining: metrics.remaining
    });
  }, [formData.status, formData.endTime]);

  const handleChange = (field: keyof NoiseAssessment, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDosimetryChange = (field: keyof NoiseAssessment['dosimetryReport'], value: string) => {
    setFormData(prev => ({
      ...prev,
      dosimetryReport: {
        ...prev.dosimetryReport!,
        [field]: value
      }
    }));
  };

  const handleCompanyChange = (id: string) => {
    const company = companies.find(c => c.id === id);
    setFormData(prev => ({ ...prev, companyId: id, companyName: company?.name || '' }));
  };

  const handleEquipmentChange = (id: string) => {
    const equip = equipments.find(e => e.id === id);
    setFormData(prev => ({ 
      ...prev, 
      equipmentId: id, 
      equipmentNumber: equip?.serialNumber || '', 
      equipmentModel: equip?.model || '' 
    }));
  };

  const handleResponsibleChange = (id: string) => {
    const resp = responsibles.find(r => r.id === id);
    if (resp) {
      setFormData(prev => ({ 
        ...prev, 
        responsibleId: id, 
        responsibleName: resp.name,
        responsibleSignature: resp.signature
      }));
    }
  };

  const togglePause = () => {
    if (formData.status === 'completed') return;
    
    const now = getBrasiliaISOString();
    if (formData.isPaused) {
      // Resume
      const updatedPauses = [...(formData.pauses || [])];
      if (updatedPauses.length > 0) {
        updatedPauses[updatedPauses.length - 1].end = now;
      }
      setFormData(prev => ({ ...prev, isPaused: false, pauses: updatedPauses }));
    } else {
      // Pause
      setFormData(prev => ({ 
        ...prev, 
        isPaused: true, 
        pauses: [...(formData.pauses || []), { start: now }] 
      }));
    }
  };

  const handlePauseTimeChange = (index: number, field: 'start' | 'end', value: string) => {
    const updatedPauses = [...(formData.pauses || [])];
    updatedPauses[index][field] = parseDateTimeLocalToBrasiliaISO(value);
    setFormData(prev => ({ ...prev, pauses: updatedPauses }));
  };

  const finalizeMeasurement = () => {
    const now = getBrasiliaISOString();
    const metrics = calculateTimeMetrics(
      formData.startTime!,
      formData.estimatedDuration!,
      formData.pauses || [],
      formData.isPaused || false,
      'completed',
      now
    );
    
    setFormData(prev => ({ 
      ...prev, 
      status: 'completed',
      endTime: now,
      samplingTime: metrics.elapsed,
      isPaused: false,
      dosimetryReport: {
        ...prev.dosimetryReport!,
        samplingTime: metrics.elapsed
      }
    }));
  };

  const validateForm = (status: 'open' | 'completed') => {
    if (status === 'completed') {
      const required = ['workerName', 'companyId', 'responsibleId', 'equipmentId', 'signature'];
      const missing = required.filter(f => !formData[f as keyof NoiseAssessment]);
      if (missing.length > 0) {
        alert('Por favor, preencha todos os campos obrigatórios e colete a assinatura antes de finalizar.');
        return false;
      }
    }
    return true;
  };

  const handleSave = async (status: 'open' | 'completed' = 'open') => {
    if (!validateForm(status)) return;
    
    setIsSubmitting(true);
    try {
      const finalData = { 
        ...formData, 
        status
      };
      await onSave(finalData as NoiseAssessment);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = () => {
    generateNoisePDF(formData as NoiseAssessment);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Avaliação de Ruído
          {formData.isStarted && (
            <Badge variant="outline" className="ml-2 font-mono text-lg bg-slate-100 animate-pulse">
              {timeMetrics.elapsed}
            </Badge>
          )}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button variant="default" size="sm" onClick={() => handleSave('open')} className="bg-blue-600" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Salvando...' : 'Salvar Rascunho'}
          </Button>
        </div>
      </div>

      {!formData.isStarted ? (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Configuração da Avaliação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Data e Horário de Início</Label>
                <Input 
                  type="datetime-local" 
                  value={formatForDateTimeLocal(formData.startTime || '')} 
                  onChange={(e) => handleChange('startTime', parseDateTimeLocalToBrasiliaISO(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tempo Estimado (HH:mm)</Label>
                <Input 
                  type="time" 
                  value={formData.estimatedDuration} 
                  onChange={(e) => handleChange('estimatedDuration', e.target.value)}
                />
              </div>
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg font-bold"
              onClick={() => setFormData(prev => ({ ...prev, isStarted: true }))}
            >
              <Play className="w-5 h-5 mr-2" />
              Iniciar Monitoramento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-blue-600" />
                Controle em Tempo Real
              </div>
              {formData.status === 'completed' && (
                <Badge className="bg-green-600">Finalizado</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                <p className="text-sm text-slate-500 font-medium mb-1">Tempo Decorrido</p>
                <p className="text-4xl font-mono font-bold text-blue-700">{timeMetrics.elapsed}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                <p className="text-sm text-slate-500 font-medium mb-1">Tempo Restante</p>
                <p className="text-4xl font-mono font-bold text-orange-600">{timeMetrics.remaining}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button 
                variant={formData.isPaused ? "default" : "outline"}
                className={formData.isPaused ? "bg-green-600 hover:bg-green-700" : "border-blue-200 text-blue-700"}
                onClick={togglePause}
                disabled={formData.status === 'completed'}
              >
                {formData.isPaused ? (
                  <><Play className="w-4 h-4 mr-2" /> Continuar</>
                ) : (
                  <><Pause className="w-4 h-4 mr-2" /> Pausar</>
                )}
              </Button>

              <Button 
                variant="destructive"
                onClick={finalizeMeasurement}
                disabled={formData.status === 'completed'}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Finalizar Medição
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados da Empresa e Trabalhador</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company">Cliente / Empresa *</Label>
            <select 
              id="company" 
              className="w-full h-10 border rounded-md px-3 bg-white"
              value={formData.companyId} 
              onChange={e => handleCompanyChange(e.target.value)}
            >
              <option value="">Selecione um cliente</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="worker">Trabalhador *</Label>
            <Input id="worker" value={formData.workerName || ''} onChange={e => handleChange('workerName', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sector">Setor</Label>
            <Input id="sector" value={formData.sector || ''} onChange={e => handleChange('sector', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Cargo</Label>
            <Input id="role" value={formData.role || ''} onChange={e => handleChange('role', e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="techResp">Responsável Técnico *</Label>
            <select 
              id="techResp" 
              className="w-full h-10 border rounded-md px-3 bg-white"
              value={formData.responsibleId} 
              onChange={e => handleResponsibleChange(e.target.value)}
            >
              <option value="">Selecione um responsável</option>
              {responsibles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados da Amostragem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="local">Local</Label>
              <Input id="local" value={formData.local || ''} onChange={e => handleChange('local', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportNumber">Nº do Relatório</Label>
              <Input id="reportNumber" value={formData.reportNumber || ''} onChange={e => handleChange('reportNumber', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tempos e Pausas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Início da Avaliação</Label>
              <Input 
                type="datetime-local" 
                value={formatForDateTimeLocal(formData.startTime || '')} 
                onChange={(e) => handleChange('startTime', parseDateTimeLocalToBrasiliaISO(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Fim da Avaliação</Label>
              <Input 
                type="datetime-local" 
                value={formatForDateTimeLocal(formData.endTime || '')} 
                onChange={(e) => handleChange('endTime', parseDateTimeLocalToBrasiliaISO(e.target.value))}
              />
            </div>
          </div>

          {formData.pauses && formData.pauses.length > 0 && (
            <div className="space-y-3 mt-4">
              <Label className="text-sm font-bold text-slate-700">Registro de Pausas</Label>
              <div className="space-y-2">
                {formData.pauses.map((pause, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="space-y-1">
                      <Label className="text-xs">Início da Pausa</Label>
                      <Input 
                        type="datetime-local" 
                        className="h-8 text-xs"
                        value={formatForDateTimeLocal(pause.start)} 
                        onChange={(e) => handlePauseTimeChange(index, 'start', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fim da Pausa</Label>
                      <Input 
                        type="datetime-local" 
                        className="h-8 text-xs"
                        value={pause.end ? formatForDateTimeLocal(pause.end) : ''} 
                        onChange={(e) => handlePauseTimeChange(index, 'end', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center">
                <span className="text-sm font-medium text-blue-800">Duração Total de Pausas:</span>
                <span className="font-mono font-bold text-blue-900">
                  {formatDuration(calculateTotalPauseSeconds(formData.pauses || []))}
                </span>
              </div>
            </div>
          )}

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center">
            <span className="text-sm font-medium text-blue-800">Tempo Total de Amostragem Efetiva:</span>
            <span className="text-xl font-bold text-blue-700 font-mono">{formData.samplingTime}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Equipamento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="equipSelect">Selecionar Equipamento *</Label>
            <select 
              id="equipSelect" 
              className="w-full h-10 border rounded-md px-3 bg-white"
              value={formData.equipmentId} 
              onChange={e => handleEquipmentChange(e.target.value)}
            >
              <option value="">Selecione um equipamento</option>
              {equipments.filter(e => e.type === 'noise').map(e => (
                <option key={e.id} value={e.id}>{e.brand} {e.model} (S/N: {e.serialNumber})</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="equipModel">Marca/Modelo</Label>
            <Input id="equipModel" value={formData.equipmentModel} readOnly className="bg-slate-50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="equipNum">Nº de Série / ID</Label>
            <Input id="equipNum" value={formData.equipmentNumber} readOnly className="bg-slate-50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados da Dosimetria</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="samplingTime">Tempo Amostragem (Auto)</Label>
            <Input id="samplingTime" value={formData.dosimetryReport?.samplingTime || ''} readOnly className="bg-slate-50 font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="measuredDose">Dose Medida</Label>
            <Input id="measuredDose" value={formData.dosimetryReport?.measuredDose || ''} onChange={e => handleDosimetryChange('measuredDose', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lavg">Lavg</Label>
            <Input id="lavg" value={formData.dosimetryReport?.lavg || ''} onChange={e => handleDosimetryChange('lavg', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calInit">Calibração Inicial</Label>
            <Input id="calInit" value={formData.dosimetryReport?.calibrationInitial || ''} onChange={e => handleDosimetryChange('calibrationInitial', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calFinal">Calibração Final</Label>
            <Input id="calFinal" value={formData.dosimetryReport?.calibrationFinal || ''} onChange={e => handleDosimetryChange('calibrationFinal', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nen">NEN</Label>
            <Input id="nen" value={formData.dosimetryReport?.nen || ''} onChange={e => handleDosimetryChange('nen', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Adicionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activities">Atividades realizadas</Label>
            <Textarea id="activities" value={formData.activities || ''} onChange={e => handleChange('activities', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sources">Fontes Geradoras</Label>
            <Input id="sources" value={formData.generatingSources || ''} onChange={e => handleChange('generatingSources', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assinatura do Trabalhador *</CardTitle>
        </CardHeader>
        <CardContent>
          <SignaturePad 
            onSave={(sig) => {
              handleChange('signature', sig);
            }} 
            initialValue={formData.signature}
          />
        </CardContent>
      </Card>

      {/* A4 Preview Section */}
      {(formData.isStarted || formData.status === 'completed') && (
        <ReportPreview data={formData as NoiseAssessment} type="noise" />
      )}

      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        {formData.status !== 'completed' ? (
          <>
            <Button 
              variant="outline" 
              className="flex-1 h-12"
              onClick={() => handleSave('open')}
              disabled={isSubmitting}
            >
              <Save className="w-5 h-5 mr-2" />
              {isSubmitting ? 'Salvando...' : 'Salvar Rascunho'}
            </Button>
            <Button 
              variant="default" 
              className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-lg"
              onClick={() => handleSave('completed')}
              disabled={isSubmitting}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              {isSubmitting ? 'Finalizando...' : 'Finalizar Avaliação'}
            </Button>
          </>
        ) : (
          <>
            <Button 
              variant="default" 
              className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-lg"
              onClick={() => handleSave('completed')}
              disabled={isSubmitting}
            >
              <Save className="w-5 h-5 mr-2" />
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 h-12"
              onClick={handleDownload}
              disabled={isSubmitting}
            >
              <Download className="w-5 h-5 mr-2" />
              Baixar PDF
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
