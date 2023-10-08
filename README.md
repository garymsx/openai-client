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

### チャット機能

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

#### 注意点
デフォルトではchatする度に会話の履歴を3個まで送信してますので、tokensがかさばりがちです。  
利用料を気にする方は.envファイルを修正して少ない値にしてください。  
ただし`CHAT_HISTORY=0`にすると履歴を送らなくなるため、会話が成り立たなくなります。

### プロンプト機能(定型処理)

事前に用意したプロンプトをAIに与えて、応答を受け取る機能です。

```
# README.mdを英語に翻訳する
# ※promptやinputに更新がない場合APIは実行されません
$ oac prompt trans --input=README.md --output=./en/README.md

# DDLからJavaのEntityを生成する(resultディレクトリに作成されます)
$ oac prompt entity sample/address.ddl

# 国語辞書
$ oac prompt dic 弱肉強食
```

promptディレクトリあるプロンプトが実行され結果を出力します。

#### オプション
- --input=ファイル名  
  入力ファイルを指定します。プロンプト内の${input}に埋め込まれます

- --output=ファイル名  
  AIの応答をファイルに出力します。

- 任意のキーワード/ファイル  
  プロンプトの中の\${param1}や、\${file1}で埋め込むことができます。\${file1}の場合はファイルの中身が展開されます。

#### ファイル生成指定
--outputでもファイルは作成されますが、ファイル作成自体をAIに任せることが出来ます。  
AIにプロンプトで@output:filename \`\`\`～\`\`\`の形式で出力させるとファイルとして拾い上げます。
このフォーマットだと１つのプロンプトから複数のファイルを出力させることが可能です。  
ただし、gpt-3.5だと失敗することが多く、gpt-4推奨になります。  
※[entity](prompt/entity.yaml)参照

## TODO
- [x] 簡易的な生成系機能の追加
- [ ] fine tuning 登録コマンドの追加
