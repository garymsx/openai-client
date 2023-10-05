# OpenAI API クライアントデモプログラム

## 説明

OpenAI APIでいろいろ実験したい人向けのテンプレートです。  
まだ機能が不足しており、テンプレート機能、生成っぽいことを追加予定。

## インストール

node.jsがインストール済みであることを前提とします。

```shell
$ npm run build
```

.env.templateファイルを.envにリネームして、APIキーを設定してください。

```
# あなたがOpenAIで作成したAPIキー
OPENAI_API_KEY=api-key
```

## 使い方

チャット機能

``` 
$ oac chat わーい

または chatを省略して

$ oac わーい
@you:
    わーい
@oac:
    わーい！何か楽しいことがあったのかな？

```

会話の履歴はtemp/history.yamlに保存されます。

会話を切りたい場合はclearを実行します。

```
$ oac clear
```

会話を別のファイルに保存したい場合はsaveします。

```
$ oac save history20231006

history20231006.yamlが作成されます。
```

## 注意点
デフォルトではchatする度に会話の履歴を3個まで送信してますので、tokensがかさばりがちです。  
利用料を気にする方は.envファイルを修正して少ない値にしてください。  
ただし`CHAT_HISTORY=0`にすると履歴を送らなくなるため、会話が成り立たなくなります。

## TODO
- [ ] 簡易的な生成系機能の追加
- [ ] fine tuning 登録コマンドの追加
