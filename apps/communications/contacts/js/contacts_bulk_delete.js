/* globals utils, contactsRemover, Promise,
   Search, ConfirmDialog, Loader, Overlay */
'use strict';

var contacts = window.contacts || {};

(function(exports) {

  var cancelled = false;

  /**
   * Loads the overlay class before showing
   */
  function requireOverlay(callback) {
    Loader.utility('Overlay', callback);
  }

  // Shows a dialog to confirm the bulk delete
  var showConfirm = function showConfirm(n) {
    return new Promise(function doShowConfirm(resolve, reject) {
      var cancelObject = {
        title: 'cancel',
        callback: function onCancel() {
          ConfirmDialog.hide();
          reject();
        }
      };

      var removeObject = {
        title: 'delete',
        isDanger: true,
        callback: function onRemove() {
          ConfirmDialog.hide();
          resolve();
        }
      };

      ConfirmDialog.show(null,
        {'id': 'ContactConfirmDel', 'args': {n: n}}, cancelObject,
          removeObject);
    });
  };

  var doDelete = function doDelete(ids, done) {
    cancelled = false;
    Overlay.showProgressBar('DeletingContacts', ids.length);

    Overlay.oncancel = function() {
      cancelled = true;
      contactsRemoverObj.finish();
    };

    var contactsRemoverObj = new contactsRemover();
    contactsRemoverObj.init(ids, function onInitDone() {
      contactsRemoverObj.start();
    });

    contactsRemoverObj.onDeleted = function onDeleted(currentId) {
      if (window.Search && Search.isInSearchMode()) {
        Search.invalidateCache();
        Search.removeContact(currentId);
      }
      contacts.List.remove(currentId);
      Overlay.updateProgressBar();
    };

    contactsRemoverObj.onError = function onError() {
      Overlay.hide();
      utils.status.show({
        id: 'deleteError-general'
      });
      contacts.Settings.refresh();
    };

    contactsRemoverObj.onFinished = function onFinished() {
      Overlay.hide();
      utils.status.show({
        id: 'DeletedTxt',
        args: {n: contactsRemoverObj.getDeletedCount()}
      });
      contacts.Settings.refresh();

      if (typeof done === 'function') {
        done();
      }
    };

    contactsRemoverObj.onCancelled = contactsRemoverObj.onFinished;

  };
  // Start the delete of the contacts
  var performDelete = function performDelete(promise, done) {
    var self = this;
    requireOverlay(function onOverlay() {
      promise.onsuccess = function onSuccess(ids) {
        showConfirm(ids.length).then(self.doDelete.bind(null, ids, done));
      };
    });
  };

  exports.BulkDelete = {
    'performDelete': performDelete,
    'doDelete': doDelete
  };

})(window);
