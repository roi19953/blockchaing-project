const { createContext, CryptoFactory } = require("sawtooth-sdk/signing");
const crypto = require("crypto");
const { protobuf } = require("sawtooth-sdk");
const fetch = require("node-fetch");
const { TextEncoder, TextDecoder } = require("text-encoding/lib/encoding");
const readline = require('readline');
const XoPayload = require("./payload");

function createSigner() {
  const context = createContext("secp256k1");
  const privateKey = context.newRandomPrivateKey();
  const cryptoFact = new CryptoFactory(context);
  return cryptoFact.newSigner(privateKey);
}

const _hash = (x) =>crypto.createHash("sha512").update(x).digest("hex").toLowerCase().substring(0, 64);

const XO_FAMILY = "xo";
const XO_NAMESPACE = _hash(XO_FAMILY).substring(0, 6);
const _makeXoAddress = (x) => XO_NAMESPACE + _hash(x);

const createTransaction = (payload, signer) => {
const [gameName, action, space] = payload.split(",");
payload = gameName+','+action+','+space

  
const encoder = new TextEncoder("utf8");
const payloadBytes = encoder.encode(payload);
const transactionHeaderBytes = protobuf.TransactionHeader.encode({
    familyName: XO_FAMILY,
    familyVersion: "1.0",
    inputs: [_makeXoAddress(gameName)],
    outputs: [_makeXoAddress(gameName)],
    signerPublicKey: signer.getPublicKey().asHex(),   
    batcherPublicKey: signer.getPublicKey().asHex(),
    dependencies: [],
    nonce: "" + Math.random(),
    payload_encoding: "utf8",
    payloadSha512: crypto
      .createHash("sha512")
      .update(payloadBytes)
      .digest("hex"),
  }).finish();


  const transaction = protobuf.Transaction.create({
    header: transactionHeaderBytes,
    headerSignature: signer.sign(transactionHeaderBytes),
    payload: payloadBytes,
  });
  return transaction;
};

const createBatch = (transactions, signer) => {
  const batchHeaderBytes = protobuf.BatchHeader.encode({
    signerPublicKey: signer.getPublicKey().asHex(),
    transactionIds: transactions.map((txn) => txn.headerSignature),
  }).finish();


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

async function main_func() {
  var input = "";
  var count =0;
  var signer1,signer2;
  signer1 = createSigner();
  signer2 = createSigner();
  var signerToSend;
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
    
    if (count % 2 == 0)
       signerToSend = signer1;
    else
       signerToSend = signer2;     
    count = count + 1;    
    
    const batchToSend = createBatch([createTransaction(input, signerToSend)], signerToSend);
    const batchListBytes = protobuf.BatchList.encode({
      batches: [batchToSend],
    }).finish();
    await asyncCall(batchListBytes);
  }
}

main_func()

