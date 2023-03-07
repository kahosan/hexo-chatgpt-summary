var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/generator/index.js
var import_chatgpt_api_cjs = require("chatgpt-api-cjs");
async function chatGPT(options) {
  let api;
  if (options.apiKey) {
    api = new import_chatgpt_api_cjs.ChatGPTAPI({ apiKey: options.apiKey });
  } else if (options.accessToken) {
    api = new import_chatgpt_api_cjs.ChatGPTUnofficialProxyAPI({ accessToken: options.accessToken });
  }
  return async (prompt) => {
    return await api.sendMessage(prompt);
  };
}

// src/utils.ts
var import_promises = __toESM(require("fs/promises"));
var import_path = __toESM(require("path"));
var import_jsonfile = __toESM(require("jsonfile"));
var rootPath = import_path.default.resolve(__dirname, "../../../");
var postsPath = import_path.default.resolve(rootPath, "source/_posts");
async function getAllPost(dirPath = postsPath, posts = []) {
  const files = await import_promises.default.readdir(dirPath);
  for (const file of files) {
    const filePath = import_path.default.join(dirPath, file);
    const stat = await import_promises.default.stat(filePath);
    if (stat.isDirectory()) {
      posts = await getAllPost(filePath, posts);
    } else if (import_path.default.extname(filePath).toLowerCase() === ".md") {
      posts.push(filePath);
    }
  }
  return posts;
}
async function getPostContent(postPath) {
  return (await import_promises.default.readFile(postPath, { flag: "r" })).toString();
}
async function getPostTitle(postPath) {
  var _a;
  const post = await getPostContent(postPath);
  return (_a = post.match(/(?<=TLDR-)(.*)/g)) == null ? void 0 : _a.at(0);
}
function summaryJSON() {
  const filePath = import_path.default.join(rootPath, "summary.json");
  const generateSummaryFile = () => {
    try {
      if (!import_jsonfile.default.readFileSync(filePath)) {
        import_jsonfile.default.writeFileSync(filePath, []);
      }
    } catch (e) {
    }
  };
  const getSummary = () => {
    try {
      return import_jsonfile.default.readFileSync(filePath, { encoding: "utf-8" });
    } catch (e) {
      console.error(e);
      throw new Error("get post summary error");
    }
  };
  const getPostSummary = (potsTitle) => {
    var _a;
    try {
      const summaryFile = import_jsonfile.default.readFileSync(filePath, { encoding: "utf-8" });
      return (_a = summaryFile.filter((summary) => summary.postTitle === potsTitle)) == null ? void 0 : _a.at(0);
    } catch (e) {
      console.error(e);
      throw new Error("get post summary error");
    }
  };
  const addPostSummary = (content) => {
    const jsonData = import_jsonfile.default.readFileSync(filePath);
    jsonData.push(content);
    try {
      import_jsonfile.default.writeFileSync(filePath, jsonData, { flag: "w", spaces: 2 });
    } catch (e) {
      console.error(e);
      throw new Error("add post summary error");
    }
  };
  return {
    addPostSummary,
    getPostSummary,
    generateSummaryFile,
    getSummary
  };
}

// index.ts
var import_isomorphic_fetch = require("isomorphic-fetch");
var config = hexo.config.chatgpt_summary;
if (config.enable) {
  if (!config.accessToken && !config.apiKey) {
    throw new Error("accessToken or apiKey is undefined");
  }
  const generatePostSummaryError = [];
  const { addPostSummary, getPostSummary, generateSummaryFile } = summaryJSON();
  hexo.extend.console.register("chatgpt", async () => {
    const generatePostSummary = await chatGPT(config);
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
        const prompt = `\u5E2E\u6211\u7528\u4E2D\u6587\u603B\u7ED3\u8FD9\u7BC7\u6587\u7AE0\uFF0C50 \u5B57\u5DE6\u53F3: 
${postContent}`;
        const newSummary = await generatePostSummary(prompt);
        if (!newSummary) {
          generatePostSummaryError.push(postPath);
          continue;
        }
        const content = {
          postPath,
          postTitle,
          summary: newSummary.text
        };
        addPostSummary(content);
      }
    }
    const errorInfo = generatePostSummaryError;
    errorInfo.forEach((error) => console.info(`\u751F\u6210\u5931\u8D25: ${error}`));
  });
  hexo.extend.filter.register("after_render:html", (data) => {
    var _a, _b;
    const postTitle = (_a = data.match(/(?<=<p>TLDR-).*?(?=<\/p>)/)) == null ? void 0 : _a.at(0);
    const deleteTLDR = (content2) => {
      return content2.replace(/<p>TLDR-.*?<\/p>/, "");
    };
    if (!postTitle) {
      data = deleteTLDR(data);
      return data;
    }
    const summary = (_b = getPostSummary(postTitle)) == null ? void 0 : _b.summary;
    if (!summary) {
      data = deleteTLDR(data);
      return data;
    }
    const summaryElement = `<div class="tldr"><p class="tldr-content">${summary}</p></div>`;
    if (!config.customPosition) {
      const content2 = data.replace(/<p>TLDR-.*?<\/p>/g, summaryElement);
      data = content2;
      return data;
    }
    const content = deleteTLDR(data).replace(`<div id=${config.customPosition}></div>`, () => `<div id="${config.customPosition}">${summary}</div>`).replace(`<div id="${config.customPosition}"></div>`, () => `<div id="${config.customPosition}">${summary}</div>`);
    data = content;
    return data;
  });
}
