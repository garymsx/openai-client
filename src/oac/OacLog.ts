import { OacOption } from "./OacOption";

export class OacLog {
    buffer: string[] = [];

    option: OacOption;
    constructor(option: OacOption) {
        this.option = option;
    }

    put(ch: string) {
        if(!this.option.debug) {
            process.stdout.write(ch);
        }
        else {
            if(ch === '\n') {
                if(!this.option.silent) {
                    console.log(this.buffer.join(''));
                }
                this.buffer = [];
            }
            else {
                this.buffer.push(ch);
            }
        }
    }

    flush() {
        if(this.option.debug) {
            this.put('\n');
        }
    }

    print(message: string) {
        console.log(message);
    }

    info(message: string) {
        if(!this.option.silent) {
            this.print(message);
        }
    }
}