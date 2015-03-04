'use strict';

/* exported Utils, APDU, AID */

const Utils = {
  byteToHexString: function byteToHexString(uint8arr) {
    if (!uint8arr) {
      return '';
    }

    var hexStr = '';
    for (var i = 0; i < uint8arr.length; i++) {
      var hex = (uint8arr[i] & 0xff).toString(16);
      hex = (hex.length === 1) ? '0' + hex : hex;
      hexStr += hex;
    }
    return hexStr.toUpperCase();
  },

  hexStringToByte: function hexStringToByte(str) {
    var a = [];
    for(var i = 0, len = str.length; i < len; i+=2) {
      a.push(parseInt(str.substr(i,2),16));
    }
    return new Uint8Array(a);
  },

  joinUint8Arrays: function joinUint8Arrays() {
    var args = Array.prototype.slice.call(arguments);
    var length = args.reduce(function(a, b) { return a + b.length; }, 0);
    var out = new Uint8Array(length);

    args.reduce(function(previousLen, buffer) {
      out.set(buffer, previousLen);
      return previousLen + buffer.length;
    }, 0);

    return out;
  },

  whilePromise: function whilePromise(condition, action, init) {
    return new Promise((resolve, reject) => {
      var loop = (value) => {
        if (condition(value)) {
          return resolve(value);
        }

        return action(value).then(loop).catch(reject);
      };
      loop(init);
    });
  },

  parseAppletsData: function parseAppletsData(data) {
    var list = [];
    for(var i = 0, len = data.length; i < len;) {
      if(data[i] === 0x61) {
        var end = i+2 + data[i+1];
        var appletData = data.subarray(i+2, end);
        var applet = this._parseSingleApplet(appletData);

        if(applet) {
          list.push(applet);
        }
        i = end;
      }
    }

    return list;
  },

  _parseSingleApplet: function _parseSingleApplet(data) {
    // checking for AID tag
    if (data[0] === 0x4F) {
      var applet = {
        aid: this.byteToHexString(data.subarray(2, 2 + data[1])),
        state: this.byteToHexString(data.subarray(data[1] + 5))
      };
      return applet;
    }
  },
};

/*
CRS AID, TAGS and APDUs based on:
GlobalPlatform Card Technology Contactless Services Card Specification v2.2
- Amendment C Version 1.1.1
*/

const AID = {
  CRS: Utils.hexStringToByte('A00000015143525300')
};

const APDU = {
  CRS: {
    getStatusAll1st: { cla: 0x80, ins: 0xF2, p1: 0x40, p2: 0x00,
      data: new Uint8Array([
        0x4F, 0x00, // applet AID, empty here
        0x5C, 0x03, // tag list to be returned
        0x4F, // AID
        0x9F, 0x70  // applet life cycle state - first byte;
                    // contactless activation state - second byte
      ])
    },

    getStatusAllNext: { cla: 0x80, ins: 0xF2, p1: 0x40, p2: 0x01,
      data: new Uint8Array([0x4F, 0x00, 0x5C, 0x03, 0x4F, 0x9F, 0x70])
    },

    activateCLF: (aid) => {
      return { cla: 0x80, ins: 0xF0, p1: 0x01, p2: 0x01, data:
        Utils.joinUint8Arrays([0x4F, 0x0F], Utils.hexStringToByte(aid))
      };
    },

    deactivateCLF: (aid) => {
      return { cla: 0x80, ins: 0xF0, p1: 0x01, p2: 0x00, data:
        Utils.joinUint8Arrays([0x4F, 0x0F], Utils.hexStringToByte(aid))
      };
    },
  }
};
