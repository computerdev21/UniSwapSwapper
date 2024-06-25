const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./wallets.db');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS wallets (id INTEGER PRIMARY KEY, address TEXT, secret TEXT)");

    const stmt = db.prepare("INSERT INTO wallets (address, secret) VALUES (?, ?)");
    stmt.run('0xYourWalletAddress1', 'yourwalletsecret1');
    stmt.finalize();
});

db.close();
