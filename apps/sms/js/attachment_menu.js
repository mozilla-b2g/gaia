'use strict';

/**
 * Handle the pre-send options menu for attachments
 */
var AttachmentMenu = {

  init: function(id) {
    this.el = document.getElementById(id);
    ['view', 'remove', 'replace', 'cancel'].forEach(function(button) {
      this[button + 'Button'] =
        this.el.querySelector('#attachment-options-' + button);
    }.bind(this));
    this.header = this.el.querySelector('header');
  },

  open: function(attachment) {
    var name = attachment.name;
    var blob = attachment.blob;
    var _ = navigator.mozL10n.get;
    var fileName = name.substr(name.lastIndexOf('/') + 1);

    // Localize the name of the file type
    var types = ['image', 'audio', 'video'];
    var mimeFirstPart = blob.type.substr(0, blob.type.indexOf('/'));
    var fileType;
    if (mimeFirstPart.indexOf(mimeFirstPart) > -1) {
      fileType = _('attachment-type-' + mimeFirstPart);
    }
    else {
      fileType = mimeFirstPart;
    }

    this.header.textContent = fileName;
    this.viewButton.textContent = _('view-attachment');
    this.removeButton.textContent = _('remove-attachment', {type: fileType});
    this.replaceButton.textContent = _('replace-attachment',
      {type: fileType});
    this.cancelButton.textContent = _('cancel');

    this.el.className = '';
  },

  close: function() {
    this.el.className = 'hide';
  }

};
