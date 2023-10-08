import { OacMessage } from "./OacMessage";

export type OacPrompt = {
    temperature: number | undefined,
    model: string | undefined,
    messages: OacMessage[]
};
