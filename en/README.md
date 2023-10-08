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
# Your API key created in OpenAI
OPENAI_API_KEY=api-key
```

## Usage

### Chat Function

``` 
$ oac chat yay

or omit "chat" and just type

$ oac yay
@you:
    yay
@oac:
    Yay! Did something fun happen?

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

### Prompt (Template Text)

This feature allows you to give a prompt to the AI and generate a file.

```
$ oac prompt trans --input=README.md --output=en/README.md
```


## Notes
By default, the program sends up to 3 conversation history each time you chat, which can result in a large number of tokens.  
If you are concerned about usage fees, modify the .env file to reduce the value.  
However, setting `CHAT_HISTORY=0` will stop sending the history, which will make the conversation incomplete.

## TODO
- [ ] Add basic generation features
- [ ] Add fine-tuning registration command
