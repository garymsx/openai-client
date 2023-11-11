import OpenAI from "openai";
import * as Fs from "fs";
import * as Path from "path";
import { OacMessage, OacMessages, OacRole } from "./OacMessage";
import { OacOption } from "./OacOption";
import { OacEnv } from "./OacEnv";
import * as Yaml from "js-yaml";
import { OacPrompt } from "./OacPrompt";
import { OacFineTuningData } from "./OacFineTuning";
import fetch from "node-fetch";
import { OacLog } from "./OacLog";

export class OacClient {
    option: OacOption;
    env: OacEnv = new OacEnv();
    log: OacLog;

    constructor(option: OacOption) {
        this.option = option;
        this.log = new OacLog(option);
    }

    async chat() {
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
                content: this.option.message
            });

            return messages;
        }

        const result = await this.completions(createMessage(), this.option.model, this.env.chatTemperature);

        // TODO: 消費したトークン数を表示する

        // ユーザーの発言を保存
        history.push({
            role: OacRole.User,
            content: this.option.message!
        });

        // 応答を保存
        history.push({
            role: OacRole.Assistant,
            content: result
        });

        // デバッグ時は履歴を保存しない
        if(!this.option.debug) {
            this.saveHistory(history);
        }

        return result;
    }

    clear() {
        this.saveHistory([]);
    }

    save() {
        if(!this.option.savePath) {
            // ファイルを指定してください
            throw new Error("Please specify a file");
        }

        const history = this.loadHistory();
        this.saveHistory(history, this.option.savePath!);
    }

    async prompt() {
        let result = "";

        // APIを実行すべきか
        let exec = false;

        // output指定がある場合は、APIを呼べるかどうかを判定する
        if(this.option.input && this.option.output) {
            const propmtStat = Fs.statSync(this.option.prompt!);
            const inputStat =  Fs.existsSync(this.option.input) ? Fs.statSync(this.option.input) : undefined;
            const outputStat = Fs.existsSync(this.option.output) ? Fs.statSync(this.option.output) : undefined;
            if(outputStat && inputStat) {
                // inputがoutputより新しい場合はAPIを実行する
                if(outputStat.mtime < inputStat.mtime) exec = true;
                // promptが新しい場合はAPIを実行する
                if(outputStat.mtime < propmtStat.mtime || inputStat.mtime < propmtStat.mtime) exec = true;
            }
            else if(outputStat) {
                // promptが新しい場合はAPIを実行する
                if(outputStat.mtime < propmtStat.mtime) exec = true;
            }
            else {
                exec = true;
            }

            if(!exec) {
                // APIを実行する必要なし
                const buffer = await Fs.readFileSync(this.option.output);
                result = buffer.toString();
            }
        }
        else {
            exec = true;
        }

        if(exec) {
            // API実行
            const messages: any[] = [];
            const prompt = this.loadPrompt();

            prompt.messages.forEach(message => {
                this.log.info(message.role + ":");
                this.log.info(message.content);
                messages.push({
                    role: message.role,
                    content: message.content
                });
            });

            result = await this.completions(
                messages,
                prompt.model ? prompt.model : this.option.model,
                prompt.temperature ? prompt.temperature : this.option.temperature
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

                    let outputFile = Path.join(this.option.resultPath!, filename);
                    Fs.writeFileSync(outputFile, source);
                }
            }

            if(this.option.output) {
                // 先頭と最後に```があった場合は削除する
                result = result
                    .replace(/^```/, "")
                    .replace(/```$/, "");
                const parentDir = Path.dirname(this.option.output);
                if(!Fs.existsSync(parentDir)) {
                    Fs.mkdirSync(parentDir, {recursive: true});
                }
                Fs.writeFileSync(this.option.output, result);
            }

        }
    }

    async fineTuning() {
        const openai = this.createOpenAI();

        // 削除
        if(this.option.delete) {
            if(this.option.model) {
                // TODO:openai.models.delete()が動作しないので、fetchで代用している
                const result = await fetch(`https://api.openai.com/v1/models/${this.option.model}`, {
                    method: "DELETE",
                    headers: {
                      "Authorization": `Bearer ${this.env.openaiApiKey}`
                    }
                })
                // ${this.option.model}の削除依頼を出しました
                this.log.print(`Delete request for ${this.option.model}`);
            }
            else {
                this.log.print(`--model is not specified`);
            }
        }
        else if(this.option.cancel) {
            if(this.option.jid) {
                openai.fineTuning.jobs.cancel(this.option.jid);
            }
            else {
                this.log.print(`--jid is not specified`);
            }
        }
        // 作成
        else if(this.option.input) {
            const data = this.loadFineTuning();
            const jsonFile = this.saveToJson(data);
            if(!this.option.fid) {
                //const stream: Fs.ReadStream = require('stream').Readable.from(jsonFile);
                let file = await openai.files.create({
                    file: Fs.createReadStream(jsonFile),
                    purpose: 'fine-tune',
                });
        
                while (true) {
                    file = await openai.files.retrieve(file.id);
                    this.log.print(`Waiting...[${file.status}]`);
        
                    if (file.status === 'processed') {
                        break;
                    }
                    else {
                        await new Promise((resolve) => setTimeout(resolve, 1000));
                    }
                }        
                this.log.print(`Uploaded file-id: ${file.id}`);
                this.option.fid = file.id;
            }
    
            if(!this.option.model) this.option.model = data.model;
    
            this.log.print(`Starting finetuning`);
            let fineTune = await openai.fineTuning.jobs.create({
                    model: this.option.model,
                    training_file: this.option.fid
                }
            );
            this.log.print(`Finetuning job-id: ${fineTune.id}`);
    
            // OpenAIから完了メールが届くのを待ちます
            this.log.print("Wait for the completion email from OpenAI");
        }
        // 一覧
        else {
            this.models(/^ft:.*/);
        }
    }

    async models(filter?:RegExp) {
        const openai = this.createOpenAI();
        const list = await openai.models.list();
        const result: string[] = [];

        for(const model of list.data) {
            const date = new Date(model.created * 1000);
            if(model.owned_by.startsWith("user-")) {
                result.push(`${model.id} | ${date.toISOString()}`);
            }
            else {
                result.push(`${model.id}`);
            }
        }

        result.sort();

        for(const model of result) {
            if(!filter || filter.test(model)) {
                this.log.print(model);
            }
        }
    }

    async files() {
        const openai = this.createOpenAI();
        const files = await openai.files.list();

        if(this.option.delete) {
            if(this.option.fid) {
                await openai.files.del(this.option.fid);
                this.log.print(`File ${this.option.fid} has been deleted`);
                return;
            }
            else {
                throw new Error(`--fid is not specified`);
            }
        }

        for(const model of files.data) {
            // unixtimeを日付に変換する
            const date = new Date(model.created_at * 1000);
            this.log.print(`${model.id} | ${model.filename} | ${date.toISOString()} | ${model.status} `);
        }

    }

    async image() {
        const openai = this.createOpenAI();
        const result = await openai.images.generate({
            model: this.option.model!,
            prompt: this.option.message!,
            size: this.option.size!,
            quality: this.option.quality!,
            n:this.option.n,
        });

        result.data.forEach((it, index) => {
            const url = it.url;
            if(url) {
                // 現在時刻を文字列にする
                const now = new Date();
                // yyyymmddhhmmss形式にする
                const nowString = now.getFullYear().toString().padStart(4, "0") +
                                  (now.getMonth() + 1).toString().padStart(2, "0") +
                                  now.getDate().toString().padStart(2, "0") +
                                  now.getHours().toString().padStart(2, "0") +
                                  now.getMinutes().toString().padStart(3, "0") +
                                  now.getSeconds().toString().padStart(2, "0");
                const filename = Path.join(this.option.resultPath!, `image${nowString}-${index + 1}.png`);
                // URLをダウンロードする
                this.log.print(`download url: ${url}`);
                this.log.print(`save file: ${filename}`);
                const response = fetch(url);
                const buffer = response.then(it => it.buffer());
                const file = buffer.then(
                    it => Fs.writeFileSync(
                        filename,
                        it
                    )
                );
            }
        });
    }

    private async completions(messages: any[], model:string, temperature:number): Promise<string> {
        const openai = this.createOpenAI();

        const response = await openai.chat.completions.create({
            model: model,
            messages: messages,
            temperature: temperature,
            stream: true,
        }); 

        if(this.option.debug) {
            this.log.info(`model: ${this.option.model}`);
            this.log.info(`temperature: ${this.option.temperature}`);
            if(this.option.message) {
                this.log.info("you:");
                this.log.info("    " + this.option.message);
            }
        }

        this.log.info("oac:");

        let result:string[] = [];
        let top = true; // 行頭かどうか
        for await (const part of response) {
            const buffer = part.choices[0]?.delta?.content || '';

            // bufferから１文字ずつ取り出してfor ofで処理する
            for (const ch of buffer) {
                // 行頭はインデント
                if(top) {
                    this.log.put("    ");
                    top = false;
                }

                this.log.put(ch);
                result.push(ch);

                if(ch === "\n") top = true;
            }
        }

        this.log.put("\n");

        if(this.option.silent) {
            this.log.print(result.join(""));
        }

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

    private loadPrompt(): OacPrompt {
        const yaml = Fs.readFileSync(this.option.prompt!, "utf8");
        const prompt = Yaml.load(yaml) as OacPrompt;
        
        // パラメータの置換を行う
        prompt.messages.forEach(message => {
            let content = message.content;

            // ${変数名}を正規表現で取り出す
            const regex = /(\$\{(file|param|input)([0-9]*)\}|(.|\n))/gm;
            const buffer:string[] = [];

            // パラメータを置換する
            let match;
            while((match = regex.exec(content)) !== null) {
                const token = match[1];
                const regex2 = /\$\{(file|param|input)([0-9]*)\}/;
                const match2 = regex2.exec(token);
                if(match2) {
                    const param = match2[1];
                    const index = parseInt(match2[2]) - 1;
                    if(param === "file") {
                        if(!this.option.params[index]) {
                            throw new Error(`file${index} is not specified`);
                        }
                        const file = this.option.params[index];
                        // fileをテキストファイルとして読み込みstringに変換する
                        const text = Fs.readFileSync(file, "utf8");
                        buffer.push(text);
                    }
                    else if(param === "input") {
                        if(!this.option.input) {
                            throw new Error(`--input is not specified`);
                        }
                        const text = Fs.readFileSync(this.option.input, "utf8");
                        buffer.push(text);
                    }
                    else if(param === "param") {
                        if(!this.option.params[index]) {
                            throw new Error(`param${index} is not specified`);
                        }
                        const param = this.option.params[index];
                        buffer.push(param);
                    }
                }
                else {
                    buffer.push(token);
                }
                
                // const nameIndex = match[2];
                // const fullName = "${" + match[1] + (match[2] ? match[2] : "") + "}";
                // let index:number = 0;
                // if(nameIndex) index = parseInt(nameIndex) - 1;

                // if(token === "file") {
                //     if(!this.option.params[index]) {
                //         throw new Error(`file${index} is not specified`);
                //     }
                //     const file = this.option.params[index];
                //     // fileをテキストファイルとして読み込みstringに変換する
                //     const text = Fs.readFileSync(file, "utf8");
                //     //content = content.replace(fullName, text);
                // }
                // else if(token === "input") {
                //     if(!this.option.input) {
                //         throw new Error(`--input is not specified`);
                //     }
                //     const text = Fs.readFileSync(this.option.input, "utf8");
                //     //content = content.replace(`\$\{input\}`, text);
                // }
                // else if(token === "param") {
                //     if(!this.option.params[index]) {
                //         throw new Error(`param${index} is not specified`);
                //     }
                //     const param = this.option.params[index];
                //     //content = content.replace(fullName, param);
                // }
            }
            message.content = buffer.join("");
        });

        return prompt;
    }

    /**
     * fineTuning用のyamlファイルを読み込む
     * @param option 
     * @returns 
     */
    private loadFineTuning(): OacFineTuningData {
        // YamlからJsonに変換する
        const fileContents = Fs.readFileSync(this.option.input!, "utf8");
        const data = Yaml.load(fileContents) as OacFineTuningData;
        return data;
    }

    /**
     * YamlからJsonに変換したファイルを作成する
     * @param option 
     * @returns 
     */
    private saveToJson(data:OacFineTuningData): string {
        const tempPath = Path.join(this.env.tempPath, `fineTuning.jsonl`);
        const out:string[] = [];

        const system = data.system;

        // jsonl形式
        data.fineTuning.forEach((it) => {
            const json:OacMessages = {
                messages: []
            };

            // systemの発言を追加する
            if(it.messages.system) {
                // 先頭にsystemの発言を追加する
                json.messages.push({
                    role: OacRole.System,
                    content: it.messages.system
                });
            }
            else if(system) {
                // 先頭にsystemの発言を追加する
                json.messages.push({
                    role: OacRole.System,
                    content: system
                });
            }

            while(it.messages.contents.length > 0) {
                const user = it.messages.contents.shift()!;
                json.messages.push({
                    role: OacRole.User,
                    content: user
                });
                const assistant = it.messages.contents.shift()!;
                if(assistant) {
                    json.messages.push({
                        role: OacRole.Assistant,
                        content: assistant
                    });
                }
                else {
                    throw new Error("There is no assistant's utterance");
                }
            }
            out.push(JSON.stringify(json));
        });
        Fs.writeFileSync(tempPath, out.join("\n"), "utf8");
        return tempPath
        //return json.join("\n");
    }

    private createOpenAI(): OpenAI {
        return new OpenAI({
            apiKey: this.env.openaiApiKey,
        });
    }
}