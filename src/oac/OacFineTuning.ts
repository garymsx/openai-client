import { OacMessage } from "./OacMessage";

export type OacFineTuningMessage = {
    system?: string;
    contents: string[];
};

export type OacFineTuning = {
    messages: OacFineTuningMessage;
};
  
export type OacFineTuningData = {
    model: string;
    system: string;
    fileTuning: OacFineTuning[];
};
