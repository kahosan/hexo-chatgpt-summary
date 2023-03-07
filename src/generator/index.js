import { ChatGPTAPI, ChatGPTUnofficialProxyAPI } from 'chatgpt-api-cjs';

export async function chatGPT(options) {
  let api;
  if (options.apiKey) {
    api = new ChatGPTAPI({ apiKey: options.apiKey });
  } else if (options.accessToken) {
    api = new ChatGPTUnofficialProxyAPI({ accessToken: options.accessToken });
  }

  return async (prompt) => {
    return await api.sendMessage(prompt);
  };
}
