/* global FLACMetadata, ForwardLockMetadata, ID3v1Metadata, ID3v2Metadata,
   LazyLoader, MP4Metadata, OggMetadata */
/* exported MetadataFormats */
'use strict';

/**
 * Delegates metadata parsing to the appropriate parser based on magic header
 * values.
 */
var MetadataFormats = (function() {

  /*
   * This is the list of formats that we know how to parse. Each format has
   * three properties:
   *
   * @property {String} file The path to the file for parsing this metadata
   *   format.
   * @property {Object} module A getter that returns the module object for this
   *   parser. Note: It *must* be a getter because it needs to be evaluated
   *   *after* the file is loaded.
   * @property {Function} match A function that takes a BlobView of the file
   *   and returns true if the file uses this metadata format.
   */
  var formats = [
    {
      file: 'js/metadata/forward_lock.js',
      get module() { return ForwardLockMetadata; },
      match: function(header) {
        return header.getASCIIText(0, 9) === 'LOCKED 1 ';
      }
    },
    {
      file: 'js/metadata/id3v2.js',
      get module() { return ID3v2Metadata; },
      match: function(header) {
        return header.getASCIIText(0, 3) === 'ID3';
      }
    },
    {
      file: 'js/metadata/ogg.js',
      get module() { return OggMetadata; },
      match: function(header) {
        return header.getASCIIText(0, 4) === 'OggS';
      }
    },
    {
      file: 'js/metadata/flac.js',
      get module() { return FLACMetadata; },
      match: function(header) {
        return header.getASCIIText(0, 4) === 'fLaC';
      }
    },
    {
      file: 'js/metadata/mp4.js',
      get module() { return MP4Metadata; },
      match: function(header) {
        return header.getASCIIText(4, 4) === 'ftyp';
      }
    },
    {
      file: 'js/metadata/id3v1.js',
      get module() { return ID3v1Metadata; },
      match: function(header) {
        return (header.getUint16(0, false) & 0xFFFE) === 0xFFFA;
      }
    }
  ];

  /**
   * Create a new metadata parser for a particular file format.
   *
   * @param {Object} formatInfo A description of the file format containing a
   *   `file` attribute for the file to load, and a `module` attribute returning
   *   the module that contains the parse() method we should call.
   */
  function MetadataParser(formatInfo) {
    this._formatInfo = formatInfo;
  }

  MetadataParser.prototype = {
    /**
     * Parse a file and return a Promise with the metadata.
     *
     * @param {BlobView} header The file in question.
     * @return {Promise} A Promise that resolves with the completed metadata
     *   object.
     */
    parse: function(header) {
      var info = this._formatInfo;
      return LazyLoader.load(info.file).then(() => {
        return info.module.parse(header);
      });
    }
  };

  /**
   * Find the appropriate metadata parser for a given file.
   *
   * @param {BlobView} header The file in question.
   * @return {MetadataParser} The metadata parser to use for this file.
   */
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
