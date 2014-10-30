'use strict';

var MetadataFormats = (function() {

  var BASEDIR = 'js/metadata/';

  var formats = [
    {
      file: 'forward_lock.js',
      get module() { return ForwardLockMetadata; },
      match: function(header) {
        return header.getASCIIText(0, 9) === 'LOCKED 1 ';
      }
    },
    {
      file: 'id3v2.js',
      get module() { return ID3v2Metadata; },
      match: function(header) {
        return header.getASCIIText(0, 3) === 'ID3';
      }
    },
    {
      file: 'ogg.js',
      get module() { return OggMetadata; },
      match: function(header) {
        return header.getASCIIText(0, 4) === 'OggS';
      }
    },
    {
      file: 'mp4.js',
      get module() { return MP4Metadata; },
      match: function(header) {
        return header.getASCIIText(4, 4) === 'ftyp';
      }
    },
    {
      file: 'id3v1.js',
      get module() { return ID3v1Metadata; },
      match: function(header) {
        return (header.getUint16(0, false) & 0xFFFE) === 0xFFFA;
      }
    }
  ];

  function MetadataParser(formatInfo) {
    this._formatInfo = formatInfo;
  }

  MetadataParser.prototype = {
    parse: function(header, metadata) {
      var info = this._formatInfo;
      return new Promise(function(resolve, reject) {
        LazyLoader.load(BASEDIR + info.file, function() {
          resolve(info.module.parse(header, metadata));
        });
      });
    }
  };

  function findParser(header) {
    for (var i = 0; i < formats.length; i++) {
      if (formats[i].match(header)) {
        return new MetadataParser(formats[i]);
      }
    }
    return null;
  }

  return {
    findParser: findParser
  };

})();
