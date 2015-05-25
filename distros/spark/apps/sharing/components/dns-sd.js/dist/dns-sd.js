!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.DNSSD=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*jshint esnext:true*/
/*exported BinaryUtils*/
'use strict';

module.exports = window.BinaryUtils = (function() {

var BinaryUtils = {
  stringToArrayBuffer: function(string) {
    var length = (string || '').length;
    var arrayBuffer = new ArrayBuffer(length);
    var uint8Array = new Uint8Array(arrayBuffer);
    for (var i = 0; i < length; i++) {
      uint8Array[i] = string.charCodeAt(i);
    }

    return arrayBuffer;
  },

  arrayBufferToString: function(arrayBuffer) {
    var results = [];
    var uint8Array = new Uint8Array(arrayBuffer);

    for (var i = 0, length = uint8Array.length; i < length; i += 200000) {
      results.push(String.fromCharCode.apply(null, uint8Array.subarray(i, i + 200000)));
    }

    return results.join('');
  },

  blobToArrayBuffer: function(blob, callback) {
    var fileReader = new FileReader();
    fileReader.onload = function() {
      if (typeof callback === 'function') {
        callback(fileReader.result);
      }
    };
    fileReader.readAsArrayBuffer(blob);

    return fileReader.result;
  },

  mergeArrayBuffers: function(arrayBuffers, callback) {
    return this.blobToArrayBuffer(new Blob(arrayBuffers), callback);
  }
};

return BinaryUtils;

})();

},{}],2:[function(require,module,exports){
/*jshint esnext:true*/
/*exported ByteArray*/
'use strict';

module.exports = window.ByteArray = (function() {

var BinaryUtils = require('./binary-utils');

function ByteArray(maxBytesOrData) {
  if (maxBytesOrData instanceof ByteArray) {
    maxBytesOrData = maxBytesOrData.buffer;
  }

  if (maxBytesOrData instanceof Uint8Array ||
      maxBytesOrData instanceof ArrayBuffer) {
    this._data = new Uint8Array(maxBytesOrData);
    this._buffer = this._data.buffer;
    this._cursor = this._data.length;
    return this;
  }

  this._buffer = new ArrayBuffer(maxBytesOrData || 256);
  this._data = new Uint8Array(this._buffer);
  this._cursor = 0;
}

ByteArray.prototype.constructor = ByteArray;

Object.defineProperty(ByteArray.prototype, 'length', {
  get: function() {
    return this._cursor;
  }
});

Object.defineProperty(ByteArray.prototype, 'buffer', {
  get: function() {
    return this._buffer.slice(0, this._cursor);
  }
});

ByteArray.prototype.push = function(value, length) {
  length = length || 1;

  this.append(valueToUint8Array(value, length));
};

ByteArray.prototype.append = function(data) {
  // Get `data` as a `Uint8Array`
  if (data instanceof ByteArray) {
    data = data.buffer;
  }

  if (data instanceof ArrayBuffer) {
    data = new Uint8Array(data);
  }

  for (var i = 0, length = data.length; i < length; i++) {
    this._data[this._cursor] = data[i];
    this._cursor++;
  }
};

ByteArray.prototype.getReader = function(startByte) {
  return new ByteArrayReader(this, startByte);
};

function ByteArrayReader(byteArray, startByte) {
  this.byteArray = byteArray;
  this.cursor = startByte || 0;
}

ByteArrayReader.prototype.constructor = ByteArrayReader;

Object.defineProperty(ByteArrayReader.prototype, 'eof', {
  get: function() {
    return this.cursor >= this.byteArray.length;
  }
});

ByteArrayReader.prototype.getBytes = function(length) {
  if (length === null || length === 0) {
    return new Uint8Array();
  }

  length = length || 1;

  var end = this.cursor + length;
  if (end > this.byteArray.length) {
    return new Uint8Array();
  }

  var uint8Array = new Uint8Array(this.byteArray._buffer.slice(this.cursor, end));
  this.cursor += length;

  return new ByteArray(uint8Array);
};

ByteArrayReader.prototype.getString = function(length) {
  var byteArray = this.getBytes(length);
  if (byteArray.length === 0) {
    return '';
  }

  return BinaryUtils.arrayBufferToString(byteArray.buffer);
};

ByteArrayReader.prototype.getValue = function(length) {
  var byteArray = this.getBytes(length);
  if (byteArray.length === 0) {
    return null;
  }

  return uint8ArrayToValue(new Uint8Array(byteArray.buffer));
};

/**
 *  Bit   1-Byte    2-Bytes     3-Bytes     4-Bytes
 *  -----------------------------------------------
 *    0        1        256       65536    16777216
 *    1        2        512      131072    33554432
 *    2        4       1024      262144    67108864
 *    3        8       2048      524288   134217728
 *    4       16       4096     1048576   268435456
 *    5       32       8192     2097152   536870912
 *    6       64      16384     4194304  1073741824
 *    7      128      32768     8388608  2147483648
 *  -----------------------------------------------
 *  Offset     0        255       65535    16777215
 *  Total    255      65535    16777215  4294967295
 */
function valueToUint8Array(value, length) {
  var arrayBuffer = new ArrayBuffer(length);
  var uint8Array = new Uint8Array(arrayBuffer);
  for (var i = length - 1; i >= 0; i--) {
    uint8Array[i] = value & 0xff;
    value = value >> 8;
  }

  return uint8Array;
}

function uint8ArrayToValue(uint8Array) {
  var length = uint8Array.length;
  if (length === 0) {
    return null;
  }

  var value = 0;
  for (var i = 0; i < length; i++) {
    value = value << 8;
    value += uint8Array[i];
  }

  return value;
}

return ByteArray;

})();

},{"./binary-utils":1}],3:[function(require,module,exports){
/*jshint esnext:true*/
/*exported DNSCodes*/
'use strict';

module.exports = window.DNSCodes = (function() {

const QUERY_RESPONSE_CODES = defineType({
  QUERY       : 0,      // RFC 1035 - Query
  RESPONSE    : 1       // RFC 1035 - Reponse
});

const OPERATION_CODES = defineType({
  QUERY       : 0,      // RFC 1035 - Query
  IQUERY      : 1,      // RFC 1035 - Inverse Query
  STATUS      : 2,      // RFC 1035 - Status
  NOTIFY      : 4,      // RFC 1996 - Notify
  UPDATE      : 5       // RFC 2136 - Update
});

const AUTHORITATIVE_ANSWER_CODES = defineType({
  NO          : 0,      // RFC 1035 - Not Authoritative
  YES         : 1       // RFC 1035 - Is Authoritative
});

const TRUNCATED_RESPONSE_CODES = defineType({
  NO          : 0,      // RFC 1035 - Not Truncated
  YES         : 1       // RFC 1035 - Is Truncated
});

const RECURSION_DESIRED_CODES = defineType({
  NO          : 0,      // RFC 1035 - Recursion Not Desired
  YES         : 1       // RFC 1035 - Recursion Is Desired
});

const RECURSION_AVAILABLE_CODES = defineType({
  NO          : 0,      // RFC 1035 - Recursive Query Support Not Available
  YES         : 1       // RFC 1035 - Recursive Query Support Is Available
});

const AUTHENTIC_DATA_CODES = defineType({
  NO          : 0,      // RFC 4035 - Response Has Not Been Authenticated/Verified
  YES         : 1       // RFC 4035 - Response Has Been Authenticated/Verified
});

const CHECKING_DISABLED_CODES = defineType({
  NO          : 0,      // RFC 4035 - Authentication/Verification Checking Not Disabled
  YES         : 1       // RFC 4035 - Authentication/Verification Checking Is Disabled
});

const RETURN_CODES = defineType({
  NOERROR     : 0,      // RFC 1035 - No Error
  FORMERR     : 1,      // RFC 1035 - Format Error
  SERVFAIL    : 2,      // RFC 1035 - Server Failure
  NXDOMAIN    : 3,      // RFC 1035 - Non-Existent Domain
  NOTIMP      : 4,      // RFC 1035 - Not Implemented
  REFUSED     : 5,      // RFC 1035 - Query Refused
  YXDOMAIN    : 6,      // RFC 2136 - Name Exists when it should not
  YXRRSET     : 7,      // RFC 2136 - RR Set Exists when it should not
  NXRRSET     : 8,      // RFC 2136 - RR Set that should exist does not
  NOTAUTH     : 9,      // RFC 2136 - Server Not Authoritative for zone
  NOTZONE     : 10      // RFC 2136 - NotZone Name not contained in zone
});

const CLASS_CODES = defineType({
  IN          : 1,      // RFC 1035 - Internet
  CS          : 2,      // RFC 1035 - CSNET
  CH          : 3,      // RFC 1035 - CHAOS
  HS          : 4,      // RFC 1035 - Hesiod
  NONE        : 254,    // RFC 2136 - None
  ANY         : 255     // RFC 1035 - Any
});

const OPTION_CODES = defineType({
  LLQ         : 1,      // RFC ???? - Long-Lived Queries
  UL          : 2,      // RFC ???? - Update Leases
  NSID        : 3,      // RFC ???? - Name Server Identifier
  OWNER       : 4,      // RFC ???? - Owner
  UNKNOWN     : 65535   // RFC ???? - Token
});

const RECORD_TYPES = defineType({
  SIGZERO     : 0,      // RFC 2931
  A           : 1,      // RFC 1035
  NS          : 2,      // RFC 1035
  MD          : 3,      // RFC 1035
  MF          : 4,      // RFC 1035
  CNAME       : 5,      // RFC 1035
  SOA         : 6,      // RFC 1035
  MB          : 7,      // RFC 1035
  MG          : 8,      // RFC 1035
  MR          : 9,      // RFC 1035
  NULL        : 10,     // RFC 1035
  WKS         : 11,     // RFC 1035
  PTR         : 12,     // RFC 1035
  HINFO       : 13,     // RFC 1035
  MINFO       : 14,     // RFC 1035
  MX          : 15,     // RFC 1035
  TXT         : 16,     // RFC 1035
  RP          : 17,     // RFC 1183
  AFSDB       : 18,     // RFC 1183
  X25         : 19,     // RFC 1183
  ISDN        : 20,     // RFC 1183
  RT          : 21,     // RFC 1183
  NSAP        : 22,     // RFC 1706
  NSAP_PTR    : 23,     // RFC 1348
  SIG         : 24,     // RFC 2535
  KEY         : 25,     // RFC 2535
  PX          : 26,     // RFC 2163
  GPOS        : 27,     // RFC 1712
  AAAA        : 28,     // RFC 1886
  LOC         : 29,     // RFC 1876
  NXT         : 30,     // RFC 2535
  EID         : 31,     // RFC ????
  NIMLOC      : 32,     // RFC ????
  SRV         : 33,     // RFC 2052
  ATMA        : 34,     // RFC ????
  NAPTR       : 35,     // RFC 2168
  KX          : 36,     // RFC 2230
  CERT        : 37,     // RFC 2538
  DNAME       : 39,     // RFC 2672
  OPT         : 41,     // RFC 2671
  APL         : 42,     // RFC 3123
  DS          : 43,     // RFC 4034
  SSHFP       : 44,     // RFC 4255
  IPSECKEY    : 45,     // RFC 4025
  RRSIG       : 46,     // RFC 4034
  NSEC        : 47,     // RFC 4034
  DNSKEY      : 48,     // RFC 4034
  DHCID       : 49,     // RFC 4701
  NSEC3       : 50,     // RFC ????
  NSEC3PARAM  : 51,     // RFC ????
  HIP         : 55,     // RFC 5205
  SPF         : 99,     // RFC 4408
  UINFO       : 100,    // RFC ????
  UID         : 101,    // RFC ????
  GID         : 102,    // RFC ????
  UNSPEC      : 103,    // RFC ????
  TKEY        : 249,    // RFC 2930
  TSIG        : 250,    // RFC 2931
  IXFR        : 251,    // RFC 1995
  AXFR        : 252,    // RFC 1035
  MAILB       : 253,    // RFC 1035
  MAILA       : 254,    // RFC 1035
  ANY         : 255,    // RFC 1035
  DLV         : 32769   // RFC 4431
});

function defineType(values) {
  function T(value) {
    for (var name in T) {
      if (T[name] === value) {
        return name;
      }
    }

    return null;
  }

  for (var name in values) {
    T[name] = values[name];
  }

  return T;
}

var DNSCodes = {
  QUERY_RESPONSE_CODES        : QUERY_RESPONSE_CODES,
  OPERATION_CODES             : OPERATION_CODES,
  AUTHORITATIVE_ANSWER_CODES  : AUTHORITATIVE_ANSWER_CODES,
  TRUNCATED_RESPONSE_CODES    : TRUNCATED_RESPONSE_CODES,
  RECURSION_DESIRED_CODES     : RECURSION_DESIRED_CODES,
  RECURSION_AVAILABLE_CODES   : RECURSION_AVAILABLE_CODES,
  AUTHENTIC_DATA_CODES        : AUTHENTIC_DATA_CODES,
  CHECKING_DISABLED_CODES     : CHECKING_DISABLED_CODES,
  RETURN_CODES                : RETURN_CODES,
  CLASS_CODES                 : CLASS_CODES,
  OPTION_CODES                : OPTION_CODES,
  RECORD_TYPES                : RECORD_TYPES
};

return DNSCodes;

})();

},{}],4:[function(require,module,exports){
/*jshint esnext:true*/
/*exported DNSPacket*/
'use strict';

module.exports = window.DNSPacket = (function() {

var DNSRecord         = require('./dns-record');
var DNSResourceRecord = require('./dns-resource-record');
var DNSUtils          = require('./dns-utils');

var ByteArray         = require('./byte-array');

const DNS_PACKET_RECORD_SECTION_TYPES = [
  'QD', // Question
  'AN', // Answer
  'NS', // Authority
  'AR'  // Additional
];

/**
 * DNS Packet Structure
 * *************************************************
 *
 * Header
 * ======
 *
 * 00                   2-Bytes                   15
 * -------------------------------------------------
 * |00|01|02|03|04|05|06|07|08|09|10|11|12|13|14|15|
 * -------------------------------------------------
 * |<==================== ID =====================>|
 * |QR|<== OP ===>|AA|TC|RD|RA|UN|AD|CD|<== RC ===>|
 * |<================== QDCOUNT ==================>|
 * |<================== ANCOUNT ==================>|
 * |<================== NSCOUNT ==================>|
 * |<================== ARCOUNT ==================>|
 * -------------------------------------------------
 *
 * ID:        2-Bytes
 * FLAGS:     2-Bytes
 *  - QR:     1-Bit
 *  - OP:     4-Bits
 *  - AA:     1-Bit
 *  - TC:     1-Bit
 *  - RD:     1-Bit
 *  - RA:     1-Bit
 *  - UN:     1-Bit
 *  - AD:     1-Bit
 *  - CD:     1-Bit
 *  - RC:     4-Bits
 * QDCOUNT:   2-Bytes
 * ANCOUNT:   2-Bytes
 * NSCOUNT:   2-Bytes
 * ARCOUNT:   2-Bytes
 *
 *
 * Data
 * ====
 *
 * 00                   2-Bytes                   15
 * -------------------------------------------------
 * |00|01|02|03|04|05|06|07|08|09|10|11|12|13|14|15|
 * -------------------------------------------------
 * |<???=============== QD[...] ===============???>|
 * |<???=============== AN[...] ===============???>|
 * |<???=============== NS[...] ===============???>|
 * |<???=============== AR[...] ===============???>|
 * -------------------------------------------------
 *
 * QD:        ??-Bytes
 * AN:        ??-Bytes
 * NS:        ??-Bytes
 * AR:        ??-Bytes
 *
 *
 * Question Record
 * ===============
 *
 * 00                   2-Bytes                   15
 * -------------------------------------------------
 * |00|01|02|03|04|05|06|07|08|09|10|11|12|13|14|15|
 * -------------------------------------------------
 * |<???================ NAME =================???>|
 * |<=================== TYPE ====================>|
 * |<=================== CLASS ===================>|
 * -------------------------------------------------
 *
 * NAME:      ??-Bytes
 * TYPE:      2-Bytes
 * CLASS:     2-Bytes
 *
 *
 * Resource Record
 * ===============
 *
 * 00                   4-Bytes                   31
 * -------------------------------------------------
 * |00|02|04|06|08|10|12|14|16|18|20|22|24|26|28|30|
 * -------------------------------------------------
 * |<???================ NAME =================???>|
 * |<======= TYPE ========>|<======= CLASS =======>|
 * |<==================== TTL ====================>|
 * |<====== DATALEN ======>|<???==== DATA =====???>|
 * -------------------------------------------------
 *
 * NAME:      ??-Bytes
 * TYPE:      2-Bytes
 * CLASS:     2-Bytes
 * DATALEN:   2-Bytes
 * DATA:      ??-Bytes (Specified By DATALEN)
 */
function DNSPacket(byteArray) {
  this.flags = DNSUtils.valueToFlags(0x0000);
  this.records = {};

  DNSPacket.RECORD_SECTION_TYPES.forEach((recordSectionType) => {
    this.records[recordSectionType] = [];
  });

  if (!byteArray) {
    return this;
  }

  var reader = byteArray.getReader();

  if (reader.getValue(2) !== 0x0000) {
    throw new Error('Packet must start with 0x0000');
  }

  this.flags = DNSUtils.valueToFlags(reader.getValue(2));

  var recordCounts = {};

  // Parse the record counts.
  DNSPacket.RECORD_SECTION_TYPES.forEach((recordSectionType) => {
    recordCounts[recordSectionType] = reader.getValue(2);
  });

  // Parse the actual records.
  DNSPacket.RECORD_SECTION_TYPES.forEach((recordSectionType) => {
    iterate(recordCounts[recordSectionType], () => {
      var record;

      if (recordSectionType === 'QD') {
        record = DNSRecord.parseFromPacketReader(reader);
        this.addRecord(recordSectionType, record);
      }

      else {
        record = DNSResourceRecord.parseFromPacketReader(reader);
        this.addRecord(recordSectionType, record);
      }
    });
  });

  if (!reader.eof) {
    console.warn('Did not complete parsing packet data');
  }
}

DNSPacket.RECORD_SECTION_TYPES = DNS_PACKET_RECORD_SECTION_TYPES;

DNSPacket.prototype.constructor = DNSPacket;

DNSPacket.prototype.addRecord = function(recordSectionType, record) {
  record.packet = this;
  this.records[recordSectionType].push(record);
};

DNSPacket.prototype.getRecords = function(recordSectionType) {
  return this.records[recordSectionType];
};

DNSPacket.prototype.serialize = function() {
  var byteArray = new ByteArray();

  // Write leading 0x0000 (2 bytes)
  byteArray.push(0x0000, 2);

  // Write `flags` (2 bytes)
  byteArray.push(DNSUtils.flagsToValue(this.flags), 2);

  // Write lengths of record sections (2 bytes each)
  DNSPacket.RECORD_SECTION_TYPES.forEach((recordSectionType) => {
    byteArray.push(this.records[recordSectionType].length, 2);
  });

  // Write records
  DNSPacket.RECORD_SECTION_TYPES.forEach((recordSectionType) => {
    this.records[recordSectionType].forEach((record) => {
      byteArray.append(record.serialize());
    });
  });

  return byteArray.buffer;
};

function iterate(count, iterator) {
  for (var i = 0; i < count; i++) {
    iterator(i);
  }
}

return DNSPacket;

})();

},{"./byte-array":2,"./dns-record":5,"./dns-resource-record":6,"./dns-utils":8}],5:[function(require,module,exports){
/*jshint esnext:true*/
/*exported DNSRecord*/
'use strict';

module.exports = window.DNSRecord = (function() {

var DNSCodes  = require('./dns-codes');
var DNSUtils  = require('./dns-utils');

var ByteArray = require('./byte-array');

function DNSRecord(properties) {
  if (properties) {
    for (var property in properties) {
      this[property] = properties[property];
    }
  }

  this.name       = this.name       || '';
  this.recordType = this.recordType || DNSCodes.RECORD_TYPES.ANY;
  this.classCode  = this.classCode  || DNSCodes.CLASS_CODES.IN;
}

DNSRecord.parseFromPacketReader = function(reader) {
  var name       = DNSUtils.byteArrayReaderToLabel(reader);
  var recordType = reader.getValue(2);
  var classCode  = reader.getValue(2);

  return new this({
    name: DNSUtils.decompressLabel(name, reader.byteArray),
    recordType: recordType,
    classCode: classCode
  });
};

DNSRecord.prototype.constructor = DNSRecord;

DNSRecord.prototype.serialize = function() {
  var byteArray = new ByteArray();
  
  // Write `name` (ends with trailing 0x00 byte)
  byteArray.append(DNSUtils.labelToByteArray(this.name));
  byteArray.push(0x00);
  
  // Write `recordType` (2 bytes)
  byteArray.push(this.recordType, 2);

  // Write `classCode` (2 bytes)
  byteArray.push(this.classCode, 2);

  return byteArray;
};

return DNSRecord;

})();

},{"./byte-array":2,"./dns-codes":3,"./dns-utils":8}],6:[function(require,module,exports){
/*jshint esnext:true*/
/*exported DNSResourceRecord*/
'use strict';

module.exports = window.DNSResourceRecord = (function() {

var DNSRecord   = require('./dns-record');
var DNSCodes    = require('./dns-codes');
var DNSUtils    = require('./dns-utils');

var ByteArray   = require('./byte-array');

const DNS_RESOURCE_RECORD_DEFAULT_TTL = 10; // 10 seconds
// const DNS_RESOURCE_RECORD_DEFAULT_TTL = 3600; // 1 hour

function DNSResourceRecord(properties) {
  DNSRecord.call(this, properties);

  this.ttl  = this.ttl  || DNS_RESOURCE_RECORD_DEFAULT_TTL;
  this.data = this.data || null;
}

DNSResourceRecord.parseFromPacketReader = function(reader) {
  var record = DNSRecord.parseFromPacketReader.call(this, reader);

  var ttl  = reader.getValue(4);
  var data = reader.getBytes(reader.getValue(2));

  switch (record.recordType) {
    case DNSCodes.RECORD_TYPES.PTR:
      data = parsePTR(data, reader.byteArray);
      break;
    case DNSCodes.RECORD_TYPES.TXT:
      data = parseTXT(data, reader.byteArray);
      break;
    default:
      // data = BinaryUtils.arrayBufferToString(data.buffer);
      break;
  }

  record.ttl  = ttl;
  record.data = data;

  return record;
}

DNSResourceRecord.prototype = Object.create(DNSRecord.prototype);

DNSResourceRecord.prototype.constructor = DNSResourceRecord;

DNSResourceRecord.prototype.serialize = function() {
  var byteArray = DNSRecord.prototype.serialize.call(this);

  // Write `ttl` (4 bytes)
  byteArray.push(this.ttl, 4);

  var data = this.data;

  switch (this.recordType) {
    case DNSCodes.RECORD_TYPES.PTR:
      data = serializePTR(data);
      break;
    case DNSCodes.RECORD_TYPES.TXT:
      data = serializeTXT(data);
      break;
    default:
      data = new ByteArray(data);
      break;
  }

  // Write `data` length plus one (2 bytes)
  byteArray.push(data.length + 1, 2);

  // Write `data` (ends with trailing 0x00 byte)
  byteArray.append(data);
  byteArray.push(0x00);

  return byteArray;
};

function parsePTR(data, packetData) {
  var result = DNSUtils.byteArrayToLabel(data);

  return DNSUtils.decompressLabel(result, packetData);
}

function parseTXT(data, packetData) {
  var result = {};

  var reader = data.getReader();
  var parts = [];

  var partLength;

  while ((partLength = reader.getValue())) {
    // If a length has been specified instead of a pointer,
    // read the string of the specified length.
    if (partLength !== 0xc0) {
      parts.push(reader.getString(partLength));
      continue;
    }

    // TODO: Handle case where we have a pointer to the label
    parts.push(String.fromCharCode(0xc0) + reader.getString());
    break;
  }

  parts.forEach((part) => {
    var pair = DNSUtils.decompressLabel(part, packetData).split('=');
    var name = pair.shift();
    var value = pair.join('=');

    result[name] = value;
  });

  return result;
}

function serializePTR(data) {
  var result = DNSUtils.labelToByteArray(data);

  return result;
}

function serializeTXT(data) {
  var result = new ByteArray();

  for (var name in data) {
    result.push(name.length + data[name].length + 1);
    result.append(BinaryUtils.stringToArrayBuffer(name + '=' + data[name]));
  }

  return result;
}

return DNSResourceRecord;

})();

},{"./byte-array":2,"./dns-codes":3,"./dns-record":5,"./dns-utils":8}],7:[function(require,module,exports){
/*jshint esnext:true*/
/*exported DNSSD*/
'use strict';

module.exports = window.DNSSD = (function() {

var DNSRecord         = require('./dns-record');
var DNSResourceRecord = require('./dns-resource-record');
var DNSPacket         = require('./dns-packet');
var DNSCodes          = require('./dns-codes');
var DNSUtils          = require('./dns-utils');

var EventTarget       = require('./event-target');
var ByteArray         = require('./byte-array');
var BinaryUtils       = require('./binary-utils');
var IPUtils           = require('./ip-utils');

const DNSSD_SERVICE_NAME    = '_services._dns-sd._udp.local';
const DNSSD_MULTICAST_GROUP = '224.0.0.251';
const DNSSD_PORT            = 5353;

var DNSSD = new EventTarget();

var discovering = false;
var services = {};

DNSSD.getSocket = function() {
  return new Promise((resolve) => {
    if (!this.socket) {
      this.socket = new UDPSocket({
        loopback: true,
        localPort: DNSSD_PORT
      });

      this.socket.onmessage = (message) => {
        var packet = new DNSPacket(new ByteArray(message.data));

        switch (packet.flags.QR) {
          case DNSCodes.QUERY_RESPONSE_CODES.QUERY:
            handleQueryPacket.call(this, packet, message);
            break;
          case DNSCodes.QUERY_RESPONSE_CODES.RESPONSE:
            handleResponsePacket.call(this, packet, message);
            break;
          default:
            break;
        }
      };

      this.socket.joinMulticastGroup(DNSSD_MULTICAST_GROUP);
    }

    this.socket.opened.then(() => {
      resolve(this.socket);
    });
  });
};

DNSSD.startDiscovery = function() {
  discovering = true;

  // Broadcast query for advertised services.
  discover.call(this);
};

DNSSD.stopDiscovery = function() {
  discovering = false;
};

DNSSD.registerService = function(serviceName, port, options) {
  services[serviceName] = {
    port: port || 0,
    options: options || {}
  };

  // Broadcast advertisement of registered services.
  advertise.call(this);
};

DNSSD.unregisterService = function(serviceName) {
  delete services[serviceName];

  // Broadcast advertisement of registered services.
  advertise.call(this);
};

function handleQueryPacket(packet, message) {
  packet.getRecords('QD').forEach((record) => {
    // Don't respond if the query's class code is not IN or ANY.
    if (record.classCode !== DNSCodes.CLASS_CODES.IN &&
        record.classCode !== DNSCodes.CLASS_CODES.ANY) {
      return;
    }

    // Don't respond if the query's record type is not PTR, SRV or ANY.
    if (record.recordType !== DNSCodes.RECORD_TYPES.PTR &&
        record.recordType !== DNSCodes.RECORD_TYPES.SRV &&
        record.recordType !== DNSCodes.RECORD_TYPES.ANY) {
      return;
    }

    // Broadcast advertisement of registered services.
    advertise.call(this);
  });
}

function handleResponsePacket(packet, message) {
  if (!discovering) {
    return;
  }

  var services = [];
  packet.getRecords('AN').forEach((record) => {
    if (record.recordType === DNSCodes.RECORD_TYPES.PTR) {
      services.push(record.data);
    }
  });

  this.dispatchEvent('discovered', {
    message: message,
    packet: packet,
    address: message.remoteAddress,
    services: services
  });
}

function discover() {
  var packet = new DNSPacket();

  packet.flags.QR = DNSCodes.QUERY_RESPONSE_CODES.QUERY;

  var question = new DNSRecord({
    name: DNSSD_SERVICE_NAME,
    recordType: DNSCodes.RECORD_TYPES.PTR
  });

  packet.addRecord('QD', question);

  this.getSocket().then((socket) => {
    var data = packet.serialize();
    socket.send(data, DNSSD_MULTICAST_GROUP, DNSSD_PORT);
  });
}

function advertise() {
  if (Object.keys(services).length === 0) {
    return;
  }

  var packet = new DNSPacket();

  packet.flags.QR = DNSCodes.QUERY_RESPONSE_CODES.RESPONSE;
  packet.flags.AA = DNSCodes.AUTHORITATIVE_ANSWER_CODES.YES;

  for (var serviceName in services) {
    addServiceToPacket(serviceName, packet);
  }

  this.getSocket().then((socket) => {
    var data = packet.serialize();
    socket.send(data, DNSSD_MULTICAST_GROUP, DNSSD_PORT);

    // Re-broadcast announcement after 1000ms (RFC6762, 8.3).
    // setTimeout(() => {
    //   socket.send(data, DNSSD_MULTICAST_GROUP, DNSSD_PORT);
    // }, 1000);
  });
}

function addServiceToPacket(serviceName, packet) {
  var service = services[serviceName];
  if (!service) {
    return;
  }

  var alias = serviceName;

  // SRV Record
  // var srvData = new ByteArray();
  // srvData.push(0x0000, 2);        // Priority
  // srvData.push(0x0000, 2);        // Weight
  // srvData.push(service.port, 2);  // Port
  // srvData.append(DNSUtils.labelToByteArray(serviceName));

  // var srv = new DNSResourceRecord({
  //   name: alias,
  //   recordType: DNSCodes.RECORD_TYPES.SR,
  //   data: srvData
  // });

  // packet.addRecord('AR', srv);

  // TXT Record
  // var txtData = new ByteArray();

  // for (var key in service.options) {
  //   txtData.append(DNSUtils.labelToByteArray(key + '=' + service.options[key]));
  // }
  
  // var txt = new DNSResourceRecord({
  //   name: alias,
  //   recordType: DNSCodes.RECORD_TYPES.TXT,
  //   data: txtData
  // });

  // packet.addRecord('AR', txt);

  // PTR Wildcard Record
  var ptrWildcard = new DNSResourceRecord({
    name: DNSSD_SERVICE_NAME,
    recordType: DNSCodes.RECORD_TYPES.PTR,
    data: serviceName
  });

  packet.addRecord('AN', ptrWildcard);

  // PTR Service Record
  var ptrService = new DNSResourceRecord({
    name: serviceName,
    recordType: DNSCodes.RECORD_TYPES.PTR,
    data: alias
  });

  packet.addRecord('AN', ptrService);
}

return DNSSD;

})();

},{"./binary-utils":1,"./byte-array":2,"./dns-codes":3,"./dns-packet":4,"./dns-record":5,"./dns-resource-record":6,"./dns-utils":8,"./event-target":9,"./ip-utils":10}],8:[function(require,module,exports){
/*jshint esnext:true*/
/*exported DNSUtils*/
'use strict';

module.exports = window.DNSUtils = (function() {

var ByteArray   = require('./byte-array');

var DNSUtils = {
  decompressLabel: function(label, byteArray) {
    var result = '';

    for (var i = 0, length = label.length; i < length; i++) {
      if (label.charCodeAt(i) !== 0xc0) {
        result += label.charAt(i);
        continue;
      }

      i++;
      result += this.decompressLabel(this.byteArrayToLabel(byteArray, label.charCodeAt(i)), byteArray);
    }

    return result;
  },

  byteArrayReaderToLabel: function(byteArrayReader) {
    var parts = [];
    var partLength;

    while ((partLength = byteArrayReader.getValue())) {
      // If a length has been specified instead of a pointer,
      // read the string of the specified length.
      if (partLength !== 0xc0) {
        parts.push(byteArrayReader.getString(partLength));
        continue;
      }

      // TODO: Handle case where we have a pointer to the label
      parts.push(String.fromCharCode(0xc0) + byteArrayReader.getString());
      break;
    }

    return parts.join('.');
  },

  byteArrayToLabel: function(byteArray, startByte) {
    return this.byteArrayReaderToLabel(byteArray.getReader(startByte));
  },

  labelToByteArray: function(label) {
    var byteArray = new ByteArray();
    var parts = label.split('.');
    parts.forEach((part) => {
      var length = part.length;
      byteArray.push(length);
      
      for (var i = 0; i < length; i++) {
        byteArray.push(part.charCodeAt(i));
      }
    });

    return byteArray;
  },

  valueToFlags: function(value) {
    return {
      QR: (value & 0x8000) >> 15,
      OP: (value & 0x7800) >> 11,
      AA: (value & 0x0400) >> 10,
      TC: (value & 0x0200) >>  9,
      RD: (value & 0x0100) >>  8,
      RA: (value & 0x0080) >>  7,
      UN: (value & 0x0040) >>  6,
      AD: (value & 0x0020) >>  5,
      CD: (value & 0x0010) >>  4,
      RC: (value & 0x000f) >>  0
    };
  },

  flagsToValue: function(flags) {
    var value = 0x0000;

    value = value << 1;
    value += flags.QR & 0x01;

    value = value << 4;
    value += flags.OP & 0x0f;

    value = value << 1;
    value += flags.AA & 0x01;

    value = value << 1;
    value += flags.TC & 0x01;

    value = value << 1;
    value += flags.RD & 0x01;

    value = value << 1;
    value += flags.RA & 0x01;

    value = value << 1;
    value += flags.UN & 0x01;

    value = value << 1;
    value += flags.AD & 0x01;

    value = value << 1;
    value += flags.CD & 0x01;

    value = value << 4;
    value += flags.RC & 0x0f;

    return value;
  }
};

return DNSUtils;

})();

},{"./byte-array":2}],9:[function(require,module,exports){
/*jshint esnext:true*/
/*exported EventTarget*/
'use strict';

module.exports = window.EventTarget = (function() {

function EventTarget(object) {
  if (typeof object !== 'object') {
    return;
  }

  for (var property in object) {
    this[property] = object[property];
  }
}

EventTarget.prototype.constructor = EventTarget;

EventTarget.prototype.dispatchEvent = function(name, data) {
  var events    = this._events || {};
  var listeners = events[name] || [];
  listeners.forEach((listener) => {
    listener.call(this, data);
  });
};

EventTarget.prototype.addEventListener = function(name, listener) {
  var events    = this._events = this._events || {};
  var listeners = events[name] = events[name] || [];
  if (listeners.find(fn => fn === listener)) {
    return;
  }

  listeners.push(listener);
};

EventTarget.prototype.removeEventListener = function(name, listener) {
  var events    = this._events || {};
  var listeners = events[name] || [];
  for (var i = listeners.length - 1; i >= 0; i--) {
    if (listeners[i] === listener) {
      listeners.splice(i, 1);
      return;
    }
  }
};

return EventTarget;

})();

},{}],10:[function(require,module,exports){
/*jshint esnext:true*/
/*exported IPUtils*/
'use strict';

module.exports = window.IPUtils = (function() {

const CRLF = '\r\n';

var IPUtils = {
  getAddresses: function(callback) {
    if (typeof callback !== 'function') {
      console.warn('No callback provided');
      return;
    }

    var addresses = {
      '0.0.0.0': true
    };

    var rtc = new mozRTCPeerConnection({ iceServers: [] });
    rtc.createDataChannel('', { reliable: false });

    rtc.onicecandidate = function(evt) {
      if (evt.candidate) {
        parseSDP('a=' + evt.candidate.candidate);
      }
    };

    rtc.createOffer((description) => {
      parseSDP(description.sdp);
      rtc.setLocalDescription(description, noop, noop);
    }, (error) => {
      console.warn('Unable to create offer', error);
    });

    function addAddress(address) {
      if (addresses[address]) {
        return;
      }

      addresses[address] = true;
      callback(address);
    }

    function parseSDP(sdp) {
      sdp.split(CRLF).forEach((line) => {
        var parts = line.split(' ');

        if (line.indexOf('a=candidate') !== -1) {
          if (parts[7] === 'host') {
            addAddress(parts[4]);
          }
        }

        else if (line.indexOf('c=') !== -1) {
          addAddress(parts[2]);
        }
      });
    }
  }
};

function noop() {}

return IPUtils;

})();

},{}]},{},[7])(7)
});