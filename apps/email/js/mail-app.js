/**
 * Application logic that isn't specific to cards, specifically entailing
 * startup and eventually notifications.
 **/

var MailAPI = null;

var App = {
  /**
   * Show the best inbox we have (unified if >1 account, just the inbox if 1) or
   * start the setup process if we have no accounts.
   */
  showMessageViewOrSetup: function() {
    // Get the list of accounts including the unified account (if it exists)
    var acctsSlice = MailAPI.viewAccounts(false);
    acctsSlice.oncomplete = function() {
      // - we have accounts, show the message view!
      if (acctsSlice.items.length) {
        // For now, just use the first one; we do attempt to put unified first
        // so this should generally do the right thing.
        var account = acctsSlice.items[0];
        var foldersSlice = MailAPI.viewFolders('account', account);
        foldersSlice.oncomplete = function() {
          var inboxFolder = foldersSlice.getFirstFolderWithType('inbox');
          if (!inboxFolder)
            dieOnFatalError('We have an account without an inbox!', foldersSlice.items);

          Cards.assertNoCards();

          // Push the navigation cards
          Cards.pushCard(
            'account-picker', 'default', 'none',
            {
              acctsSlice: acctsSlice,
              curAccount: account,
            });
          Cards.pushCard(
            'folder-picker', 'navigation', 'none',
            {
              curAccount: account,
              foldersSlice: foldersSlice,
              curFolder: inboxFolder,
            });
          // Push the message list card
          Cards.pushCard(
            'message-list', 'default', 'immediate',
            {
              folder: inboxFolder,
            });
        };
      }
      // - no accounts, show the setup page!
      else {
        acctsSlice.die();
        Cards.assertNoCards();
        Cards.pushCard(
          'setup-pick-service', 'default', 'immediate',
          {});
      }
    };
  },
};

function hookStartup() {
  var gotLocalized = false, gotMailAPI = false;
  function doInit() {
    try {
      populateTemplateNodes();
      Cards._init();
      App.showMessageViewOrSetup();
    }
    catch (ex) {
      console.error('Problem initializing', ex, '\n', ex.stack);
    }
  }

  window.addEventListener('localized', function() {
    gotLocalized = true;
    if (gotMailAPI)
      doInit();
  }, false);
  window.addEventListener('mailapi', function(event) {
    MailAPI = event.mailAPI;
    gotMailAPI = true;
    if (gotLocalized)
      doInit();
  }, false);
}
hookStartup();
