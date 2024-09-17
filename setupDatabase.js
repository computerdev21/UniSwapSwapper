const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./wallets.db');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS wallets (id INTEGER PRIMARY KEY, address TEXT, secret TEXT)");

    const stmt = db.prepare("INSERT INTO wallets (address, secret) VALUES (?, ?)");

    const wallets = [
        {address: '0x238d993C808f02eD53607aC7928013d33F2dc177', secret: '80b9614a897296a8c972bfd3772efad95e025a336de9a99eb53439e257ba6067'},
        {address: '0xe0F86a49c33343E2B54beebd2B0C2d8406DDAe11', secret: '2f5f3128697bc6fa0ce0c90179c528d6c80ee73d784d6d95e8a3e8e2dd48bd2a'},
        {address: '0x2B7150648d9E0781aADFEB167c4380E6098E040f', secret: '7a473d93d2dd0fb30d9771df8dc111c45c96472a676ec269c3bd06118800f08c'},
        {address: '0xd09b9977457F70Fff5A0a8bB783dC73d717E8808', secret: '85a97e271a2f05a32a07ef649cf5aab791fd18fd674515df8688b0f401beb6f6'},
        {address: '0xd2bCD606408755D421e2970fE6711D0151A5e2b4', secret: 'b728f86ccc99552c0604341fcdc4db85ffe75e938e7e95c7a99a0c298a12878e'},
        {address: '0xf2FEfb5B25681a4491a51f4c622C883BE42dcf85', secret: '5c73fd5a4a999ecd5dfa06e27e3ac5364577269964177d631f9b208bc0005786'},
        {address: '0x7E02De4D6D9e587E9FbBfbeF5cC3Afe7c6137067', secret: '2a72634c9115b5dee85b65da3c5f8ed76d6a788d67f73fee02954c4024d03cd5'},
        {address: '0x6aa067733Df43d6892C4dd6A54F1BD889Aef31FE', secret: '08453ae0d13280b3e72c682f886d27d393c2ec1d587a28d31445e9eb1e3c7c33'},
        {address: '0x89DCfc202D5f5C047500c10Da7Bb520b70904699', secret: 'b054140fc316e313d85f4e5f42e0dab6e5462caa956c22830737f79bcf34fd1a'},
        {address: '0x0b642dba3f8b9029152248bB057Cc69F39Cb56F6', secret: '6fc9531ba961790a13d6f6b10d872fa2c331753fecbec8681203aee77b958d9d'}
    ];

    wallets.forEach(wallet => {
        stmt.run(wallet.address, wallet.secret);
    });

    stmt.finalize();
});

db.close();
