/*exported MockMimeMapper */

'use strict';

var MockMimeMapper = {
  guessTypeFromFileProperties: function(filename, mimetype) {
    return mimetype;
  },

  ensureFilenameMatchesType: function(filename, mimetype) {
    return filename;
  }
};
