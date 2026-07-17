import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("FortuneContractModule", (m) => {
  const fortuneContract = m.contract("FortuneContract");
  return { fortuneContract };
});
