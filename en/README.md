# OpenAI API Client Demo Program

## Description

This is a template for people who want to experiment with the OpenAI API.  
The functionality is still limited, and template features and generation-like features will be added in the future.

## Installation

Assumes that node.js is already installed.

```shell
$ npm run build
```

Rename the .env.template file to .env and set your API key.

```
# Your API key created with OpenAI
OPENAI_API_KEY=api-key
```

## Usage

### Chat

``` 
$ oac chat わーい

or omit "chat"

$ oac わーい
@you:
    わーい
@oac:
    わーい！何か楽しいことがあったのかな？

```

The conversation history is saved in temp/history.yaml.

To end the conversation, use the "clear" command.

```
$ oac clear
```

To save the conversation to a different file, use the "save" command.

```
$ oac save history20231006

history20231006.yaml will be created.
```

#### Note
By default, up to 3 conversation history items are sent with each chat, which can result in a large number of tokens.  
If you are concerned about usage fees, modify the .env file to reduce the value.  
However, setting `CHAT_HISTORY=0` will stop sending the history, which will cause the conversation to fail.

### Prompt (Template Processing)

This feature allows you to provide pre-prepared prompts to the AI and receive a response.

```
# Translate README.md into English
# * If there are no updates to the prompt or input, the API will not be executed.
$ oac prompt trans --input=README.md --output=./en/README.md

# Generate Java Entities from DDL (created in the result directory)
$ oac prompt entity sample/address.ddl

# Japanese dictionary
$ oac prompt dic 弱肉強食
```

The prompt in the prompt directory is executed and the result is output.

#### Options
- --input=file name  
  Specifies the input file. It will be embedded in the prompt as ${input}.

- --output=file name  
  Outputs the AI response to a file.

- Any keyword/file  
  You can embed ${param1} or ${file1} in the prompt. If ${file1} is used, the contents of the file will be expanded.

#### File Generation Specification
Although files are also created with --output, you can leave the file creation itself to the AI.  
If you use the format @output:filename \`\`\`～\`\`\` in the prompt, it will be picked up as a file.  
With this format, you can output multiple files from a single prompt.  
However, gpt-3.5 often fails, so gpt-4 is recommended.  
※Refer to [entity](prompt/entity.yaml)

### Generate Image

Generates an image.

```
$ oac image 白いシャム猫

download url: https://oaidalleapiprodscus.blob.core.windows.net/private/xxxxxxxxxx
save file: result\image2023xxxxxxxxxx-1.png
```

### Fine Tuning

Creates a model for fine-tuning.

```
$ oac finetuning sample/fineTuning.yaml
Waiting...[uploaded]
Waiting...[processed]
Uploaded file-id: file-xxxxxxxxxxxxxxxx
Starting fine-tuning
Finetuning job-id: ftjob-xxxxxxxxxxxxxxxxx
Wait for the completion email from OpenAI
```

After this, when the fine-tuned model is registered, you will receive a completion notification from OpenAI.  
Check that the model ft:xxxxx has been added with `oac models`.

If you want to use the created model, specify it in the .env file with OPENAI_MODEL.  
It is also recommended to set CHAT_SYSTEM_ROLE accordingly.

.env
```
OPENAI_MODEL=ft:gpt-3.5-turbo-0613:personal::XXXXXXXX
CHAT_SYSTEM_ROLE=Marv is a fact-based chatbot and also makes sarcastic remarks.
```

Once the configuration is complete, try asking with `oac chat`.
```
$ oac What is the capital of France?
oac:
    It's Paris. It's something everyone knows, but well, it's important information.
```

It seems that it doesn't just return the text from the fine-tuning.

fineTuning.yaml
```
- What is the capital of France?
- It's Paris. It's not like nobody knows that.
```

#### Deleting the Files Used for Training
Use `oac files` to list the files, and specify the file you want to delete.
```
$ oac files
file-aaaaaaaaaaaaaaaaaaaaaaaa | fineTuning.json | 2023-10-13T06:00:36.000Z | processed
file-bbbbbbbbbbbbbbbbbbbbbbbb | fineTuning.json | 2023-10-13T08:59:54.000Z | processed

$ oac files --delete --fid=file-aaaaaaaaaaaaaaaaaaaaaaaa
```

#### Deleting the Model
Similarly, use `oac finetuning` to list the models, and specify the model you want to delete.
```
$ oac finetuning
ft:gpt-3.5-turbo-0613:personal::XXXXXXXX | 2023-10-15T03:32:24.000Z

$ oac finetuning --delete --model=ft:gpt-3.5-turbo-0613:personal::XXXXXXXX
