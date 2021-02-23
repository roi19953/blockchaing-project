/**
 * Copyright 2017-2018 Intel Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ------------------------------------------------------------------------------
 */

"use strict";

const XoPayload = require("./payload");

const { XO_NAMESPACE, XO_FAMILY, XoState } = require("./state");

const { TransactionHandler } = require("sawtooth-sdk/processor/handler");
const { InvalidTransaction } = require("sawtooth-sdk/processor/exceptions");

const _cityToStr = (board, state, player1, player2, name /*, driversArr*/) => {
  board = board.replace(/-/g, " ");
  board = board.split("");
  let out = "";
  out += `City: ${name}\n`;
  out += `PLAYER 1: ${player1.substring(0, 6)}\n`;
  out += `PLAYER 2: ${player2.substring(0, 6)}\n`;
  out += `STATE: ${state}\n`;
  out += `\n`;
  out += `${board[0]} | ${board[1]} | ${board[2]} \n`;
  out += `---|---|--- \n`;
  out += `${board[3]} | ${board[4]} | ${board[5]} \n`;
  out += `---|---|--- \n`;
  out += `${board[6]} | ${board[7]} | ${board[8]} \n`;
  //out += `driversArr: ${driversArr[0]}\n`
  return out;
};

const _display = (msg) => {
  let n = msg.search("\n");
  let length = 0;

  if (n !== -1) {
    msg = msg.split("\n");
    for (let i = 0; i < msg.length; i++) {
      if (msg[i].length > length) {
        length = msg[i].length;
      }
    }
  } else {
    length = msg.length;
    msg = [msg];
  }

  console.log("+" + "-".repeat(length + 2) + "+");
  for (let i = 0; i < msg.length; i++) {
    let len = length - msg[i].length;

    if (len % 2 === 1) {
      console.log(
        "+ " +
          " ".repeat(Math.floor(len / 2)) +
          msg[i] +
          " ".repeat(Math.floor(len / 2 + 1)) +
          " +"
      );
    } else {
      console.log(
        "+ " +
          " ".repeat(Math.floor(len / 2)) +
          msg[i] +
          " ".repeat(Math.floor(len / 2)) +
          " +"
      );
    }
  }
  console.log("+" + "-".repeat(length + 2) + "+");
};

const _isWin = (board, letter) => {
  let wins = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [1, 4, 7],
    [2, 5, 8],
    [3, 6, 9],
    [1, 5, 9],
    [3, 5, 7],
  ];
  let win;
  for (let i = 0; i < wins.length; i++) {
    win = wins[i];
    if (
      board[win[0] - 1] === letter &&
      board[win[1] - 1] === letter &&
      board[win[2] - 1] === letter
    ) {
      return true;
    }
  }
  return false;
};

class XOHandler extends TransactionHandler {
  constructor() {
    super(XO_FAMILY, ["1.0"], [XO_NAMESPACE]);
  }

  apply(transactionProcessRequest, context) {
    let payload = XoPayload.fromBytes(transactionProcessRequest.payload);
    let xoState = new XoState(context);
    let header = transactionProcessRequest.header;
    let player = header.signerPublicKey;

    if (payload.action === "create") {
      return xoState.getCity(payload.name).then((city) => {
        if (city !== undefined) {
          throw new InvalidTransaction("Invalid Action: City already exists.");
        }

        let createdCity = {
          name: payload.name,
          board: "---------",
          state: "P1-NEXT",
          player1: "",
          player2: "",
          //driversArr : "",
        };

        _display(
          `Player ${player.toString().substring(0, 6)} created city ${
            payload.name
          }`
        );

        return xoState.setCity(payload.name, createdCity);
      });
    } else if (payload.action === "take") {
      return xoState.getCity(payload.name).then((city) => {
        try {
          parseInt(payload.space);
        } catch (err) {
          throw new InvalidTransaction(
            "Space could not be converted as an integer."
          );
        }

        if (payload.space < 1 || payload.space > 9) {
          throw new InvalidTransaction("Invalid space " + payload.space);
        }

        if (city === undefined) {
          throw new InvalidTransaction(
            "Invalid Action: Take requires an existing city."
          );
        }
        if (["P1-WIN", "P2-WIN", "TIE"].includes(city.state)) {
          throw new InvalidTransaction("Invalid Action: City has ended.");
        }

        if (city.player1 === "") {
          city.player1 = player;
        } else if (city.player2 === "") {
          city.player2 = player;
        }
        let boardList = city.board.split("");

        if (boardList[payload.space - 1] !== "-") {
          throw new InvalidTransaction("Invalid Action: Space already taken.");
        }
/************************************************************************************************ */
        

        if (city.state === "P1-NEXT" && player === city.player1) {
          boardList[payload.space - 1] = "C";
          city.state = "P2-NEXT";
        } else if (city.state === "P2-NEXT" && player === city.player2) {
          boardList[payload.space - 1] = "C";
          city.state = "P1-NEXT";
        } else {
          console.log("state: " + city.state + "player1: " + city.player1 + "player2: " + city.player2 + "player: " + player)
          throw new InvalidTransaction(
            `Not this player's turn: ${player.toString().substring(0, 6)}`
          );
        }//P1-NEXTplayer1: 02e2b2f9a5e5374a9f81f1bbd1911f80859e602137b94fd96ef00b3906e7e12571player2: 03e8ff142baa25d288122e95b42cef2c94d6b8a2836a6ea47288b80241ec64600f

        city.board = boardList.join("");

        if (_isWin(city.board, "X")) {
          city.state = "P1-WIN";
        } else if (_isWin(city.board, "O")) {
          city.state = "P2-WIN";
        } else if (city.board.search("-") === -1) {
          city.state = "TIE";
        }

        let playerString = player.toString().substring(0, 6);

        _display(
          `Player ${playerString} takes space: ${payload.space}\n\n` +
            _cityToStr(
              city.board,
              city.state,
              city.player1,
              city.player2,
              payload.name
            )
        );

        return xoState.setCity(payload.name, city);
      });
    } 
    else if ( payload.action === "move")
    {
      return xoState.getCity(payload.name).then((city) => {
        try {
          parseInt(payload.space);
        } catch (err) {
          throw new InvalidTransaction(
            "Space could not be converted as an integer."
          );
        }

        if (payload.space < 10 || payload.space > 99) {
          throw new InvalidTransaction("Invalid space " + payload.space);
        }

        if (city === undefined) {
          throw new InvalidTransaction(
            "Invalid Action: Take requires an existing city."
          );
        }
        if (["P1-WIN", "P2-WIN", "TIE"].includes(city.state)) {
          throw new InvalidTransaction("Invalid Action: City has ended.");
        }

        if (city.player1 === "") {
          city.player1 = player;
        } else if (city.player2 === "") {
          city.player2 = player;
        }
        let boardList = city.board.split("");

        /*
        if (boardList[payload.space - 1] !== "-") {
          throw new InvalidTransaction("Invalid Action: Space already taken.");
        }
        */
/************************************************************************************************ */
        
        console.log('board list: ' + boardList.toString())
        console.log('loc1: '+Math.floor(payload.space / 10) - 1)
        console.log('loc2: '+Math.floor(payload.space % 10) - 1)
        if (city.state === "P1-NEXT" && player === city.player1) {
          boardList[Math.floor(payload.space / 10) - 1] = "-";//19 :1-->9
          boardList[Math.floor(payload.space % 10) - 1] = "X";
          city.state = "P2-NEXT";
        } else if (city.state === "P2-NEXT" && player === city.player2) {
          boardList[Math.floor(payload.space / 10) - 1] = "-";
          boardList[Math.floor(payload.space % 10) - 1] = "O";
          city.state = "P1-NEXT";
        } else {
          console.log("state: " + city.state + "player1: " + city.player1 + "player2: " + city.player2 + "player: " + player)
          throw new InvalidTransaction(
            `Not this player's turn: ${player.toString().substring(0, 6)}`
          );
        }//P1-NEXTplayer1: 02e2b2f9a5e5374a9f81f1bbd1911f80859e602137b94fd96ef00b3906e7e12571player2: 03e8ff142baa25d288122e95b42cef2c94d6b8a2836a6ea47288b80241ec64600f

        city.board = boardList.join("");

        if (_isWin(city.board, "X")) {
          city.state = "P1-WIN";
        } else if (_isWin(city.board, "O")) {
          city.state = "P2-WIN";
        } else if (city.board.search("-") === -1) {
          city.state = "TIE";
        }

        let playerString = player.toString().substring(0, 6);

        var cityName = payload.name
        var source = Math.floor(payload.space / 10)
        var target = Math.floor(payload.space % 10)
        var cost = 0
        if(cityName === 'TelAviv') {
          cost = (target - source)*10
        } else {
          cost = (target-source)*5
        }

        _display(
          `cost is: ${cost}, Player ${playerString} takes space: ${payload.space}\n\n` +
            _cityToStr(
              city.board,
              city.state,
              city.player1,
              city.player2,
              payload.name
            )
        );

        return xoState.setCity(payload.name, city);
      });
    }
  }
}

module.exports = XOHandler;
