'use strict';

var NfcUtil = {
  fromUTF8: function fromUTF8(str) {
    var buf = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
      buf[i] = str.charCodeAt(i);
    }
    return buf;
  },
};

const NDEF = {
  TNF: 0x07,

  TNF_EMPTY: 0x00,
  TNF_WELL_KNOWN: 0x01,

  RTD_URI: 0,

  URIS: [],

  init: function ndef_init() {
    this.RTD_TEXT = NfcUtil.fromUTF8('T');
    this.RTD_URI = NfcUtil.fromUTF8('U');

    this.URIS[0x00] = '';
    this.URIS[0x01] = 'http://www.';
    this.URIS[0x02] = 'https://www.';
    this.URIS[0x03] = 'http://';
    this.URIS[0x04] = 'https://';
    this.URIS[0x05] = 'tel:';
    this.URIS[0x06] = 'mailto:';
    this.URIS[0x07] = 'ftp://anonymous:anonymous@';
    this.URIS[0x08] = 'ftp://ftp.';
    this.URIS[0x09] = 'ftps://';
    this.URIS[0x0A] = 'sftp://';
    this.URIS[0x0B] = 'smb://';
    this.URIS[0x0C] = 'nfs://';
    this.URIS[0x0D] = 'ftp://';
    this.URIS[0x0E] = 'dav://';
    this.URIS[0x0F] = 'news:';
    this.URIS[0x10] = 'telnet://';
    this.URIS[0x11] = 'imap:';
    this.URIS[0x12] = 'rtsp://';
    this.URIS[0x13] = 'urn:';
    this.URIS[0x14] = 'pop:';
    this.URIS[0x15] = 'sip:';
    this.URIS[0x16] = 'sips:';
    this.URIS[0x17] = 'tftp:';
    this.URIS[0x18] = 'btspp://';
    this.URIS[0x19] = 'btl2cap://';
    this.URIS[0x1A] = 'btgoep://';
    this.URIS[0x1B] = 'tcpobex://';
    this.URIS[0x1C] = 'irdaobex://';
    this.URIS[0x1D] = 'file://';
    this.URIS[0x1E] = 'urn:epc:id:';
    this.URIS[0x1F] = 'urn:epc:tag:';
    this.URIS[0x20] = 'urn:epc:pat:';
    this.URIS[0x21] = 'urn:epc:raw:';
    this.URIS[0x22] = 'urn:epc:';
    this.URIS[0x23] = 'urn:nfc:';
  },
};

NDEF.init();
