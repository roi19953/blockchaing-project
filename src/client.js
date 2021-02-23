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
  const [cityName, action, space] = payload.split(",");
  console.log('cityName is : ' + cityName)
  console.log('action is : ' + action)
  console.log('space is : ' + space)
  console.log('player is : ' + player)
  payload = cityName+','+action+','+space
  console.log('payload is : ' + payload)
 
  const encoder = new TextEncoder("utf8");
  const payloadBytes = encoder.encode(payload);
  const transactionHeaderBytes = protobuf.TransactionHeader.encode({
    familyName: XO_FAMILY,
    familyVersion: "1.0",
    inputs: [_makeXoAddress(cityName)],
    outputs: [_makeXoAddress(cityName)],
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
  var listClients = []
  var listDrivers = []
  var dCount =0;
  var lCount =0;
  while(input != "stop") { 
     
    if(input.includes("addDriver"))
    {
       listDrivers.push(dCount);
       dCount++;
    }
    if(input.includes("take"))
    {
       listClients.push(lCount);
       lCount++;
    }
    if(input.includes("move"))
    {
      var input2 = await askQuestion("With which driver do you wanna ride?");
      console.log("Driver with serial number "+ input2 + "will pick you up in 5 minuets");
    }
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
    
    if (count%2==0) // To know which turn
    {
    signerToSend = signer1;
    }
    else
    {
    signerToSend = signer2; 
    }
    count = count + 1;    

    const batchToSend = createBatch([createTransaction(input, signerToSend)], signerToSend);
    const batchListBytes = protobuf.BatchList.encode({
      batches: [batchToSend],
    }).finish();
    await asyncCall(batchListBytes);
  }
}

main_func()

// async function main_func2() {
//     var city = "";
//     while(city != "stop") { 

//       //input
//       async function askQuestion(query) {
//         const rl = readline.createInterface({
//             input: process.stdin,
//             output: process.stdout,
//         });
    
//         return new Promise(resolve => rl.question(query, ans => {
//             rl.close();
//             resolve(ans);
//         }))
//     }
//     city = await askQuestion("enter city :")
//     var source_x = parseInt(await askQuestion("enter source x :"))
//     var source_y = parseInt(await askQuestion("enter source y :"))

//   }
// }

