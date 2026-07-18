import { describe, expect, it } from "vitest";

import { integrationParticipants } from "../config/deployments";
import { coston2 } from "../config/network";
import {
  getWalletNetworkState,
  getWalletRole,
  getWalletRoleLabel,
  shortenAddress,
} from "./wallet-identity";

describe("wallet identity", () => {
  it("recognizes the completed Task #1 participants case-insensitively", () => {
    expect(getWalletRole(integrationParticipants.creator.toLowerCase() as `0x${string}`))
      .toBe("task-1-creator");
    expect(getWalletRole(integrationParticipants.worker)).toBe("task-1-worker");
  });

  it("treats any other address as a future testnet participant", () => {
    expect(getWalletRole("0x0000000000000000000000000000000000000001"))
      .toBe("new-participant");
    expect(getWalletRole(undefined)).toBe("new-participant");
  });

  it("uses explicit human-readable role labels", () => {
    expect(getWalletRoleLabel("task-1-creator")).toBe("Task #1 Creator");
    expect(getWalletRoleLabel("task-1-worker")).toBe("Task #1 Worker");
    expect(getWalletRoleLabel("new-participant")).toBe(
      "New testnet participant",
    );
  });

  it("distinguishes Coston2, a wrong network, and no connection", () => {
    expect(getWalletNetworkState(coston2.id)).toBe("coston2");
    expect(getWalletNetworkState(1)).toBe("wrong-network");
    expect(getWalletNetworkState(undefined)).toBe("disconnected");
  });

  it("shortens an address without changing its identifying ends", () => {
    expect(shortenAddress(integrationParticipants.creator)).toBe(
      "0x43bb96…cf6a2D",
    );
  });
});
