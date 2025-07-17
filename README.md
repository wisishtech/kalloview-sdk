# KalloView Solana SDK

A TypeScript SDK for interacting with the KalloView Solana program - a decentralized product review system.

## Installation

```bash
npm install @kalloview/solana-sdk
# or
yarn add @kalloview/solana-sdk

```

# API Reference
```bash
# Client Creation
new KalloViewClient(options?)
KalloViewClient.forDevnet(programId?)
KalloViewClient.forMainnet(programId?)
KalloViewClient.forLocalhost(programId?)

# Read Methods (No wallet required)
getConfig(): Promise<Config | null>
getProduct(productId: string): Promise<Product | null>
getReview(productId: string, reviewer: PublicKey): Promise<Review | null>
getUser(userAddress: PublicKey): Promise<User | null>
getDailyClaims(userAddress: PublicKey, date?: string): Promise<DailyClaims | null>

# Write Methods (Requires wallet)
createProduct(owner: Keypair, productId: string, metadataUri: string): Promise<string>
updateProduct(owner: Keypair, productId: string, metadataUri: string): Promise<string>
deleteProduct(owner: Keypair, productId: string): Promise<string>
addReview(reviewer: Keypair, productId: string, score: number, comment: string): Promise<string>
updateReview(reviewer: Keypair, productId: string, score: number, comment: string): Promise<string>
dailyClaim(user: Keypair): Promise<string>

```

# Quick Start

```bash
import { KalloViewClient } from '@kalloview/solana-sdk';
# or
import KalloViewClient from '@kalloview/solana-sdk';

# Create client for devnet
const client = KalloViewClient.forDevnet();

# Get a product
const product = await client.getProduct('my-product-id');

# Create a product (requires wallet)
const signature = await client.createProduct(
  ownerKeypair,
  'my-product-id',
  'https://metadata-uri.com/metadata.json'
);

```