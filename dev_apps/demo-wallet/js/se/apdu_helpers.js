/*
CRS AID, TAGS and APDUs based on:
GlobalPlatform Card Technology Contactless Services Card Specification v2.2
– Amendment C Version 1.1.1
*/

/* globals SEUtils, SECommand */
/* exported APDU, AID, TAG */

'use strict';

const AID = {
  CRS: SEUtils.hexStringToByte('A00000015143525300')
};

const APDU = {
  // gets the response from SIM, can be used to retireve channel select
  getResponse: new SECommand(0x00, 0xC0, 0x00, 0x00, new Uint8Array()),
  readBinary: new SECommand(0x00, 0xB0, 0x00, 0x00, new Uint8Array()),
  CRS: {
    // Get applet version number and global update counter
    getData: new SECommand(0x80, 0xCA, 0x00, 0xA5, new Uint8Array()),
    // Get status of applets and Security Domains only.
    // The ISD is ignored. Get first or only occurrence
    getStatusAll1st: new SECommand(0x80, 0xF2, 0x40, 0x00,
      new Uint8Array([
        0x4F, 0x00, // applet AID, empty here
        0x5C, 0x03, // tag list to be returned
        0x4F, // AID
        0x9F, 0x70  // applet life cycle state - first byte;
                    // contactless activation state - second byte
      ])),
    // Get status of applets and Security Domains only.
    // The ISD is ignored. Get next occurrence(s), if SW is 63h10h
    getStatusAllNext: new SECommand(0x80, 0xF2, 0x40, 0x01,
      new Uint8Array([0x4F, 0x00, 0x5C, 0x03, 0x4F, 0x9F, 0x70])),
    // Get status of applet identified with AID
    getStatusAID: (aid) => {
      return new SECommand(0x80, 0xF2, 0x40, 0x00,
        SEUtils.joinUint8Arrays(
          [0x4F, 0x0F], // applet AID
          SEUtils.hexStringToByte(aid),
          [0x5C, 0x04,  // tag list
           0x4F, // AID
           0x9F, // applet lifecycle state
           0x70, // contactless activation state
           0x81 // selection priority
          ]
        )
      );
    },
    activateCLF: (aid) => {
      return new SECommand(0x80, 0xF0, 0x01, 0x01,
        SEUtils.joinUint8Arrays([0x4F, 0x0F], SEUtils.hexStringToByte(aid)));
    },
    deactivateCLF: (aid) => {
      return new SECommand(0x80, 0xF0, 0x01, 0x00,
        SEUtils.joinUint8Arrays([0x4F, 0x0F], SEUtils.hexStringToByte(aid)));
    },
    nfcActivate: new SECommand(0x80, 0xF0, 0x04, 0x80,
                               new Uint8Array([0x80, 0x01, 0x40])),
    nfcDeactivate: new SECommand(0x80, 0xF0, 0x04, 0x00,
                                 new Uint8Array([0x80, 0x01, 0x40]))
  }
};

const TAG  = {
  CRS: {
    AID: 0x4F,
    STATE: 0x9F70
  },
};