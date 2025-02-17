import fs from "fs/promises";
import path from "path";

const CACHE = "__CACHE__";

const makeCacheDirectory = async () => {
  try {
    await fs.mkdir(path.join(__dirname, CACHE));
  } catch (e) {}
};

export const cache = async (key: string, callback: () => Promise<string>) => {
  const filename = path.join(__dirname, CACHE, key);
  try {
    await makeCacheDirectory();
    console.log(key);
    return await fs.readFile(filename, "utf-8");
  } catch (e) {
    const data = await callback();
    await fs.writeFile(filename, data, "utf-8");
    return data;
  }
};

export const cacheJSON = async <T>(
  key: string,
  callback: () => Promise<T>
): Promise<T> => {
  const result = await cache(key, async () => {
    return JSON.stringify(await callback(), null, "\t");
  });
  return JSON.parse(result);
};
