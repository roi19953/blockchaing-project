/**
 * Copyright 2018 Intel Corporation
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

const crypto = require("crypto");

class XoState {
  constructor(context) {
    this.context = context;
    this.addressCache = new Map([]);
    this.timeout = 500; // Timeout in milliseconds
  }

  getCity(name) {
    return this._loadCitys(name).then((citys) => citys.get(name));
  }

  setCity(name, city) {
    let address = _makeXoAddress(name);

    return this._loadCitys(name)
      .then((citys) => {
        citys.set(name, city);
        return citys;
      })
      .then((citys) => {
        let data = _serialize(citys);

        this.addressCache.set(address, data);
        let entries = {
          [address]: data,
        };
        return this.context.setState(entries, this.timeout);
      });
  }

  deleteCity(name) {
    let address = _makeXoAddress(name);
    return this._loadCitys(name).then((citys) => {
      citys.delete(name);

      if (citys.size === 0) {
        this.addressCache.set(address, null);
        return this.context.deleteState([address], this.timeout);
      } else {
        let data = _serialize(citys);
        this.addressCache.set(address, data);
        let entries = {
          [address]: data,
        };
        return this.context.setState(entries, this.timeout);
      }
    });
  }

  _loadCitys(name) {
    let address = _makeXoAddress(name);
    if (this.addressCache.has(address)) {
      if (this.addressCache.get(address) === null) {
        return Promise.resolve(new Map([]));
      } else {
        return Promise.resolve(_deserialize(this.addressCache.get(address)));
      }
    } else {
      return this.context
        .getState([address], this.timeout)
        .then((addressValues) => {
          if (!addressValues[address].toString()) {
            this.addressCache.set(address, null);
            return new Map([]);
          } else {
            let data = addressValues[address].toString();
            this.addressCache.set(address, data);
            return _deserialize(data);
          }
        });
    }
  }
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

module.exports = {
  XO_NAMESPACE,
  XO_FAMILY,
  XoState,
};

const _deserialize = (data) => {
  let citysIterable = data
    .split("|")
    .map((x) => x.split(","))
    .map((x) => [
      x[0],
      { name: x[0], board: x[1], state: x[2], player1: x[3], player2: x[4] },
    ]);
  return new Map(citysIterable);
};

const _serialize = (citys) => {
  let cityStrs = [];
  for (let nameCity of citys) {
    let name = nameCity[0];
    let city = nameCIty[1];
    cityStrs.push(
      [name, city.board, city.state, city.player1, city.player2].join(",")
    );
  }

  cityStrs.sort();

  return Buffer.from(cityStrs.join("|"));
};
