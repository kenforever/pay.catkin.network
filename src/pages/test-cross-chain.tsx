import { useState, FormEvent } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { NetworkEnum } from '@1inch/cross-chain-sdk';
import useFusionPlusTransfer from '../hooks/use-fusion-plus-transfer';
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
  link: {
    color: 'blue',
    textDecoration: 'underline'
  }
};

const TestCrossChainPage: NextPage = () => {
  const { isConnected } = useAccount();
  
  // 表單輸入狀態
  const [amount, setAmount] = useState('');
  const [dstChainId, setDstChainId] = useState('');
  const [dstAddress, setDstAddress] = useState('');
  const [srcTokenAddress, setSrcTokenAddress] = useState('0x6b175474e89094c44da98b954eedeac495271d0f'); // 默認 DAI
  const [dstTokenAddress, setDstTokenAddress] = useState('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'); // 默認 ETH

  // Hook 結果
  const {
    transfer,
    isLoading,
    isSuccess,
    isError,
    error,
    txHash
  } = useFusionPlusTransfer({
    amount,
    dstChainId: dstChainId ? Number(dstChainId) as NetworkEnum : NetworkEnum.ETHEREUM,
    dstAddress,
    srcTokenAddress,
    dstTokenAddress
  });

  // 處理表單提交
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await transfer();
    } catch (err) {
      console.error('交易失敗:', err);
    }
  };

  // 鏈 ID 選項
  const chainOptions = [
    { value: NetworkEnum.ETHEREUM, label: 'Ethereum (1)' },
    { value: NetworkEnum.GNOSIS, label: 'Gnosis (100)' },
    { value: NetworkEnum.POLYGON, label: 'Polygon (137)' },
    { value: NetworkEnum.BINANCE, label: 'Binance Smart Chain (56)' },
    { value: NetworkEnum.OPTIMISM, label: 'Optimism (10)' },
    { value: NetworkEnum.ARBITRUM, label: 'Arbitrum (42161)' },
    { value: NetworkEnum.AVALANCHE, label: 'Avalanche (43114)' },
  ];

  return (
    <>
      <Head>
        <title>跨鏈轉賬測試</title>
        <meta name="description" content="測試跨鏈轉賬功能" />
      </Head>

      <div style={styles.container}>
        <h1 style={styles.title}>跨鏈轉賬測試</h1>
        
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
                placeholder="例如: 1000000000000000000"
                required
              />
              <small style={styles.small}>以 wei 為單位 (1 ETH = 10^18 wei)</small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>目標鏈 ID (必填):</label>
              <select
                value={dstChainId}
                onChange={(e) => setDstChainId(e.target.value)}
                style={styles.select}
                required
              >
                <option value="">請選擇目標鏈</option>
                {chainOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>目標地址 (可選，默認為當前錢包地址):</label>
              <input
                type="text"
                value={dstAddress}
                onChange={(e) => setDstAddress(e.target.value)}
                style={styles.input}
                placeholder="0x..."
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>源代幣地址 (可選):</label>
              <input
                type="text"
                value={srcTokenAddress}
                onChange={(e) => setSrcTokenAddress(e.target.value)}
                style={styles.input}
                placeholder="0x..."
              />
              <small style={styles.small}>默認為 DAI (0x6b175474e89094c44da98b954eedeac495271d0f)</small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>目標代幣地址 (可選):</label>
              <input
                type="text"
                value={dstTokenAddress}
                onChange={(e) => setDstTokenAddress(e.target.value)}
                style={styles.input}
                placeholder="0x..."
              />
              <small style={styles.small}>默認為 ETH (0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee)</small>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={isLoading ? styles.buttonDisabled : styles.button}
            >
              {isLoading ? '處理中...' : '執行跨鏈轉賬'}
            </button>
          </form>
        )}

        {/* 結果顯示 */}
        {isSuccess && (
          <div style={styles.successBox}>
            <h3 style={{ fontWeight: 'bold', color: '#047857' }}>交易成功!</h3>
            <p>交易哈希: {txHash}</p>
          </div>
        )}

        {isError && (
          <div style={styles.errorBox}>
            <h3 style={{ fontWeight: 'bold', color: '#b91c1c' }}>交易失敗</h3>
            <p>{error?.message || '發生未知錯誤'}</p>
          </div>
        )}
      </div>
    </>
  );
};

export default TestCrossChainPage; 