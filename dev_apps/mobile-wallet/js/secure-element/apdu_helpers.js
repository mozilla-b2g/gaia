/*
CRS AID, TAGS and APDUs based on:
GlobalPlatform Card Technology Contactless Services Card Specification v2.2
– Amendment C Version 1.1.1

UICC APDUs based on:
ETSI TS 102 221 V8.2.0 (2009-06)
Smart Cards; UICC-Terminal interface; Physical and logical characteristics
(Release 8)
*/

/* globals SEUtils */
/* exported APDU, AID, TAG */

'use strict';

(function(exports) {

  const AID = {
    CRS: 'A00000015143525300',
    UICC: 'A0000000871001FF33FFFF8901010100'
  };

  const APDU = {
    // gets the response from SIM, can be used to retireve channel select
    getResponse: { cla: 0x00, ins: 0xC0, p1: 0x00, p2: 0x00 },
    readBinary: { cla: 0x00, ins: 0xB0, p1: 0x00, p2: 0x00 },
    CRS: {
      // Get applet version number and global update counter
      getData: { cla: 0x80, ins: 0xCA, p1: 0x00, p2: 0xA5 },
      // Get status of applets and Security Domains only.
      // The ISD is ignored. Get first or only occurrence
      getStatusAll1st: {
        cla: 0x80, ins: 0xF2, p1: 0x40, p2: 0x00,
        data: new Uint8Array([
         0x4F, 0x00, // applet AID, empty here
         0x5C, 0x03, // tag list to be returned
         0x4F,       // AID
         0x9F, 0x70  // applet life cycle state - first byte;
                     // contactless activation state - second byte
        ])
      },
      // Get status of applets and Security Domains only.
      // The ISD is ignored. Get next occurrence(s), if SW is 63h10h
      getStatusAllNext: { cla: 0x80, ins: 0xF2, p1: 0x40, p2: 0x01,
        data: new Uint8Array([0x4F, 0x00, 0x5C, 0x03, 0x4F, 0x9F, 0x70]) },
      // Get status of applet identified with AID
      getStatusAID: (aid) => {
        return { cla: 0x80, ins: 0xF2, p1: 0x40, p2: 0x00,
          data: SEUtils.joinUint8Arrays(
            [0x4F, 0x0F], // applet AID
            SEUtils.hexStringToByte(aid),
            [0x5C, 0x04,  // tag list
             0x4F, // AID
             0x9F, // applet lifecycle state
             0x70, // contactless activation state
             0x81  // selection priority
            ]
          )
        };
      },
      activateCLF: (aid) => {
        return { cla: 0x80, ins: 0xF0, p1: 0x01, p2: 0x01,
          data: SEUtils.joinUint8Arrays([0x4F, 0x0F],
                                        SEUtils.hexStringToByte(aid))
        };
      },
      deactivateCLF: (aid) => {
        return { cla: 0x80, ins: 0xF0, p1: 0x01, p2: 0x00,
          data: SEUtils.joinUint8Arrays([0x4F, 0x0F],
                                        SEUtils.hexStringToByte(aid))
        };
      },
      nfcActivate: { cla: 0x80, ins: 0xF0, p1: 0x04, p2: 0x80,
                     data: new Uint8Array([0x80, 0x01, 0x40]) },
      nfcDeactivate: { cla: 0x80, ins: 0xF0, p1: 0x04, p2: 0x00,
                       data: new Uint8Array([0x80, 0x01, 0x40]) }
    },
    // PIN commands
    UICC: {
      getAttempts: (p2) => {
        return { cla: 0x00, ins: 0x20, p1: 0x00, p2: p2 };
      },
      verify: (p2, pinBytes) => {
        return { cla: 0x00, ins: 0x20, p1: 0x00, p2: p2, data: pinBytes };
      },
      enable: (p2, defPinBytes) => {
        return { cla: 0x00, ins: 0x28, p1: 0x00, p2: p2, data: defPinBytes };
      },
      disable: (p2, defPinBytes) => {
        return { cla: 0x00, ins: 0x26, p1: 0x00, p2: p2, data: defPinBytes };
      },
      change: (p2, curPinBytes, newPinBytes) => {
        var data = SEUtils.joinUint8Arrays(curPinBytes, newPinBytes);
        return { cla: 0x00, ins: 0x24, p1: 0x00, p2: p2, data: data };
      },
      unblock: (p2, pukBytes, defPinBytes) => {
        var data = SEUtils.joinUint8Arrays(pukBytes, defPinBytes);
        return { cla: 0x00, ins: 0x2C, p1: 0x00, p2: p2, data: data };
      }
    }
  };

  const TAG = {
    CRS: {
      APP_TEMPLATE: 0x61,
      AID: 0x4F,
      STATE: 0x9F70
    },
  };

exports.AID = AID;
exports.APDU = APDU;
exports.TAG = TAG;

}((typeof exports === 'undefined') ? window : exports));
