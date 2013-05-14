/** Creates an Attachment object
 * @param {String} type of attachment (image, video, etc).
 * @param {String} uri Location or datauri of image to show.
 * @param {Number} size Size of attachment in bytes.
 * @return {Attachment} new attachment object.
 *
 * The render method creates an iframe to represent the
 * attachment in the message composition area. An iframe
 * is used because Gecko will still try to put the
 * cursor into elements with [contentEditable=false].
 * Instead of a bunch of JavaScript to manage where the
 * caret is and what to delete on backspace, the
 * contentEditable region treats the iframe as a simple
 * block. Win.
 *
 * It uses the main sms.css stylesheet so that styles
 * can be defined in that.
 */

'use strict';

function Attachment(blob, name) {
  this.blob = blob;
  this.name = name || '';
  this.optionsMenu = null;
  this.el = null;
}

Attachment.prototype = {
  get size() {
    return this.blob.size;
  },
  get type() {
    return Utils.typeFromMimeType(this.blob.type);
  },
  render: function() {
    var self = this;
    var _ = navigator.mozL10n.get;
    this.el = document.createElement('iframe');
    // The attachment's iFrame requires access to the parent document's context
    // so that URIs for Blobs created in the parent may resolve as expected.
    this.el.setAttribute('sandbox', 'allow-same-origin');
    var src = 'data:text/html,';
    // We want kilobytes so we divide by 1024, with one fractional digit
    var size = Math.floor(this.size / 102.4) / 10;
    var sizeString = _('attachmentSize', {n: size});
    var objectURL = window.URL.createObjectURL(this.blob);
    src += Utils.Template('attachment-tmpl').interpolate({
      uri: objectURL,
      size: sizeString
    });
    this.el.src = src;
    this.el.className = 'attachment';

    // When rendering is complete
    this.el.addEventListener('load', function() {
      // Signal Gecko to release the reference to the Blob
      window.URL.revokeObjectURL.bind(window.URL, objectURL));

      self.el.contentDocument.addEventListener('click',
        self.openOptionsMenu.bind(self));
    });

    return this.el;
  },

  openOptionsMenu: function() {
    var self = this;
    var template = Utils.Template('attachment-options-tmpl');
    var html = template.interpolate({
      fileName: 'todo',
      fileType: 'todo'
    });
    var elem = document.createElement('menu');
    elem.innerHTML = html;

    var viewButton = elem.querySelector('#attachment-options-view');
    var removeButton = elem.querySelector('#attachment-options-remove');
    var replaceButton = elem.querySelector('#attachment-options-replace');
    var cancelButton = elem.querySelector('#attachment-options-cancel');

    removeButton.addEventListener('click', function() {
      self.remove();
    });

    cancelButton.addEventListener('click', function() {
      self.closeOptionsMenu();
    });

    this.optionsMenu = elem;
    document.body.appendChild(elem);
  },

  closeOptionsMenu: function() {
    this.optionsMenu.remove();
    this.optionsMenu = null;
  },

  remove: function() {
    this.el.remove();
    ThreadUI.updateInputHeight();
    this.closeOptionsMenu();
  }
};
