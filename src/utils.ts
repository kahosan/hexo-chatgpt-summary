import fs from 'fs/promises';
import path from 'path';

import jsonfile from 'jsonfile';

export const rootPath = path.resolve(__dirname, '../../../');
const postsPath = path.resolve(rootPath, 'source/_posts');

/**
 *  获取 posts 路径下所有文章，包括嵌套在内
 * @param dirPath 文章所在路径
 * @param posts 文章列表
 * @returns 文章列表
 */
export async function getAllPost(dirPath: string = postsPath, posts: string[] = []) {
  const files = await fs.readdir(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      posts = await getAllPost(filePath, posts);
    } else if (path.extname(filePath).toLowerCase() === '.md') {
      posts.push(filePath);
    }
  }

  return posts;
}

/**
 * @param postPath 文章路径
 * @returns 文章内容
 */
export async function getPostContent(postPath: string) {
  return (await fs.readFile(postPath, { flag: 'r' })).toString();
}

/**
 * @param postPath 文章路径
 * @returns 文章标题
 */
export async function getPostTitle(postPath: string) {
  const post = await getPostContent(postPath);
  return post.match(/(?<=TLDR-)(.*)/g)?.at(0);
}

export interface SummaryContent {
  postTitle: string
  postPath: string
  summary: string
}

/**
 * 编辑 json 数据库
 *
 */
export function summaryJSON() {
  const filePath = path.join(rootPath, 'summary.json');

  const generateSummaryFile = () => {
    try {
      if (!jsonfile.readFileSync(filePath)) {
        jsonfile.writeFileSync(filePath, []);
      }
    } catch {
      //
    }
  };

  const getSummary = () => {
    try {
      return jsonfile.readFileSync(filePath, { encoding: 'utf-8' }) as SummaryContent[];
    } catch (e) {
      console.error(e);
      throw new Error('get post summary error');
    }
  };

  const getPostSummary = (potsTitle: string) => {
    try {
      const summaryFile = jsonfile.readFileSync(filePath, { encoding: 'utf-8' }) as SummaryContent[];
      return summaryFile.filter(summary => summary.postTitle === potsTitle)?.at(0);
    } catch (e) {
      console.error(e);
      throw new Error('get post summary error');
    }
  };

  const addPostSummary = (content: SummaryContent) => {
    const jsonData = jsonfile.readFileSync(filePath) as SummaryContent[];
    jsonData.push(content);
    try {
      jsonfile.writeFileSync(filePath, jsonData, { flag: 'w', spaces: 2 });
    } catch (e) {
      console.error(e);
      throw new Error('add post summary error');
    }
  };

  return {
    addPostSummary,
    getPostSummary,
    generateSummaryFile,
    getSummary
  };
}
