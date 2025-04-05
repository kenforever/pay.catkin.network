const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api"

// Authentication endpoints
export const authEndpoints = {
  getSiweMessage: `${API_BASE_URL}/auth/get_siwe_message`,
  verifySiwe: `${API_BASE_URL}/auth/verify_siwe`,
}

// Product endpoints
export const productEndpoints = {
  createProduct: `${API_BASE_URL}/product/product`,
  getProducts: `${API_BASE_URL}/product/products`,
  getProduct: (productId: number | string) => `${API_BASE_URL}/product/product/${productId}`,
  updateProduct: (productId: number | string) => `${API_BASE_URL}/product/product/${productId}`,
  deleteProduct: (productId: number | string) => `${API_BASE_URL}/product/product/${productId}`,
  getMyProducts: `${API_BASE_URL}/product/my-products`,
  searchProducts: `${API_BASE_URL}/product/products/search`,
}

// Payment endpoints
export const paymentEndpoints = {
  newPayment: `${API_BASE_URL}/payment/new`,
  submitTransaction: (paymentId: string, txHash: string) =>
    `${API_BASE_URL}/payment/tx/submit?payment_id=${paymentId}&tx_hash=${txHash}`,
  getTransactionStatus: (paymentId: string) => `${API_BASE_URL}/payment/${paymentId}/status`,
}

// Types based on the OpenAPI schema
export interface ProductCreate {
  image_uri?: string | null
  title: string
  description?: string | null
  price: number
}

export interface ProductResponse {
  id: number
  created_at: string
  owner: string
  image_uri?: string | null
  title: string
  description?: string | null
  price: number
}

export interface ProductUpdate {
  image_uri?: string | null
  title?: string | null
  description?: string | null
  price?: number | null
}

// API client functions
export async function fetchProduct(productId: number | string): Promise<ProductResponse> {
  const response = await fetch(productEndpoints.getProduct(productId))
  if (!response.ok) {
    throw new Error(`Failed to fetch product: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchProducts(): Promise<ProductResponse[]> {
  const response = await fetch(productEndpoints.getProducts)
  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.statusText}`)
  }
  return response.json()
}

export async function createPayment(productId?: string, userAlias?: string) {
  let url = paymentEndpoints.newPayment

  if (productId) {
    url += `?product_id=${productId}`
  } else if (userAlias) {
    url += `?user_alias=${userAlias}`
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to create payment: ${response.statusText}`)
  }
  return response.json()
}

export async function submitTransaction(paymentId: string, txHash: string) {
  const response = await fetch(paymentEndpoints.submitTransaction(paymentId, txHash))
  if (!response.ok) {
    throw new Error(`Failed to submit transaction: ${response.statusText}`)
  }
  return response.json()
}

export async function getTransactionStatus(paymentId: string) {
  const response = await fetch(paymentEndpoints.getTransactionStatus(paymentId))
  if (!response.ok) {
    throw new Error(`Failed to get transaction status: ${response.statusText}`)
  }
  return response.json()
}

