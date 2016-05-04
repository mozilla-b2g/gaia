/* global LazyLoader, VorbisPictureComment */
/* exported FLACMetadata */
'use strict';

/**
 * Parse metadata for FLAC files (this is very similar to Ogg files, but with a
 * different container format).
 *
 * Format information:
 *   http://flac.sourceforge.net/format.html
 */
var FLACMetadata = (function() {
  // Fields that should be stored as integers, not strings
  var INTFIELDS = [
    'tracknum', 'trackcount', 'discnum', 'disccount'
  ];

  // Map FLAC field names to metadata property names
  var FLACFIELDS = {
    title: 'title',
    artist: 'artist',
    album: 'album',
    tracknumber: 'tracknum',
    tracktotal: 'trackcount',
    discnumber: 'discnum',
    disctotal: 'disccount'
  };

  /**
   * Parse a file and return a Promise with the metadata.
   *
   * @param {BlobView} blobview The audio file to parse.
   * @return {Promise} A Promise returning the parsed metadata object.
   */
  function parse(blobview) {
    // First four bytes are "fLaC" or we wouldn't be here.
    blobview.seek(4);

    var metadata = {tag_format: 'flac'};
    var has_vorbis_comment = false;
    var has_picture = false;

    function processBlock(block) {
      if (block.block_type === 4) {
        readAllComments(block.view, metadata);
        has_vorbis_comment = true;
      } else if (block.block_type === 6) {
        metadata.picture = VorbisPictureComment.readPicFrame(block.view);
        has_picture = true;
      }

      return (!has_vorbis_comment || !has_picture);
    }

    return LazyLoader.load('js/metadata/vorbis_picture.js').then(() => {
      return findMetadataBlocks(blobview, processBlock);
    }).then(() => {
      return metadata;
    });
  }

  /**
   * Step over metadata blocks until we find the proper metadata block.
   *
   * @param {BlobView} blobview The BlobView for the file.
   * @param {function} callback The callback to process the block with.
   * @return {Promise} A Promise that resolves when all relevant metadata blocks
   *   have been processed.
   */
  function findMetadataBlocks(blobview, callback) {
    return readMetadataBlockHeader(blobview).then((block) => {
      if (callback(block) && !block.last) {
        block.view.advance(block.length - block.view.index);
        findMetadataBlocks(block.view, callback);
      }
    });
  }

  /**
   * Read a metadata block header and fetch its contents from the Blob, plus
   * enough extra data to read the next block's header.
   *
   * @param {BlobView} blobview The BlobView for the file.
   * @return {Promise} A Promise resolving to an object with the following
   *   fields:
   *     {Boolean} last True if this is the last metadata block.
   *     {Number} block_type The block's type, as an integer.
   *     {Number} length The size in bytes of the block's body (excluding the
   *       header).
   *     {BlobView} view The BlobView with the block's data, starting at the
   *       beginning of the metadata block's content (not the header).
   */
  function readMetadataBlockHeader(blobview) {
    return new Promise(function(resolve, reject) {
      var header = blobview.readUnsignedByte();
      var last = (header & 0x80) === 0x80;
      var block_type = header & 0x7F;
      var length = blobview.readUint24(false);

      // Get the contents of this block, plus enough to read the next block's
      // header if necessary.
      blobview.getMore(blobview.viewOffset + blobview.index, length + 4,
                       function(more, err) {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          last: last,
          block_type: block_type,
          length: length,
          view: more
        });
      });
    });
  }

  /**
   * Read all the comments in a metadata header block.
   *
   * @param {BlobView} page The audio file being parsed.
   * @param {Metadata} metadata The (partially filled-in) metadata object.
   */
  function readAllComments(page, metadata) {
    var vendor_string_length = page.readUnsignedInt(true);
    page.advance(vendor_string_length); // skip vendor string

    var num_comments = page.readUnsignedInt(true);
    for (var i = 0; i < num_comments; i++) {
      try {
        var comment = readComment(page);
        if (comment) {
          if (!(comment.field in metadata)) {
            metadata[comment.field] = comment.value;
          } else {
            // We already have a value, so append this new one.
            metadata[comment.field] += ' / ' + comment.value;
          }
        }
      } catch (e) {
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
    var comment_length = page.readUnsignedInt(true);
    var comment = page.readUTF8Text(comment_length);
    var equal = comment.indexOf('=');
    if (equal === -1) {
      throw new Error('missing delimiter in comment');
    }

    var fieldname = comment.substring(0, equal).toLowerCase().replace(' ', '');
    var propname = FLACFIELDS[fieldname];
    if (propname) { // Do we care about this field?
      var value = comment.substring(equal + 1);
      if (INTFIELDS.indexOf(propname) !== -1) {
        value = parseInt(value, 10);
      }
      return {field: propname, value: value};
    }
    return null;
  }

  return {
    parse: parse
  };
})();
