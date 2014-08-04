'use strict';
/* global CollectionsDatabase */

(function(exports) {

  var cancelButton = document.getElementById('cancel');
  var deleteButton = document.getElementById('delete');

  function HandleDelete(activity) {
    var id = activity.source.data.id;

    // Bug 1007743
    // need to l10n the dialog title and body
    cancelButton.addEventListener('click', function cancel() {
      activity.postResult(false);
    });

    deleteButton.addEventListener('click', function remove() {
      deleteButton.removeEventListener('click', remove);
      CollectionsDatabase.remove(id).then(function onsuccess() {
        activity.postResult(true);
      }, function onerror() {
        activity.postResult(false);
      });
    });
  }

  navigator.mozSetMessageHandler('activity', function onActivity(activity) {
    if (activity.source.name === 'delete-collection') {
      HandleDelete(activity);
    }
  });

  // exporting handler so we can trigger it from testpage.js
  // without mozActivities since we can't debug activities in app manager
  exports.HandleDelete = HandleDelete;

}(window));
