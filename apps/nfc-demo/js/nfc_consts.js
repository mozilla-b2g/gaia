/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* Copyright © 2013, Deutsche Telekom, Inc. */


var nfc = {

  fromUTF8: function(str) {
    var buf = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
      buf[i] = str.charCodeAt(i);
    }
    return buf;
  },
  
  flags_tnf: 0x07,
  flags_ss: 0x10,
  flags_il: 0x08,

  tnf_empty: 0x00,
  tnf_well_known: 0x01,
  tnf_mime_media: 0x02,
  tnf_absolute_uri: 0x03,
  tnf_external_type: 0x04,
  tnf_unknown: 0x05,
  tnf_unchanged: 0x06,
  tnf_reserved: 0x07,

  rtd_text: 0,
  rtd_uri: 0,
  rtd_smart_poster: 0,
  rtd_alternative_carrier: 0,
  rtd_handover_carrier: 0,
  rtd_handover_request: 0,
  rtd_handover_select: 0,

  smartposter_action: 0,

  uris: new Array(),

  init: function() {
    this.rtd_text = nfc.fromUTF8('T');
    this.rtd_uri = nfc.fromUTF8('U');
    this.rtd_smart_poster = nfc.fromUTF8('Sp');
    this.rtd_alternative_carrier = nfc.fromUTF8('ac');
    this.rtd_handover_carrier = nfc.fromUTF8('Hc');
    this.rtd_handover_request = nfc.fromUTF8('Hr');
    this.rtd_handover_select = nfc.fromUTF8('Hs');

    this.smartposter_action = nfc.fromUTF8('act');
    
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

  rtd_text_iana_length: 0x3F,
  rtd_text_encoding: 0x40,
  rtd_text_utf8: 0,
  rtd_text_utf16: 1
};

nfc.init();
