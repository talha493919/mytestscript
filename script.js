const bip39 = require("bip39");
const { BIP32Factory } = require("bip32");
const ecc = require("tiny-secp256k1");
const bitcoin = require("bitcoinjs-lib");
const { ethers } = require("ethers");
const axios = require("axios");
const { Keypair, Connection, PublicKey } = require("@solana/web3.js");
const fs = require("fs");

// RPC URLs
const RPC_URLS = {
    Ethereum: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
    BSC: "https://bsc-dataseed.binance.org/",
    Solana: "https://api.mainnet-beta.solana.com"
};

// Define the words for generating mnemonics
const myWords = ["word1", "word2", "word3", /* Add your words here */];

// Select 12 random words
function getRandomMnemonic(words) {
    return words.sort(() => 0.5 - Math.random()).slice(0, 12).join(" ");
}

// Get Bitcoin address
function getBtcAddress(mnemonic) {
    try {
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const bip32 = BIP32Factory(ecc);
        const root = bip32.fromSeed(seed);
        const path = "m/44'/0'/0'/0/0";
        const node = root.derivePath(path);
        return bitcoin.payments.p2pkh({ pubkey: node.publicKey, network: bitcoin.networks.bitcoin }).address;
    } catch (error) {
        return null;
    }
}

// Get Ethereum & BNB address
function getEthAddress(mnemonic) {
    try {
        return ethers.Wallet.fromPhrase(mnemonic).address;
    } catch (error) {
        return null;
    }
}

// Get Solana address
function getSolanaAddress(mnemonic) {
    try {
        const seed = bip39.mnemonicToSeedSync(mnemonic).slice(0, 32);
        return Keypair.fromSeed(seed).publicKey.toBase58();
    } catch (error) {
        return null;
    }
}

// Get Ethereum-based balance
async function getEthBalance(address, rpcUrl) {
    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const balance = await provider.getBalance(address);
        return ethers.formatEther(balance);
    } catch (error) {
        return "0";
    }
}

// Get Bitcoin balance
async function getBtcBalance(address) {
    try {
        const url = `https://blockchain.info/q/addressbalance/${address}`;
        const response = await axios.get(url);
        return (parseInt(response.data) / 1e8).toFixed(8);
    } catch (error) {
        return "0";
    }
}

// Get Solana balance
async function getSolanaBalance(address) {
    try {
        const connection = new Connection(RPC_URLS.Solana);
        const balance = await connection.getBalance(new PublicKey(address));
        return (balance / 1e9).toFixed(8);
    } catch (error) {
        return "0";
    }
}

// Check wallet balances for a mnemonic
async function checkWallet(mnemonic) {
    if (!bip39.validateMnemonic(mnemonic)) {
        logMessage("❌ Invalid mnemonic: " + mnemonic);
        return false;
    }

    const ethAddress = getEthAddress(mnemonic);
    const btcAddress = getBtcAddress(mnemonic);
    const solAddress = getSolanaAddress(mnemonic);
    const bnbAddress = ethAddress; // BNB uses the same address as Ethereum

    const balances = {
        Ethereum: await getEthBalance(ethAddress, RPC_URLS.Ethereum),
        BNB: await getEthBalance(bnbAddress, RPC_URLS.BSC),
        Bitcoin: await getBtcBalance(btcAddress),
        Solana: await getSolanaBalance(solAddress)
    };

    const totalBalance = Object.values(balances).reduce((sum, val) => sum + parseFloat(val) || 0, 0);

    if (totalBalance > 0) {
        logMessage("✅ Found a funded wallet!");
        fs.appendFileSync("found_wallets.txt", `${mnemonic} - ETH: ${ethAddress}, BTC: ${btcAddress}, SOL: ${solAddress}, BNB: ${bnbAddress} - Balances: ${JSON.stringify(balances)}\n`);
        return true;
    } else {
        logMessage("⚠️ Empty wallet.");
        fs.appendFileSync("empty_wallets.txt", `${mnemonic} - ETH: ${ethAddress}, BTC: ${btcAddress}, SOL: ${solAddress}, BNB: ${bnbAddress} - Balances: ${JSON.stringify(balances)}\n`);
    }

    return false;
}

// Run multiple searches concurrently
async function startChecking(maxConcurrentChecks = 5) {
    logMessage(`⏳ Running with ${maxConcurrentChecks} concurrent searches...`);

    let foundWallet = false;
    const queue = new Set();

    async function processMnemonic() {
        if (foundWallet) return;

        const mnemonic = getRandomMnemonic(myWords);
        const result = await checkWallet(mnemonic);

        if (result) {
            foundWallet = true;
            logMessage("✅ Found a funded wallet! Stopping...");
        } else {
            queue.delete(this);
            if (!foundWallet) queue.add(processMnemonic.call({}));
        }
    }

    for (let i = 0; i < maxConcurrentChecks; i++) {
        queue.add(processMnemonic.call({}));
    }

    await Promise.allSettled(queue);
    logMessage("✅ Finished checking all possible mnemonics.");
}

// Log messages to the UI
function logMessage(message) {
    const logDiv = document.getElementById("log");
    logDiv.innerHTML += message + "<br>";
}

// Attach event listener
document.getElementById("startButton").addEventListener("click", () => {
    logMessage("🔍 Starting recovery process...");
    startChecking();
});
