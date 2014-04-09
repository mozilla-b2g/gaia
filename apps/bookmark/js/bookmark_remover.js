'use strict';

/* global BookmarksDatabase */
/* exported BookmarkRemover */
var BookmarkRemover = {
  init: function bookmarkRemover_init(data) {
    var id = data.id;
    BookmarksDatabase.get(id).then(function got(bookmark) {
      if (!bookmark) {
        data.oncancelled('bookmark does not exist');
        return;
      }

      var _ = navigator.mozL10n.get;

      var nameObj = {
        name: bookmark.name
      };

      // Title and message
      document.getElementById('title').textContent = _('remove-title', nameObj);
      document.getElementById('message').textContent =
                                        _('remove-message', nameObj);

      // Action handlers
      document.getElementById('cancel-action').addEventListener('click',
        function onCancel() {
          data.oncancelled('cancelled');
        }
      );

      document.getElementById('remove-action').addEventListener('click',
        function onConfirm(evt) {
          evt.target.removeEventListener('click', onConfirm);
          BookmarksDatabase.remove(id).then(data.onremoved, data.oncancelled);
        }
      );
    }, data.oncancelled);
  }
};
