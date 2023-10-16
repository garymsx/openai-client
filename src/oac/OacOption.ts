import { OacEnv } from "./OacEnv";

export enum OacCommand {
    Clear = "clear",
    Save = "save",
    Prompt = "prompt",
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

    constructor() {
        const env = new OacEnv();
        // modelとtemperatureは環境変数からデフォルトを取得
        this.model = env.openaiModel;
        this.temperature = env.chatTemperature
        this.resultPath = env.resultPath
    }
}


