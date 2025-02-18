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
    return await fs.readFile(filename, "utf-8");
  } catch (e) {
    const data = await callback();
    await fs.writeFile(filename, data, "utf-8");
    return data;
  }
};
