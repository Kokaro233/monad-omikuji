import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("FortuneContract", async function () {
  const { viem } = await network.create();

  it("maps all weighted roll boundaries to the seven fortune ids", async function () {
    const contract = await viem.deployContract("FortuneContract");
    const cases: Array<[bigint, bigint]> = [[0n,0n],[4n,0n],[5n,1n],[16n,1n],[17n,2n],[34n,2n],[35n,3n],[59n,3n],[60n,4n],[79n,4n],[80n,5n],[94n,5n],[95n,6n],[99n,6n]];
    for (const [roll, fortuneId] of cases) assert.equal(await contract.read.previewFortuneForRoll([roll]), fortuneId);
  });

  it("emits records and blocks the eleventh draw from the same wallet that day", async function () {
    const contract = await viem.deployContract("FortuneContract");
    const [owner] = await viem.getWalletClients();
    await viem.assertions.emit(contract.write.drawFortune(), contract, "FortuneDrawn");
    for (let i = 1; i < 10; i++) await contract.write.drawFortune();
    assert.equal(await contract.read.getRecordCount([owner.account.address]), 10n);
    await viem.assertions.revertWithCustomError(contract.write.drawFortune(), contract, "DailyLimitReached");
  });

  it("allows independent wallets to draw", async function () {
    const contract = await viem.deployContract("FortuneContract");
    const clients = await viem.getWalletClients();
    await contract.write.drawFortune();
    const second = await viem.getContractAt("FortuneContract", contract.address, { client: { wallet: clients[1] } });
    await second.write.drawFortune();
    assert.equal(await contract.read.getRecordCount([clients[0].account.address]), 1n);
    assert.equal(await contract.read.getRecordCount([clients[1].account.address]), 1n);
  });
});
