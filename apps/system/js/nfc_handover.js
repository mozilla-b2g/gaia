/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Copyright © 2013, Deutsche Telekom, Inc. */

'use strict';

/*******************************************************************************
 * HandoverManager handles handovers from other Bluetooth devices according
 * to the specification of the NFC Forum (Document:
 * NFCForum-TS-ConnectionHandover_1_2.doc). HandoverManager exports the
 * following function:
 * - handleHandoverSelect: handle NDEF Handover Select message
 */
function HandoverManager() {

  this.DEBUG = false;
  this.settings = window.navigator.mozSettings;
  this.bluetooth = window.navigator.mozBluetooth;
  this.nfc = window.navigator.mozNfc;

  this.defaultAdapter = null;

  var self = this;

  /*****************************************************************************
   *****************************************************************************
   * Utility functions/classes
   *****************************************************************************
   ****************************************************************************/

  /**
   * Debug method
   */
  function debug(msg, optObject) {
    if (self.DEBUG) {
      var output = '[DEBUG] SYSTEM NFC-HANDOVER: ' + msg;
      if (optObject) {
        output += JSON.stringify(optObject);
      }
      if (typeof dump !== 'undefined') {
        dump(output);
      } else {
        console.log(output);
      }
    }
  }

  /*****************************************************************************
   * NdefUtils: Some common utilities functions.
   */
  var NdefUtils = {

    fromUTF8: function fromUTF8(str) {
      var buf = new Uint8Array(str.length);
      for (var i = 0; i < str.length; i++) {
        buf[i] = str.charCodeAt(i);
      }
      return buf;
    },

    equalArrays: function equalArrays(a1, a2) {
      if (a1.length != a2.length) {
        return false;
      }
      for (var i = 0; i < a1.length; i++) {
        if (a1[i] != a2[i]) {
          return false;
        }
      }
      return true;
    },

    toUTF8: function toUTF8(a) {
      var str = '';
      for (var i = 0; i < a.length; i++) {
        str += String.fromCharCode(a[i]);
      }
      return str;
    }

  };

  /*****************************************************************************
   * NdefConsts: some NDEF-related constants as defined by the NFC Forum.
   */
  var NdefConsts = {
    MB: 1 << 7,
    ME: 1 << 6,
    CF: 1 << 5,
    SR: 1 << 4,
    IL: 1 << 3,
    TNF: 0x07,

    tnf_well_known: 0x01,
    tnf_mime_media: 0x02,

    rtd_alternative_carrier: 0,
    rts_collision_resolution: 0,
    rtd_handover_carrier: 0,
    rtd_handover_request: 0,
    rtd_handover_select: 0,

    init: function init() {
      this.rtd_alternative_carrier = NdefUtils.fromUTF8('ac');
      this.rtd_collision_resolution = NdefUtils.fromUTF8('cr');
      this.rtd_handover_carrier = NdefUtils.fromUTF8('Hc');
      this.rtd_handover_request = NdefUtils.fromUTF8('Hr');
      this.rtd_handover_select = NdefUtils.fromUTF8('Hs');
    }
  };

  NdefConsts.init();

  /*****************************************************************************
   * Buffer: helper class that makes it easier to read from a Uint8Array.
   * @param {Uint8Array} uint8array The Uint8Array instance to wrap.
   */
  function Buffer(uint8array) {
    /*
     * It is weird that the uint8array parameter (which is of type Uint8Array)
     * needs to be wrapped in another Uint8Array instance. Running the code
     * with node.js does not require this, but when running it is Gaia it will
     * later complain that subarray is not a function when the parameter is
     * not wrapped.
     */
    this.uint8array = new Uint8Array(uint8array);
    this.offset = 0;
  }

  Buffer.prototype.getOctet = function getOctet() {
    if (this.offset == this.uint8array.length) {
      throw 'Buffer too small';
    }
    return this.uint8array[this.offset++];
  };

  Buffer.prototype.getOctetArray = function getOctetArray(len) {
    if (this.offset + len > this.uint8array.length) {
      throw 'Buffer too small';
    }
    var a = this.uint8array.subarray(this.offset, this.offset + len);
    this.offset += len;
    return a;
  };

  Buffer.prototype.skip = function skip(len) {
    if (this.offset + len > this.uint8array.length) {
      throw 'Buffer too small';
    }
    this.offset += len;
  };

  /*****************************************************************************
   * NdefCodec: Coding/decoding of NDEF messages (NFCForum-TS-NDEF_1.0)
   */
  var NdefCodec = {

    /**
     * parse(): parses a NDEF message contained in a Buffer instance.
     * Usage:
     *   var buf = new Buffer(<Uint8Array that contains the raw NDEF message>);
     *   var ndef = NdefCodec.parse(buf);
     *
     * 'null' is returned if the message could not be parsed. Otherwise the
     * result is an array of MozNdefRecord instances.
     */
    parse: function parse(buffer) {
      this.buffer = buffer;
      try {
        return NdefCodec.doParse();
      } catch (err) {
        debug(err);
        return null;
      }
    },

    doParse: function doParse() {
      var records = new Array();
      var isFirstRecord = true;
      do {
        var firstOctet = this.buffer.getOctet();
        if (isFirstRecord && !(firstOctet & NdefConsts.MB)) {
          throw 'MB bit not set in first NDEF record';
        }
        if (!isFirstRecord && (firstOctet & NdefConsts.MB)) {
          throw 'MB can only be set for the first record';
        }
        if (firstOctet & NdefConsts.CF) {
          throw 'Cannot deal with chunked records';
        }
        records.push(NdefCodec.parseNdefRecord(firstOctet));
        isFirstRecord = false;
      } while (!(firstOctet & NdefConsts.ME));
      return records;
    },

    parseNdefRecord: function parseNdefRecord(firstOctet) {
      var tnf = firstOctet & NdefConsts.TNF;
      var typeLen = this.buffer.getOctet();
      var payloadLen = this.buffer.getOctet();
      if (!(firstOctet & NdefConsts.SR)) {
        for (var i = 0; i < 3; i++) {
          payloadLen <<= 8;
          payloadLen |= this.buffer.getOctet();
        }
      }
      var idLen = 0;
      if (firstOctet & NdefConsts.IL) {
        idLen = this.buffer.getOctet();
      }
      var type = this.buffer.getOctetArray(typeLen);
      var id = this.buffer.getOctetArray(idLen);
      var payload = this.buffer.getOctetArray(payloadLen);
      return new MozNdefRecord(tnf, type, id, payload);
    }
  };

  /*****************************************************************************
   * NdefHandoverCodec: Coding/decoding of NDEF Handover messages.
   * (NFCForum-TS-ConnectionHandover_1_2.doc)
   */
  var NdefHandoverCodec = {

    /**
     * parse(): parse a NDEF message containing a handover message. 'ndefMsg'
     * is an Array of MozNdefRecord. Only 'Hr' and 'Hs' records are parsed.
     * The result is an object with the following attributes:
     *   - type: either 'Hr' (Handover Request) or 'Hs' (Handover Select)
     *   - majorVersion
     *   - minorVersion
     *   - cr: Collision resolution value. Tthis value is only present
     *         for a 'Hr' record
     *   - ac: Array of Alternate Carriers. Each object of this array has
     *         the following attributes:
     *           - cps: Carrier Power State
     *           - cdr: Carrier Data Record: MozNdefRecord containing further
     *                  info
     */
    parse: function parse(ndefMsg) {
      try {
        return NdefHandoverCodec.doParse(ndefMsg);
      } catch (err) {
        debug(err);
        return null;
      }
    },

    doParse: function doParse(ndefMsg) {
      var record = ndefMsg[0];
      var buffer = new Buffer(record.payload);
      var h = {};
      var version = buffer.getOctet();
      h.majorVersion = version >>> 4;
      h.minorVersion = version & 0x0f;
      h.ac = [];

      var embeddedNdef = NdefCodec.parse(buffer);
      if (embeddedNdef == null) {
        throw 'Could not parse embedded NDEF in Hr/Hs record';
      }

      if (record.tnf != NdefConsts.tnf_well_known) {
        throw 'Expected Well Known TNF in Hr/Hs record';
      }

      if (NdefUtils.equalArrays(record.type, NdefConsts.rtd_handover_select)) {
        h.type = 'Hs';
        this.parseAcRecords(h, ndefMsg, embeddedNdef, 0);
      } else if (NdefUtils.equalArrays(record.type,
                 NdefConsts.rtd_handover_request)) {
        h.type = 'Hr';
        var crr = embeddedNdef[0];
        if (!NdefUtils.equalArrays(crr.type,
            NdefConsts.rtd_collision_resolution)) {
          throw 'Expected Collision Resolution Record';
        }
        if (crr.payload.length != 2) {
          throw 'Expected random number in Collision Resolution Record';
        }
        h.cr = (crr.payload[0] << 8) | crr.payload[1];
        this.parseAcRecords(h, ndefMsg, embeddedNdef, 1);
      } else {
        throw 'Can only handle Hr and Hs records for now';
      }
      return h;
    },

    parseAcRecords: function parseAcRecords(h, ndef, acNdef, offset) {
      for (var i = offset; i < acNdef.length; i++) {
        var record = acNdef[i];
        if (NdefUtils.equalArrays(record.type,
            NdefConsts.rtd_alternative_carrier)) {
          h.ac.push(this.parseAC(record.payload, ndef));
        } else {
          throw 'Can only parse AC record within Hs';
        }
      }
    },

    parseAC: function parseAC(ac, ndef) {
      var b = new Buffer(ac);
      var ac = {};
      ac.cps = b.getOctet() & 0x03;
      var cdrLen = b.getOctet();
      var cdr = b.getOctetArray(cdrLen);
      ac.cdr = this.findNdefRecordWithId(cdr, ndef);
      return ac;
    },

    findNdefRecordWithId: function findNdefRecordWithId(id, ndef) {
      for (var i = 0; i < ndef.length; i++) {
        var record = ndef[i];
        if (NdefUtils.equalArrays(id, record.id)) {
          return record;
        }
      }
      throw 'Could not find record with id';
    },

    /**
     * searchForBluetoothAC(): searches a Handover message for an
     * Alternative Carrier that contains a Bluetooth profile.
     * Parameter 'h' is the result of the parse() function.
     * Returns null if no Bluetooth AC could be found, otherwise
     * returns a MozNdefRecord.
     */
    searchForBluetoothAC: function searchForBluetoothAC(h) {
      for (var i = 0; i < h.ac.length; i++) {
        var cdr = h.ac[i].cdr;
        if (cdr.tnf == NdefConsts.tnf_mime_media) {
          var mimeType = NdefUtils.toUTF8(cdr.type);
          if (mimeType == 'application/vnd.bluetooth.ep.oob') {
            return cdr;
          }
        }
      }
      return null;
    },

    /**
     * parseBluetoothSSP(): Parses a Carrier Data Record that contains a
     * Bluetooth Secure Simple Pairing record (NFCForum-AD-BTSSP_1.0).
     * 'cdr': Carrier Data Record. Returns an object with the following
     * attributes:
     *   - mac: MAC address (string representation)
     *   - localName: Local name (optional)
     */
    parseBluetoothSSP: function parseBluetoothSSP(cdr) {
      var btssp = {};
      var buf = new Buffer(cdr.payload);
      var btsspLen = buf.getOctet() | (buf.getOctet() << 8);
      var mac = '';
      for (var i = 0; i < 6; i++) {
        if (mac.length > 0) {
          mac = ':' + mac;
        }
        var o = buf.getOctet();
        mac = o.toString(16).toUpperCase() + mac;
        if (o < 16) {
          mac = '0' + mac;
        }
      }
      btssp.mac = mac;
      while (buf.offset != cdr.payload.length) {
        // Read OOB value
        var len = buf.getOctet() - 1 /* 'len' */;
        var type = buf.getOctet();
        switch (type) {
        case 0x08:
        case 0x09:
          // Local name
          var n = buf.getOctetArray(len);
          btssp.localName = NdefUtils.toUTF8(n);
          break;
        default:
          // Ignore OOB value
          buf.skip(len);
          break;
        }
      }
      return btssp;
    }
  };

  /*****************************************************************************
   *****************************************************************************
   * Event handlers
   *****************************************************************************
   ****************************************************************************/


  /*
   * actionQueue keeps a list of actions that need to be performed after
   * Bluetooth is turned on.
   */
  this.actionQueue = new Array();

  /*
   * settingsNotified is used to prevent triggering Settings multiple times.
   */
  this.settingsNotified = false;

  if (this.bluetooth) {
    this.bluetooth.addEventListener('adapteradded', function() {
      debug('adapteradded');
      var req = self.bluetooth.getDefaultAdapter();
      req.onsuccess = function bt_getAdapterSuccess() {
        self.settingsNotified = false;
        self.defaultAdapter = req.result;
        debug('MAC address: ' + self.defaultAdapter.address);
        debug('MAC name: ' + self.defaultAdapter.name);
        /*
         * Call all actions that have queued up while Bluetooth
         * was turned on.
         */
        for (var i = 0; i < self.actionQueue.length; i++) {
          var action = self.actionQueue[i];
          action.callback.apply(null, action.args);
        }
        self.actionQueue = new Array();
      };
    });
  }

  /*****************************************************************************
   *****************************************************************************
   * Private helper functions
   *****************************************************************************
   ****************************************************************************/

  /*
   * Performs an action once Bluetooth is enabled. If Bluetooth is disabled,
   * it is enabled and the action is queued. If Bluetooth is already enabled,
   * performs the action directly.
   */
  function doAction(action) {
    if (!self.bluetooth.enabled) {
      debug('Bluetooth: not yet enabled');
      self.actionQueue.push(action);
      if (self.settingsNotified == false) {
        self.settings.createLock().set({'bluetooth.enabled': true});
        self.settingsNotified = true;
      }
    } else {
      action.callback.apply(null, action.args);
    }
  }

  function doPairing(mac) {
    debug('doPairing: ' + mac);
    if (self.defaultAdapter == null) {
      // No BT
      debug('No defaultAdapter');
      return;
    }
    var req = self.defaultAdapter.pair(mac);
    req.onsuccess = function() {
      debug('Pairing succeeded!');
    };
    req.onerror = function() {
      debug('Pairing failed!');
    };
  }

  /*****************************************************************************
   *****************************************************************************
   * Handover API
   *****************************************************************************
   ****************************************************************************/

  this.handleHandoverSelect = function handleHandoverSelect(ndef) {
    debug('handleHandoverSelect');
    var h = NdefHandoverCodec.parse(ndef);
    if (h == null) {
      // Bad handover message. Just ignore.
      debug('Bad handover messsage');
      return;
    }
    var btsspRecord = NdefHandoverCodec.searchForBluetoothAC(h);
    if (btsspRecord == null) {
      // There is no Bluetooth Alternative Carrier record in the
      // Handover Select message. Since we cannot handle WiFi Direct,
      // just ignore.
      debug('No BT AC');
      return;
    }
    var btssp = NdefHandoverCodec.parseBluetoothSSP(btsspRecord);
    var mac = btssp.mac;
    debug('Pair with: ' + mac);
    doAction({callback: doPairing, args: [mac]});
  };
}

var handoverManager = new HandoverManager();
