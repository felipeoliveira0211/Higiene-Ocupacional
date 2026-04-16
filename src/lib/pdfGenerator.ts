import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ChemicalAssessment, NoiseAssessment } from '../types';

/**
 * Common function to render HTML content for PDF generation
 */
async function renderToPDF(htmlContent: string, filename: string) {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: 794, // 210mm at 96dpi
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    return { pdf, blob: pdf.output('blob'), filename };
  } finally {
    document.body.removeChild(container);
  }
}

function getChemicalHTML(data: ChemicalAssessment) {
  return `
    <div style="width: 210mm; padding: 15mm; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #000;">
      <div style="border: 2px solid #000; padding: 20px; min-height: 260mm; display: flex; flex-direction: column;">
        <h2 style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; font-size: 18px; text-transform: uppercase;">
          Monitoramento de Exposição a Agentes Químicos
        </h2>
        
        <div style="margin-bottom: 20px;">
          <div style="border-bottom: 1px solid #000; padding: 5px 0;"><strong>Empresa:</strong> ${data.companyName || ''}</div>
          <div style="border-bottom: 1px solid #000; padding: 5px 0;"><strong>Trabalhador:</strong> ${data.workerName || ''}</div>
          <div style="border-bottom: 1px solid #000; padding: 5px 0;"><strong>Setor:</strong> ${data.sector || ''}</div>
          <div style="border-bottom: 1px solid #000; padding: 5px 0;"><strong>Cargo:</strong> ${data.role || ''}</div>
        </div>

        <h3 style="text-align: center; background: #f0f0f0; padding: 5px; font-size: 14px; border: 1px solid #000; margin-bottom: 10px;">DADOS DA AMOSTRAGEM</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid #000; margin-bottom: 20px;">
          <div style="border-right: 1px solid #000; padding: 5px;"><strong>Local:</strong> ${data.local || ''}</div>
          <div style="border-right: 1px solid #000; padding: 5px;"><strong>Data:</strong> ${data.startTime?.split('T')[0] || ''}</div>
          <div style="padding: 5px;"><strong>Relatório:</strong> ${data.reportNumber || ''}</div>
        </div>

        <div style="margin-bottom: 20px;">
          <strong>Agentes:</strong> ${(data.agents || []).join(', ')} ${data.otherAgents ? `(${data.otherAgents})` : ''}
        </div>

        ${data.pauses && data.pauses.length > 0 ? `
          <div style="margin-bottom: 20px; border: 1px solid #ccc; padding: 10px; font-size: 11px; font-style: italic;">
            <strong>Pausas Registradas:</strong>
            <ul style="margin: 5px 0; padding-left: 20px;">
              ${data.pauses.map(p => `<li>${p.start.split('T')[1].slice(0, 5)} às ${p.end ? p.end.split('T')[1].slice(0, 5) : '...'}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <h3 style="text-align: center; background: #f0f0f0; padding: 5px; font-size: 14px; border: 1px solid #000; margin-bottom: 10px;">EQUIPAMENTO</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #000; margin-bottom: 20px;">
          <div style="border-right: 1px solid #000; padding: 5px;"><strong>Modelo:</strong> ${data.equipmentModel || ''}</div>
          <div style="padding: 5px;"><strong>S/N:</strong> ${data.equipmentNumber || ''}</div>
        </div>

        <h3 style="text-align: center; background: #f0f0f0; padding: 5px; font-size: 14px; border: 1px solid #000; margin-bottom: 10px;">HORÁRIO E VAZÃO</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid #000; margin-bottom: 20px;">
          <div style="border-right: 1px solid #000; padding: 5px;"><strong>Início:</strong> ${data.startTime?.split('T')[1]?.slice(0, 5) || ''}</div>
          <div style="border-right: 1px solid #000; padding: 5px;"><strong>Fim:</strong> ${data.endTime?.split('T')[1]?.slice(0, 5) || '--:--'}</div>
          <div style="padding: 5px;"><strong>Vazão:</strong> ${data.flowInitial || ''} l/min</div>
        </div>

        <div style="flex-grow: 1;">
          <div style="margin-bottom: 20px;">
            <strong>Atividades realizadas:</strong>
            <p style="margin-top: 5px; white-space: pre-wrap;">${data.activities || ''}</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px;">
          <div style="text-align: center; border-top: 1px solid #000; padding-top: 10px; position: relative;">
            ${data.responsibleSignature ? `<img src="${data.responsibleSignature}" style="max-height: 60px; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 5px;" />` : ''}
            <div style="font-weight: bold;">${data.responsibleName || ''}</div>
            <div style="font-size: 10px;">Responsável Técnico</div>
          </div>
          <div style="text-align: center; border-top: 1px solid #000; padding-top: 10px; position: relative;">
            ${data.signature ? `<img src="${data.signature}" style="max-height: 60px; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 5px;" />` : ''}
            <div style="font-size: 10px;">Assinatura do Trabalhador</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getNoiseHTML(data: NoiseAssessment) {
  return `
    <div style="width: 210mm; padding: 15mm; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #000;">
      <div style="border: 2px solid #000; padding: 20px; min-height: 260mm; display: flex; flex-direction: column;">
        <h2 style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; font-size: 18px; text-transform: uppercase;">
          Monitoramento de Exposição ao Ruído
        </h2>
        
        <div style="margin-bottom: 20px;">
          <div style="border-bottom: 1px solid #000; padding: 5px 0;"><strong>Empresa:</strong> ${data.companyName || ''}</div>
          <div style="border-bottom: 1px solid #000; padding: 5px 0;"><strong>Trabalhador:</strong> ${data.workerName || ''}</div>
          <div style="border-bottom: 1px solid #000; padding: 5px 0;"><strong>Setor:</strong> ${data.sector || ''}</div>
          <div style="border-bottom: 1px solid #000; padding: 5px 0;"><strong>Cargo:</strong> ${data.role || ''}</div>
        </div>

        <h3 style="text-align: center; background: #f0f0f0; padding: 5px; font-size: 14px; border: 1px solid #000; margin-bottom: 10px;">DADOS DA AMOSTRAGEM</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #000; margin-bottom: 10px;">
          <div style="border-right: 1px solid #000; padding: 5px;"><strong>Equipamento:</strong> ${data.equipmentModel || ''}</div>
          <div style="padding: 5px;"><strong>S/N:</strong> ${data.equipmentNumber || ''}</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid #000; border-top: none; margin-bottom: 20px;">
          <div style="border-right: 1px solid #000; padding: 5px;"><strong>Início:</strong> ${data.startTime?.split('T')[1]?.slice(0, 5) || ''}</div>
          <div style="border-right: 1px solid #000; padding: 5px;"><strong>Fim:</strong> ${data.endTime?.split('T')[1]?.slice(0, 5) || '--:--'}</div>
          <div style="padding: 5px;"><strong>Data:</strong> ${data.startTime?.split('T')[0] || ''}</div>
        </div>

        ${data.pauses && data.pauses.length > 0 ? `
          <div style="margin-bottom: 20px; border: 1px solid #ccc; padding: 10px; font-size: 11px; font-style: italic;">
            <strong>Pausas Registradas:</strong>
            <ul style="margin: 5px 0; padding-left: 20px;">
              ${data.pauses.map(p => `<li>${p.start.split('T')[1].slice(0, 5)} às ${p.end ? p.end.split('T')[1].slice(0, 5) : '...'}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <h3 style="text-align: center; background: #f0f0f0; padding: 5px; font-size: 14px; border: 1px solid #000; margin-bottom: 10px;">DADOS DA DOSIMETRIA</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid #000; margin-bottom: 20px;">
          <div style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 5px;"><strong>Tempo:</strong> ${data.dosimetryReport?.samplingTime || ''}</div>
          <div style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 5px;"><strong>Dose:</strong> ${data.dosimetryReport?.measuredDose || ''}</div>
          <div style="border-bottom: 1px solid #000; padding: 5px;"><strong>Lavg:</strong> ${data.dosimetryReport?.lavg || ''}</div>
          <div style="border-right: 1px solid #000; padding: 5px;"><strong>Calib. Inic:</strong> ${data.dosimetryReport?.calibrationInitial || ''}</div>
          <div style="border-right: 1px solid #000; padding: 5px;"><strong>Calib. Final:</strong> ${data.dosimetryReport?.calibrationFinal || ''}</div>
          <div style="padding: 5px;"><strong>NEN:</strong> ${data.dosimetryReport?.nen || ''}</div>
        </div>

        <div style="flex-grow: 1;">
          <div style="margin-bottom: 20px;">
            <strong>Atividades realizadas:</strong>
            <p style="margin-top: 5px; white-space: pre-wrap;">${data.activities || ''}</p>
          </div>
          <div style="margin-bottom: 20px;">
            <strong>Fontes Geradoras:</strong>
            <p style="margin-top: 5px; white-space: pre-wrap;">${data.generatingSources || ''}</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px;">
          <div style="text-align: center; border-top: 1px solid #000; padding-top: 10px; position: relative;">
            ${data.responsibleSignature ? `<img src="${data.responsibleSignature}" style="max-height: 60px; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 5px;" />` : ''}
            <div style="font-weight: bold;">${data.responsibleName || ''}</div>
            <div style="font-size: 10px;">Responsável Técnico</div>
          </div>
          <div style="text-align: center; border-top: 1px solid #000; padding-top: 10px; position: relative;">
            ${data.signature ? `<img src="${data.signature}" style="max-height: 60px; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 5px;" />` : ''}
            <div style="font-size: 10px;">Assinatura do Trabalhador</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function generateChemicalPDF(data: ChemicalAssessment) {
  const filename = `relatorio_quimico_${data.workerName.replace(/\s+/g, '_').toLowerCase()}_${new Date().getTime()}.pdf`;
  const { pdf } = await renderToPDF(getChemicalHTML(data), filename);
  pdf.save(filename);
}

export async function shareChemicalPDF(data: ChemicalAssessment) {
  const filename = `relatorio_quimico_${data.workerName.replace(/\s+/g, '_').toLowerCase()}.pdf`;
  const { blob } = await renderToPDF(getChemicalHTML(data), filename);
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Relatório de Avaliação Química',
        text: `Segue em anexo o relatório de avaliação química de ${data.workerName}.`
      });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Erro ao compartilhar:', error);
        // Fallback to download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  } else {
    // Fallback to download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export async function generateNoisePDF(data: NoiseAssessment) {
  const filename = `relatorio_ruido_${data.workerName.replace(/\s+/g, '_').toLowerCase()}_${new Date().getTime()}.pdf`;
  const { pdf } = await renderToPDF(getNoiseHTML(data), filename);
  pdf.save(filename);
}

export async function shareNoisePDF(data: NoiseAssessment) {
  const filename = `relatorio_ruido_${data.workerName.replace(/\s+/g, '_').toLowerCase()}.pdf`;
  const { blob } = await renderToPDF(getNoiseHTML(data), filename);
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Relatório de Avaliação de Ruído',
        text: `Segue em anexo o relatório de avaliação de ruído de ${data.workerName}.`
      });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Erro ao compartilhar:', error);
        // Fallback to download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  } else {
    // Fallback to download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
