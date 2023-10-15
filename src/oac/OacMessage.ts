export enum OacRole {
    User = "user",
    System = "system",
    Assistant = "assistant"
}

export type OacMessage = {
    role: OacRole,
    content: string
};

export type OacMessages = {
    messages: OacMessage[],
};
