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
            arg === oac.OacCommand.Image ||
            arg === oac.OacCommand.Prompt ||
            arg === oac.OacCommand.Finetuning ||
            arg === oac.OacCommand.Models ||
            arg === oac.OacCommand.Files ) {
            if(!option.command) {
                option.command = arg;
            }
            else {
                // すでにコマンドが指定されています
                console.log(`Command already specified: ${option.command}`);
                return;
            }
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
        else if(arg.startsWith("--jid=")) {
            option.jid = arg.replace(/^--jid=/, "");
        }
        else if(arg.startsWith("--temperature=")) {
            option.temperature = parseFloat(arg.replace(/^--temperature=/, ""));
        }
        else if(arg.startsWith("--quality=")) {
            const quality = arg.replace(/^--quality=/, "");
            if(quality != 'standard' && quality != 'hd') {
                // クオリティ指定が不正です
                console.log(`Invalid quality: ${quality} (standard, hd)`);
                return;
            }
            option.quality = quality;
        }
        else if(arg.startsWith("--size=")) {
            const size = arg.replace(/^--size=/, "");
            if( size != '256x256' && 
                size != '512x512' &&
                size != '1024x1024' &&
                size != '1792x1024' &&
                size != '1024x1792') {
                // サイズ指定が不正です
                console.log(`Invalid size: ${size} (256x256, 512x512, 1024x1024, 1792x1024, 1024x1792)`);
                return;
            }
            option.size = size;
        }
        else if(arg.startsWith("--n=")) {
            const n = parseInt(arg.replace(/^--n=/, ""));
            if(n < 1 || n > 10) {
                // 画像は10枚までです
                console.log(`Invalid n: ${n} (1-10)`);
                return;
            }
            option.n = n;
        }
        else if(arg === "--silent") {
            option.silent = true;
        }
        else if(arg === "--cancel") {
            option.cancel = true;
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
            else if(option.command === oac.OacCommand.Image) {
                messages.push(arg);
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
        console.log("      prompt [prompt] [parameter]...");
        console.log("      prompt [prompt] --input=[filename] --output=[filename] ");
        console.log("      image [message] --size=256x256|512x512|1024x1024|1792x1024|1024x1792 --quality=standard|hd");
        console.log("                      --models=dall-e-2 --n=[n] (dall-e-2 only)");
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

        // 出力先
        if(option.resultPath) {
            if(!Fs.existsSync(option.resultPath)) {
                Fs.mkdirSync(option.resultPath, {recursive: true});
            }
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
        else if(option.command === oac.OacCommand.Image) {
            if(option.model != "dall-e-2") {
                option.model = "dall-e-3";
            }
            client.image();
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

