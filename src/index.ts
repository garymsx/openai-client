#!/usr/bin/env node

import * as oac from "./oac";

function main() {
    const option = new oac.OacOption();
    const messages:string[] = [];

    for (let i = 2; i < process.argv.length; i++) {
        let arg = process.argv[i];
        if(arg === "chat") {
            option.command = oac.OacCommand.Chat;
        }
        else if(arg === "clear") {
            option.command = oac.OacCommand.Clear;
        }
        else if(arg === "save") {
            option.command = oac.OacCommand.Save;
        }
        else if(arg === "--debug") {
            option.debug = true;
        }
        else if(arg.startsWith("--model=")) {
            option.model = arg.replace(/^--model=/, "");
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
        console.log("  command");
        console.log("      chat [message]");
        console.log("      save [filename]");
        console.log("      clear");
        return;
    }

    const client = new oac.OacClient();
    if(option.command === oac.OacCommand.Chat) {
        if(option.message) {
            client.chat(option);
        }
        else {
            console.log("メッセージを入力してください");
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
            console.log("ファイル名を指定してください");
        }
    }
}

main();

