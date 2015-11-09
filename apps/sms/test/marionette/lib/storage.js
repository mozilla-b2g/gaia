/* global Components, module, Services */
(function(module) {
  'use strict';

  module.exports = {
    create: function(client) {
      return {
        /**
         * Sets pre-populated thread/message storage.
         * @param {Array.<Thread>?} threads List of the thread to pre-populate
         * storage with.
         * @param {number?} uniqueMessageIdCounter Start value for the unique
         * message id counter, it's used to avoid message "id" collision between
         * message ids from predefined store and message ids that can be
         * generated during test (e.g. send or receive new message).
         */
        setMessagesStorage: function(threads, uniqueMessageIdCounter) {
          this.setStorage('messagesDB', {
            threads: threads || [],
            uniqueMessageIdCounter: uniqueMessageIdCounter || 0
          });
        },

        /**
         * Sets pre-populated contacts storage.
         * @param {Array.<MozContact>?} contacts List of the contacts to
         * pre-populate storage with.
         */
        setContactsStorage: function(contacts) {
          this.setStorage('contactsDB', {
            contacts: contacts || []
          });
        },

        /**
         * Sets pre-populated custom storage.
         * @param {string} storageName Name of the custom storage.
         * @param {*} storage Custom storage data.
         * @private
         */
        setStorage: function(storageName, storage) {
          client.scope({ context: 'chrome' }).executeScript(
            function(storage, storageName) {
              Services.obs.addObserver(function(window) {
                window.wrappedJSObject.TestStorages.set(
                  storageName, Components.utils.cloneInto(storage, window)
                );
              }, 'test-storage-ready', false);
            },
            [storage, storageName]
          );
        }
      };
    }
  };
})(module);
