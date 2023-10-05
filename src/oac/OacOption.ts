export enum OacCommand {
    Clear = "clear",
    Save = "save",
    Template = "tm",
    Chat = "chat",
    Finetuning = "ft",
}

export class OacOption {
    command: OacCommand | undefined;
    model: string = "gpt-3.5-turbo";
    temperature: number = 0.3;
    debug:boolean = false;
    silent:boolean = false;
    message:string | undefined;
    savePath:string | undefined;
}


