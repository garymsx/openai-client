import { OacEnv } from "./OacEnv";

export enum OacCommand {
    Clear = "clear",
    Save = "save",
    Prompt = "prompt",
    Image = "image",
    Chat = "chat",
    Finetuning = "finetuning",
    Models = "models",
    Files = "files",
}

export class OacOption {
    command: OacCommand | undefined;
    model: string = "gpt-3.5-turbo";
    temperature: number = 0.3;
    debug:boolean = false;
    silent:boolean = false;
    message:string | undefined;
    savePath:string | undefined;
    prompt:string | undefined;
    params:string[] = [];
    resultPath:string | undefined;
    input:string | undefined;
    output:string | undefined;
    fid:string | undefined;
    jid:string | undefined;
    delete:boolean = false;
    cancel:boolean = false;
    quality:'standard' | 'hd' = "standard";
    n = 1;
    size:'256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792' | null = "1024x1024";

    constructor() {
        const env = new OacEnv();
        // modelとtemperatureは環境変数からデフォルトを取得
        this.model = env.openaiModel;
        this.temperature = env.chatTemperature
        this.resultPath = env.resultPath

    }
}


