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

      // Title and message
      var ttl = document.getElementById('title');
      var msg = document.getElementById('message');
      ttl.setAttribute('data-l10n-id', 'remove-title');
      ttl.setAttribute('data-l10n-args', `{ "name": "${bookmark.name}" }`);
      msg.setAttribute('data-l10n-id', 'remove-message');
      msg.setAttribute('data-l10n-args', `{ "name": "${bookmark.name}" }`);

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
