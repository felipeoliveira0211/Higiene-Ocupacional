export type AssessmentType = 'chemical' | 'noise';

export interface BaseAssessment {
  id: string;
  type: AssessmentType;
  status: 'open' | 'completed';
  createdAt: number;
  startTime: string;
  endTime?: string;
  estimatedDuration: string; // HH:mm
  workerName: string;
  companyId: string;
  companyName: string;
  sector: string;
  role: string;
  equipmentId: string;
  equipmentNumber: string;
  equipmentModel: string;
  responsibleId: string;
  responsibleName: string;
  local: string;
  reportNumber: string;
  durationMinutes?: number;
  signature?: string; // Worker signature (Base64)
  responsibleSignature?: string; // Responsible signature (Base64)
  userId?: string;
  pauses: { start: string; end?: string }[];
  isPaused: boolean;
  isStarted: boolean;
}

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
}

export interface Equipment {
  id: string;
  brand: string;
  model: string;
  serialNumber: string;
  type: AssessmentType;
}

export interface Responsible {
  id: string;
  name: string;
  document?: string;
  signature?: string;
}

export interface ChemicalAssessment extends BaseAssessment {
  type: 'chemical';
  samplerCode: string;
  ges: string;
  agents: string[];
  otherAgents?: string;
  flowInitial: string;
  flowFinal: string;
  flowAverage: string;
  flowVariation: string;
  samplingTime: string;
  volume: string;
  activities: string;
  generatingSources: string;
  environmentObservations: string;
  environmentType: 'open' | 'closed';
  humidity: string;
  temperature: string;
  weatherConditions: string;
  technicalResponsible: string;
  fieldMonitoring: string;
}

export interface NoiseAssessment extends BaseAssessment {
  type: 'noise';
  workday: string;
  breakInterval: string;
  dosimetryReport: {
    samplingTime: string;
    measuredDose: string;
    calibrationInitial: string;
    calibrationFinal: string;
    lavg: string;
    dose8h: string;
    nen: string;
  };
  activities: string;
  generatingSources: string;
  environmentObservations: string;
  technicalResponsible: string;
  fieldMonitoring: string;
}

export type Assessment = ChemicalAssessment | NoiseAssessment;
