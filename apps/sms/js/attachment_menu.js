'use strict';

/**
 * Handle the pre-send options menu for attachments
 */
var AttachmentMenu = (function() {

  var el;

  var attachmentMenu = {

    init: function(id) {
      el = document.getElementById(id);
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

      var header = el.querySelector('header');
      var viewButton = el.querySelector('#attachment-options-view');
      var removeButton = el.querySelector('#attachment-options-remove');
      var replaceButton = el.querySelector('#attachment-options-replace');
      var cancelButton = el.querySelector('#attachment-options-cancel');

      header.textContent = fileName;
      viewButton.textContent = _('view-attachment');
      removeButton.textContent = _('remove-attachment', {type: fileType});
      replaceButton.textContent = _('replace-attachment', {type: fileType});
      cancelButton.textContent = _('cancel');

      el.className = '';
    },

    close: function() {
      el.className = 'hide';
    }

  };

  return attachmentMenu;

}());
