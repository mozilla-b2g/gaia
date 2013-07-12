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

// Named module, so it is the same before and after build, and referenced
// in the require at the end of this file.
define('mail_app', function(require) {

var htmlCache = require('html_cache'),
    common = require('mail_common'),
    model = require('model'),
    mozL10n = require('l10n!'),
    appMessages = require('app_messages'),
    Cards = common.Cards,
    activityCallback = null;

model.firstRun = function(MailAPI) {
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
};

function makeFolderPickerInit() {
  // Generates default folder picker init for a message_list. Assumes
  // that the model is already populated with the correct data.
  return {
    account: model.account,
    foldersSlice: model.foldersSlice,
    acctsSlice: model.acctsSlice
  };
}

// Handle cases where a default card is needed for back navigation
// after a non-default entry point (like an activity) is triggered.
Cards.pushDefaultCard = function(onPushed) {
  model.latestOnce('foldersSlice', function() {
    Cards.pushCard('message_list', 'nonsearch', 'none', {
      folderPickerInit: makeFolderPickerInit(),
      onPushed: onPushed
    },
    // Default to "before" placement.
    'left');
  });
};

Cards._init();

var waitForActivity = false,
    cachedNode = Cards._cardsNode.children[0],
    startCardId = cachedNode && cachedNode.getAttribute('data-type');

function pushStartCard(id, addedArgs) {
  var startCardArgs = {
    'setup_account_info': [
      'setup_account_info', 'default', 'immediate',
      {
        cachedNode: cachedNode,
        allowBack: false,
        onPushed: function(impl) {
          htmlCache.delayedSaveFromNode(impl.domNode.cloneNode(true));
        }
      }
    ],
    'message_list': [
      'message_list', 'nonsearch', 'immediate',
      {
        cachedNode: cachedNode
      }
    ]
  };

  var args = startCardArgs[id];
  if (!args)
    throw new Error('Invalid start card: ' + id);

  // Mix in addedArgs to the args object that is passed to pushCard.
  if (addedArgs) {
    Object.keys(addedArgs).forEach(function(key) {
      args[3][key] = addedArgs[key];
    });
  }

  return Cards.pushCard.apply(Cards, args);
}

if (appMessages.hasPending('activity')) {
  // There is an activity, do not use the cache node, start fresh,
  // and block normal first card selection, wait for activity.
  cachedNode = null;
  waitForActivity = true;
} else if (cachedNode) {
  // Wire up a card implementation to the cached node.
  if (startCardId) {
    pushStartCard(startCardId);
  } else {
    cachedNode = null;
  }
}

function resetCards(cardId, args) {
  // If this is the second pass through resetCards (so startCardId
  // will be null) as a result of account switches, or if the cached
  // startCardId did not match what was desired, clear the cards
  // and push a new one.
  if (!startCardId || cardId !== startCardId) {
    startCardId = null;
    cachedNode = null;
    Cards.removeAllCards();
    pushStartCard(cardId, args);
    return true;
  }
  return false;
}

model.on('acctsSlice', function() {
  if (!model.hasAccount()) {
    resetCards('setup_account_info');
  }
});

model.on('foldersSlice', function() {
  // If started via an activity, hold off on regular card insertion.
  if (waitForActivity) {
    waitForActivity = false;
    return;
  }

  // If an acctivity was waiting for an account, trigger it now.
  if (activityCallback) {
    var activityCb = activityCallback;
    activityCallback = null;
    return activityCb();
  }

  var args = {
    folderPickerInit: makeFolderPickerInit()
  };

  if (!resetCards('message_list', args)) {
    // There is an exising message_list, so just tell it the data.
    Cards.tellCard(['message_list', 'nonsearch'], args);
  }
});

appMessages.on('activity', function(type, data, rawActivity) {

  function initComposer() {
    Cards.pushCard('compose', 'default', 'immediate', {
      activity: rawActivity,
      composerData: {
        onComposer: function(composer) {
          var attachmentBlobs = data.attachmentBlobs;
          /* to/cc/bcc/subject/body all have default values that shouldn't
          be clobbered if they are not specified in the URI*/
          if (data.to)
            composer.to = data.to;
          if (data.subject)
            composer.subject = data.subject;
          if (data.body)
            composer.body = { text: data.body };
          if (data.cc)
            composer.cc = data.cc;
          if (data.bcc)
            composer.bcc = data.bcc;
          if (attachmentBlobs) {
            for (var iBlob = 0; iBlob < attachmentBlobs.length; iBlob++) {
              composer.addAttachment({
                name: data.attachmentNames[iBlob],
                blob: attachmentBlobs[iBlob]
              });
            }
          }
        }
      }
    });
  }

  function promptEmptyAccount() {
    var req = confirm(mozL10n.get('setup-empty-account-prompt'));
    if (!req) {
      // We want to do the right thing, but currently this won't even dump
      // us in the home-screen app.  This is because our activity has
      // disposition: window rather than inline.
      rawActivity.postError('cancelled');
      // So our workaround is to close our window.
      window.close();
    }

    // No longer need to wait for the activity to complete, it needs
    // normal card flow
    waitForActivity = false;

    activityCallback = initComposer;
  }

  if (model.inited) {
    if (model.hasAccount()) {
      initComposer();
    } else {
      promptEmptyAccount();
    }
  } else {
    // Be optimistic and start rendering compose as soon as possible
    // In the edge case that email is not configured, then the empty
    // account prompt will be triggered quickly in the next section.
    initComposer();

    model.latestOnce('acctsSlice', function activityOnAccount() {
      if (!model.hasAccount()) {
        promptEmptyAccount();
      }
    });
  }
});

model.init();
});

// Run the app module, bring in fancy logging
requirejs(['console_hook', 'cards/message_list', 'mail_app']);
