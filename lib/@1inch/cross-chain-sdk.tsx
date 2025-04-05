export class SDK {
  constructor(options: any) {
    // Placeholder implementation
  }

  async getQuote(params: any) {
    // Placeholder implementation
    return {
      getPreset: () => ({
        secretsCount: 1,
      }),
    }
  }

  async placeOrder(quote: any, options: any) {
    // Placeholder implementation
    return {
      orderHash: "0x" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    }
  }
}

export class HashLock {
  static hashSecret(secret: string) {
    return secret // Placeholder implementation
  }

  static forSingleFill(secret: string) {
    return secret // Placeholder implementation
  }

  static forMultipleFills(secretHashes: string[]) {
    return secretHashes // Placeholder implementation
  }
}

export function getRandomBytes32() {
  return "0x" + Math.random().toString(36).substring(2, 34) // Placeholder implementation
}

