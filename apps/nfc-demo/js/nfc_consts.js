var nfc = {

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

  rtd_text: 'T',
  rtd_uri: 'U',
  rtd_smart_poster: 'Sp',
  rtd_alternative_carrier: 'ac',
  rtd_handover_carrier: 'Hc',
  rtd_handover_request: 'Hr',
  rtd_handover_select: 'Hs',

  smartposter_action: 'act',

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

  rtd_text_iana_length: 0x3F,
  rtd_text_encoding: 0x40,
  rtd_text_utf8: 0,
  rtd_text_utf16: 1
};

nfc.init();
