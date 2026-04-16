import React, { useEffect, useRef, useState } from 'react';
import { ChemicalAssessment, NoiseAssessment } from '../types';
import { Button } from '@/components/ui/button';
import { Share2, Download } from 'lucide-react';
import { shareChemicalPDF, generateChemicalPDF, shareNoisePDF, generateNoisePDF } from '../lib/pdfGenerator';

interface ReportPreviewProps {
  data: ChemicalAssessment | NoiseAssessment;
  type: 'chemical' | 'noise';
}

export function ReportPreview({ data, type }: ReportPreviewProps) {
  const [previewScale, setPreviewScale] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.offsetWidth - 32; // padding
        const a4WidthPx = 210 * 3.7795275591; // 210mm to pixels at 96dpi
        const newScale = Math.min(1, containerWidth / a4WidthPx);
        setPreviewScale(newScale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const handleShare = () => {
    if (type === 'chemical') {
      shareChemicalPDF(data as ChemicalAssessment);
    } else {
      shareNoisePDF(data as NoiseAssessment);
    }
  };

  const handleDownload = () => {
    if (type === 'chemical') {
      generateChemicalPDF(data as ChemicalAssessment);
    } else {
      generateNoisePDF(data as NoiseAssessment);
    }
  };

  const isChemical = (d: any): d is ChemicalAssessment => type === 'chemical';
  const isNoise = (d: any): d is NoiseAssessment => type === 'noise';

  return (
    <div className="mt-12 space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-bold text-slate-700">Pré-visualização do Relatório (A4)</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShare}
            className="flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Compartilhar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownload}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Baixar PDF
          </Button>
        </div>
      </div>
      <div 
        ref={previewContainerRef}
        className="bg-slate-200 p-4 sm:p-8 rounded-xl overflow-hidden flex justify-center min-h-[400px]"
      >
        <div 
          id="a4-preview"
          className="bg-white shadow-2xl origin-top transition-transform"
          style={{ 
            width: '210mm', 
            minHeight: '297mm', 
            padding: '15mm',
            fontSize: '12px',
            transform: `scale(${previewScale})`,
            marginBottom: `-${(1 - previewScale) * 100}%`
          }}
        >
          <div className="border-2 border-black p-4 h-full flex flex-col text-black font-sans">
            <h2 className="text-center border-b-2 border-black pb-2 mb-4 font-bold text-lg uppercase">
              {type === 'chemical' ? 'Monitoramento de Exposição a Agentes Químicos' : 'Monitoramento de Exposição ao Ruído'}
            </h2>
            
            <div className="grid grid-cols-1 gap-1 mb-4">
              <div className="border-b border-black py-1"><strong>Empresa:</strong> {data.companyName}</div>
              <div className="border-b border-black py-1"><strong>Trabalhador:</strong> {data.workerName}</div>
              <div className="border-b border-black py-1"><strong>Setor:</strong> {data.sector}</div>
              <div className="border-b border-black py-1"><strong>Cargo:</strong> {data.role}</div>
            </div>

            <h3 className="text-center bg-slate-100 py-1 font-bold mb-2 border border-black uppercase">DADOS DA AMOSTRAGEM</h3>
            
            {isChemical(data) ? (
              <>
                <div className="grid grid-cols-3 border border-black mb-4">
                  <div className="border-r border-black p-1"><strong>Local:</strong> {data.local}</div>
                  <div className="border-r border-black p-1"><strong>Data:</strong> {data.startTime?.split('T')[0]}</div>
                  <div className="p-1"><strong>Relatório:</strong> {data.reportNumber}</div>
                </div>
                <div className="mb-4">
                  <strong>Agentes:</strong> {data.agents?.join(', ')} {data.otherAgents && `(${data.otherAgents})`}
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 border border-black mb-4">
                  <div className="border-r border-black p-1"><strong>Equipamento:</strong> {data.equipmentModel}</div>
                  <div className="p-1"><strong>S/N:</strong> {data.equipmentNumber}</div>
                </div>
                <div className="grid grid-cols-3 border border-black mb-4">
                  <div className="border-r border-black p-1"><strong>Início:</strong> {data.startTime?.split('T')[1].slice(0, 5)}</div>
                  <div className="border-r border-black p-1"><strong>Fim:</strong> {data.endTime?.split('T')[1]?.slice(0, 5) || '--:--'}</div>
                  <div className="p-1"><strong>Data:</strong> {data.startTime?.split('T')[0]}</div>
                </div>
              </>
            )}

            {data.pauses && data.pauses.length > 0 && (
              <div className="mb-4 border border-slate-300 p-2 text-xs italic">
                <strong>Pausas:</strong>
                <ul className="list-disc pl-4">
                  {data.pauses.map((p, i) => (
                    <li key={i}>
                      {p.start.split('T')[1].slice(0, 5)} às {p.end ? p.end.split('T')[1].slice(0, 5) : '...'}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isChemical(data) && (
              <>
                <h3 className="text-center bg-slate-100 py-1 font-bold mb-2 border border-black uppercase">EQUIPAMENTO</h3>
                <div className="grid grid-cols-2 border border-black mb-4">
                  <div className="border-r border-black p-1"><strong>Modelo:</strong> {data.equipmentModel}</div>
                  <div className="p-1"><strong>S/N:</strong> {data.equipmentNumber}</div>
                </div>

                <h3 className="text-center bg-slate-100 py-1 font-bold mb-2 border border-black uppercase">HORÁRIO E VAZÃO</h3>
                <div className="grid grid-cols-3 border border-black mb-4">
                  <div className="border-r border-black p-1"><strong>Início:</strong> {data.startTime?.split('T')[1].slice(0, 5)}</div>
                  <div className="border-r border-black p-1"><strong>Fim:</strong> {data.endTime?.split('T')[1]?.slice(0, 5) || '--:--'}</div>
                  <div className="p-1"><strong>Vazão:</strong> {data.flowInitial} l/min</div>
                </div>
              </>
            )}

            {isNoise(data) && (
              <>
                <h3 className="text-center bg-slate-100 py-1 font-bold mb-2 border border-black uppercase">DADOS DA DOSIMETRIA</h3>
                <div className="grid grid-cols-3 border border-black mb-4">
                  <div className="border-r border-black border-b border-black p-1"><strong>Tempo:</strong> {data.dosimetryReport?.samplingTime}</div>
                  <div className="border-r border-black border-b border-black p-1"><strong>Dose:</strong> {data.dosimetryReport?.measuredDose}</div>
                  <div className="border-b border-black p-1"><strong>Lavg:</strong> {data.dosimetryReport?.lavg}</div>
                  <div className="border-r border-black p-1"><strong>Calib. Inic:</strong> {data.dosimetryReport?.calibrationInitial}</div>
                  <div className="border-r border-black p-1"><strong>Calib. Final:</strong> {data.dosimetryReport?.calibrationFinal}</div>
                  <div className="p-1"><strong>NEN:</strong> {data.dosimetryReport?.nen}</div>
                </div>
              </>
            )}

            <div className="flex-grow">
              <div className="mb-4">
                <strong>Atividades:</strong>
                <p className="mt-1 whitespace-pre-wrap">{data.activities}</p>
              </div>
              {isNoise(data) && (
                <div className="mb-4">
                  <strong>Fontes Geradoras:</strong>
                  <p className="mt-1 whitespace-pre-wrap">{data.generatingSources}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-8 mt-8">
              <div className="text-center border-t border-black pt-2 flex flex-col items-center relative">
                {data.responsibleSignature && (
                  <img src={data.responsibleSignature} alt="Assinatura Responsável" className="max-h-16 absolute bottom-full mb-1" />
                )}
                <p className="font-bold">{data.responsibleName}</p>
                <p className="text-xs">Responsável Técnico</p>
              </div>
              <div className="text-center border-t border-black pt-2 flex flex-col items-center relative">
                {data.signature && (
                  <img src={data.signature} alt="Assinatura" className="max-h-16 absolute bottom-full mb-1" />
                )}
                {!data.signature && (
                  <div className="h-16 flex items-center justify-center text-slate-300 italic text-xs">Aguardando assinatura</div>
                )}
                <p className="text-xs">Assinatura do Trabalhador</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-slate-500 italic">
        * A pré-visualização acima é uma representação do documento A4 final.
      </p>
    </div>
  );
}
