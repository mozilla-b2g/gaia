/*jshint browser: true */
/*global define */

define(function() {
  var api;

  api = {
    viewAccounts: function() {
      var account = {
        id: 'fake_account',
        name: 'fake account'
      };

      var acctsSlice = {
        items: [
          account
        ],
        defaultAccount: account
      };

      setTimeout(function() {
        if (!acctsSlice.oncomplete)
          return;

        acctsSlice.oncomplete();
      });

      return acctsSlice;
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
          if (type !== 'inbox')
            throw new Error('Only type of inbox supported in mock_api');

          return inboxFolder;
        }
      };

      setTimeout(function() {
        if (!foldersSlice.oncomplete)
          return;

        foldersSlice.oncomplete();
      });

      return foldersSlice;
    }
  };

  return api;
});
