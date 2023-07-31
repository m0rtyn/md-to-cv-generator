import { readFile, writeFile } from "fs/promises";

const jewelsAndStones = () => {
  const input = "abbbb311A\naAAbb0—35эaAbb,4bb".toLowerCase();
  if (input.length === 0) return 0;

  const [j, s] = input.split("\n"); //?
  if (j.length === 0 || s.length === 0) return 0;

  const jSet = new Set(j.split(""));

  const result = s.split("").reduce((acc, el) => {
    console.log(el, s);
    const isJ = jSet.has(el);
    return isJ ? acc + 1 : acc;
  }, 0);

  console.debug("🚀 ~ s.split", s.split(""));

  console.log(result);
  return result;
};

jewelsAndStones(); //?
