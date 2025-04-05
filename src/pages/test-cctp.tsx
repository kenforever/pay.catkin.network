import { useState, FormEvent, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId } from 'wagmi';
import { useCCTPTransfer } from '../hooks/use-CCTP-transfer';
import { SupportedChainId } from '@/lib/chains';
import type { NextPage } from 'next';
import Head from 'next/head';

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '1rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.25rem'
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: '4px'
  },
  select: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: '4px'
  },
  small: {
    fontSize: '0.75rem',
    color: '#666'
  },
  button: {
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none'
  },
  buttonDisabled: {
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    fontWeight: 'bold',
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
    border: 'none',
    color: 'white'
  },
  successBox: {
    marginTop: '1.5rem',
    padding: '1rem',
    backgroundColor: '#d1fae5',
    border: '1px solid #10b981',
    borderRadius: '4px'
  },
  errorBox: {
    marginTop: '1.5rem',
    padding: '1rem',
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    borderRadius: '4px'
  },
  logBox: {
    marginTop: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    maxHeight: '200px',
    overflow: 'auto'
  },
  link: {
    color: 'blue',
    textDecoration: 'underline'
  }
};

const TestCCTPPage: NextPage = () => {
  const { isConnected } = useAccount();
  const currentChainId = useChainId();
 console.log("currentChainId", currentChainId) 
  // 表單輸入狀態
  const [amount, setAmount] = useState('');
  const [destinationChainId, setDestinationChainId] = useState<SupportedChainId | ''>('');
  const [transferType, setTransferType] = useState<'fast' | 'standard'>('standard');
  const [destinationAddress, setDestinationAddress] = useState('');
  
  // 儲存證明和交易哈希的狀態
  const [attestation, setAttestation] = useState<any>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // 從hook中獲取結果
  const {
    executeTransfer,
    reset,
    currentStep,
    logs,
    error,
    isLoading,
    isSuccess,
    isError,
  } = useCCTPTransfer({
    sourceChainId: currentChainId as SupportedChainId,
    destinationChainId: destinationChainId as SupportedChainId,
    amount,
    transferType,
    destinationAddress: destinationAddress || undefined
  });

  // 處理表單提交
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const result = await executeTransfer();
      if (result) {
        setAttestation(result);
        setTxHash(result.transactionHash || null);
      }
    } catch (err) {
      console.error('交易失敗:', err);
    }
  };

  // 重置所有狀態
  const handleReset = () => {
    reset();
    setAttestation(null);
    setTxHash(null);
  };

  // 檢查表單是否可提交
  const isFormValid = isConnected && amount && destinationChainId && 
                      Object.values(SupportedChainId).includes(currentChainId as SupportedChainId);
  const sourceChainId = currentChainId as SupportedChainId;

  return (
    <>
      <Head>
        <title>CCTP 跨鏈轉賬測試</title>
        <meta name="description" content="測試 CCTP 跨鏈轉賬功能" />
      </Head>

      <div style={styles.container}>
        <h1 style={styles.title}>CCTP 跨鏈轉賬測試</h1>
        
        {!isConnected ? (
          <div style={styles.formGroup}>
            <p style={{ marginBottom: '0.5rem' }}>請先連接您的錢包:</p>
            <ConnectButton />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>轉賬金額 (必填):</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={styles.input}
                placeholder="例如: 10"
                required
              />
              <small style={styles.small}>以 USDC 為單位 (例如: 10 USDC)</small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>源鏈:</label>
              <div style={{...styles.input, backgroundColor: '#f3f4f6'}}>
                {sourceChainId === SupportedChainId.ETH_SEPOLIA && "Ethereum Sepolia (11155111)"}
                {sourceChainId === SupportedChainId.AVAX_FUJI && "Avalanche Fuji (43113)"}
                {sourceChainId === SupportedChainId.BASE_SEPOLIA && "Base Sepolia (84532)"}
                {!Object.values(SupportedChainId).includes(sourceChainId) && "不支持的鏈"}
              </div>
              <small style={styles.small}>當前已連接的鏈將作為源鏈</small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>目標鏈 (必填):</label>
              <select
                value={destinationChainId}
                onChange={(e) => setDestinationChainId(e.target.value ? Number(e.target.value) as SupportedChainId : '')}
                style={styles.select}
                required
              >
                <option value="">請選擇目標鏈</option>
                <option value={SupportedChainId.ETH_SEPOLIA}>Ethereum Sepolia (11155111)</option>
                <option value={SupportedChainId.AVAX_FUJI}>Avalanche Fuji (43113)</option>
                <option value={SupportedChainId.BASE_SEPOLIA}>Base Sepolia (84532)</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>轉賬類型:</label>
              <select
                value={transferType}
                onChange={(e) => setTransferType(e.target.value as 'fast' | 'standard')}
                style={styles.select}
              >
                <option value="standard">標準</option>
                <option value="fast">快速</option>
              </select>
              <small style={styles.small}>快速轉賬有較低的確認閾值</small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>目標地址 (可選，默認為當前錢包地址):</label>
              <input
                type="text"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                style={styles.input}
                placeholder="0x..."
              />
            </div>

            <div style={{ marginBottom: '1rem', display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                style={!isFormValid || isLoading ? styles.buttonDisabled : styles.button}
              >
                {isLoading ? '處理中...' : '執行 CCTP 跨鏈轉賬'}
              </button>
              
              <button
                type="button"
                onClick={handleReset}
                style={{
                  ...styles.button,
                  backgroundColor: '#6b7280'
                }}
              >
                重置
              </button>
            </div>
          </form>
        )}

        {/* 日誌顯示 */}
        {logs.length > 0 && (
          <div style={styles.logBox}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>轉賬日誌:</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {logs.map((log, index) => (
                <li key={index} style={{ marginBottom: '0.25rem' }}>{log}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 步驟顯示 */}
        {currentStep !== 'idle' && (
          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>當前步驟:</h3>
            <div style={{ 
              padding: '0.5rem', 
              borderRadius: '4px',
              backgroundColor: 
                currentStep === 'error' ? '#fee2e2' : 
                currentStep === 'completed' ? '#d1fae5' : 
                '#f3f4f6' 
            }}>
              {currentStep === 'approving' && '正在批准 USDC 轉賬...'}
              {currentStep === 'burning' && '正在燃燒 USDC...'}
              {currentStep === 'waiting-attestation' && '等待證明...'}
              {currentStep === 'completed' && '完成!'}
              {currentStep === 'error' && '錯誤!'}
            </div>
          </div>
        )}

        {/* 證明顯示 */}
        {isSuccess && attestation && (
          <div style={{...styles.logBox, marginTop: '1rem'}}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>獲取的證明:</h3>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(attestation, null, 2)}
            </pre>
          </div>
        )}

        {/* 結果顯示 */}
        {isSuccess && (
          <div style={styles.successBox}>
            <h3 style={{ fontWeight: 'bold', color: '#047857' }}>交易成功!</h3>
            <p>CCTP 跨鏈轉賬已完成</p>
            {txHash && <p>交易哈希: {txHash}</p>}
          </div>
        )}

        {isError && (
          <div style={styles.errorBox}>
            <h3 style={{ fontWeight: 'bold', color: '#b91c1c' }}>交易失敗</h3>
            <p>{typeof error === 'string' ? error : (error ? String(error) : '發生未知錯誤')}</p>
          </div>
        )}
      </div>
    </>
  );
};

export default TestCCTPPage;
