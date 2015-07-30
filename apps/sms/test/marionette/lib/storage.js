/* global module */
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
          client.executeScript(function(threads, uniqueMessageIdCounter) {
            var STORAGE_NAME = 'messagesDB';

            var recipientToThreadId = new Map();

            var threadMap = new Map(threads.map(function(thread) {
              recipientToThreadId.set(thread.participants[0], thread.id);

              return [thread.id, thread];
            }));

            window.wrappedJSObject.TestStorages.setStorage(STORAGE_NAME, {
              threads: threadMap,
              recipientToThreadId: recipientToThreadId,
              uniqueMessageIdCounter: uniqueMessageIdCounter
            });

            window.wrappedJSObject.TestStorages.setStorageReady(STORAGE_NAME);
          }, [threads || [], uniqueMessageIdCounter || 0]);
        },

        /**
         * Sets pre-populated contacts storage.
         * @param {Array.<MozContact>?} contacts List of the contacts to
         * pre-populate storage with.
         */
        setContactsStorage: function(contacts) {
          client.executeScript(function(contacts) {
            var STORAGE_NAME = 'contactsDB';

            window.wrappedJSObject.TestStorages.setStorage(STORAGE_NAME, {
              contacts: contacts
            });

            window.wrappedJSObject.TestStorages.setStorageReady(STORAGE_NAME);
          }, [contacts || []]);
        }
      };
    }
  };
})(module);
