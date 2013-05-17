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
  var self = this;
  this.blob = blob;
  this.name = name || '';
  this.optionsMenu = null;
  this.el = document.createElement('iframe');
  // The attachment's iFrame requires access to the parent document's context
  // so that URIs for Blobs created in the parent may resolve as expected.
  this.el.setAttribute('sandbox', 'allow-same-origin');
  this.el.className = 'attachment';
  this.objectURL = window.URL.createObjectURL(this.blob);

  // When rendering is complete
  this.el.addEventListener('load', function() {
    // Signal Gecko to release the reference to the Blob
    window.URL.revokeObjectURL(self.objectURL);

    self.el.contentDocument.addEventListener('click',
      self.openOptionsMenu.bind(self));
  });
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
    var template = Utils.Template('attachment-options-tmpl');
    var html = template.interpolate({
      fileName: this.name.substr(this.name.lastIndexOf('/') + 1),
      fileType: this.type
    });
    var elem = document.createElement('menu');
    elem.innerHTML = html;

    var viewButton = elem.querySelector('#attachment-options-view');
    var removeButton = elem.querySelector('#attachment-options-remove');
    var replaceButton = elem.querySelector('#attachment-options-replace');
    var cancelButton = elem.querySelector('#attachment-options-cancel');

    viewButton.addEventListener('click', this.view.bind(this));
    removeButton.addEventListener('click', this.remove.bind(this));
    replaceButton.addEventListener('click', this.replace.bind(this));
    cancelButton.addEventListener('click', this.closeOptionsMenu.bind(this));

    this.optionsMenu = elem;
    document.body.appendChild(elem);
  },

  closeOptionsMenu: function() {
    this.optionsMenu.parentNode.removeChild(this.optionsMenu);
    this.optionsMenu = null;
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
    var self = this;
    var request = Compose.requestAttachment();
    request.onsuccess = function(result) {
      self.blob = result.blob;
      self.name = result.name;
      self.objectURL = window.URL.createObjectURL(self.blob);
      self.render();
      self.closeOptionsMenu();
    };
  }

};
