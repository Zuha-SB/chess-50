import { cache } from "./cache";

const urlToFileName = (url: string) => {
  return url.replace(/\W+/g, "_");
};

export const fetchText = async (url: string, init?: RequestInit) => {
  const key = urlToFileName(url);
  return cache(key, async () => {
    const response = await fetch(url, init);
    return response.text();
  });
};

export const fetchJson = async (url: string, init?: RequestInit) => {
  const text = await fetchText(url, init);
  return JSON.parse(text);
};
