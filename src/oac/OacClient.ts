import OpenAI from "openai";
import * as Fs from "fs";
import { OacMessage, OacRole } from "./OacMessage";
import { OacOption } from "./OacOption";
import { OacEnv } from "./OacEnv";
import * as Yaml from "js-yaml";

export class OacClient {
    env: OacEnv = new OacEnv();

    async chat(option:OacOption) {
        if(!option.silent) {
            console.log("@you:");
            console.log("    " + option.message);
        }

        // 履歴を取得
        const history = this.loadHistory();

        // APIに渡すmessagesを作成
        const createMessage = (): any[] => {
            const messages: any[] = [];

            // system roleを追加
            if(this.env.chatSystemRole) {
                messages.push({
                    role: OacRole.System,
                    content: this.env.chatSystemRole
                });
            }

            // 最新履歴からchatHistory分取得
            let startHistory = history.length - this.env.chatHistory * 2;  // 質問、応答で1セットのため2倍
            if(startHistory < 0 ) startHistory = 0;
            for(let i = startHistory; i < history.length; i++) {
                const message = history[i];
                // 履歴をmessagesに追加
                messages.push({
                    role: message.role,
                    content: message.content
                });
            }

            // ユーザーの発言を追加
            messages.push({
                role: OacRole.User,
                content: option.message
            });

            return messages;
        }

        let model = option.model;
        let temperature = this.env.chatTemperature;

        const openai = new OpenAI({
            apiKey: this.env.openaiApiKey,
        });

        const response = await openai.chat.completions.create({
            model: model!,
            messages: createMessage(),
            temperature: temperature,
            stream: true,
        }); 

        if(!option.silent) {
            console.log("@oac:");
        }
        let result:string[] = [];
        let dispResult:string[] = []; // 表示用
        if(!option.silent) {
            dispResult.push("    ");
            process.stdout.write("    ");
        }
        for await (const part of response) {
            const buffer = part.choices[0]?.delta?.content || '';

            // bufferから１文字ずつ取り出してfor ofで処理する
            for (const ch of buffer) {
                // debug時は標準出力に出力しない(VSCodeのdebugで出力できない)
                if(!option.debug && !option.silent) process.stdout.write(ch);
                result.push(ch);
                dispResult.push(ch);
                if(ch === "\n") {
                    if(!option.silent) {
                        dispResult.push("    ");
                    }
                    process.stdout.write("    ");
                }
            }
        }

        // デバッグ用に標準出力に出力
        if(option.debug || option.silent) {
            console.log(dispResult.join(""));
        }
        else {
            process.stdout.write("\n");
        }

        // TODO: 消費したトークン数を表示する

        // ユーザーの発言を保存
        history.push({
            role: OacRole.User,
            content: option.message!
        });

        // 応答を保存
        history.push({
            role: OacRole.Assistant,
            content: result.join("")
        });

        // デバッグ時は履歴を保存しない
        if(!option.debug) {
            this.saveHistory(history);
        }

        return result;
    }

    async clear(option:OacOption) {
        this.saveHistory([]);
    }

    async save(option:OacOption) {
        const history = this.loadHistory();
        this.saveHistory(history, option.savePath!);
    }

    private loadHistory(): OacMessage[] {
        if(!Fs.existsSync(this.env.chatHistoryFile)) {
            return [];
        }
        const yaml = Fs.readFileSync(this.env.chatHistoryFile, "utf8");
        const messages = Yaml.load(yaml) as OacMessage[];
        if(!messages) return [];

        return messages;
    }

    private saveHistory(messages: OacMessage[], path?: string) {
        const yaml = Yaml.dump(messages);
        if(!path) {
            path = this.env.chatHistoryFile;
        }
        Fs.writeFileSync(path, yaml);
    }
}