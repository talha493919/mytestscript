const bip39 = window.bip39;
const { ethers } = window.ethers;

// Logging Function
function logMessage(message) {
    const logDiv = document.getElementById("log");
    logDiv.innerHTML += `<p>${message}</p>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

// Generate Random Mnemonic
function getRandomMnemonic(words) {
    return words.sort(() => 0.5 - Math.random()).slice(0, 12).join(" ");
}

// Get Ethereum Address
function getEthAddress(mnemonic) {
    try {
        return ethers.Wallet.fromPhrase(mnemonic).address;
    } catch (error) {
        return null;
    }
}

// Check Wallet Balance (Ethereum)
async function getEthBalance(address) {
    try {
        const provider = new ethers.JsonRpcProvider("https://mainnet.infura.io/v3/903b7ac3925c4e9892a78a8e6926d488");
        const balance = await provider.getBalance(address);
        return ethers.formatEther(balance);
    } catch (error) {
        return "0";
    }
}

// Check Wallet
async function checkWallet(mnemonic) {
    if (!bip39.validateMnemonic(mnemonic)) {
        logMessage("❌ Invalid Mnemonic: " + mnemonic);
        return;
    }

    const ethAddress = getEthAddress(mnemonic);
    if (!ethAddress) return;

    const balance = await getEthBalance(ethAddress);
    logMessage(`🔹 Checking: ${mnemonic} - ETH: ${ethAddress} - Balance: ${balance}`);

    if (parseFloat(balance) > 0) {
        logMessage("✅ Found a funded wallet! Saving...");
        saveWallet(mnemonic, "found_wallets.txt");
    } else {
        logMessage("⚠️ Empty Wallet.");
        saveWallet(mnemonic, "empty_wallets.txt");
    }
}

// Save Wallet (Only Works Locally, Not on GitHub Pages)
function saveWallet(mnemonic, filename) {
    const blob = new Blob([mnemonic + "\n"], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Start Recovery
document.getElementById("startButton").addEventListener("click", async function () {
    logMessage("⏳ Starting Wallet Recovery...");
    for (let i = 0; i < 5; i++) {
        const mnemonic = getRandomMnemonic(myWords);
        await checkWallet(mnemonic);
    }
    logMessage("✅ Recovery Process Completed.");
});
