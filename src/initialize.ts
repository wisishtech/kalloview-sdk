import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { createInitializeInstruction, getConfigPDA } from './instructions';
import * as fs from 'fs';
import * as path from 'path';

// Your deployed program ID
const PROGRAM_ID = new PublicKey('AYGsCLrgGZ7DFSQpKWphG2ryedMG9KXdPtwEqgrDA6c2');

// Connect to devnet
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Load deployer keypair
function loadKeypair(): Keypair {
  try {
    // Try to load your actual deployer keypair
    const keypairPath = path.join(process.env.HOME || '', '.config/solana/kalloview-deployer.json');
    if (fs.existsSync(keypairPath)) {
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
      return Keypair.fromSecretKey(new Uint8Array(keypairData));
    }
  } catch (error) {
    console.log('Could not load deployer keypair, using default Solana keypair...');
  }

  try {
    // Try default Solana keypair
    const defaultKeypairPath = path.join(process.env.HOME || '', '.config/solana/id.json');
    if (fs.existsSync(defaultKeypairPath)) {
      const keypairData = JSON.parse(fs.readFileSync(defaultKeypairPath, 'utf8'));
      return Keypair.fromSecretKey(new Uint8Array(keypairData));
    }
  } catch (error) {
    console.log('Could not load default keypair...');
  }

  // Generate a new keypair as last resort
  console.log('⚠️  Generating new keypair for testing...');
  return Keypair.generate();
}

async function debugAccountInfo(pubkey: PublicKey, name: string) {
  const accountInfo = await connection.getAccountInfo(pubkey);
  console.log(`🔍 ${name}:`, pubkey.toString());
  console.log(`   Owner:`, accountInfo?.owner.toString() || 'null');
  console.log(`   Lamports:`, accountInfo?.lamports || 0);
  console.log(`   Data length:`, accountInfo?.data.length || 0);
  console.log(`   Executable:`, accountInfo?.executable || false);
}

async function initializeProgram() {
  try {
    console.log('🚀 Initializing KalloView Program...');
    
    // Load keypair
    const payer = loadKeypair();
    console.log('👤 Using authority:', payer.publicKey.toString());
    
    // Check balance
    let balance = await connection.getBalance(payer.publicKey);
    console.log('💰 Current balance:', balance / 1e9, 'SOL');
    
    // Request airdrop if needed
    if (balance < 1e9) { // Less than 1 SOL
      console.log('💰 Requesting airdrop...');
      try {
        const airdropSig = await connection.requestAirdrop(payer.publicKey, 2e9);
        await connection.confirmTransaction(airdropSig);
        balance = await connection.getBalance(payer.publicKey);
        console.log('💰 New balance:', balance / 1e9, 'SOL');
      } catch (airdropError) {
        console.log('⚠️  Airdrop failed, continuing with current balance...');
      }
    }
    
    // Get config PDA
    const [configPDA] = getConfigPDA(PROGRAM_ID);
    console.log('📋 Config PDA:', configPDA.toString());
    
    // Debug account information
    console.log('\n🔍 Debugging account information:');
    await debugAccountInfo(PROGRAM_ID, 'Program');
    await debugAccountInfo(configPDA, 'Config PDA');
    await debugAccountInfo(SystemProgram.programId, 'System Program');
    
    // Check if already initialized
    const configAccount = await connection.getAccountInfo(configPDA);
    if (configAccount && configAccount.data.length > 0) {
      console.log('✅ Program already initialized!');
      console.log('📊 Config account data length:', configAccount.data.length);
      return configPDA;
    }
    
    // Create initialize instruction
    console.log('\n📝 Creating initialize instruction...');
    const initializeIx = createInitializeInstruction(
      PROGRAM_ID,
      payer.publicKey,
      configPDA
    );
    
    console.log('📋 Instruction details:');
    console.log('   Program ID:', initializeIx.programId.toString());
    console.log('   Data length:', initializeIx.data.length);
    console.log('   Data:', Array.from(initializeIx.data));
    console.log('   Keys:');
    initializeIx.keys.forEach((key, index) => {
      console.log(`     ${index}: ${key.pubkey.toString()} (signer: ${key.isSigner}, writable: ${key.isWritable})`);
    });
    
    // Create and send transaction
    const transaction = new Transaction().add(initializeIx);
    
    console.log('\n📤 Sending initialize transaction...');
    
    // First simulate the transaction
    try {
      const simulation = await connection.simulateTransaction(transaction, [payer]);
      console.log('🧪 Simulation result:');
      console.log('   Error:', simulation.value.err);
      console.log('   Logs:', simulation.value.logs);
      
      if (simulation.value.err) {
        console.log('❌ Transaction would fail, stopping here.');
        return;
      }
    } catch (simError) {
      console.log('⚠️  Simulation failed:', simError);
    }
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer],
      {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      }
    );
    
    console.log('✅ Program initialized successfully!');
    console.log('📋 Transaction signature:', signature);
    console.log('🔑 Config PDA:', configPDA.toString());
    console.log('👤 Authority:', payer.publicKey.toString());
    
    // Verify the initialization
    const finalConfigAccount = await connection.getAccountInfo(configPDA);
    if (finalConfigAccount) {
      console.log('✅ Config account created with', finalConfigAccount.data.length, 'bytes');
    }
    
    return configPDA;
    
  } catch (error) {
    console.error('❌ Error initializing program:', error);
    
    // If it's a SendTransactionError, get more details
    if (error && typeof error === 'object' && 'transactionLogs' in error) {
      console.log('\n📋 Transaction logs:');
      (error as any).transactionLogs?.forEach((log: string, index: number) => {
        console.log(`   ${index}: ${log}`);
      });
    }
    
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeProgram()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { initializeProgram, PROGRAM_ID };