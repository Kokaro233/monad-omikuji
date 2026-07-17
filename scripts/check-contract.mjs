import { readFile } from "node:fs/promises";
import solc from "solc";

const source = await readFile(new URL("../contracts/FortuneContract.sol", import.meta.url), "utf8");
const input = {
  language: "Solidity",
  sources: { "FortuneContract.sol": { content: source } },
  settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors ?? []).filter((entry) => entry.severity === "error");

if (errors.length) {
  for (const error of errors) console.error(error.formattedMessage);
  process.exitCode = 1;
} else {
  const contract = output.contracts["FortuneContract.sol"].FortuneContract;
  if (!contract.evm.bytecode.object) throw new Error("FortuneContract bytecode is empty.");
  console.log(`FortuneContract verified with solc ${solc.version()} (${contract.abi.length} ABI entries).`);
}
