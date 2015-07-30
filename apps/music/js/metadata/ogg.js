/* global LazyLoader, VorbisPictureComment */
/* exported OggMetadata */
'use strict';

/**
 * Parse files with Ogg metadata (e.g. Vorbis comments or Opus tags).
 *
 * Format information:
 *   http://wiki.xiph.org/VorbisComment
 */
var OggMetadata = (function() {
  // Fields that should be stored as integers, not strings
  var INTFIELDS = [
    'tracknum', 'trackcount', 'discnum', 'disccount'
  ];

  // Map ogg field names to metadata property names
  var OGGFIELDS = {
    title: 'title',
    artist: 'artist',
    album: 'album',
    tracknumber: 'tracknum',
    tracktotal: 'trackcount',
    discnumber: 'discnum',
    disctotal: 'disccount',
    metadata_block_picture: 'picture'
  };

  /**
   * A type thrown if we walk off the end of an Ogg page.
   */
  function EndOfPageError() {}

  /**
   * Parse a file and return a Promise with the metadata.
   *
   * @param {BlobView} blobview The audio file to parse.
   * @param {Metadata} metadata The (partially filled-in) metadata object.
   * @return {Promise} A Promise returning the parsed metadata object.
   */
  function parse(blobview) {
    readIdentificationHeader(blobview);
    return readCommentHeader(blobview);
  }

  /**
   * Read the identification header of an Ogg container. It's always the first
   * page.
   *
   * @param {BlobView} page The audio file being parsed.
   */
  function readIdentificationHeader(page) {
    var header = readPageHeader(page);
    if (header.segment_table.length !== 1) {
      throw new Error(
        'ogg identification header expected as only packet of first page'
      );
    }
    // Skip over the identification header.
    page.advance(header.segment_table[0]);
  }

  /**
   * Read the comment header of an Ogg container.
   *
   * @param {BlobView} page The audio file being parsed.
   * @return {Promise} A Promise that resolves with the completed metadata.
   */
  function readCommentHeader(page) {
    var metadata = {};
    var header = readPageHeader(page);

    var sum = function(a, b) { return a + b; };
    var comment_length = Array.reduce(header.segment_table, sum, 0);

    return new Promise((resolve, reject) => {
      page.getMore(page.index, comment_length, (fullpage, err) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          // Look for a comment header from a supported codec
          var first_byte = fullpage.readByte();
          var valid = false;
          switch (first_byte) {
          case 3:
            valid = fullpage.readASCIIText(6) === 'vorbis';
            metadata.tag_format = 'vorbis';
            break;
          case 79:
            valid = fullpage.readASCIIText(7) === 'pusTags';
            metadata.tag_format = 'opus';
            break;
          }
          if (!valid) {
            reject('malformed ogg comment packet');
            return;
          }

          readAllComments(fullpage, metadata);

          LazyLoader.load('js/metadata/vorbis_picture.js').then(() => {
            return VorbisPictureComment.parsePictureComment(metadata);
          }).then(resolve);
        } catch(e) {
          reject(e);
        }
      });
    });
  }

  /**
   * Read the header for an Ogg page.
   *
   * @param {BlobView} page The audio file being parsed.
   * @return {Object} An object containing the page's segment table.
   */
  function readPageHeader(page) {
    var capture_pattern = page.readASCIIText(4);
    if (capture_pattern !== 'OggS') {
      throw new Error('malformed ogg page header');
    }

    // Skip over some header fields until we reach the page segments.
    page.advance(22);

    var page_segments = page.readUnsignedByte();
    var segment_table = page.readUnsignedByteArray(page_segments);

    return {
      segment_table: segment_table
    };
  }

  /**
   * Read all the comments in an Ogg container.
   *
   * @param {BlobView} page The audio file being parsed.
   * @param {Metadata} metadata The (partially filled-in) metadata object.
   */
  function readAllComments(page, metadata) {
    var vendor_string_length = page.readUnsignedInt(true);
    page.advance(vendor_string_length); // skip libvorbis vendor string

    var num_comments = page.readUnsignedInt(true);
    for (var i = 0; i < num_comments; i++) {
      try {
        var comment = readComment(page);
        if (comment) {
          if (!(comment.field in metadata)) {
            metadata[comment.field] = comment.value;
          } else if (comment.field !== 'picture') {
            // We already have a value, so append this new one.
            metadata[comment.field] += ' / ' + comment.value;
          }
        }
      } catch (e) {
        if (e instanceof EndOfPageError) {
          return;
        }
        console.warn('Error parsing vorbis comment', e);
      }
    }
  }

  /**
   * Read a single comment field.
   *
   * @param {BlobView} page The audio file being parsed.
   */
  function readComment(page) {
    if (page.remaining() < 4) { // 4 bytes for comment-length variable
      // TODO: handle metadata that uses multiple pages
      throw new EndOfPageError();
    }
    var comment_length = page.readUnsignedInt(true);
    if (comment_length > page.remaining()) {
      // TODO: handle metadata that uses multiple pages
      throw new EndOfPageError();
    }

    var comment = page.readUTF8Text(comment_length);
    var equal = comment.indexOf('=');
    if (equal === -1) {
      throw new Error('missing delimiter in comment');
    }

    var fieldname = comment.substring(0, equal).toLowerCase().replace(' ', '');
    var propname = OGGFIELDS[fieldname];
    if (propname) { // Do we care about this field?
      var value = comment.substring(equal + 1);
      if (INTFIELDS.indexOf(propname) !== -1) {
        value = parseInt(value, 10);
      }
      return {field: propname, value: value};
    }

  }

  return {
    parse: parse
  };
})();
