const { createContext, CryptoFactory } = require("sawtooth-sdk/signing");
const crypto = require("crypto");
const { protobuf } = require("sawtooth-sdk");
const fetch = require("node-fetch");
const { TextEncoder, TextDecoder } = require("text-encoding/lib/encoding");
const readline = require('readline');
const XoPayload = require("./payload");
const context = createContext("secp256k1");

// var privateKey = context.newRandomPrivateKey();
// var cryptoFact = new CryptoFactory(context);
// var signer = cryptoFact.newSigner(privateKey);
// var signerPublicKey = signer.getPublicKey().asHex();
// var batcherPublicKey = signer.getPublicKey().asHex();

// var newArr1 = [signerPublicKey,batcherPublicKey]

// console.log('new arr1:' + newArr1)

// privateKey1 = context.newRandomPrivateKey();
// cryptoFact = new CryptoFactory(context1);
// signer = cryptoFact.newSigner(privateKey);
// var signerPublicKey2 = signer.getPublicKey().asHex();
// var batcherPublicKey2 = signer.getPublicKey().asHex();

// var newArr2 = [signerPublicKey2,batcherPublicKey2]
// console.log('new arr2:' + newArr2)

function createSigner() {
  var privateKey = context.newRandomPrivateKey();
  var cryptoFact = new CryptoFactory(context);
  return cryptoFact.newSigner(privateKey);
}

// function createKey1() {
//   const context = createContext("secp256k1");
//   const privateKey = context.newRandomPrivateKey();
//   const cryptoFact = new CryptoFactory(context);
//   const signer = cryptoFact.newSigner(privateKey);
//   return signer.getPublicKey().asHex();
// }

// function createKey2() {
//   const context2 = createContext("secp256k1");
//   const privateKey2 = context2.newRandomPrivateKey();
//   const cryptoFact2 = new CryptoFactory(context);
//   const signer2 = cryptoFact2.newSigner(privateKey2);
//   return signer2.getPublicKey().asHex();
// }

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

const createTransaction = (payload, signer) => {
  console.log(payload);
  var player = 1
  const [gameName, action, space] = payload.split(",");
  console.log('gamename is : ' + gameName)
  console.log('action is : ' + action)
  console.log('space is : ' + space)
  console.log('player is : ' + player)
  payload = gameName+','+action+','+space
  console.log('payload is : ' + payload)
    // var signerKey = arr[0];
    // var batcherKey = arr[0];
  // if (player=="1")
  // {
  //   var signerKey = arr[0];
  //   var batcherKey = arr[1];
  // } 
  // else if (player=="2")
  // {
  //   var signerKey = arr[2];
  //   var batcherKey = arr[3];
  // }
  // console.log('signer is : ' + signerKey)
  // console.log('batcherKey is : ' + batcherKey)
  const encoder = new TextEncoder("utf8");
  const payloadBytes = encoder.encode(payload);
  const transactionHeaderBytes = protobuf.TransactionHeader.encode({
    familyName: XO_FAMILY,
    familyVersion: "1.0",
    inputs: [_makeXoAddress(gameName)],
    outputs: [_makeXoAddress(gameName)],
    signerPublicKey: signer.getPublicKey().asHex(),
    // In this example, we're signing the batch with the same private key,
    // but the batch can be signed by another party, in which case, the
    // public key will need to be associated with that key.
    batcherPublicKey: signer.getPublicKey().asHex(),
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
    var signer1 = createSigner();
    var signer2 = createSigner();
    // const arr = [signerPublicKey,batcherPublicKey];
    // const arr = [signerPublicKey1,batcherPublicKey1];
    const batchToSend = createBatch([createTransaction("game3,create,0", signer1)]);
    const batchListBytes = protobuf.BatchList.encode({
      batches: [batchToSend],
    }).finish();
    await asyncCall(batchListBytes);
  }
}

main_func()

