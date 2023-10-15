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
            arg === oac.OacCommand.Prompt ||
            arg === oac.OacCommand.Finetuning ||
            arg === oac.OacCommand.Models ||
            arg === oac.OacCommand.Files ) {
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
        else if(arg.startsWith("--fid=")) {
            option.fid = arg.replace(/^--fid=/, "");
        }
        else if(arg.startsWith("--temperature=")) {
            option.temperature = parseFloat(arg.replace(/^--temperature=/, ""));
        }
        else if(arg === "--silent") {
            option.silent = true;
        }
        else if(arg === "--delete") {
            option.delete = true;
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
                    // 不明なパラメータが指定されています
                    console.log(`Unknown parameter specified: ${arg}`);
                    return;
                }
            }
            else if(option.command === oac.OacCommand.Prompt) {
                if(!option.prompt) {
                    option.prompt = env.rootDir + "/prompt/" + arg + ".yaml"
                }
                else {
                    option.params.push(arg);
                }
            }
            else if(option.command === oac.OacCommand.Finetuning) {
                if(!option.input) {
                    option.input = arg;
                }
                else {
                    // すでにファイルが指定されています
                    console.log(`File already specified: ${arg}`);
                    return;
                }
            }
            else {
                // 不明なコマンドが指定されています
                console.log(`Unknown command specified: ${arg}`);
                return;
            }
        }
        else {
            // 不明なオプションが指定されています
            console.log(`Unknown option specified: ${arg}`);
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
        console.log("      --model=[model]");
        console.log("  command");
        console.log("      [message]");
        console.log("      chat [message]");
        console.log("      save [filename]");
        console.log("      pm   [prompt] [parameter]...");
        console.log("      pm   [prompt] --input=[filename] --output=[filename] ");
        console.log("      clear");
        console.log("      finetuning [filename]");
        console.log("      finetuning --delete --model=[model]");
        console.log("      models");
        console.log("      files");
        console.log("      files --delete --fid=[fid]");
        return;
    }

    try {
        if(option.prompt && !Fs.existsSync(option.prompt)) {
            // promptが存在しません
            throw new Error(`Prompt does not exist: ${option.prompt}`);
        }

        if(option.input && !Fs.existsSync(option.input)) {
            // ファイルが存在しません
            throw new Error(`File does not exist: ${option.input}`);
        }

        const client = new oac.OacClient(option);
        if(option.command === oac.OacCommand.Chat) {
            if(option.message) {
                client.chat();
            }
            else {
                // メッセージを入力してください
                throw new Error("Please enter a message");
            }      
        }
        else if(option.command === oac.OacCommand.Clear) {
            client.clear();
        }
        else if(option.command === oac.OacCommand.Save) {
            client.save();
        }
        else if(option.command === oac.OacCommand.Prompt) {
            client.prompt();
        }
        else if(option.command === oac.OacCommand.Finetuning) {
            client.fineTuning();
        }
        else if(option.command === oac.OacCommand.Models) {
            client.models();
        }
        else if(option.command === oac.OacCommand.Files) {
            client.files();
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

