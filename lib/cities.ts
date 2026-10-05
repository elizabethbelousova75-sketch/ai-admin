export type City = {
  label: string;
  aliases?: string[];
  pipelineId?: number;
  statusId?: number;
};

export const CITIES: City[] = [];