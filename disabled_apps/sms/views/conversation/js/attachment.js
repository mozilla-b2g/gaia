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
  * @param {String} filepath
  * @return {String} actual base file name i.e name.extension
  */
  function getBaseName(filePath) {
    if (!filePath) {
      throw new Error('Filepath is not defined!');
    }
    return filePath.substring(filePath.lastIndexOf('/') + 1);
  }

  /**
  * set Property of Attachment from given blob and options object.
  * @param {Object, Object} (blob object, options object)
  */
  function Attachment(blob, options) {
    options = options || {};
    this.blob = blob;
    this.isDraft = !!options.isDraft;
    this.name = blob.name || options.name || '';

    if (typeof this.name !== 'string') {
      this.name = '';
    }

    // force the _renderer property to be non enumerable so that we don't try to
    // store it in IndexedDB
    Object.defineProperty(this, '_renderer', { writable: true });
  }

  Attachment.prototype = {
    /* private methods */
    _getAttachmentRenderer: function() {
      this._renderer = this._renderer || AttachmentRenderer.for(this);
      return this._renderer;
    },

    /* public properties */
    get size() {
      return this.blob.size;
    },

    get type() {
      return Utils.typeFromMimeType(this.blob.type);
    },

    /* public methods */
    render: function(readyCallback) {
      var attachmentRenderer = this._getAttachmentRenderer();

      attachmentRenderer.render().catch(function(e) {
        console.error('Error occurred while rendering attachment.', e);
      }).then(readyCallback);

      // We still need this for the case where we render a list of attachments
      // and right order is important.
      return attachmentRenderer.getAttachmentContainer();
    },

    updateFileSize: function() {
      var attachmentRenderer = this._getAttachmentRenderer();
      attachmentRenderer.updateFileSize();
    },

    view: function(options) {
      // Make sure media is openable and savable even if
      // file extenion is missing or invalid but mimetype is supported.

      var l10nPromise = this.name ? Promise.resolve(this.name) :
        document.l10n.formatValue('unnamed-attachment');

      return l10nPromise.then(name => {
        // Make sure media is openable and savable even if
        // blob mimetype is unsupported but file extension is valid.
        var mimetype =
          MimeMapper.guessTypeFromFileProperties(
            name,
            this.blob.type.toLowerCase()
          );
        var filename = MimeMapper.ensureFilenameMatchesType(name, mimetype);

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
          console.error('error with open activity', this.error.name);
          if (this.error.name === 'NO_PROVIDER') {
            Utils.alert('attachmentOpenError');
          }
        };
      });
    }
  };

  exports.Attachment = Attachment;
}(this));
