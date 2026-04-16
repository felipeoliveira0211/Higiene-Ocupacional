import { Assessment } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Clock, User, HardDrive, ArrowRight, CheckCircle2, AlertCircle, ClipboardList, Trash2 } from 'lucide-react';
import { formatDistance, differenceInMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { getBrasiliaNow } from '../lib/timeUtils';

interface DashboardProps {
  assessments: Assessment[];
  onEdit: (assessment: Assessment) => void;
  onDelete: (id: string) => void;
}

export function Dashboard({ assessments, onEdit, onDelete }: DashboardProps) {
  const openAssessments = assessments.filter(a => a.status === 'open');
  const completedAssessments = assessments.filter(a => a.status === 'completed');

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Avaliações em Andamento
          </h2>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
            {openAssessments.length} Ativas
          </Badge>
        </div>

        {openAssessments.length === 0 ? (
          <Card className="border-dashed border-slate-300 bg-slate-50/50">
            <CardContent className="py-12 flex flex-col items-center justify-center text-slate-500">
              <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
              <p>Nenhuma avaliação ativa no momento.</p>
              <p className="text-sm">Inicie uma nova avaliação para monitorar aqui.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openAssessments.map(assessment => (
              <ActiveAssessmentCard 
                key={assessment.id} 
                assessment={assessment} 
                onClick={() => onEdit(assessment)}
                onDelete={() => onDelete(assessment.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Histórico Recente
          </h2>
        </div>

        <div className="space-y-3">
          {completedAssessments.length === 0 ? (
            <p className="text-slate-500 text-sm italic">Nenhuma avaliação concluída ainda.</p>
          ) : (
            completedAssessments.sort((a, b) => b.createdAt - a.createdAt).map(assessment => (
              <Card key={assessment.id} className="hover:border-blue-300 transition-colors cursor-pointer group" onClick={() => onEdit(assessment)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${assessment.type === 'chemical' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{assessment.workerName || 'Trabalhador não identificado'}</p>
                      <p className="text-xs text-slate-500">
                        {assessment.companyName || (assessment as any).company || 'Cliente não informado'} • {assessment.type === 'chemical' ? 'Química' : 'Ruído'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        {formatDistance(assessment.createdAt, getBrasiliaNow(), { addSuffix: true, locale: ptBR })}
                      </p>
                      <ArrowRight className="w-4 h-4 text-slate-300 ml-auto mt-1" />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity z-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(assessment.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function ActiveAssessmentCard({ assessment, onClick, onDelete }: { assessment: Assessment, onClick: () => void, onDelete: () => void, key?: string }) {
  const [metrics, setMetrics] = useState({ elapsed: '00:00:00', remaining: '00:00:00', progress: 0 });

  useEffect(() => {
    if (!assessment.isStarted) {
      setMetrics({ elapsed: '00:00:00', remaining: '00:00:00' });
      return;
    }

    const updateTimer = () => {
      const start = parseISO(assessment.startTime);
      const now = getBrasiliaNow();
      
      // Calculate total pause time (only completed pauses)
      let totalPauseMs = 0;
      assessment.pauses?.forEach(p => {
        if (p.end) {
          const pStart = parseISO(p.start);
          const pEnd = parseISO(p.end);
          totalPauseMs += pEnd.getTime() - pStart.getTime();
        }
      });

      let effectiveNow = now;
      
      // If measurement is finalized (has endTime), stop at that time
      if (assessment.endTime) {
        effectiveNow = parseISO(assessment.endTime);
      } else if (assessment.isPaused) {
        const lastPause = assessment.pauses[assessment.pauses.length - 1];
        if (lastPause && !lastPause.end) {
          effectiveNow = parseISO(lastPause.start);
        }
      }

      const elapsedMs = effectiveNow.getTime() - start.getTime() - totalPauseMs;
      const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
      
      const estimatedSeconds = assessment.durationMinutes ? assessment.durationMinutes * 60 : 
                               (assessment.estimatedDuration ? (parseInt(assessment.estimatedDuration.split(':')[0]) * 3600 + parseInt(assessment.estimatedDuration.split(':')[1]) * 60) : 0);
      
      const remainingSeconds = Math.max(0, estimatedSeconds - elapsedSeconds);

      const format = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
      };

      const totalSecs = Math.max(1, elapsedSeconds + remainingSeconds);
      const progress = Math.min(100, (elapsedSeconds / totalSecs) * 100);

      setMetrics({
        elapsed: format(elapsedSeconds),
        remaining: format(remainingSeconds),
        progress
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [assessment]);

  const isChemical = assessment.type === 'chemical';
  const themeColor = isChemical ? 'red' : 'green';

  return (
    <Card 
      className={`overflow-hidden border-l-4 border-l-${themeColor}-600 hover:shadow-md transition-shadow cursor-pointer relative group`} 
      onClick={onClick}
    >
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-2 right-2 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity z-50"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg">{assessment.workerName || 'Trabalhador'}</CardTitle>
            <Badge variant="outline" className={`text-[10px] uppercase font-bold ${isChemical ? 'text-red-600 border-red-200 bg-red-50' : 'text-green-600 border-green-200 bg-green-50'}`}>
              {isChemical ? 'Avaliação Química' : 'Avaliação de Ruído'}
            </Badge>
          </div>
          <Badge className={!assessment.isStarted ? "bg-slate-400" : (assessment.isPaused ? "bg-orange-500" : (assessment.endTime ? "bg-slate-600" : `bg-${themeColor}-600`))}>
            {!assessment.isStarted ? "Aguardando Início" : (assessment.isPaused ? "Pausado" : (assessment.endTime ? "Finalizado" : metrics.remaining))}
          </Badge>
        </div>
        <CardDescription>{assessment.companyName || (assessment as any).company || 'Cliente não informado'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-1 mb-2">
          <div className="flex justify-between text-xs font-medium text-slate-500">
            <span>Decorrido: {metrics.elapsed}</span>
            <span>Restante: {metrics.remaining}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`bg-${themeColor}-600 h-full transition-all duration-1000`} 
              style={{ width: `${metrics.progress}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <HardDrive className="w-4 h-4" />
            <span>Equip: {assessment.equipmentNumber}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Clock className="w-4 h-4" />
            <span>Início: {assessment.startTime.split('T')[1].substring(0, 5)}</span>
          </div>
        </div>
        <Button variant="outline" className="w-full mt-2 group">
          Continuar Preenchimento
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
}
