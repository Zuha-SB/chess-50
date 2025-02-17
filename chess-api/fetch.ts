import { cacheJSON } from "./cache";

const urlToFileName = (url: string) => {
  return url.replace(/\W+/g, "_");
};

export const getJSON = async (url: string, init?: RequestInit) => {
  const key = urlToFileName(url);
  const text = await cacheJSON(key, async () => {
    const response = await fetch(url, init);
    return response.text();
  });
  return JSON.parse(text);
};
