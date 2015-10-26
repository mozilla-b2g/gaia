/* globals Contacts, utils, contactsRemover, Promise, ConfirmDialog */
'use strict';

var contacts = window.contacts || {};

contacts.BulkDelete = (function() {

  var cancelled = false;

  /**
   * Loads the overlay class before showing
   */
  function requireOverlay(callback) {
    Contacts.utility('Overlay', callback, Contacts.SHARED_UTILITIES);
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

      Contacts.confirmDialog({'id': 'DelContactTitle', 'args': {n: n}},
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
      if (contacts.Search && contacts.Search.isInSearchMode()) {
        contacts.Search.invalidateCache();
        contacts.Search.removeContact(currentId);
      }
      contacts.List.remove(currentId);
      progress.update();
    };

    contactsRemoverObj.onError = function onError() {
      Contacts.hideOverlay();
      Contacts.showStatus({
        id: 'deleteError-general'
      });
      contacts.Settings.refresh();
    };

    contactsRemoverObj.onFinished = function onFinished() {
      Contacts.hideOverlay();
      Contacts.showStatus({
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
    requireOverlay(function onOverlay() {
      utils.overlay.show('preparing-contacts', 'spinner');
      promise.onsuccess = function onSuccess(ids) {
        Contacts.hideOverlay();
        showConfirm(ids.length).then(
                          contacts.BulkDelete.doDelete.bind(null, ids, done));
      };
      promise.onerror = function onError() {
        Contacts.hideOverlay();
      };
    });
  };

  return {
    'performDelete': performDelete,
    'doDelete': doDelete
  };

})();
