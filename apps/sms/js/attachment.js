/** Creates an Attachment object
 * @param {String} type of attachment (image, video, etc).
 * @param {String} uri Location or datauri of image to show.
 * @param {Number} size Size of attachment in bytes.
 * @return {Attachment} new attachment object.
 */

/*global AttachmentRenderer, MimeMapper, MozActivity, Utils*/

(function(exports) {
  'use strict';

  // Path to the folder that stores all saved attachments
  const ATTACHMENT_FOLDER_PATH = 'sms-attachments/';

  /**
  * Gets actual base file name (name.extension) from its path.
  */
  function getBaseName(filePath) {
    if (!filePath) {
      throw new Error('Filepath is not defined!');
    }
    return filePath.substring(filePath.lastIndexOf('/') + 1);
  }

  function Attachment(blob, options) {
    options = options || {};
    this.blob = blob;
    this.name = blob.name || options.name ||
      navigator.mozL10n.get('unnamed-attachment');
    this.isDraft = !!options.isDraft;
  }

  Attachment.prototype = {
    get size() {
      return this.blob.size;
    },

    get type() {
      return Utils.typeFromMimeType(this.blob.type);
    },

    render: function(readyCallback) {
      var attachmentRenderer = AttachmentRenderer.for(this);

      attachmentRenderer.render().catch(function(e) {
        console.error('Error occurred while rendering attachment.', e);
      }).then(readyCallback);

      // We still need this for the case where we render a list of attachments
      // and right order is important.
      return attachmentRenderer.getAttachmentContainer();
    },

    view: function(options) {
      // Make sure media is openable and savable even if:
      //   - Blob mimetype is unsupported but file extension is valid.
      //   - File extenion is missing or invalid but mimetype is supported.

      var mimetype =
        MimeMapper.guessTypeFromFileProperties(this.name, this.blob.type);
      var filename = MimeMapper.ensureFilenameMatchesType(this.name, mimetype);

      // Override filename, so that every attachment that is saved via "open"
      // activity will be placed in the single location.
      filename = ATTACHMENT_FOLDER_PATH + getBaseName(filename);

      var activity = new MozActivity({
        name: 'open',
        data: {
          type: mimetype,
          filename: filename,
          blob: this.blob,
          allowSave: options && options.allowSave
        }
      });
      activity.onerror = function() {
        var _ = navigator.mozL10n.get;
        console.error('error with open activity', this.error.name);
        if (this.error.name === 'NO_PROVIDER') {
          alert(_('attachmentOpenError'));
        }
      };
    }
  };

  exports.Attachment = Attachment;
}(this));
