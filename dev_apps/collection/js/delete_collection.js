'use strict';
/* global Promise */

(function(exports) {

  var _ = navigator.mozL10n.get;
  var cancelButton = document.getElementById('cancel');
  var deleteButton = document.getElementById('delete');

  function HandleDelete(activity) {
    var id = activity.source.data.id;
    var name = activity.source.data.name;

    // Bug 1007743
    // need to l10n the dialog title and body
    cancelButton.addEventListener('click', function cancel() {
      activity.postResult(false);
    });

    deleteButton.addEventListener('click', function remove() {
      activity.postResult(true);
      CollectionsDatabase.remove(id);
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
