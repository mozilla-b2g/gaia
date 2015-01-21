'use strict';

(function(exports) {
  var URI = ['', 'http://www.', 'https://www.', 'http://', 'https://', 'tel:',
    'mailto:', 'ftp://anonymous:anonymous@', 'ftp://ftp.', 'ftps://', 'sftp://',
    'smb://', 'nfs://', 'ftp://', 'dav://', 'news:', 'telnet://', 'imap:',
    'rtsp://', 'urn:', 'pop:', 'sip:', 'sips:', 'tftp:', 'btspp://',
    'btl2cap://', 'btgoep://', 'tcpobex://', 'irdaobex://', 'file://',
    'urn:epc:id:', 'urn:epc:tag:', 'urn:epc:pat:', 'urn:epc:raw:', 'urn:epc:',
    'urn:nfc:'];

  function NDEFHelper() { }

  NDEFHelper.prototype = {
    /**
     * Create MozNDEFRecord whose content is the uri.
     */
    createURI: function nh_createURI(uri) {

      var id = 0;
      // start with 1 since index 0 is ''.
      for (var i = 1; i < URI.length; i++) {
        if (uri.startsWith(URI[i])) {
          id = i;
        }
      }

      uri = String.fromCharCode(id) + uri.substring(URI[id].length);

      var enc = new TextEncoder('utf-8');

      return new MozNDEFRecord({tnf: 'well-known',
                                type: enc.encode('U'),
                                payload: enc.encode(uri)});
    },

    /**
     * Utils to dump Uint8Array.
     */
    dumpUint8Array: function nh_dumpUint8Array(array) {
      if (!array) {
        return 'null';
      }

      var str = '[';
      var i;
      var arrayLen = array ? array.length : 0;
      for (i = 0; i < arrayLen; i++) {
        str += '0x' + array[i].toString(16);
        if (i != array.length - 1) {
          str += ', ';
        }
      }

      return str + ']';
    }
  };

  exports.NDEFHelper = NDEFHelper;
})(window);
