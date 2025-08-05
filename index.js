// index.js
const fs = require('fs');
const path = require('path');
const bip39 = require('bip39');
const StellarSdk = require('stellar-sdk');
const axios = require('axios'); // Library untuk membuat permintaan HTTP

// =================================================================
// =================== KONFIGURASI =================================
// =================================================================

// Alamat publik Pi Anda yang ingin dicocokkan
const TARGET_PUBLIC_KEY = "GCQGRMZNDB47GIO6CISSMJWW22YYLPOZEH7YFA75E24WA5NGEJNZ3P47";

// Nama file yang berisi daftar passphrase Anda
const PHRASE_FILE_PATH = 'phrases.txt';

// URL API Pi Network
const PI_API_URL = 'https://api.mainnet.minepi.com/accounts/';

// Jeda waktu antara setiap permintaan API (dalam milidetik) untuk menghindari blokir
// 500ms = 2 permintaan per detik. Menaikkan angka ini lebih aman tapi lebih lambat.
const API_DELAY_MS = 500;

// =================================================================
// ================== AKHIR DARI KONFIGURASI =======================
// =================================================================

// Fungsi untuk membuat jeda
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyPassphrasesViaApi() {
    console.log("================================================");
    console.log("   Pi Network API Verifier (NOT RECOMMENDED)    ");
    console.log("================================================");
    console.warn("⚠️ PERINGATAN: Metode ini sangat lambat dan berisiko. Gunakan metode offline jika memungkinkan.");

    const filePath = path.join(__dirname, PHRASE_FILE_PATH);
    if (!fs.existsSync(filePath)) {
        console.error(`\n[ERROR] File '${PHRASE_FILE_PATH}' tidak ditemukan.`);
        return;
    }

    const phrases = fs.readFileSync(filePath, 'utf-8').split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const totalPhrases = phrases.length;
    
    console.log(`\n[INFO] Target Alamat Publik: ${TARGET_PUBLIC_KEY}`);
    console.log(`[INFO] Ditemukan ${totalPhrases} frase untuk diverifikasi.`);
    console.log(`[INFO] Jeda antar permintaan: ${API_DELAY_MS}ms.`);
    console.log("------------------------------------------------");

    for (let i = 0; i < totalPhrases; i++) {
        const phrase = phrases[i];
        console.log(`\n[${i + 1}/${totalPhrases}] Memeriksa frase: "${phrase.substring(0, 15)}..."`);

        if (phrase.split(' ').length !== 24 || !bip39.validateMnemonic(phrase)) {
            console.log("   -> Frase tidak valid, dilewati.");
            continue;
        }

        try {
            // Langkah 1: Generate Alamat Publik secara lokal
            const seed = bip39.mnemonicToSeedSync(phrase);
            const keypair = StellarSdk.Keypair.fromRawEd25519Seed(seed.slice(0, 32));
            const generatedPublicKey = keypair.publicKey();
            console.log(`   -> Menghasilkan Alamat Publik: ${generatedPublicKey.substring(0, 15)}...`);

            // Langkah 2: Bandingkan dengan target Anda (ini adalah cara yang benar dan cepat)
            if (generatedPublicKey === TARGET_PUBLIC_KEY) {
                console.log("\n\n===================================");
                console.log("🎉 SELAMAT! PASSPHRASE DITEMUKAN! 🎉");
                console.log("===================================");
                console.log("\nPassphrase yang Benar adalah:");
                console.log(`\n${phrase}\n`);
                console.log("Alamat Publik Terverifikasi:", generatedPublicKey);
                return; // Proses selesai
            }

            // Langkah 3 (DEMONSTRASI): Jika tidak cocok, tanya ke API apakah akun ini ada
            console.log(`   -> Memeriksa keberadaan akun via API... (menunggu ${API_DELAY_MS}ms)`);
            await sleep(API_DELAY_MS); // Menunggu untuk menghindari rate limit

            try {
                await axios.get(PI_API_URL + generatedPublicKey);
                console.log("   -> HASIL API: Akun ini ADA di blockchain, tapi bukan milik Anda.");
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    console.log("   -> HASIL API: Akun ini TIDAK ADA di blockchain.");
                } else {
                    console.error("   -> ERROR API:", error.message);
                    console.error("   -> Kemungkinan Anda telah diblokir sementara oleh server. Hentikan skrip.");
                    return;
                }
            }

        } catch (e) {
            console.log("   -> Terjadi error saat memproses frase ini.");
        }
    }

    console.log("\n-------------------------------------");
    console.log("Verifikasi selesai. Tidak ada passphrase yang cocok ditemukan di dalam daftar.");
}

verifyPassphrasesViaApi();
