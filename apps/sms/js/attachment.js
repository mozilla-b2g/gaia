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
  this.optionsMenu = document.getElementById('attachment-options-menu');
  this.el = document.createElement('iframe');
  this.optionsMenu.el = this.el;
  // The attachment's iFrame requires access to the parent document's context
  // so that URIs for Blobs created in the parent may resolve as expected.
  this.el.setAttribute('sandbox', 'allow-same-origin');
  this.el.className = 'attachment';
  this.objectURL = window.URL.createObjectURL(this.blob);

  // When rendering is complete
  this.el.addEventListener('load', this.handleLoad.bind(this));
}

Attachment.prototype = {
  get size() {
    return this.blob.size;
  },
  get type() {
    return Utils.typeFromMimeType(this.blob.type);
  },
  handleLoad: function() {
    // Signal Gecko to release the reference to the Blob
    window.URL.revokeObjectURL(this.objectURL);

    // Bubble click events from inside the iframe
    this.el.contentDocument.addEventListener('click', function() {
      this.el.click(this.el);
    }.bind(this));
  },
  render: function() {
    var _ = navigator.mozL10n.get;
    var src = 'data:text/html,';
    // We want kilobytes so we divide by 1024, with one fractional digit
    var size = Math.floor(this.size / 102.4) / 10;
    var sizeString = _('attachmentSize', {n: size});
    src += Utils.Template('attachment-tmpl').interpolate({
      uri: this.objectURL,
      size: sizeString
    });
    this.el.src = src;

    return this.el;
  },

  openOptionsMenu: function() {
    var _ = navigator.mozL10n.get;
    var elem = this.optionsMenu;
    var fileName = this.name.substr(this.name.lastIndexOf('/') + 1);

    // Localize the name of the file type
    var types = ['image', 'audio', 'video'];
    var mimeFirstPart = this.blob.type.substr(0, this.blob.type.indexOf('/'));
    var fileType;
    if (mimeFirstPart.indexOf(mimeFirstPart) > -1) {
      fileType = _('attachment-type-' + mimeFirstPart);
    }
    else {
      fileType = mimeFirstPart;
    }

    var header = elem.querySelector('header');
    var viewButton = elem.querySelector('#attachment-options-view');
    var removeButton = elem.querySelector('#attachment-options-remove');
    var replaceButton = elem.querySelector('#attachment-options-replace');
    var cancelButton = elem.querySelector('#attachment-options-cancel');

    header.textContent = fileName;
    viewButton.textContent = _('view-attachment');
    removeButton.textContent = _('remove-attachment', {type: fileType});
    replaceButton.textContent = _('replace-attachment', {type: fileType});
    cancelButton.textContent = _('cancel');

    elem.className = '';
  },

  closeOptionsMenu: function() {
    this.optionsMenu.className = 'hide';
  },

  view: function() {
    var activity = new MozActivity({
      name: 'open',
      data: {
        type: this.blob.type,
        filename: this.name,
        blob: this.blob
      }
    });
    activity.onerror = function() {
      var _ = navigator.mozL10n.get;
      console.error('error with open activity', this.error.name);
      alert(_('attachmentOpenError'));
    };
  },

  remove: function() {
    this.el.parentNode.removeChild(this.el);
    ThreadUI.updateInputHeight();
    this.closeOptionsMenu();
  },

  replace: function() {
    var request = Compose.requestAttachment(true);
    request.onsuccess = function(result) {
      this.blob = result.blob;
      this.name = result.name || '';
      this.objectURL = window.URL.createObjectURL(this.blob);
      this.render();
      this.closeOptionsMenu();
    }.bind(this);
  }

};
