import OpenAI from "openai";
import * as Fs from "fs";
import * as Path from "path";
import { OacMessage, OacRole } from "./OacMessage";
import { OacOption } from "./OacOption";
import { OacEnv } from "./OacEnv";
import * as Yaml from "js-yaml";
import { OacPrompt } from "./OacPrompt";

export class OacClient {
    env: OacEnv = new OacEnv();

    async chat(option:OacOption) {
        if(!option.silent) {
            console.log("you:");
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

        const result = await this.completions(createMessage(), option.model, this.env.chatTemperature, option);

        // TODO: 消費したトークン数を表示する

        // ユーザーの発言を保存
        history.push({
            role: OacRole.User,
            content: option.message!
        });

        // 応答を保存
        history.push({
            role: OacRole.Assistant,
            content: result
        });

        // デバッグ時は履歴を保存しない
        if(!option.debug) {
            this.saveHistory(history);
        }

        return result;
    }

    clear(option:OacOption) {
        this.saveHistory([]);
    }

    save(option:OacOption) {
        const history = this.loadHistory();
        this.saveHistory(history, option.savePath!);
    }

    async prompt(option:OacOption) {
        let result = "";

        // APIを実行すべきか
        let exec = false;

        // output指定がある場合は、APIを呼べるかどうかを判定する
        if(option.input && option.output) {
            const propmtStat = Fs.statSync(option.prompt!);
            const inputStat =  Fs.existsSync(option.input) ? Fs.statSync(option.input) : undefined;
            const outputStat = Fs.existsSync(option.output) ? Fs.statSync(option.output) : undefined;
            if(outputStat && inputStat) {
                // inputがoutputより新しい場合はAPIを実行する
                if(outputStat < inputStat) exec = true;
                // promptが新しい場合はAPIを実行する
                if(outputStat < propmtStat || inputStat < propmtStat) exec = true;
            }
            else if(outputStat) {
                // promptが新しい場合はAPIを実行する
                if(outputStat < propmtStat) exec = true;
            }
            else {
                exec = true;
            }

            if(!exec) {
                // APIを実行する必要なし
                const buffer = await Fs.readFileSync(option.output);
                result = buffer.toString();
            }
        }
        else {
            exec = true;
        }

        if(exec) {
            // API実行
            const messages: any[] = [];
            const prompt = this.loadPrompt(option);
            prompt.messages.forEach(message => {
                messages.push({
                    role: message.role,
                    content: message.content
                });
            });
            result = await this.completions(
                messages,
                prompt.model ? prompt.model : option.model,
                prompt.temperature ? prompt.temperature : option.temperature,
                option
            );

            // resultから@outputコマンドを抽出する
            const regex = /@output:[a-zA-Z0-9\\/._-]+\n*```.*?\n.*?```/gs;
            let match;
            while(match = regex.exec(result)) {
                if(!match[0]) break;
                if(match[0].startsWith("@output")) {
                    const match2 = (/@output:(?<filename>[a-zA-Z0-9\\/\._-]+)\n*```.*?\n(?<sorce>.*)```/gs).exec(match[0]);
                    const filename = match2?.groups?.filename!;
                    const source = match2?.groups?.sorce!;

                    let outputPath = option.resultPath!;
                    if(!Fs.existsSync(outputPath)) {
                        Fs.mkdirSync(outputPath, {recursive: true});
                    }
                    let outputFile = Path.join(outputPath, filename);

                    Fs.writeFileSync(outputFile, source);
                }
            }

            if(option.output) {
                // 先頭と最後に```があった場合は削除する
                result = result
                    .replace(/^```/, "")
                    .replace(/```$/, "");
                const parentDir = Path.dirname(option.output);
                if(!Fs.existsSync(parentDir)) {
                    Fs.mkdirSync(parentDir, {recursive: true});
                }
                Fs.writeFileSync(option.output, result);
            }

        }
    }

    private async completions(messages: any[], model:string, temperature:number, option:OacOption): Promise<string> {
        const openai = new OpenAI({
            apiKey: this.env.openaiApiKey,
        });

        const response = await openai.chat.completions.create({
            model: model,
            messages: messages,
            temperature: temperature,
            stream: true,
        }); 

        if(!option.silent) {
            console.log("oac:");
        }
        let result:string[] = [];
        let line:string[] = [];       // 行表示用
        for await (const part of response) {
            const buffer = part.choices[0]?.delta?.content || '';

            // bufferから１文字ずつ取り出してfor ofで処理する
            for (const ch of buffer) {
                // 行頭はインデント
                if(line.length === 0) process.stdout.write("    ");

                // debug時は標準出力に出力しない(VSCodeのdebugで出力できない)
                if(!option.debug && !option.silent) process.stdout.write(ch);

                if(ch === "\n") {
                    if(option.debug && !option.silent) {
                        // 改行を追加する前にバッファを出力する
                        console.log(`    ${line.join("")}`);
                    }
                    line.push("\n");
                    result.push(line.join(""));
                    line = [];
                }
                else {
                    line.push(ch);
                }
            }
        }

        // 残りを出力
        if(line.length > 0) {
            line.push("\n");
            result.push(line.join(""));
            if(option.debug && !option.silent) {
                console.log(`    ${line.join("")}`);
            }
        }
        process.stdout.write("\n");

        return result.join("");
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

    private loadPrompt(option:OacOption): OacPrompt {
        const yaml = Fs.readFileSync(option.prompt!, "utf8");
        const prompt = Yaml.load(yaml) as OacPrompt;
        
        // パラメータの置換を行う
        prompt.messages.forEach(message => {
            let content = message.content;

            // ${変数名}を正規表現で取り出す
            const regex = /\$\{(file|param|input)([0-9]*)\}/g;

            // パラメータを置換する
            let match;
            while(match = regex.exec(content)) {
                const name = match[1];
                const nameIndex = match[2];
                const fullName = "${" + match[1] + (match[2] ? match[2] : "") + "}";
                let index:number = 0;
                if(nameIndex) index = parseInt(nameIndex) - 1;

                if(name === "file") {
                    if(!option.params[index]) {
                        throw new Error(`file${index}が指定されていません`);
                    }
                    const file = option.params[index];
                    // fileをテキストファイルとして読み込みstringに変換する
                    const text = Fs.readFileSync(file, "utf8");
                    content = content.replace(fullName, text);
                }
                else if(name === "input") {
                    if(!option.input) {
                        throw new Error(`--inputが指定されていません`);
                    }
                    const text = Fs.readFileSync(option.input, "utf8");
                    content = content.replace(`\$\{input\}`, text);
                }
                else if(name === "param") {
                    if(!option.params[index]) {
                        throw new Error(`param${index}が指定されていません`);
                    }
                    const param = option.params[index];
                    content = content.replace(fullName, param);
                }
                message.content = content;
            }
        });

        return prompt;

    }

}