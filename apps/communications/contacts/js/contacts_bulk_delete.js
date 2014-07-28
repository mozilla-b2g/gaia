/* globals Contacts, utils, contactsRemover, Promise, ConfirmDialog */
'use strict';

var contacts = window.contacts || {};

contacts.BulkDelete = (function() {

  var cancelled = false;

  var _ = navigator.mozL10n.get;

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
        title: _('cancel'),
        callback: function onCancel() {
          ConfirmDialog.hide();
          reject();
        }
      };

      var removeObject = {
        title: _('delete'),
        isDanger: true,
        callback: function onRemove() {
          ConfirmDialog.hide();
          resolve();
        }
      };

      utils.confirmDialog(null, _('ContactConfirmDel', {n: n}), cancelObject,
                             removeObject);
    });
  };

  var doDelete = function doDelete(ids, done) {
    cancelled = false;
    var progress = utils.overlay.show(_('DeletingContacts'), 'progressBar');
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

    contactsRemoverObj.onCancelled = function onCancelled() {
      Contacts.hideOverlay();
      Contacts.showStatus(_('DeletedTxt',
        {n: contactsRemoverObj.getDeletedCount()}));
      contacts.Settings.refresh();
    };

    contactsRemoverObj.onError = function onError() {
      Contacts.hideOverlay();
      Contacts.showStatus(_('deleteError-general'));
      contacts.Settings.refresh();
    };

    contactsRemoverObj.onFinished = function onFinished() {
      Contacts.hideOverlay();
      Contacts.showStatus(_('DeletedTxt',
        {n: contactsRemoverObj.getDeletedCount()}));
      contacts.Settings.refresh();

      if (typeof done === 'function') {
        done();
      }
    };

  };
  // Start the delete of the contacts
  var performDelete = function performDelete(promise, done) {
    requireOverlay(function onOverlay() {
      utils.overlay.show(_('preparing-contacts'), 'spinner');
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
