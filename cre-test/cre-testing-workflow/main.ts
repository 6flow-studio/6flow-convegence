import { cre, ok, consensusIdenticalAggregation, getNetwork, bytesToHex, Runner, type Runtime, type HTTPSendRequester, EVMLog } from "@chainlink/cre-sdk";
import { keccak256, toHex, encodeFunctionData, decodeEventLog, parseAbi } from "viem";

type Config = Record<string, never>;

const fetch_http_1 = (sendRequester: HTTPSendRequester, config: Config) => {
  const req = {
    url: "https://api.example.com/validate",
    method: "POST" as const,
    headers: {
      "Content-Type": "application/json",
    },
    body: Buffer.from(new TextEncoder().encode(JSON.stringify(`{"address":"${step_trigger_1.to}","balance":"${step_evm_read_1.balance}"}`))).toString("base64"),
  };

  const resp = sendRequester.sendRequest(req).result();

  if (!ok(resp)) {
    throw new Error(`HTTP request failed with status: ${resp.statusCode}`);
  }

  return { statusCode: resp.statusCode, body: resp.body, headers: resp.headers };
};

const onLogTrigger = (runtime: Runtime<Config>, triggerData: EVMLog): string => {
  const httpClient = new cre.capabilities.HTTPClient();
  const evmClient_base_testnet_sepolia = new cre.capabilities.EVMClient(getNetwork({ chainFamily: "evm", chainSelectorName: "base-testnet-sepolia", isTestnet: true })!.chainSelector.selector);

  // Check Balance
  const step_evm_read_1 = evmClient_ethereum_testnet_sepolia.read(runtime, {
    contractAddress: "0x1234567890abcdef1234567890abcdef12345678",
    functionName: "balanceOf",
    abi: parseAbi(["{"type":"function","name":"balanceOf","inputs":[{"name":"account","type":"address","indexed":null,"components":null}],"outputs":[{"name":"balance","type":"uint256","indexed":null,"components":null}],"stateMutability":"view"}"]),
    args: [step_trigger_1.to],
  }).result();
  // Validate User
  const step_http_1 = httpClient.sendRequest(runtime, fetch_http_1, consensusIdenticalAggregation())(runtime.config).result();
  // Parse Validation
  const step_parse_1 = JSON.parse(Buffer.from(step_http_1.body, "base64").toString("utf-8"));
  // Is Valid?
  if (step_parse_1.isValid === "true") {
    // ABI encode mint call
    const step_mint_1___encode = {
      encoded: encodeFunctionData({
        abi: [{"name":"to","type":"address","indexed":null,"components":null},{"name":"amount","type":"uint256","indexed":null,"components":null}],
        args: [step_trigger_1.to, step_evm_read_1.balance],
      }),
    };
    // Execute mint transaction
    const step_mint_1___write = evmClient_base_testnet_sepolia.write(runtime, {
      receiverAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      gasLimit: BigInt(500000),
      data: step_mint_1___encode.encoded,
    }).result();
    return "\"Minted successfully\"";
  } else {
    throw new Error(`User ${step_trigger_1.to} failed validation`);
  }
};

const initWorkflow = (config: Config) => {
  const network = getNetwork({ chainFamily: "evm", chainSelectorName: "ethereum-testnet-sepolia", isTestnet: true });

  if (!network) {
    throw new Error("Network not found for chain selector");
  }

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

  const eventTopicHash = keccak256(toHex("Transfer(address,address,uint256)"));

  return [
    cre.handler(
      evmClient.logTrigger({
        addresses: ["0x1234567890abcdef1234567890abcdef12345678"],
        topics: [{ values: [eventTopicHash] }],
        confidence: "finalized",
      }),
      onLogTrigger,
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();
