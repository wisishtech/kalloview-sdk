import {
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';

// Instruction variants (must match your Rust enum)
export enum KalloViewInstructionType {
  Initialize = 0,
  CreateProduct = 1,
  UpdateProduct = 2,
  DeleteProduct = 3,
  AddReview = 4,
  UpdateReview = 5,
  DailyClaim = 6,
}

// Simple instruction data encoding functions
function encodeString(str: string): Buffer {
  const strBuffer = Buffer.from(str, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(strBuffer.length, 0);
  return Buffer.concat([lengthBuffer, strBuffer]);
}

function encodeCreateProduct(productId: string, metadataUri: string): Buffer {
  const instruction = Buffer.from([KalloViewInstructionType.CreateProduct]);
  const productIdBuffer = encodeString(productId);
  const metadataUriBuffer = encodeString(metadataUri);
  return Buffer.concat([instruction, productIdBuffer, metadataUriBuffer]);
}

function encodeUpdateProduct(metadataUri: string): Buffer {
  const instruction = Buffer.from([KalloViewInstructionType.UpdateProduct]);
  const metadataUriBuffer = encodeString(metadataUri);
  return Buffer.concat([instruction, metadataUriBuffer]);
}

function encodeAddReview(productId: string, score: number, comment: string): Buffer {
  const instruction = Buffer.from([KalloViewInstructionType.AddReview]);
  const productIdBuffer = encodeString(productId);
  const scoreBuffer = Buffer.from([score]);
  const commentBuffer = encodeString(comment);
  return Buffer.concat([instruction, productIdBuffer, scoreBuffer, commentBuffer]);
}

function encodeUpdateReview(score: number, comment: string): Buffer {
  const instruction = Buffer.from([KalloViewInstructionType.UpdateReview]);
  const scoreBuffer = Buffer.from([score]);
  const commentBuffer = encodeString(comment);
  return Buffer.concat([instruction, scoreBuffer, commentBuffer]);
}

// PDA seed constants (must match your Rust constants)
const CONFIG_SEED = 'config';
const PRODUCT_SEED = 'product';
const REVIEW_SEED = 'review';
const USER_SEED = 'user';
const DAILY_CLAIMS_SEED = 'daily_claims';

// PDA helper functions
export function getConfigPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(CONFIG_SEED)],
    programId
  );
}

export function getProductPDA(
  programId: PublicKey,
  productId: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PRODUCT_SEED), Buffer.from(productId)],
    programId
  );
}

export function getReviewPDA(
  programId: PublicKey,
  productId: string,
  reviewer: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(REVIEW_SEED),
      Buffer.from(productId),
      reviewer.toBuffer(),
    ],
    programId
  );
}

export function getUserPDA(
  programId: PublicKey,
  user: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(USER_SEED), user.toBuffer()],
    programId
  );
}

export function getDailyClaimsPDA(
  programId: PublicKey,
  user: PublicKey,
  date: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(DAILY_CLAIMS_SEED),
      user.toBuffer(),
      Buffer.from(date),
    ],
    programId
  );
}

// Instruction builders
export function createInitializeInstruction(
  programId: PublicKey,
  authority: PublicKey,
  configAccount: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: configAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data: Buffer.from([KalloViewInstructionType.Initialize]),
  });
}

export function createCreateProductInstruction(
  programId: PublicKey,
  owner: PublicKey,
  productAccount: PublicKey,
  configAccount: PublicKey,
  productId: string,
  metadataUri: string
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: productAccount, isSigner: false, isWritable: true },
      { pubkey: configAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId,
    data: encodeCreateProduct(productId, metadataUri),
  });
}

export function createUpdateProductInstruction(
  programId: PublicKey,
  owner: PublicKey,
  productAccount: PublicKey,
  metadataUri: string
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: productAccount, isSigner: false, isWritable: true },
    ],
    programId,
    data: encodeUpdateProduct(metadataUri),
  });
}

export function createDeleteProductInstruction(
  programId: PublicKey,
  owner: PublicKey,
  productAccount: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: productAccount, isSigner: false, isWritable: true },
    ],
    programId,
    data: Buffer.from([KalloViewInstructionType.DeleteProduct]),
  });
}

export function createAddReviewInstruction(
  programId: PublicKey,
  reviewer: PublicKey,
  productAccount: PublicKey,
  reviewAccount: PublicKey,
  userAccount: PublicKey,
  configAccount: PublicKey,
  productId: string,
  score: number,
  comment: string
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: reviewer, isSigner: true, isWritable: true },
      { pubkey: productAccount, isSigner: false, isWritable: true },
      { pubkey: reviewAccount, isSigner: false, isWritable: true },
      { pubkey: userAccount, isSigner: false, isWritable: true },
      { pubkey: configAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId,
    data: encodeAddReview(productId, score, comment),
  });
}

export function createUpdateReviewInstruction(
  programId: PublicKey,
  reviewer: PublicKey,
  reviewAccount: PublicKey,
  score: number,
  comment: string
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: reviewer, isSigner: true, isWritable: true },
      { pubkey: reviewAccount, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId,
    data: encodeUpdateReview(score, comment),
  });
}

export function createDailyClaimInstruction(
  programId: PublicKey,
  user: PublicKey,
  userAccount: PublicKey,
  dailyClaimsAccount: PublicKey,
  configAccount: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: userAccount, isSigner: false, isWritable: true },
      { pubkey: dailyClaimsAccount, isSigner: false, isWritable: true },
      { pubkey: configAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId,
    data: Buffer.from([KalloViewInstructionType.DailyClaim]),
  });
}

// Utility function to get current date string (YYYY-MM-DD)
export function getCurrentDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}