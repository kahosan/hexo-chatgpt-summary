import { chatGPT } from './src/generator/index';
import type { SummaryContent } from './src/utils';
import { getAllPost, getPostContent, getPostTitle, summaryJSON } from './src/utils';

import 'isomorphic-fetch';

interface PluginConfigration {
  enable: boolean
  model?: string
  apiKey?: string
  accessToken?: string
  apiReverseProxyUrl?: string
  customPosition?: string
}

const config = hexo.config.chatgpt_summary as PluginConfigration;

if (config.enable) {
  if (!config.accessToken && !config.apiKey) {
    throw new Error('accessToken or apiKey is undefined');
  }

  const generatePostSummaryError: string[] = [];

  const { addPostSummary, getPostSummary, generateSummaryFile } = summaryJSON();

  hexo.extend.console.register('chatgpt', async () => {
    const generatePostSummary = await chatGPT(config);

    // generate summary json file
    generateSummaryFile();

    const postPaths = await getAllPost();
    for (const postPath of postPaths) {
      const postTitle = await getPostTitle(postPath);

      if (!postTitle) {
        continue;
      }

      const summary = getPostSummary(postTitle);
      if (!summary) {
        const postContent = await getPostContent(postPath);
        const prompt = `帮我用中文总结这篇文章，50 字左右: \n${postContent}`;
        const newSummary = await generatePostSummary(prompt);

        if (!newSummary) {
          generatePostSummaryError.push(postPath);
          continue;
        }

        const content: SummaryContent = {
          postPath,
          postTitle,
          summary: newSummary.text
        };

        addPostSummary(content);
      }
    }

    const errorInfo = generatePostSummaryError;
    errorInfo.forEach(error => console.info(`生成失败: ${error}`));
  });

  hexo.extend.filter.register('after_render:html', (data) => {
    const postTitle = data.match(/(?<=<p>TLDR-).*?(?=<\/p>)/)?.at(0);
    const deleteTLDR = (content: string) => {
      return content.replace(/<p>TLDR-.*?<\/p>/, '');
    };

    if (!postTitle) {
      data = deleteTLDR(data).replace(`<div id=${config.customPosition}></div>`, '');
      return data;
    }

    const summary = getPostSummary(postTitle)?.summary;
    if (!summary) {
      data = deleteTLDR(data).replace(`<div id=${config.customPosition}></div>`, '');
      return data;
    }

    const summaryElement = '<div class="tldr">' + `<p class="tldr-content">${summary}</p>` + '</div>';
    if (!config.customPosition) {
      const content = data.replace(/<p>TLDR-.*?<\/p>/g, summaryElement);
      data = content;
      return data;
    }

    // custom position 是唯一的元素 ID
    const content = deleteTLDR(data)
      .replace(`<div id=${config.customPosition}></div>`, () => `<div id="${config.customPosition}">${summary}</div>`)
      .replace(`<div id="${config.customPosition}"></div>`, () => `<div id="${config.customPosition}">${summary}</div>`);

    data = content;
    return data;
  });
}
