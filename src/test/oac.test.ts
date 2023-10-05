import * as oac from "../oac";

describe("chatコマンド", () => {
    it("正常に実行されること", async () => {
        const option = new oac.OacOption();
        const client = new oac.OacClient();
        option.command = oac.OacCommand.Chat;
        option.message = "おはよう";
        option.debug = true;
        // 異常なく実行されること
        await client.chat(option);            
    });
});
