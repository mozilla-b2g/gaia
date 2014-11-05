/*exported AttachmentMenu */

'use strict';

/**
 * Handle the pre-send options menu for attachments
 */
var AttachmentMenu = {

  init: function(id) {
    this.el = document.getElementById(id).querySelector('#attachment-options');
    ['view', 'remove', 'replace', 'cancel'].forEach(function(button) {
      this[button + 'Button'] =
        this.el.querySelector('#attachment-options-' + button);
    }.bind(this));
    this.header = this.el.querySelector('header');
  },

  open: function(attachment) {
    var name = attachment.name;
    var blob = attachment.blob;
    var fileName = name.substr(name.lastIndexOf('/') + 1);

    // Localize the name of the file type
    var types = ['image', 'audio', 'video'];
    var mimeFirstPart = blob.type.substr(0, blob.type.indexOf('/'));

    // default to -other
    var fileType = 'other';
    if (types.indexOf(mimeFirstPart) > -1) {
      fileType = mimeFirstPart;
    }

    this.header.textContent = fileName;

    this.viewButton.setAttribute(
      'data-l10n-id',
      'view-attachment-' + fileType
    );
    this.removeButton.setAttribute(
      'data-l10n-id',
      'remove-attachment-' + fileType
    );
    this.replaceButton.setAttribute(
      'data-l10n-id',
      'replace-attachment-' + fileType
    );

    this.el.classList.add('visible');

    // focus the menu so we can lose focus on anything with the keyboard
    // when we gain focus through longpress/contextmenu the keyboard
    // won't go away on its own.
    this.el.focus();
  },

  close: function() {
    this.el.classList.remove('visible');
  }

};
