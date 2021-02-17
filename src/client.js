const { createContext, CryptoFactory } = require("sawtooth-sdk/signing");
const crypto = require("crypto");
const { protobuf } = require("sawtooth-sdk");
const fetch = require("node-fetch");
const context = createContext("secp256k1");
const { TextEncoder, TextDecoder } = require("text-encoding/lib/encoding");
const privateKey = context.newRandomPrivateKey();
const cryptoFact = new CryptoFactory(context);
const signer = cryptoFact.newSigner(privateKey);
const readline = require('readline');
 

const XoPayload = require("./payload");

const _hash = (x) =>
  crypto
    .createHash("sha512")
    .update(x)
    .digest("hex")
    .toLowerCase()
    .substring(0, 64);

const XO_FAMILY = "xo";
const XO_NAMESPACE = _hash(XO_FAMILY).substring(0, 6);
const _makeXoAddress = (x) => XO_NAMESPACE + _hash(x);

const createTransaction = (payload,arr) => {
  console.log(payload);
  const [gameName, action, space , player] = payload.split(",");
  console.log('gamename is : ' + gameName)
  console.log('action is : ' + action)
  console.log('space is : ' + space)
  console.log('player is : ' + player)
  payload = gameName+','+action+','+space
  console.log('payload is : ' + payload)
  if (player=="1")
  {
    var signerKey = arr[0];
    var batcherKey = arr[1];
  } 
  else if (player=="2")
  {
    var signerKey = arr[2];
    var batcherKey = arr[3];
  }
  const encoder = new TextEncoder("utf8");
  const payloadBytes = encoder.encode(payload);
  const transactionHeaderBytes = protobuf.TransactionHeader.encode({
    familyName: XO_FAMILY,
    familyVersion: "1.0",
    inputs: [_makeXoAddress(gameName)],
    outputs: [_makeXoAddress(gameName)],
    signerPublicKey: signerKey,
    // In this example, we're signing the batch with the same private key,
    // but the batch can be signed by another party, in which case, the
    // public key will need to be associated with that key.
    batcherPublicKey: batcherKey,
    // In this example, there are no dependencies.  This list should include
    // an previous transaction header signatures that must be applied for
    // this transaction to successfully commit.
    // For example,
    // dependencies: ['540a6803971d1880ec73a96cb97815a95d374cbad5d865925e5aa0432fcf1931539afe10310c122c5eaae15df61236079abbf4f258889359c4d175516934484a'],
    dependencies: [],
    nonce: "" + Math.random(),
    payload_encoding: "utf8",
    payloadSha512: crypto
      .createHash("sha512")
      .update(payloadBytes)
      .digest("hex"),
  }).finish();

  // const signature = signer.sign(transactionHeaderBytes);

  const transaction = protobuf.Transaction.create({
    header: transactionHeaderBytes,
    headerSignature: signer.sign(transactionHeaderBytes),
    payload: payloadBytes,
  });
  return transaction;
};

const createBatch = (transactions) => {
  const batchHeaderBytes = protobuf.BatchHeader.encode({
    signerPublicKey: signer.getPublicKey().asHex(),
    transactionIds: transactions.map((txn) => txn.headerSignature),
  }).finish();

  // const signature = signer.sign(batchHeaderBytes);

  const batch = protobuf.Batch.create({
    header: batchHeaderBytes,
    headerSignature: signer.sign(batchHeaderBytes),
    transactions: transactions,
  });
  return batch;
};


async function asyncCall(batchListBytes) {
  if (batchListBytes == null) {
    try {
      var geturl = "http://localhost:8008/state/" + this.address; //endpoint used to retrieve data from an address in Sawtooth blockchain
      console.log("Getting from: " + geturl);
      let response = await fetch(geturl, {
        method: "GET",
      });
      let responseJson = await response.json();
      var data = responseJson.data;
      var newdata = Buffer.from(data, "base64").toString();
      return newdata;
    } catch (error) {
      console.error(error);
    }
  } else {
    try {
      let resp = await fetch("http://localhost:8008/batches", {
        //endpoint to which we write data in a Sawtooth blockchain
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: batchListBytes,
      });
      console.log("response--", resp);
    } catch (error) {
      console.log("error in fetch", error);
    }
  }
};


const privateKey1 = context.newRandomPrivateKey();
const cryptoFact1 = new CryptoFactory(context);
const signer1 = cryptoFact1.newSigner(privateKey1);
const signerPublicKey1 = signer1.getPublicKey().asHex();
const batcherPublicKey1 = signer1.getPublicKey().asHex();

const privateKey2 = context.newRandomPrivateKey();
const cryptoFact2 = new CryptoFactory(context);
const signer2 = cryptoFact2.newSigner(privateKey2);
const signerPublicKey2 = signer2.getPublicKey().asHex();
const batcherPublicKey2 = signer2.getPublicKey().asHex();



async function main_func() {
  var input = ""
  while(input != "stop") { 

    //input
    async function askQuestion(query) {
      const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
      });
  
      return new Promise(resolve => rl.question(query, ans => {
          rl.close();
          resolve(ans);
      }))
  }
  input = await askQuestion("enter command :")
    const arr = [signerPublicKey1,batcherPublicKey1,signerPublicKey2,batcherPublicKey2];
    const batchToSend = createBatch([createTransaction(input,arr)]);
    const batchListBytes = protobuf.BatchList.encode({
      batches: [batchToSend],
    }).finish();
    await asyncCall(batchListBytes);
  }
}

main_func()

