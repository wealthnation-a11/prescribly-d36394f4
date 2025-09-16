import jsPDF from 'jspdf';

interface DiagnosisData {
  symptoms: string[];
  diagnoses: Array<{
    condition_name: string;
    probability: number;
    explanation: string;
    severity: string;
    confidence: string;
  }>;
  emergency?: boolean;
  alert_message?: string;
}

interface DrugRecommendation {
  drug_name: string;
  strength?: string;
  form?: string;
  dosage?: string;
  notes?: string;
}

export const generateDiagnosisPDF = async (
  diagnosisData: DiagnosisData,
  drugRecommendations: DrugRecommendation[],
  patientName?: string
): Promise<Blob> => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Add logo
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      logoImg.onload = resolve;
      logoImg.onerror = reject;
      logoImg.src = '/lovable-uploads/f0e7a9d5-ed9f-4f1e-9b54-765017780d65.png';
    });
    
    const logoWidth = 40;
    const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
    pdf.addImage(logoImg, 'PNG', pageWidth - logoWidth - 20, 10, logoWidth, logoHeight);
  } catch (error) {
    console.warn('Could not load logo for PDF:', error);
  }

  // Header
  pdf.setFontSize(24);
  pdf.setTextColor(59, 130, 246); // Primary color
  pdf.text('Medical Diagnosis Report', 20, yPosition);
  yPosition += 15;

  // Patient info
  if (patientName) {
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Patient: ${patientName}`, 20, yPosition);
    yPosition += 10;
  }

  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPosition);
  yPosition += 15;

  // Emergency alert
  if (diagnosisData.emergency && diagnosisData.alert_message) {
    pdf.setFillColor(239, 68, 68); // Red background
    pdf.rect(20, yPosition - 5, pageWidth - 40, 15, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.text('EMERGENCY ALERT:', 25, yPosition + 3);
    pdf.text(diagnosisData.alert_message, 25, yPosition + 8);
    pdf.setTextColor(0, 0, 0);
    yPosition += 20;
  }

  // Symptoms section
  pdf.setFontSize(16);
  pdf.setTextColor(59, 130, 246);
  pdf.text('Reported Symptoms', 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  const symptomsText = diagnosisData.symptoms.join(', ');
  const symptomsLines = pdf.splitTextToSize(symptomsText, pageWidth - 40);
  pdf.text(symptomsLines, 20, yPosition);
  yPosition += symptomsLines.length * 5 + 10;

  // Diagnosis section
  pdf.setFontSize(16);
  pdf.setTextColor(59, 130, 246);
  pdf.text('Diagnosis Results', 20, yPosition);
  yPosition += 10;

  // Top diagnosis
  if (diagnosisData.diagnoses && diagnosisData.diagnoses.length > 0) {
    const topDiagnosis = diagnosisData.diagnoses[0];
    
    pdf.setFontSize(14);
    pdf.setTextColor(34, 197, 94); // Green color
    pdf.text(`Primary Diagnosis: ${topDiagnosis.condition_name}`, 20, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Confidence: ${Math.round(topDiagnosis.probability * 100)}%`, 20, yPosition);
    yPosition += 6;
    pdf.text(`Severity: ${topDiagnosis.severity}`, 20, yPosition);
    yPosition += 6;
    pdf.text(`Clinical Confidence: ${topDiagnosis.confidence}`, 20, yPosition);
    yPosition += 10;

    const explanationLines = pdf.splitTextToSize(topDiagnosis.explanation, pageWidth - 40);
    pdf.text(explanationLines, 20, yPosition);
    yPosition += explanationLines.length * 5 + 10;

    // Other possible conditions
    if (diagnosisData.diagnoses.length > 1) {
      pdf.setFontSize(12);
      pdf.setTextColor(59, 130, 246);
      pdf.text('Other Possible Conditions:', 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      diagnosisData.diagnoses.slice(1).forEach((diagnosis, index) => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(`${index + 2}. ${diagnosis.condition_name} (${Math.round(diagnosis.probability * 100)}%)`, 25, yPosition);
        yPosition += 5;
      });
      yPosition += 10;
    }
  }

  // Drug recommendations
  if (drugRecommendations.length > 0) {
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(16);
    pdf.setTextColor(59, 130, 246);
    pdf.text('Medication Recommendations', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(8);
    pdf.setTextColor(239, 68, 68);
    pdf.text('⚠ Always consult with a healthcare provider before taking any medication', 20, yPosition);
    yPosition += 10;

    pdf.setTextColor(0, 0, 0);
    drugRecommendations.forEach((drug, index) => {
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(12);
      pdf.text(`${index + 1}. ${drug.drug_name}`, 20, yPosition);
      yPosition += 6;

      pdf.setFontSize(9);
      if (drug.strength) {
        pdf.text(`Strength: ${drug.strength}`, 25, yPosition);
        yPosition += 4;
      }
      if (drug.form) {
        pdf.text(`Form: ${drug.form}`, 25, yPosition);
        yPosition += 4;
      }
      if (drug.dosage) {
        pdf.text(`Dosage: ${drug.dosage}`, 25, yPosition);
        yPosition += 4;
      }
      if (drug.notes) {
        const notesLines = pdf.splitTextToSize(`Notes: ${drug.notes}`, pageWidth - 50);
        pdf.text(notesLines, 25, yPosition);
        yPosition += notesLines.length * 4;
      }
      yPosition += 8;
    });
  }

  // Disclaimer
  if (yPosition > pageHeight - 40) {
    pdf.addPage();
    yPosition = 20;
  }

  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  const disclaimer = 'Medical Disclaimer: This AI analysis is for informational purposes only and should not replace professional medical advice. Please consult with a qualified healthcare provider for proper diagnosis and treatment.';
  const disclaimerLines = pdf.splitTextToSize(disclaimer, pageWidth - 40);
  pdf.text(disclaimerLines, 20, yPosition);

  return pdf.output('blob');
};

export const downloadPDF = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const shareOnWhatsApp = async (blob: Blob, filename: string) => {
  try {
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'application/pdf' })] })) {
      // Use Web Share API if available
      const file = new File([blob], filename, { type: 'application/pdf' });
      await navigator.share({
        title: 'Medical Diagnosis Report',
        text: 'Here is my medical diagnosis report from Prescribly',
        files: [file]
      });
    } else {
      // Fallback: open WhatsApp Web with message
      const message = encodeURIComponent('Here is my medical diagnosis report from Prescribly. Please find the PDF attached.');
      const whatsappUrl = `https://wa.me/?text=${message}`;
      window.open(whatsappUrl, '_blank');
      
      // Also trigger download so user can manually attach
      downloadPDF(blob, filename);
    }
  } catch (error) {
    console.error('Error sharing on WhatsApp:', error);
    // Fallback to download
    downloadPDF(blob, filename);
  }
};
