import * as dotenv from "dotenv";
import * as path from "path";

export class OacEnv {
    rootDir:string;

    openaiModel:string;
    openaiApiKey:string;
    chatHistory:number;
    chatHistoryFile:string;
    chatSystemRole:string;
    chatTemperature:number = 0.3;
    resultPath:string;
    tempPath:string;

    constructor() {
        // \を/に置換、最後の/を削除を付けたうえで"/"を付ける
        this.rootDir = path.join(__dirname, "../../")
                    .replace(/\\/g, "/")
                    .replace(/\/$/, "");

        dotenv.config({ path: this.rootDir + "/.env" });

        this.openaiModel = this.getEnvString("OPENAI_MODEL", "gpt-3.5-turbo");
        this.openaiApiKey = this.getEnvString("OPENAI_API_KEY", "");
        this.chatHistory = this.getEnvInt("CHAT_HISTORY", 10);
        this.chatHistoryFile = this.getEnvString("CHAT_HISTORY_FILE", this.rootDir + "/result/history.yaml");
        this.chatSystemRole = this.getEnvString("CHAT_SYSTEM_ROLE", "");
        this.chatTemperature = this.getEnvFloat("CHAT_TEMPERATURE", 0.3);
        this.resultPath = this.getEnvString("RESULT_PATH", "");
        this.tempPath = this.getEnvString("TEMP_PATH", this.rootDir + "/temp");
    }

    private getEnvString(key:string, defaultValue:string): string {
        let value = process.env[key];
        if(value) {
            // 置換
            value = value.replace("${OAC_PATH}", this.rootDir);
            return value;
        }
        else {
            return defaultValue;
        }
    }

    private getEnvInt(key:string, defaultValue:number): number {
        const value = process.env[key];
        if(value) {
            return Number.parseInt(value);
        }
        else {
            return defaultValue;
        }
    }

    private getEnvFloat(key:string, defaultValue:number): number {
        const value = process.env[key];
        if(value) {
            return Number.parseFloat(value);
        }
        else {
            return defaultValue;
        }
    }

}