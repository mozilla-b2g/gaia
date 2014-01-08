/**
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this file,
* You can obtain one at http://mozilla.org/MPL/2.0/.
*/

/* Copyright © 2013, Deutsche Telekom, Inc. */

'use strict';

var NfcURI = {


fromUTF8: function(str) {
    var buf = new Uint8Array(str.length);
     for (var i = 0; i < str.length; i++) {
      buf[i] = str.charCodeAt(i);
    }
    return buf;
},


uris: new Array(),

init: function() {
    this.uris[0x00] = '';
    this.uris[0x01] = 'http://www.';
    this.uris[0x02] = 'https://www.';
    this.uris[0x03] = 'http://';
    this.uris[0x04] = 'https://';
    this.uris[0x05] = 'tel:';
    this.uris[0x06] = 'mailto:';
    this.uris[0x07] = 'ftp://anonymous:anonymous@';
    this.uris[0x08] = 'ftp://ftp.';
    this.uris[0x09] = 'ftps://';
    this.uris[0x0A] = 'sftp://';
    this.uris[0x0B] = 'smb://';
    this.uris[0x0C] = 'nfs://';
    this.uris[0x0D] = 'ftp://';
    this.uris[0x0E] = 'dav://';
    this.uris[0x0F] = 'news:';
    this.uris[0x10] = 'telnet://';
    this.uris[0x11] = 'imap:';
    this.uris[0x12] = 'rtsp://';
    this.uris[0x13] = 'urn:';
    this.uris[0x14] = 'pop:';
    this.uris[0x15] = 'sip:';
    this.uris[0x16] = 'sips:';
    this.uris[0x17] = 'tftp:';
    this.uris[0x18] = 'btspp://';
    this.uris[0x19] = 'btl2cap://';
    this.uris[0x1A] = 'btgoep://';
    this.uris[0x1B] = 'tcpobex://';
    this.uris[0x1C] = 'irdaobex://';
    this.uris[0x1D] = 'file://';
    this.uris[0x1E] = 'urn:epc:id:';
    this.uris[0x1F] = 'urn:epc:tag:';
    this.uris[0x20] = 'urn:epc:pat:';
    this.uris[0x21] = 'urn:epc:raw:';
    this.uris[0x22] = 'urn:epc:';
    this.uris[0x23] = 'urn:nfc:';
  },


lookupUrlRecordType: function(uri) {
  for (var i = 1; i < this.uris.length; i++) {
    var len = this.uris[i].length;
	if (uri.substring(0, len) == this.uris[i]) {
      var uriPayload = uri.substring(len);
      return {'identifier' : i, 'uri' : uriPayload};
    }
  }
  return {'identifier' : 0, 'uri' : uri};
},


createUriNdefRecord: function(uri, abbreviate,tnf,type,id) {
  var urlPayload = null;
  if (uri == null) {
    return null;
  }
  if (tnf == null) {
    return null;
  }
  if (type == null) {
    return null;
  }

  if (abbreviate == true) {
    var split = this.lookupUrlRecordType(uri);
    if (split.identifier == 0) {
      urlPayload = uri;
    } else {
      urlPayload = String.fromCharCode(split.identifier) + split.uri;
    }
  } else {
    urlPayload = uri;
  }

  if (!urlPayload)
      return null;

var payload = this.fromUTF8(urlPayload);
var types = this.fromUTF8(type);
var ids = new Uint8Array(id);

  var record = new MozNdefRecord(
    tnf,
    types,
    ids,
    payload
  );

  return record;
},

sendNdefRecords: function(records,event) {
  if (records == null) {
    return null;
  }

  var res;
  var nfcdom = window.navigator.mozNfc;
  var nfcPeer = nfcdom.getNFCPeer(event.detail);

    if (!nfcPeer) {
      return null;
    }

  res = nfcPeer.sendNDEF(records);

  res.onerror = (function() {
      debug('URL transfer failed');
      return null;
    });

  return 1;
},

};

NfcURI.init();
