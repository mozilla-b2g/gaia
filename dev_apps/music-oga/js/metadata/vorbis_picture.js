/* global BlobView */
/* exported VorbisPictureComment */
'use strict';

var VorbisPictureComment = (function() {
  /**
   * Read the picture frame from the block blob
   */
  function readPicFrame(view) {
    // Source of the structure:
    // https://xiph.org/flac/format.html#metadata_block_picture
    // http://flac.sourceforge.net/format.html#metadata_block_picture
    //
    var kind = view.readUnsignedInt();
    if (kind != 3) {
      return null;
    }
    var len = view.readUnsignedInt();
    var mimetype = view.readASCIIText(len);
    if (mimetype == '-->') {
      // XXX we don't support URL (no recommended by the spec anyway)
      console.error('URL for cover art is not supported from Vorbis comment.');
      return null;
    }

    // We ignore these next two fields
    len = view.readUnsignedInt();
    view.readNullTerminatedUTF8Text(len); // desc
    // skip w, h, bpp and indexed colours.
    view.advance(16);

    var piclength = view.readUnsignedInt();
    var picstart = view.sliceOffset + view.viewOffset + view.index;

    // Now return an object that specifies where to pull the image from
    // The properties of this object can be passed to blob.slice()
    return {
      flavor: 'embedded',
      start: picstart,
      end: picstart + piclength,
      type: mimetype
    };
  }

  // BEGIN slow base64
  // https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
  // This is needed as atob doesn't yield the right result.
  function base64DecToArr(sBase64, nBlocksSize) {

    function b64ToUint6(nChr) {

      return nChr > 64 && nChr < 91 ?
        nChr - 65
        : nChr > 96 && nChr < 123 ?
        nChr - 71
        : nChr > 47 && nChr < 58 ?
        nChr + 4
        : nChr === 43 ?
        62
        : nChr === 47 ?
        63
        : 0;
    }

    var sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, '');
    var nInLen = sB64Enc.length;
    var nOutLen = nBlocksSize ?
        Math.ceil((nInLen * 3 + 1 >> 2) / nBlocksSize) * nBlocksSize :
        nInLen * 3 + 1 >> 2;
    var taBytes = new Uint8Array(nOutLen);
    for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0;
         nInIdx < nInLen; nInIdx++) {
      nMod4 = nInIdx & 3;
      nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 18 - 6 * nMod4;
      if (nMod4 === 3 || nInLen - nInIdx === 1) {
        for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
          taBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
        }
        nUint24 = 0;
      }
    }

    return taBytes;
  }
  // END

  //
  // Will parse the vorbis comment for picture from metadata.picture.
  // If it doesn't exists, it is a no-op.
  function parsePictureComment(metadata) {
    return new Promise(function(resolve, reject) {
      if (!metadata.picture) {
        resolve(metadata);
        return;
      }
      var value = metadata.picture;
      try {
        // Album art in ogg
        // http://wiki.xiph.org/VorbisComment
        // http://flac.sourceforge.net/format.html#metadata_block_picture

        // Image block is in base64.
        var binary = base64DecToArr(value);

        var aBlob = new Blob([binary]);
        BlobView.get(aBlob, 0, aBlob.size, function(block, err) {

          var prop = readPicFrame(block);
          if (prop) {
            // we need to duplicate the blob because we need
            // to set the MIME type now.
            metadata.picture = {
              flavor: 'unsynced',
              blob: aBlob.slice(prop.start, prop.end, prop.type)
            };
          }
          resolve(metadata);
        }, BlobView.bigEndian);
      }
      catch(e) {
        console.warn('Error parsing picture comment', e.message);
        resolve(metadata);
      }
    });
  }

  return {
    readPicFrame: readPicFrame,
    parsePictureComment: parsePictureComment
  };

})();

