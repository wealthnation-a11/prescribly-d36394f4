import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type Diagnosis = {
  name: string;
  icd10?: string;
  confidence?: number;
};

export const DiagnosisResults = ({
  diagnoses,
  safetyNotes,
  prescriptionId,
  onPrint,
}: {
  diagnoses: Diagnosis[];
  safetyNotes?: string[];
  prescriptionId?: string | null;
  onPrint?: () => void;
}) => {
  if (!diagnoses?.length) return null;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Diagnoses</h3>
        <div className="mt-2 space-y-2">
          {diagnoses.map((d, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{d.name}</div>
                {d.icd10 && (
                  <div className="text-xs text-muted-foreground">ICD-10: {d.icd10}</div>
                )}
              </div>
              {typeof d.confidence === 'number' && (
                <Badge variant="outline">{Math.round(d.confidence * 100)}%</Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {Array.isArray(safetyNotes) && safetyNotes.length > 0 && (
        <div>
          <h3 className="text-sm font-medium">Safety notes</h3>
          <ul className="list-disc list-inside text-xs text-muted-foreground mt-1 space-y-1">
            {safetyNotes.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {prescriptionId && (
        <Button className="w-full" onClick={onPrint}>View/Print Prescription</Button>
      )}
    </div>
  );
};
