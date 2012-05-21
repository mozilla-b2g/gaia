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
            dieOnFatalError('We have an account without an inbox!');

          Cards.assertNoCards();
          // Push the navigation card
          Cards.pushCard(
            'folders', 'navigation', 'none',
            {
              acctsSlice: acctsSlice,
              curAccount: account,
              foldersSlice: foldersSlice,
              curFolder: inboxFolder,
            });
        };
      }
      // - no accounts, show the setup page!
      else {
        Cards.assertNoCards();
        Cards.pushCard(
          'setup-pick-service', 'default', 'immediate',
          {});
      }
    };
  },
};

function hookStartup() {
  var callbacks = makeAllback(['mailapi', 'locale'], function(results) {
    populateTemplateNodes();
    Cards._init();

    MailAPI = results.mailapi;
    App.showMessageViewOrSetup();
  });
  gimmeMailAPI(callbacks.mailapi);
  window.addEventListener('localized', callbacks.locale);
}

