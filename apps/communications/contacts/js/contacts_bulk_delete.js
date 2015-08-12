/* globals Contacts, utils, contactsRemover, Promise,
   Search, ConfirmDialog, Loader */
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
    var progress = utils.overlay.show('DeletingContacts', 'progressBar');
    progress.setTotal(ids.length);
    utils.overlay.showMenu();

    utils.overlay.oncancel = function() {
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
      progress.update();
    };

    contactsRemoverObj.onError = function onError() {
      Contacts.hideOverlay();
      utils.status.show({
        id: 'deleteError-general'
      });
      contacts.Settings.refresh();
    };

    contactsRemoverObj.onFinished = function onFinished() {
      Contacts.hideOverlay();
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
      utils.overlay.show('preparing-contacts', 'spinner');
      promise.onsuccess = function onSuccess(ids) {
        Contacts.hideOverlay();
        showConfirm(ids.length).then(self.doDelete.bind(null, ids, done));
      };
      promise.onerror = function onError() {
        Contacts.hideOverlay();
      };
    });
  };

  exports.BulkDelete = {
    'performDelete': performDelete,
    'doDelete': doDelete
  };

})(window);
