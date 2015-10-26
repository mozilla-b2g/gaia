/*exported MockMimeMapper */

'use strict';

var MockMimeMapper = {
  guessTypeFromFileProperties: function(filename, mimetype) {
    return mimetype;
  },

  ensureFilenameMatchesType: function(filename, mimetype) {
    if (filename.indexOf('.') !== -1) {
      return filename;
    }
    return filename + '.' + 'jpg';
  }
};
