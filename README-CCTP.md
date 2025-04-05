# CCTP 跨鏈轉賬實現說明

本文檔說明了在付款頁面中使用 CCTP（Circle Cross-Chain Transfer Protocol）跨鏈轉賬 USDC 的實現。

## 功能概述

- 當源鏈和目標鏈都在 Ethereum、Avalanche、Base 和 Linea 之間，且選擇的代幣是 USDC 時，系統會自動使用 CCTP 進行跨鏈轉賬
- 支持 CCTP 的鏈和 USDC 代幣在 UI 中會顯示「快速」標籤
- 在確認付款時，如果使用 CCTP，會顯示相關提示

## 技術實現

1. `useCCTPTransfer` Hook - 實現與 CCTP 合約交互的邏輯
2. 付款流程判斷邏輯 - 根據源鏈、目標鏈和代幣類型選擇使用 CCTP 或 FusionPlus
3. UI 標籤 - 為支持 CCTP 的鏈和 USDC 代幣添加「快速」標籤

## 支持的鏈和地址

支持 CCTP 的鏈：
- Ethereum (Chain ID: 1)
- Avalanche (Chain ID: 43114)
- Base (Chain ID: 8453)
- Linea (Chain ID: 59144)

每條鏈上的 USDC 合約地址：
- Ethereum: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
- Avalanche: 0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E
- Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- Linea: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff

## 使用方法

1. 在付款頁面選擇支持 CCTP 的鏈（帶有「快速」標籤）
2. 選擇 USDC 代幣（帶有「快速」標籤）
3. 當源鏈和目標鏈都支持 CCTP 且選擇 USDC 時，系統會自動使用 CCTP 進行轉賬

## 實現注意事項

- 目前 CCTP 實現是基本框架，需要與實際 CCTP 合約進行交互
- 在生產環境中，需要完善錯誤處理和交易監控
- 應添加適當的測試以確保功能正常運行

## 未來擴展計劃

- 支持更多 CCTP 支持的鏈
- 添加交易狀態跟踪和歷史記錄
- 優化 UI/UX 體驗 