#!/usr/bin/env node

import * as oac from "./oac";
import * as Fs from "fs";

function main() {
    const env = new oac.OacEnv();
    const option = new oac.OacOption();
    const messages:string[] = [];

    for (let i = 2; i < process.argv.length; i++) {
        let arg = process.argv[i];
        if(arg === oac.OacCommand.Chat ||
            arg === oac.OacCommand.Save ||
            arg === oac.OacCommand.Clear ||
            arg === oac.OacCommand.Prompt ) {
            option.command = arg;
        }
        else if(arg === "--debug") {
            option.debug = true;
        }
        else if(arg.startsWith("--model=")) {
            option.model = arg.replace(/^--model=/, "");
        }
        else if(arg.startsWith("--result=")) {
            option.resultPath = arg.replace(/^--result=/, "");
        }
        else if(arg.startsWith("--input=")) {
            option.input = arg.replace(/^--input=/, "");
        }
        else if(arg.startsWith("--output=")) {
            option.output = arg.replace(/^--output=/, "");
        }
        else if(arg.startsWith("--temperature=")) {
            option.temperature = parseFloat(arg.replace(/^--temperature=/, ""));
        }
        else if(arg === "--silent") {
            option.silent = true;
        }
        else if(!arg.startsWith("--")) {
            // chatコマンドもしくはコマンド指定がない場合はメッセージとして扱う
            if(option.command === oac.OacCommand.Chat || option.command === undefined) {
                messages.push(arg);
            }
            else if(option.command === oac.OacCommand.Save) {
                if(!option.savePath) {
                    // 拡張子yaml付与
                    if(!arg.endsWith(".yaml") && !arg.endsWith(".yml")) {
                        arg += ".yaml";
                    }
                    option.savePath = arg;
                }
                else {
                    console.log(`不明なパラメータが指定されています: ${arg}`);
                    return;
                }
            }
            else if(option.command === oac.OacCommand.Prompt) {
                if(!option.prompt) {
                    option.prompt = env.rootDir + "/prompt/" + arg + ".yaml"
                    if(!Fs.existsSync(option.prompt)) {
                        console.log(`promptが存在しません: ${arg}`);
                        return;
                    }
                }
                else {
                    option.params.push(arg);
                }
            }
            else {
                console.log(`不明なコマンドが指定されています: ${arg}`);
                return;
            }
        }
        else {
            console.log(`不明なオプションが指定されています: ${arg}`);
            return;
        }
    }

    if(messages.length > 0) {
        // コマンド指定がない場合はchatコマンドとして扱う
        if(option.command === undefined) option.command = oac.OacCommand.Chat;
        option.message = messages.join(" ");
    }

    if(!option.command) {
        console.log("usage: oac [options] [command] [parameters]");
        console.log("  options");
        console.log("      --silent");
        console.log("      --mdeo=[model]");
        console.log("  command");
        console.log("      [message]");
        console.log("      chat [message]");
        console.log("      save [filename]");
        console.log("      pm   [prompt] [parameter]...");
        console.log("      clear");
        return;
    }

    try {
        const client = new oac.OacClient();
        if(option.command === oac.OacCommand.Chat) {
            if(option.message) {
                client.chat(option);
            }
            else {
                throw new Error("メッセージを入力してください");
            }      
        }
        else if(option.command === oac.OacCommand.Clear) {
            client.clear(option);
        }
        else if(option.command === oac.OacCommand.Save) {
            if(option.savePath) {
                client.save(option);
            }
            else {
                throw new Error("ファイル名を指定してください");
            }
        }
        else if(option.command === oac.OacCommand.Prompt) {
            client.prompt(option);
        }
    }
    catch(e) {
        if(e instanceof Error) {
            console.log(e.message);
        }
        else {
            console.log(e);
        }
    }
}

main();

