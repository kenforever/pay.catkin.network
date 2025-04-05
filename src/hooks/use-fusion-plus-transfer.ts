import { useState, useCallback } from 'react';
import { 
  SDK, 
  HashLock, 
  NetworkEnum,
  type EIP712TypedData,
  type BlockchainProviderConnector,
  type SupportedChain
} from "@1inch/cross-chain-sdk";
import { 
  useAccount, 
  usePublicClient, 
  useWalletClient, 
  useConfig 
} from 'wagmi';
import { WalletClient, type SignTypedDataParameters, PublicClient } from 'viem';
import { solidityPackedKeccak256, randomBytes, Contract, Wallet, JsonRpcProvider } from 'ethers';

// 輔助函數：生成隨機字節
function getRandomBytes32() {
  // for some reason the cross-chain-sdk expects a leading 0x and can't handle a 32 byte long hex string
  return '0x' + Buffer.from(randomBytes(32)).toString('hex');
}

// 定義 MerkleLeaf 類型，以便在下面使用
type MerkleLeaf = string & { _tag: "MerkleLeaf" };

// 創建一個從 WalletClient 適配到 1inch SDK 所需的 BlockchainProvider 的接口
class WalletClientProviderConnector implements BlockchainProviderConnector {
  private walletClient: WalletClient;
  private publicClient: PublicClient;
  
  constructor(walletClient: WalletClient, publicClient: PublicClient) {
    this.walletClient = walletClient;
    this.publicClient = publicClient;
  }

  // 實現 BlockchainProvider 必需的方法
  async signTypedData(
    walletAddress: string,
    typedData: EIP712TypedData
  ): Promise<string> {
    console.log("Received data for signing:");
    console.log("Wallet Address:", walletAddress);
    console.log("Typed Data:", JSON.stringify(typedData, null, 2));
    console.log("Account from WalletClient:", this.walletClient.account);

    // 從 typedData 中提取所需參數
    const { domain, types, primaryType, message } = typedData;

    // 驗證提取的參數
    if (typeof domain !== 'object' || domain === null) {
      console.error("Invalid domain extracted:", domain);
      throw new Error(`Invalid domain received in typedData: ${JSON.stringify(domain)}`);
    }
    if (typeof types !== 'object' || types === null) {
        console.error("Invalid types extracted:", types);
        throw new Error(`Invalid types received in typedData: ${JSON.stringify(types)}`);
    }
    if (typeof primaryType !== 'string') {
        console.error("Invalid primaryType extracted:", primaryType);
        throw new Error(`Invalid primaryType received in typedData: ${JSON.stringify(primaryType)}`);
    }
    if (typeof message !== 'object' || message === null) {
        console.error("Invalid message extracted:", message);
        throw new Error(`Invalid message received in typedData: ${JSON.stringify(message)}`);
    }

    // 確保 account 存在
    if (!this.walletClient.account) {
        throw new Error('WalletClient account is missing.');
    }

    console.log("Extracted parameters for viem:");
    console.log("Domain:", JSON.stringify(domain, null, 2));
    console.log("Types:", JSON.stringify(types, null, 2));
    console.log("Primary Type:", primaryType);
    console.log("Message:", JSON.stringify(message, null, 2));
    console.log("Account:", this.walletClient.account);

    try {
      // 使用從 typedData 提取的參數調用 viem
      return await this.walletClient.signTypedData({
        domain,
        types,
        primaryType,
        message,
        account: this.walletClient.account
      });
    } catch (error) {
      console.error("Error in viem signTypedData call:", error);
      // 可以在這裡添加更詳細的錯誤類型檢查和處理
      throw error; // 重新拋出原始錯誤以便上層處理
    }
  }

  // 添加 ethCall 方法以滿足 BlockchainProviderConnector 接口
  async ethCall(contractAddress: string, callData: string): Promise<string> {
    // 使用傳入的 publicClient 進行 eth_call
    if (!this.publicClient) {
      throw new Error("PublicClient is not available.");
    }
    try {
        const result = await this.publicClient.call({
            to: contractAddress as `0x${string}`,
            data: callData as `0x${string}`,
            // eth_call 通常不需要 account
        });
        return result.data || ''; 
    } catch (error) {
        console.error("Error during ethCall:", error);
        throw error;
    }
  }

  async sendTransaction(transaction: any): Promise<any> {
     // 確保 walletClient.account 存在
     if (!this.walletClient.account) {
        throw new Error('WalletClient account is missing for sendTransaction.');
      }
    console.log("Sending transaction:", transaction);
    try {
        const txHash = await this.walletClient.sendTransaction({
          ...transaction,
          account: this.walletClient.account,
        });
        console.log("Transaction sent, hash:", txHash);
        // 1inch SDK 期望返回 { hash: string }
        return { hash: txHash }; 
    } catch(error) {
        console.error("Error sending transaction:", error);
        throw error;
    }
  }
}

export interface CrossChainTransferParams {
  // 要轉移的金額
  amount: string;
  // 目標鏈 ID
  dstChainId: NetworkEnum;
  // 可選的目標地址，默認使用當前連接的錢包地址
  dstAddress?: string;
  // 源代幣地址，默認為 ETH
  srcTokenAddress?: string;
  // 目標代幣地址，默認為 ETH
  dstTokenAddress?: string;
  // 1inch API 密鑰 (如果 SDK 需要)
  authKey?: string; // 改為可選，因為 SDK 初始化時不需要了
}

interface CrossChainTransferResult {
  // 執行跨鏈轉移
  transfer: () => Promise<{ txHash: string } | void>; // 返回類型可能為 void 如果 placeOrder 不返回 hash
  // 交易狀態
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  // 錯誤信息
  error: Error | null;
  // 交易哈希 (如果能獲取到)
  txHash: string | null;
}

export const useFusionPlusTransfer = ({
  amount,
  dstChainId,
  dstAddress,
  srcTokenAddress = "0x6b175474e89094c44da98b954eedeac495271d0f", // 默認 DAI
  dstTokenAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // 默認 ETH
}: Omit<CrossChainTransferParams, 'authKey'>): CrossChainTransferResult => {
  // 狀態管理
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // 獲取 wagmi hooks
  const { address, chain } = useAccount();
  const { chains } = useConfig();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const transfer = useCallback(async () => {
    if (!walletClient || !publicClient || !address || !chain) {
      const err = new Error('錢包未連接、PublicClient 不可用或鏈信息缺失');
      setError(err);
      setIsError(true);
      console.error(err.message, { walletClient, publicClient, address, chain });
      // 不再拋出錯誤，而是返回，讓 UI 處理
      return; 
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);
    setTxHash(null);
    setIsSuccess(false);

    try {
      // 創建 SDK blockchainProvider，傳入 publicClient
      const blockchainProvider = new WalletClientProviderConnector(walletClient, publicClient);
      
      // 初始化 1inch SDK (移除 authKey)
      const sdk = new SDK({
        url: "http://localhost:8888/fusion-plus",
        blockchainProvider
      });

      // 設置跨鏈轉移參數
      const params = {
        srcChainId: chain.id as SupportedChain, // 將 NetworkEnum 斷言為 SupportedChain
        dstChainId: dstChainId as SupportedChain, // 同樣斷言 dstChainId
        srcTokenAddress: srcTokenAddress,
        dstTokenAddress: dstTokenAddress,
        amount: amount,
        enableEstimate: true,
        walletAddress: dstAddress || address
      };
      console.log("Requesting quote with params:", params);

      // 獲取報價
      const quote = await sdk.getQuote(params);
      console.log("Received quote:", quote);
    
      // 哈希鎖定處理
      const secretsCount = quote.getPreset().secretsCount;
      console.log("Secrets count:", secretsCount);
      const secrets = Array.from({ length: secretsCount }).map(() => getRandomBytes32());
      const secretHashes = secrets.map((x) => HashLock.hashSecret(x));
      console.log("Generated secrets and hashes");

      // 創建哈希鎖
      const hashLock = secretsCount === 1
        ? HashLock.forSingleFill(secrets[0])
        : HashLock.forMultipleFills(
            secretHashes.map((secretHash, i) => 
              solidityPackedKeccak256(["uint64", "bytes32"], [i, secretHash.toString()])
            ) as MerkleLeaf[]
          );
      console.log("Created hash lock");


      // 下單參數
      const orderParams = {
        walletAddress: address,
        hashLock,
        secretHashes,
        // 可選的費用配置
        fee: {
          takingFeeBps: 100, // 1%，以 bps 格式，1% 等於 100bps
          takingFeeReceiver: "0x0000000000000000000000000000000000000000" // 費用接收者地址
        }
      };
      console.log("Placing order with params:", orderParams);

      // 下單
      const result = await sdk.placeOrder(quote, orderParams);
      console.log("Order placed, result:", result);

      // 檢查 result 結構並嘗試獲取哈希
      // 注意：placeOrder 的確切返回類型可能需要根據 SDK 文檔或實際響應調整
      let finalTxHash = null;
      if (result && typeof result === 'object') {
        if ('hash' in result && typeof result.hash === 'string') {
          finalTxHash = result.hash;
        } else if ('tx' in result && typeof result.tx === 'object' && result.tx && 'hash' in result.tx && typeof result.tx.hash === 'string') {
          finalTxHash = result.tx.hash;
        } else {
          console.warn("Could not find transaction hash in placeOrder result:", result);
          // 如果沒有直接的哈希，可能需要監聽事件或進行其他操作
        }
      }
      
      // 設置成功狀態
      if(finalTxHash) {
          setTxHash(finalTxHash);
          setIsSuccess(true);
          return { txHash: finalTxHash };
      } else {
          // 訂單可能已提交但沒有立即返回哈希
          setIsSuccess(true); // 標記為成功，但沒有哈希
          console.log("Order placed successfully, but no immediate tx hash found.");
          return; // 或返回一個表示狀態的對象
      }

    } catch (err) {
      // 錯誤處理
      console.error("Error during cross-chain transfer process:", err);
      setIsError(true);
      setError(err instanceof Error ? err : new Error(String(err)));
      // 不再拋出，由 UI 顯示錯誤
    } finally {
      setIsLoading(false);
    }
  }, [
    walletClient, 
    publicClient,
    address, 
    chain, 
    dstChainId, 
    dstAddress, 
    srcTokenAddress, 
    dstTokenAddress, 
    amount
  ]);

  return {
    transfer,
    isLoading,
    isSuccess,
    isError,
    error,
    txHash
  };
};

export default useFusionPlusTransfer;
