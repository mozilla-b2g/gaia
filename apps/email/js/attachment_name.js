'use strict';
define(function(require) {
  var mozL10n = require('l10n!'),
      mapper = require('shared/js/mime_mapper');

  var attachmentName = {
    /**
     * Given a blob, and a possible name, make sure a text name
     * is constructed. If name is already a value, that is used,
     * otherwise, the blob type and the count are used to generate
     * a name.
     * @param  {Blob} blob the blog associated with the attachment.
     * @param  {String} [name] possible existing name.
     * @param  {Number} [count] a count to use in the generated name.
     * @return {String}
     */
    ensureName: function(blob, name, count) {
      if (!name) {
        count = count || 1;
        var suffix = mapper.guessExtensionFromType(blob.type);
        name = mozL10n.get('default-attachment-filename', { n: count }) +
                       (suffix ? ('.' + suffix) : '');
      }
      return name;
    },

    /**
     * Given an array of blobs and a corresponding array of file names,
     * make sure there is a file name entry for each blob. If a file name
     * is missing, generate one using part of the mime type of the blob
     * as the file extension in the name. This method MODIFIES the
     * names array, and expects names to be an array.
     * @param  {Array} blobs the blobs that need names.
     * @return {Array} Array of strings.
     */
    ensureNameList: function(blobs, names) {
      for (var i = 0; i < blobs.length; i++) {
        names[i] = attachmentName.ensureName(blobs[i], names[i], i + 1);
      }
    }
  };

  return attachmentName;
});
