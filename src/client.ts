import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  AccountInfo,
} from '@solana/web3.js';
import {
  createInitializeInstruction,
  createCreateProductInstruction,
  createAddReviewInstruction,
  createUpdateProductInstruction,
  createDeleteProductInstruction,
  createUpdateReviewInstruction,
  createDailyClaimInstruction,
  getConfigPDA,
  getProductPDA,
  getReviewPDA,
  getUserPDA,
  getDailyClaimsPDA,
  getCurrentDateString,
} from './instructions';

// Your deployed program ID
export const PROGRAM_ID = new PublicKey('AYGsCLrgGZ7DFSQpKWphG2ryedMG9KXdPtwEqgrDA6c2');

// Default connection to devnet
export const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

export interface Product {
  productId: string;
  owner: PublicKey;
  totalScores: number;
  totalReviews: number;
  metadataUri: string;
  status: boolean;
  createdAt: number;
}

export interface Review {
  productId: string;
  reviewer: PublicKey;
  score: number;
  comment: string;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  userAddress: PublicKey;
  dailyPoints: number;
  reviewPoints: number;
  lastClaimTime: number;
  totalReviews: number;
}

export interface DailyClaims {
  user: PublicKey;
  date: string;
  claimsCount: number;
}

export interface Config {
  isInitialized: boolean;
  authority: PublicKey;
  totalProducts: number;
  totalReviews: number;
  totalUsers: number;
  totalTransactions: number;
  version: number;
}

export class KalloViewClient {
  constructor(
    public connection: Connection = connection,
    public programId: PublicKey = PROGRAM_ID
  ) {}

  // Get program accounts
  async getConfig(): Promise<Config | null> {
    try {
      const [configPDA] = getConfigPDA(this.programId);
      const accountInfo = await this.connection.getAccountInfo(configPDA);
      if (!accountInfo) return null;
      
      // Parse account data (simplified - you'd use borsh in production)
      return this.parseConfigData(accountInfo.data);
    } catch (error) {
      console.error('Error fetching config:', error);
      return null;
    }
  }

  async getProduct(productId: string): Promise<Product | null> {
    try {
      const [productPDA] = getProductPDA(this.programId, productId);
      const accountInfo = await this.connection.getAccountInfo(productPDA);
      if (!accountInfo) return null;
      
      return this.parseProductData(accountInfo.data);
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }

  async getReview(productId: string, reviewer: PublicKey): Promise<Review | null> {
    try {
      const [reviewPDA] = getReviewPDA(this.programId, productId, reviewer);
      const accountInfo = await this.connection.getAccountInfo(reviewPDA);
      if (!accountInfo) return null;
      
      return this.parseReviewData(accountInfo.data);
    } catch (error) {
      console.error('Error fetching review:', error);
      return null;
    }
  }

  async getUser(userAddress: PublicKey): Promise<User | null> {
    try {
      const [userPDA] = getUserPDA(this.programId, userAddress);
      const accountInfo = await this.connection.getAccountInfo(userPDA);
      if (!accountInfo) return null;
      
      return this.parseUserData(accountInfo.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  async getDailyClaims(userAddress: PublicKey, date?: string): Promise<DailyClaims | null> {
    try {
      const dateStr = date || getCurrentDateString();
      const [dailyClaimsPDA] = getDailyClaimsPDA(this.programId, userAddress, dateStr);
      const accountInfo = await this.connection.getAccountInfo(dailyClaimsPDA);
      if (!accountInfo) return null;
      
      return this.parseDailyClaimsData(accountInfo.data);
    } catch (error) {
      console.error('Error fetching daily claims:', error);
      return null;
    }
  }

  // Program interactions
  async createProduct(
    owner: Keypair,
    productId: string,
    metadataUri: string
  ): Promise<string> {
    const [productPDA] = getProductPDA(this.programId, productId);
    const [configPDA] = getConfigPDA(this.programId);

    const instruction = createCreateProductInstruction(
      this.programId,
      owner.publicKey,
      productPDA,
      configPDA,
      productId,
      metadataUri
    );

    const transaction = new Transaction().add(instruction);
    
    return await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [owner],
      { commitment: 'confirmed' }
    );
  }

  async updateProduct(
    owner: Keypair,
    productId: string,
    metadataUri: string
  ): Promise<string> {
    const [productPDA] = getProductPDA(this.programId, productId);

    const instruction = createUpdateProductInstruction(
      this.programId,
      owner.publicKey,
      productPDA,
      metadataUri
    );

    const transaction = new Transaction().add(instruction);
    
    return await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [owner],
      { commitment: 'confirmed' }
    );
  }

  async deleteProduct(
    owner: Keypair,
    productId: string
  ): Promise<string> {
    const [productPDA] = getProductPDA(this.programId, productId);

    const instruction = createDeleteProductInstruction(
      this.programId,
      owner.publicKey,
      productPDA
    );

    const transaction = new Transaction().add(instruction);
    
    return await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [owner],
      { commitment: 'confirmed' }
    );
  }

  async addReview(
    reviewer: Keypair,
    productId: string,
    score: number,
    comment: string
  ): Promise<string> {
    const [productPDA] = getProductPDA(this.programId, productId);
    const [reviewPDA] = getReviewPDA(this.programId, productId, reviewer.publicKey);
    const [userPDA] = getUserPDA(this.programId, reviewer.publicKey);
    const [configPDA] = getConfigPDA(this.programId);

    const instruction = createAddReviewInstruction(
      this.programId,
      reviewer.publicKey,
      productPDA,
      reviewPDA,
      userPDA,
      configPDA,
      productId,
      score,
      comment
    );

    const transaction = new Transaction().add(instruction);
    
    return await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [reviewer],
      { commitment: 'confirmed' }
    );
  }

  async updateReview(
    reviewer: Keypair,
    productId: string,
    score: number,
    comment: string
  ): Promise<string> {
    const [reviewPDA] = getReviewPDA(this.programId, productId, reviewer.publicKey);

    const instruction = createUpdateReviewInstruction(
      this.programId,
      reviewer.publicKey,
      reviewPDA,
      score,
      comment
    );

    const transaction = new Transaction().add(instruction);
    
    return await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [reviewer],
      { commitment: 'confirmed' }
    );
  }

  async dailyClaim(user: Keypair): Promise<string> {
    const [userPDA] = getUserPDA(this.programId, user.publicKey);
    const today = getCurrentDateString();
    const [dailyClaimsPDA] = getDailyClaimsPDA(this.programId, user.publicKey, today);
    const [configPDA] = getConfigPDA(this.programId);

    const instruction = createDailyClaimInstruction(
      this.programId,
      user.publicKey,
      userPDA,
      dailyClaimsPDA,
      configPDA
    );

    const transaction = new Transaction().add(instruction);
    
    return await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [user],
      { commitment: 'confirmed' }
    );
  }

  // Helper methods to parse account data
  private parseConfigData(data: Buffer): Config {
    // Simplified parsing - in production, use borsh
    const view = new DataView(data.buffer);
    return {
      isInitialized: view.getUint8(0) === 1,
      authority: new PublicKey(data.slice(1, 33)),
      totalProducts: Number(view.getBigUint64(33, true)),
      totalReviews: Number(view.getBigUint64(41, true)),
      totalUsers: Number(view.getBigUint64(49, true)),
      totalTransactions: Number(view.getBigUint64(57, true)),
      version: view.getUint8(65),
    };
  }

  private parseProductData(data: Buffer): Product {
    const view = new DataView(data.buffer);
    let offset = 1; // Skip is_initialized
    
    // Read product_id string
    const productIdLen = view.getUint32(offset, true);
    offset += 4;
    const productId = new TextDecoder().decode(data.slice(offset, offset + productIdLen));
    offset += productIdLen;
    
    // Read owner
    const owner = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // Read stats
    const totalScores = view.getUint32(offset, true);
    offset += 4;
    const totalReviews = view.getUint32(offset, true);
    offset += 4;
    
    // Read metadata_uri string
    const metadataUriLen = view.getUint32(offset, true);
    offset += 4;
    const metadataUri = new TextDecoder().decode(data.slice(offset, offset + metadataUriLen));
    offset += metadataUriLen;
    
    // Read status and timestamp
    const status = view.getUint8(offset) === 1;
    offset += 1;
    const createdAt = Number(view.getBigInt64(offset, true));
    
    return {
      productId,
      owner,
      totalScores,
      totalReviews,
      metadataUri,
      status,
      createdAt,
    };
  }

  private parseReviewData(data: Buffer): Review {
    const view = new DataView(data.buffer);
    let offset = 1; // Skip is_initialized
    
    // Read product_id string
    const productIdLen = view.getUint32(offset, true);
    offset += 4;
    const productId = new TextDecoder().decode(data.slice(offset, offset + productIdLen));
    offset += productIdLen;
    
    // Read reviewer
    const reviewer = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // Read score
    const score = view.getUint8(offset);
    offset += 1;
    
    // Read comment string
    const commentLen = view.getUint32(offset, true);
    offset += 4;
    const comment = new TextDecoder().decode(data.slice(offset, offset + commentLen));
    offset += commentLen;
    
    // Read timestamps
    const createdAt = Number(view.getBigInt64(offset, true));
    offset += 8;
    const updatedAt = Number(view.getBigInt64(offset, true));
    
    return {
      productId,
      reviewer,
      score,
      comment,
      createdAt,
      updatedAt,
    };
  }

  private parseUserData(data: Buffer): User {
    const view = new DataView(data.buffer);
    let offset = 1; // Skip is_initialized
    
    // Read user address
    const userAddress = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // Read points and stats
    const dailyPoints = Number(view.getBigUint64(offset, true));
    offset += 8;
    const reviewPoints = Number(view.getBigUint64(offset, true));
    offset += 8;
    const lastClaimTime = Number(view.getBigInt64(offset, true));
    offset += 8;
    const totalReviews = view.getUint32(offset, true);
    
    return {
      userAddress,
      dailyPoints,
      reviewPoints,
      lastClaimTime,
      totalReviews,
    };
  }

  private parseDailyClaimsData(data: Buffer): DailyClaims {
    const view = new DataView(data.buffer);
    let offset = 1; // Skip is_initialized
    
    // Read user
    const user = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // Read date string
    const dateLen = view.getUint32(offset, true);
    offset += 4;
    const date = new TextDecoder().decode(data.slice(offset, offset + dateLen));
    offset += dateLen;
    
    // Read claims count
    const claimsCount = view.getUint8(offset);
    
    return {
      user,
      date,
      claimsCount,
    };
  }
}

// Export singleton instance
export const kalloViewClient = new KalloViewClient();