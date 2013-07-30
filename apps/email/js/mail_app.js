/**
 * Application logic that isn't specific to cards, specifically entailing
 * startup and eventually notifications.
 **/
/*jshint browser: true */
/*global define, requirejs, console, confirm, TestUrlResolver */

// Set up loading of scripts, but only if not in tests, which set up
// their own config.
if (typeof TestUrlResolver === 'undefined') {
  requirejs.config({
    baseUrl: 'js',
    paths: {
      l10nbase: '../shared/js/l10n',
      l10ndate: '../shared/js/l10n_date',
      style: '../style',
      shared: '../shared',

      'mailapi/main-frame-setup': 'ext/mailapi/main-frame-setup',
      'mailapi/main-frame-backend': 'ext/mailapi/main-frame-backend'
    },
    map: {
      '*': {
        'api': 'mailapi/main-frame-setup'
      }
    },
    shim: {
      l10ndate: ['l10nbase'],
      'shared/js/mime_mapper': {
        exports: 'MimeMapper'
      }
    }
  });
}

// Named module, so it is the same before and after build.
define('mail_app', function(require) {

var htmlCache = require('html_cache'),
    common = require('mail_common'),
    MailAPI = require('api'),
    mozL10n = require('l10n!'),
    queryURI = require('query_uri'),
    Cards = common.Cards,
    initialCardInsertion = true,
    hasCardsPushed = false,
    activityCallback = null;

var App = {
  initialized: false,

  /**
   * Bind any global notifications, relay localizations to the back-end.
   */
  _init: function() {
    // If our password is bad, we need to pop up a card to ask for the updated
    // password.
    MailAPI.onbadlogin = function(account, problem) {
      switch (problem) {
        case 'bad-user-or-pass':
          Cards.pushCard('setup_fix_password', 'default', 'animate',
                    { account: account, restoreCard: Cards.activeCardIndex },
                    'right');
          break;
        case 'imap-disabled':
          Cards.pushCard('setup_fix_gmail_imap', 'default', 'animate',
                    { account: account, restoreCard: Cards.activeCardIndex },
                    'right');
          break;
        case 'needs-app-pass':
          Cards.pushCard('setup_fix_gmail_twofactor', 'default', 'animate',
                    { account: account, restoreCard: Cards.activeCardIndex },
                    'right');
          break;
      }
    };

    MailAPI.useLocalizedStrings({
      wrote: mozL10n.get('reply-quoting-wrote'),
      originalMessage: mozL10n.get('forward-original-message'),
      forwardHeaderLabels: {
        subject: mozL10n.get('forward-header-subject'),
        date: mozL10n.get('forward-header-date'),
        from: mozL10n.get('forward-header-from'),
        replyTo: mozL10n.get('forward-header-reply-to'),
        to: mozL10n.get('forward-header-to'),
        cc: mozL10n.get('forward-header-cc')
      },
      folderNames: {
        inbox: mozL10n.get('folder-inbox'),
        sent: mozL10n.get('folder-sent'),
        drafts: mozL10n.get('folder-drafts'),
        trash: mozL10n.get('folder-trash'),
        queue: mozL10n.get('folder-queue'),
        junk: mozL10n.get('folder-junk'),
        archives: mozL10n.get('folder-archives'),
        localdrafts: mozL10n.get('folder-localdrafts')
      }
    });

    this.initialized = true;
  },

  /**
   * Show the best inbox we have (unified if >1 account, just the inbox if 1) or
   * start the setup process if we have no accounts.
   */
  showMessageViewOrSetup: function(showLatest) {
    // Get the list of accounts including the unified account (if it exists)

    var acctsSlice = MailAPI.viewAccounts(false);
    acctsSlice.oncomplete = function() {
      // - we have accounts, show the message view!
      if (acctsSlice.items.length) {
        // For now, just use the first one; we do attempt to put unified first
        // so this should generally do the right thing.
        // XXX: Because we don't have unified account now, we should switch to
        //       the latest account which user just added.
        var account = showLatest ? acctsSlice.items.slice(-1)[0] :
                                   acctsSlice.defaultAccount;

        var foldersSlice = MailAPI.viewFolders('account', account);
        foldersSlice.oncomplete = function() {
          var inboxFolder = foldersSlice.getFirstFolderWithType('inbox');

          if (!inboxFolder)
            common.dieOnFatalError('We have an account without an inbox!',
                foldersSlice.items);

          if (!initialCardInsertion)
            Cards.removeAllCards();

          // Push the message list card
          Cards.pushCard(
            'message_list', 'nonsearch', 'immediate',
            {
              folder: inboxFolder,
              cacheableFolderId: account === acctsSlice.defaultAccount ?
                                 inboxFolder.id : null,
              waitForData: initialCardInsertion,
              onPushed: function() {
                // Add navigation, but before the message list.
                Cards.pushCard(
                  'folder_picker', 'navigation', 'none',
                  {
                    acctsSlice: acctsSlice,
                    curAccount: account,
                    foldersSlice: foldersSlice,
                    curFolder: inboxFolder,
                    onPushed: function() {
                      hasCardsPushed = true;

                      if (activityCallback) {
                        activityCallback();
                        activityCallback = null;
                      }
                    }
                  },
                  // Place to left of message list
                  'left');
              }
            });

          initialCardInsertion = false;
        };
      } else {
        if (acctsSlice)
          acctsSlice.die();

        // - no accounts, show the setup page!
        if (!Cards.hasCard(['setup_account_info', 'default'])) {
          if (activityCallback) {
            // Clear out activity callback, but do it
            // before calling activityCallback, in
            // case that code then needs to set a delayed
            // activityCallback for later.
            var activityCb = activityCallback;
            activityCallback = null;
            var result = activityCb();
            if (!result)
              return;
          }

          if (initialCardInsertion) {
            initialCardInsertion = false;
          } else {
            Cards.removeAllCards();
          }

          Cards.pushCard(
            'setup_account_info', 'default', 'immediate',
            {
              allowBack: false,
              onPushed: function(impl) {
                hasCardsPushed = true;
                htmlCache.delayedSaveFromNode(impl.domNode.cloneNode(true));
              }
            });
        }
      }
    };
  }
};

try {
  Cards._init();
  App._init();
  App.showMessageViewOrSetup();
}
catch (ex) {
  console.error('Problem initializing', ex, '\n', ex.stack);
}

if ('mozSetMessageHandler' in window.navigator) {
  window.navigator.mozSetMessageHandler('activity',
                                        function actHandle(activity) {
    var activityName = activity.source.name;
    // To assist in bug analysis, log the start of the activity here.
    console.log('activity!', activityName);
    if (activityName === 'share') {
      var attachmentBlobs = activity.source.data.blobs,
          attachmentNames = activity.source.data.filenames;
    }
    else if (activityName === 'new' ||
             activityName === 'view') {
      // new uses URI, view uses url
      var parts = queryURI(activity.source.data.url ||
                           activity.source.data.URI);
      var to = parts[0];
      var subject = parts[1];
      var body = parts[2];
      var cc = parts[3];
      var bcc = parts[4];
    }
    var sendMail = function actHandleMail() {
      var folderToUse;
      try {
        folderToUse = Cards._cardStack[Cards
          ._findCard(['folder_picker', 'navigation'])].cardImpl.curFolder;
      } catch (e) {
        console.log('no navigation found:', e);
        var req = confirm(mozL10n.get('setup-empty-account-prompt'));
        if (!req) {
          // We want to do the right thing, but currently this won't even dump
          // us in the home-screen app.  This is because our activity has
          // disposition: window rather than inline.
          activity.postError('cancelled');
          // So our workaround is to close our window.
          window.close();
          return false;
        }
        activityCallback = sendMail;
        return true;
      }
      var composer = MailAPI.beginMessageComposition(
        null, folderToUse, null,
        function() {
          /* to/cc/bcc/subject/body all have default values that shouldn't be
          clobbered if they are not specified in the URI*/
          if (to)
            composer.to = to;
          if (subject)
            composer.subject = subject;
          if (body && typeof body === 'string')
            composer.body = { text: body };
          if (cc)
            composer.cc = cc;
          if (bcc)
            composer.bcc = bcc;
          if (attachmentBlobs) {
            for (var iBlob = 0; iBlob < attachmentBlobs.length; iBlob++) {
              composer.addAttachment({
                name: attachmentNames[iBlob],
                blob: attachmentBlobs[iBlob]
              });
            }
          }
          Cards.pushCard('compose',
            'default', 'immediate', { composer: composer,
            activity: activity });
        });
    };

    if (hasCardsPushed) {
      console.log('activity', activityName, 'triggering compose now');
      sendMail();
    } else {
      console.log('activity', activityName, 'waiting for callback');
      activityCallback = sendMail;
    }
  });
}
else {
  console.warn('Activity support disabled!');
}

return App;

});

// Run the app module, bring in fancy logging
requirejs(['console_hook', 'mail_app']);
