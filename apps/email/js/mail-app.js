/**
 * Application logic that isn't specific to cards, specifically entailing
 * startup and eventually notifications.
 **/

var MailAPI = null;

var App = {
  /**
   * Bind any global notifications.
   */
  _init: function() {
    // If our password is bad, we need to pop up a card to ask for the updated
    // password.
    MailAPI.onbadlogin = function(account) {
      Cards.pushCard('setup-fix-password', 'default', 'animate',
                     { account: account, restoreCard: Cards.activeCardIndex },
                     'right');
    };
  },

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
            dieOnFatalError('We have an account without an inbox!',
                foldersSlice.items);

          Cards.assertNoCards();

          // Push the navigation cards
          Cards.pushCard(
            'account-picker', 'default', 'none',
            {
              acctsSlice: acctsSlice,
              curAccount: account
            });
          Cards.pushCard(
            'folder-picker', 'navigation', 'none',
            {
              curAccount: account,
              foldersSlice: foldersSlice,
              curFolder: inboxFolder
            });
          // Push the message list card
          Cards.pushCard(
            'message-list', 'default', 'immediate',
            {
              folder: inboxFolder
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
  }
};

function hookStartup() {
  var gotLocalized = false, gotMailAPI = false;
  function doInit() {
    try {
      populateTemplateNodes();
      Cards._init();
      App._init();
      App.showMessageViewOrSetup();
    }
    catch (ex) {
      console.error('Problem initializing', ex, '\n', ex.stack);
    }
  }

  window.addEventListener('localized', function() {
    console.log('got localized!');
    gotLocalized = true;
    if (gotMailAPI)
      doInit();
  }, false);
  window.addEventListener('mailapi', function(event) {
    console.log('got MailAPI!');
    MailAPI = event.mailAPI;
    gotMailAPI = true;
    if (gotLocalized)
      doInit();
  }, false);
}
hookStartup();

window.navigator.mozSetMessageHandler('activity', function actHandle(activity) {
  var to,
  subject,
  body,
  cc,
  bcc;
  var queryURI = function _queryURI(uri) {
    var mailtoReg = /^mailto:(.*)/i;
    if (uri.match(mailtoReg)) {
      uri = uri.match(mailtoReg)[1];
      var parts = uri.split('?');
      var subjectReg = /(?:^|&)subject=([^\&]*)/i,
      bodyReg = /(?:^|&)body=([^\&]*)/i,
      ccReg = /(?:^|&)cc=([^\&]*)/i,
      bccReg = /(?:^|&)bcc=([^\&]*)/i;
      to = unescape(parts[0]);


      if (parts[1].match(subjectReg))
        subject = unescape(parts[1].match(subjectReg)[1]);
      if (parts[1].match(bodyReg))
        body = unescape(parts[1].match(bodyReg)[1]);
      if (parts[1].match(ccReg))
        cc = unescape(parts[1].match(ccReg)[1]);
      if (parts[1].match(bccReg))
        bcc = unescape(parts[1].match(bccyReg)[1]);

    }

  }
  queryURI(activity.source.data.URI);
  var sendMail = function actHandleMail() {
    if (to && subject) {

      var folderToUse = Cards._cardStack[Cards
        ._findCard(['folder-picker', 'navigation'])].cardImpl.curFolder;
      var composer = MailAPI.(
        null, folderToUse, null,
        function() {
          composer.to = to;
          composer.subject = subject;
          composer.body = body;
          composer.cc = cc;
          composer.bcc = bcc;
          Cards.pushCard('compose',
            'default', 'immediate', {composer: composer });
        });
    }
  }

  if (document.readyState == 'complete') {
    sendMail();
  } else {
    window.addEventListener('localized', function loadWait() {
      window.removeEventListener('localized', loadWait);
      sendMail();
    });
  }

  activity.postResult({ status: 'accepted' });
});

