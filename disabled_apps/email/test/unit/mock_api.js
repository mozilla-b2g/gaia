/*jshint browser: true */
/*global define */
'use strict';

define(function() {
  var api;

  api = {
    setInteractive: function() {},
    useLocalizedStrings: function() {},

    viewAccounts: function() {
      var account = {
        id: 'fake_account',
        name: 'fake account'
      };

      var acctsSlice = {
        items: [
          account
        ],
        defaultAccount: account,
        die: function() {}
      };

      setTimeout(function() {
        if (!acctsSlice.oncomplete) {
          return;
        }

        acctsSlice.oncomplete();
      });

      return acctsSlice;
    },

    viewFolderMessages: function() {
      var messagesSlice = {
        items: [],
        die: function() {}
      };

      return messagesSlice;
    },

    viewFolders: function(mode, argument) {
      var inboxFolder = {
          id: 'fake_inbox',
          type: 'inbox',
          name: 'inbox'
        };

      var foldersSlice = {
        items: [
          inboxFolder
        ],

        getFirstFolderWithType: function(type) {
          if (type !== 'inbox') {
            throw new Error('Only type of inbox supported in mock_api');
          }

          return inboxFolder;
        },

        die: function() {}
      };

      setTimeout(function() {
        if (!foldersSlice.oncomplete) {
          return;
        }

        foldersSlice.oncomplete();
      });

      return foldersSlice;
    }
  };

  return api;
});
