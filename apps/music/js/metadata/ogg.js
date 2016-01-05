/* global LazyLoader, VorbisPictureComment, BlobView */
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
  function EndOfPageError(leftovers, comment_length) {
    // store an BlobView containing the leftovers (blobview + index + size)
    this.leftovers = leftovers;
    this.comment_length = comment_length || 0;
  }

  /**
   * Parse a file and return a Promise with the metadata.
   *
   * @param {BlobView} blobview The audio file to parse.
   * @param {Metadata} metadata The (partially filled-in) metadata object.
   * @return {Promise} A Promise returning the parsed metadata object.
   */
  function parse(blobview) {
    var parser = new VorbisCommentParser();
    parser.readIdentificationHeader(blobview);
    return parser.readVorbisComment(blobview);
  }

  /**
   * Constructor for the VorbisComment parser.
   *
   * @param {BlobView} blobview The audio file to parse.
   * @param {Metadata} metadata The (partially filled-in) metadata object.
   */
  function VorbisCommentParser() {
    this.continued = false;
    this.read_comments = 0;
    return this;
  }

  VorbisCommentParser.prototype = {
    /**
     * Read the identification header of an Ogg container. It's always the first
     * page.
     *
     * @param {BlobView} blobview The audio file being parsed.
     */
    readIdentificationHeader: function(blobview) {
      var header = this._readPageHeader(blobview);
      if (header.segment_table.length !== 1) {
        throw new Error(
          'ogg identification header expected as only packet of first page'
        );
      }
      // Skip over the identification header.
      blobview.advance(header.segment_table[0]);
    },

    /**
     * Read the Vorbis Comment. Deal with multiple pages. Parse the
     * picture block too.
     *
     * @param {BlobView} page The audio file being parsed.
     * @return {Promise} A Promise that resolves with the completed metadata.
     */
    readVorbisComment: function(blobview) {
      return new Promise((resolve, reject) => {

        this._readCommentHeader(blobview).then((metadata) => {
          LazyLoader.load('js/metadata/vorbis_picture.js').then(() => {
            return VorbisPictureComment.parsePictureComment(metadata);
          }).then(resolve).catch(reject);
        });
      });
    },

    /**
     * Read the comment header of an Ogg container.
     *
     * @param {BlobView} bloview The audio file being parsed.
     * @param {Metadata} metadata The (partially filled-in) metadata object.
     */
    _readCommentHeader: function(blobview) {
      return new Promise((resolve, reject) => {
        var metadata = {};
        var header = this._readPageHeader(blobview);

        var sum = function(a, b) { return a + b; };
        this.page_length = Array.reduce(header.segment_table, sum, 0);

        blobview.getMore(blobview.index, this.page_length, (fullpage, err) => {
          if (err) {
            reject(Error(err));
          }

          // Look for a comment header from a supported codec
          var first_byte = fullpage.readByte();
          var valid = false;
          switch (first_byte) {
          case 3:
            valid = fullpage.readBinaryText(6) === 'vorbis';
            metadata.tag_format = 'vorbis';
            break;
          case 79:
            valid = fullpage.readBinaryText(7) === 'pusTags';
            metadata.tag_format = 'opus';
            break;
          }
          if (!valid) {
            reject(new Error('malformed ogg comment packet'));
          }

          var vendor_string_length = fullpage.readUnsignedInt(true);
          fullpage.advance(vendor_string_length);// skip libvorbis vendor string

          var num_comments = fullpage.readUnsignedInt(true);
          var readLoop = (fullpage, err) => {
            if(err) {
              reject(new Error(err));
            }
            blobview.advance(this.page_length);

            if(!this._readAllComments(fullpage, num_comments, metadata)) {
              try {
                var header = this._readPageHeader(blobview);
                this.page_length = Array.reduce(header.segment_table, sum, 0);
              } catch(e) {
                // _readPageHeader() will throw on error.
                reject(e);
              }
              blobview.getMore(blobview.index, this.page_length, readLoop);
            } else {
              resolve(metadata);
            }
          };
          readLoop(fullpage, null);
        });
      });
    },

    /**
     * Read the header for an Ogg page.
     *
     * @param {BlobView} page The audio file being parsed.
     * @return {Object} An object containing the page's segment table.
     */
    _readPageHeader: function(page) {
      var capture_pattern = page.readBinaryText(4);
      if (capture_pattern !== 'OggS') {
        throw new Error('malformed ogg page header');
      }

      /* fields skipped = 22 bytes
       * version: : unsigned byte
       * type: unsigned byte
       * granule: 8 bytes
       * serial: unsigned int (4 bytes)
       * seq: unsigned int (4 bytes)
       * checksum: 4 bytes
       */
      page.advance(22);

      var page_segments = page.readUnsignedByte();
      var segment_table = page.readUnsignedByteArray(page_segments);

      return {
        segment_table: segment_table
      };
    },

    /**
     * Read all the comments in an Ogg container.
     *
     * @param {BlobView} page The audio file being parsed.
     * @param {int} num_comments The number of comment to be parsed.
     * @param {Metadata} metadata The (partially) filled-in metadata object.
     * @return true when done reading all comments.
     */
    _readAllComments: function(page, num_comments, metadata) {

      /**
       * Read a single comment field.
       *
       * @param {BlobView} page The audio file being parsed.
       */
      function readComment(page) {
        if (page.remaining() < 4) { // 4 bytes for comment-length variable
          throw new EndOfPageError({
            page: page,
            index: page.tell(),
            size: page.remaining()
          });
        }
        var comment_length = page.readUnsignedInt(true);
        if (comment_length > page.remaining()) {
          throw new EndOfPageError({
            page: page,
            index: page.tell(),
            size: page.remaining()
          }, comment_length);
        }

        var comment = page.readUTF8Text(comment_length);
        return decodeComment(comment);
      }

      function readContinuedComment(leftovers, comment_length, page) {
        var buffer;
        var left;
        if (comment_length === undefined) {
          buffer = new Uint8Array(4);
          var size = Math.min(leftovers.size, 4);
          var val = leftovers.page.readUnsignedByteArray(size);
          buffer.set(val, 0);
          if (size < 4) {
            left = 4 - size;
            val = page.readUnsginedByteArray(left);
            buffer.set(val, size);
          }
          comment_length = DataView(buffer.buffer).getUint32(0, true);
        }

        left = leftovers.page.remaining();
        var newBuffer = new Uint8Array(left + page.remaining());
        if (left > 0) {
          buffer = leftovers.page.readUnsignedByteArray(left);
          newBuffer.set(buffer, 0);
        }
        buffer = page.readUnsignedByteArray(Math.min(comment_length - left,
                                                     page.remaining()));
        newBuffer.set(buffer, left);

        var view = BlobView.getFromArrayBuffer(newBuffer.buffer, 0,
                                               newBuffer.byteLength,
                                               true);
        if (comment_length > view.remaining()) {
          throw new EndOfPageError({
            page: view,
            index: 0,
            size: newBuffer.byteLength
          }, comment_length);
        }
        return decodeComment(view.readUTF8Text(comment_length));
      }

      /**
       * Decode the vorbis comment as coming from the buffer.
       * @param {String} comment The comment data.
       * @return {Object} a key value pair.
       */
      function decodeComment(comment) {
        var equal = comment.indexOf('=');
        if (equal === -1) {
          throw new Error('missing delimiter in comment');
        }

        var fieldname = comment.substring(0, equal).
            toLowerCase().replace(' ', '');
        var propname = OGGFIELDS[fieldname];
        if (propname) { // Do we care about this field?
          var value = comment.substring(equal + 1);
          if (INTFIELDS.indexOf(propname) !== -1) {
            value = parseInt(value, 10);
          }
          return {field: propname, value: value};
        }
      }

      for (var i = this.read_comments; i < num_comments; i++) {
        try {
          var comment;
          if (this.continued) {
            comment = readContinuedComment(this.leftovers,
                                           this.comment_length, page);
          } else {
            comment = readComment(page);
          }
          this.continued = false;
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
            this.continued = true;
            if (e.comment_length !== undefined) {
              this.comment_length = e.comment_length;
            }
            this.leftovers = e.leftovers;
            this.read_comments = i;
            return false;
          }
          console.warn('Error parsing ogg metadata frame', e.stack);
        }
      }
      return true;
    }
  };

  return {
    parse: parse
  };
})();
