/* globals Contacts, _, utils, contactsRemover */
'use strict';

var contacts = window.contacts || {};

contacts.BulkDelete = (function() {

  var cancelled = false;

  /**
   * Loads the overlay class before showing
   */
  function requireOverlay(callback) {
    Contacts.utility('Overlay', callback);
  }

  // Shows a dialog to confirm the bulk delete
  var showConfirm = function showConfirm(n) {
    var response = confirm(_('ContactConfirmDel', {n: n}));
    return response;
  };

  var doDelete = function doDelete(contactList) {
    cancelled = false;
    var progress = utils.overlay.show(_('DeletingContacts'), 'progressBar');
    progress.setTotal(contactList.length);
    utils.overlay.showMenu();

    utils.overlay.oncancel = function() {
      cancelled = true;
      contactsRemoverObj.finish();
    };

    var contactsRemoverObj = new contactsRemover();
    contactsRemoverObj.init(contactList, function onInitDone() {
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
    };

  };
  // Start the delete of the contacts
  var performDelete = function performDelete(promise) {
    requireOverlay(function onOverlay() {
      utils.overlay.show(_('preparing-contacts'), 'spinner');
      promise.onsuccess = function onSuccess(ids, contactList) {
        Contacts.hideOverlay();
        var confirmDelete = showConfirm(ids.length);
        if (confirmDelete) {
          doDelete(contactList);
        } else {
          Contacts.showStatus(_('BulkDelCancel'));
        }
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
