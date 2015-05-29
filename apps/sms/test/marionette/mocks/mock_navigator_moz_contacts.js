/* global Components, Services, PhoneNumberUtils */
'use strict';

const Cu = Components.utils;
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/PhoneNumberUtils.jsm');

/**
 * Mock object of navigator.mozContacts used in marionette js tests.
 * Developers using this mock should follow these rules:
 * - non-primitive types that are returned from the mock should be wrapped with
 *   Components.utils.cloneInto - to create clone of data to be passed from
 *   privileged (chrome) code to less privileged (content) one, so that content
 *   won't be able to change source data directly;
 * - mock returns results immediately, without any delay.
 */
Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView;

  var storagePromise = null;
  function getStorage() {
    if (!storagePromise) {
      var appWindow = window.wrappedJSObject;

      if (!appWindow.TestStorages) {
        storagePromise = Promise.resolve();
      } else {
        storagePromise = appWindow.TestStorages.getStorage('contactsDB');
      }

      storagePromise = storagePromise.then(function(storage) {
        return storage || { contacts: [] };
      });
    }

    return storagePromise;
  }

  /**
   * Very simplified search strategies, see real "find" implementation at:
   * http://mxr.mozilla.org/mozilla-central/source/dom/contacts/
   * @param {Object} filter Filter object.
   * @returns {Function} Search strategy function that accepts contact and
   * returns boolean indicating that contact matches filter.
   */
  function getFilterStrategy(filter) {
    var isInvalidFilter = !filter ||
      !filter.filterValue ||
      !filter.filterOp ||
      !filter.filterBy ||
      !filter.filterBy.length;

    if (isInvalidFilter) {
      return null;
    }

    // Contacts.findByPhoneNumber case
    if (filter.filterBy.length === 1 && filter.filterBy[0] === 'tel' &&
      filter.filterOp === 'match') {
      var number = PhoneNumberUtils.normalize(
        filter.filterValue,
        /* numbers only */ true
      );

      if (!number.length) {
        return null;
      }

      return (contact) => {
        return contact.tel && contact.tel.length && contact.tel.some((tel) => {
          return tel.value && tel.value.indexOf(number) >= 0;
        });
      };
    }

    return null;
  }

  var Contacts = {
    find: function(filter) {
      var request = Services.DOMRequest.createRequest(window);

      var filterStrategy = getFilterStrategy(filter);

      if (!filterStrategy) {
        Services.DOMRequest.fireErrorAsync(request, 'Filter is not supported');
        return request;
      }

      getStorage().then((storage) => {
        var contacts = storage.contacts.filter(filterStrategy);

        // See description at the top of the file about "cloneInto" necessity.
        Services.DOMRequest.fireSuccessAsync(
          request, Cu.cloneInto(contacts, window)
        );
      });

      return request;
    },

    addEventListener: () => {}
  };

  Object.defineProperty(window.wrappedJSObject.navigator, 'mozContacts', {
    configurable: false,
    writable: true,
    value: Cu.cloneInto(Contacts, window, {cloneFunctions: true})
  });
}, 'document-element-inserted', false);
