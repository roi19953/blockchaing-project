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

const _gameToStr = (board, state, player1, player2, name) => {
  board = board.replace(/-/g, " ");
  board = board.split("");
  let out = "";
  out += `GAME: ${name}\n`;
  out += `PLAYER 1: ${player1.substring(0, 6)}\n`;
  out += `PLAYER 2: ${player2.substring(0, 6)}\n`;
  out += `STATE: ${state}\n`;
  out += `\n`;
  out += `${board[0]} | ${board[1]} | ${board[2]} | ${board[3]} | ${board[4]} \n`;
  out += `---|---|---|---|--- \n`;
  out += `${board[5]} | ${board[6]} | ${board[7]} | ${board[8]} | ${board[9]} \n`;
  out += `---|---|---|---|--- \n`;
  out += `${board[10]} | ${board[11]} | ${board[12]} | ${board[13]} | ${board[14]} \n`;
  out += `---|---|---|---|--- \n`;
  out += `${board[15]} | ${board[16]} | ${board[17]} | ${board[18]} | ${board[19]} \n`;
  out += `---|---|---|---|--- \n`;
  out += `${board[20]} | ${board[21]} | ${board[22]} | ${board[23]} | ${board[24]} \n`;
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
    [1, 2, 3, 4 ,5],
    [6, 7, 8, 9 ,10],
    [11, 12, 13, 14 ,15],
    [16, 17, 18, 19 ,20],
    [21, 22, 23, 24 ,25],
    [1, 6, 11, 16 ,21],
    [2, 7, 12, 17 ,22],
    [3, 8, 13, 18 ,23],
    [4, 9, 14, 19 ,24],
    [5, 10, 15, 20 ,25],
    [1, 7, 13, 19 ,25],
    [5, 9, 13, 17 ,21],
  ];
  let win;
  for (let i = 0; i < wins.length; i++) {
    win = wins[i];
    if (
      board[win[0] - 1] === letter &&
      board[win[1] - 1] === letter &&
      board[win[2] - 1] === letter &&
      board[win[3] - 1] === letter &&
      board[win[4] - 1] === letter
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
      return xoState.getGame(payload.name).then((game) => {
        if (game !== undefined) {
          throw new InvalidTransaction("Invalid Action: Game already exists.");
        }

        let createdGame = {
          name: payload.name,
          board: "-------------------------",
          state: "P1-NEXT",
          player1: "",
          player2: "",
        };

        _display(
          `Player ${player.toString().substring(0, 6)} created game ${
            payload.name
          }`
        );

        return xoState.setGame(payload.name, createdGame);
      });
    } else if (payload.action === "take") {
      return xoState.getGame(payload.name).then((game) => {
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

        if (game === undefined) {
          throw new InvalidTransaction(
            "Invalid Action: Take requires an existing game."
          );
        }
        if (["P1-WIN", "P2-WIN", "TIE"].includes(game.state)) {
          throw new InvalidTransaction("Invalid Action: Game has ended.");
        }

        if (game.player1 === "") {
          game.player1 = player;
        } else if (game.player2 === "") {
          game.player2 = player;
        }
        let boardList = game.board.split("");

        if (boardList[payload.space - 1] !== "-") {
          throw new InvalidTransaction("Invalid Action: Space already taken.");
        }
/************************************************************************************************ */
        

        if (game.state === "P1-NEXT" && player === game.player1) {
          boardList[payload.space - 1] = "X";
          game.state = "P2-NEXT";
        } else if (game.state === "P2-NEXT" && player === game.player2) {
          boardList[payload.space - 1] = "O";
          game.state = "P1-NEXT";
        } else {
          console.log("state: " + game.state + "player1: " + game.player1 + "player2: " + game.player2 + "player: " + player)
          throw new InvalidTransaction(
            `Not this player's turn: ${player.toString().substring(0, 6)}`
          );
        }//P1-NEXTplayer1: 02e2b2f9a5e5374a9f81f1bbd1911f80859e602137b94fd96ef00b3906e7e12571player2: 03e8ff142baa25d288122e95b42cef2c94d6b8a2836a6ea47288b80241ec64600f

        game.board = boardList.join("");

        if (_isWin(game.board, "X")) {
          game.state = "P1-WIN";
        } else if (_isWin(game.board, "O")) {
          game.state = "P2-WIN";
        } else if (game.board.search("-") === -1) {
          game.state = "TIE";
        }

        let playerString = player.toString().substring(0, 6);

        _display(
          `Player ${playerString} takes space: ${payload.space}\n\n` +
            _gameToStr(
              game.board,
              game.state,
              game.player1,
              game.player2,
              payload.name
            )
        );

        return xoState.setGame(payload.name, game);
      });
    } else if (payload.action === "delete") {
      return xoState.getGame(payload.name).then((game) => {
        if (game === undefined) {
          throw new InvalidTransaction(
            `No game exists with name ${payload.name}: unable to delete`
          );
        }
        return xoState.deleteGame(payload.name);
      });
    } else {
      throw new InvalidTransaction(
        `Action must be create, delete, or take not ${payload.action}`
      );
    }
  }
}

module.exports = XOHandler;
