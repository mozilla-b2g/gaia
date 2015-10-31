/* global utils */
/* global contactsRemover */
/* global Promise */
/* global ConfirmDialog */
/* global Loader */
/* global Overlay */
/* global Search */

'use strict';

(function(exports) {

  var cancelled = false;

  // Loads the overlay class before showing
  function _requireOverlay(callback) {
    Loader.utility('Overlay', callback);
  }

  // Shows a dialog to confirm the bulk delete
  function _showConfirm(n) {
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
  }

  // Does the real deletion of contacts and updates UI
  function doDelete(ids, done) {
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

    contactsRemoverObj.onDeleted = function(currentId) {
      if (window.Search && Search.isInSearchMode()) {
        Search.invalidateCache();
        Search.removeContact(currentId);
      }

      Overlay.updateProgressBar();
    };

    contactsRemoverObj.onError = function() {
      Overlay.hide();
      utils.status.show({
        id: 'deleteError-general'
      });
    };

    contactsRemoverObj.onFinished = function() {
      Overlay.hide();
      utils.status.show({
        id: 'DeletedTxt',
        args: {n: contactsRemoverObj.getDeletedCount()}
      });

      if (typeof done === 'function') {
        done();
      }
    };

    contactsRemoverObj.onCancelled = contactsRemoverObj.onFinished;
  }

  // Prepares the deletion and asks user for confirmation
  function performDelete(promise, done) {
    /* jshint ignore:start */
    var self = this;
    /* jshint ignore:end */
    _requireOverlay(function onOverlay() {
      promise.onsuccess = function onSuccess(ids) {
        _showConfirm(ids.length).then(self.doDelete.bind(null, ids, done));
      };
    });
  }

  exports.BulkDelete = {
    'performDelete': performDelete,
    'doDelete': doDelete
  };

})(window);
