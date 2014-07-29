/**
 * Application logic that isn't specific to cards, specifically entailing
 * startup and eventually notifications.
 **/
/*jshint browser: true */
/*global define, requirejs, console, TestUrlResolver */
'use strict';

// Set up loading of scripts, but only if not in tests, which set up
// their own config.
if (typeof TestUrlResolver === 'undefined') {
  requirejs.config({
    // waitSeconds is set to the default here; the build step rewrites
    // it to 0 in build/email.build.js so that we never timeout waiting
    // for modules in production. This is important when the device is
    // under super-low-memory stress, as it may take a while for the
    // device to get around to loading things email for background tasks
    // like periodic sync.
    waitSeconds: 7,
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
      },

      'shared/js/notification_helper': {
        exports: 'NotificationHelper'
      },

      'shared/js/accessibility_helper': {
        exports: 'AccessibilityHelper'
      }
    },
    definePrim: 'prim'
  });
}

// Tell audio channel manager that we want to adjust the notification
// channel if the user press the volumeup/volumedown buttons in Email.
if (navigator.mozAudioChannelManager) {
  navigator.mozAudioChannelManager.volumeControlChannel = 'notification';
}

// Named module, so it is the same before and after build, and referenced
// in the require at the end of this file.
define('mail_app', function(require, exports, module) {

var appMessages = require('app_messages'),
    htmlCache = require('html_cache'),
    mozL10n = require('l10n!'),
    common = require('mail_common'),
    evt = require('evt'),
    model = require('model'),
    headerCursor = require('header_cursor').cursor,
    Cards = common.Cards,
    slice = Array.prototype.slice,
    waitingForCreateAccountPrompt = false,
    activityCallback = null;

require('shared/js/font_size_utils');
require('metrics');
require('sync');
require('wake_locks');

model.latestOnce('api', function(api) {
  // If our password is bad, we need to pop up a card to ask for the updated
  // password.
  api.onbadlogin = function(account, problem, whichSide) {
    switch (problem) {
      case 'bad-user-or-pass':
        Cards.pushCard('setup_fix_password', 'default', 'animate',
                  { account: account,
                    whichSide: whichSide,
                    restoreCard: Cards.activeCardIndex },
                  'right');
        break;
      case 'imap-disabled':
      case 'pop3-disabled':
        Cards.pushCard('setup_fix_gmail', 'default', 'animate',
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

  api.useLocalizedStrings({
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
      outbox: mozL10n.get('folder-outbox'),
      sent: mozL10n.get('folder-sent'),
      drafts: mozL10n.get('folder-drafts'),
      trash: mozL10n.get('folder-trash'),
      queue: mozL10n.get('folder-queue'),
      junk: mozL10n.get('folder-junk'),
      archives: mozL10n.get('folder-archives'),
      localdrafts: mozL10n.get('folder-localdrafts')
    }
  });
});

// Handle cases where a default card is needed for back navigation
// after a non-default entry point (like an activity) is triggered.
Cards.pushDefaultCard = function(onPushed) {
  model.latestOnce('foldersSlice', function() {
    Cards.pushCard('message_list', 'nonsearch', 'none', {
      onPushed: onPushed
    },
    // Default to "before" placement.
    'left');
  });
};

Cards._init();

var finalCardStateCallback,
    waitForAppMessage = false,
    startedInBackground = false,
    cachedNode = Cards._cardsNode.children[0],
    startCardId = cachedNode && cachedNode.getAttribute('data-type');

function getStartCardArgs(id) {
  // Use a function that returns fresh arrays for each call so that object
  // in that last array position is fresh for each call and does not have other
  // properties mixed in to it by multiple reuse of the same object
  // (bug 1031588).
  if (id === 'setup_account_info') {
    return [
      'setup_account_info', 'default', 'immediate',
      {
        onPushed: function(impl) {
          htmlCache.delayedSaveFromNode(impl.domNode.cloneNode(true));
        }
      }
    ];
  } else if (id === 'message_list') {
    return [
      'message_list', 'nonsearch', 'immediate', {}
    ];
  }
}

function pushStartCard(id, addedArgs) {
  var args = getStartCardArgs(id);
  if (!args) {
    throw new Error('Invalid start card: ' + id);
  }

  //Add in cached node to use (could be null)
  args[3].cachedNode = cachedNode;

  // Mix in addedArgs to the args object that is passed to pushCard.
  if (addedArgs) {
    Object.keys(addedArgs).forEach(function(key) {
      args[3][key] = addedArgs[key];
    });
  }

  return Cards.pushCard.apply(Cards, args);
}

if (appMessages.hasPending('activity') ||
    appMessages.hasPending('notification')) {
  // There is an activity, do not use the cache node, start fresh,
  // and block normal first card selection, wait for activity.
  cachedNode = null;
  waitForAppMessage = true;
}

if (appMessages.hasPending('alarm')) {
  // There is an alarm, do not use the cache node, start fresh,
  // as we were woken up just for the alarm.
  cachedNode = null;
  startedInBackground = true;
}

// If still have a cached node, then show it.
if (cachedNode) {
  // l10n may not see this as it was injected before l10n.js was loaded,
  // so let it know it needs to translate it.
  mozL10n.translateFragment(cachedNode);

  // Wire up a card implementation to the cached node.
  if (startCardId) {
    pushStartCard(startCardId);
  } else {
    cachedNode = null;
  }
}

/**
 * When determination of real start state is known after
 * getting data, then make sure the correct card is
 * shown. If the card used from cache is not correct,
 * wipe out the cards and start fresh.
 * @param  {String} cardId the desired card ID.
 */
function resetCards(cardId, args) {
  cachedNode = null;

  var startArgs = getStartCardArgs(cardId),
      query = [startArgs[0], startArgs[1]];

  if (!Cards.hasCard(query)) {
    Cards.removeAllCards();
    pushStartCard(cardId, args);
  }
}

/*
 * Determines if current card is a nonsearch message_list
 * card, which is the default kind of card.
 */
function isCurrentCardMessageList() {
  var cardType = Cards.getCurrentCardType();
  return (cardType &&
          cardType[0] === 'message_list' &&
          cardType[1] === 'nonsearch');
}

/**
 * Tracks what final card state should be shown. If the
 * app started up hidden for a cronsync, do not actually
 * show the UI until the app becomes visible, so that
 * extra work can be avoided for the hidden cronsync case.
 */
function showFinalCardState(fn) {
  if (startedInBackground && document.hidden) {
    finalCardStateCallback = fn;
  } else {
    fn();
  }
}

/**
 * Shows the message list. Assumes that the correct
 * account and inbox have already been selected.
 */
function showMessageList(args) {
  showFinalCardState(function() {
    resetCards('message_list', args);
  });
}

// Handles visibility changes: if the app becomes visible
// being hidden via a cronsync startup, trigger UI creation.
document.addEventListener('visibilitychange', function onVisibilityChange() {
  if (startedInBackground && finalCardStateCallback && !document.hidden) {
    finalCardStateCallback();
    finalCardStateCallback = null;
  }
}, false);

// Some event modifications during setup do not have full account
// IDs. This listener catches those modifications and applies
// them when the data is available.
evt.on('accountModified', function(accountId, data) {
  model.latestOnce('acctsSlice', function() {
    var account = model.getAccount(accountId);
    if (account) {
      account.modifyAccount(data);
    }
  });
});

// The add account UI flow is requested.
evt.on('addAccount', function() {
  Cards.removeAllCards();

  // Show the first setup card again.
  pushStartCard('setup_account_info', {
    allowBack: true
  });
});

function resetApp() {
  // Clear any existing local state and reset UI/model state.
  waitForAppMessage = false;
  waitingForCreateAccountPrompt = false;
  activityCallback = null;

  Cards.removeAllCards();
  model.init();
}

function activityContinued() {
  if (activityCallback) {
    var activityCb = activityCallback;
    activityCallback = null;
    activityCb();
    return true;
  }
  return false;
}

// An account was deleted. Burn it all to the ground and
// rise like a phoenix. Prefer a UI event vs. a slice
// listen to give flexibility about UI construction:
// an acctsSlice splice change may not warrant removing
// all the cards.
evt.on('accountDeleted', resetApp);
evt.on('resetApp', resetApp);

// A request to show the latest account in the UI.
// Usually triggered after an account has been added.
evt.on('showLatestAccount', function() {
  Cards.removeAllCards();

  model.latestOnce('acctsSlice', function(acctsSlice) {
    var account = acctsSlice.items[acctsSlice.items.length - 1];

    model.changeAccount(account, function() {
      pushStartCard('message_list', {
        // If waiting to complete an activity, do so after pushing the
        // message list card.
        onPushed: activityContinued
      });
    });
  });
});

model.on('acctsSlice', function() {
  if (!model.hasAccount()) {
    if (!waitingForCreateAccountPrompt) {
      resetCards('setup_account_info');
    }
  } else {
    model.latestOnce('foldersSlice', function() {
      if (waitForAppMessage) {
        return;
      }

      // If an activity was waiting for an account, trigger it now.
      if (activityContinued()) {
        return;
      }

      showMessageList();
    });
  }
});

// Rate limit rapid fire entries, like an accidental double tap. While the card
// code adjusts for the taps, in the case of configured account, user can end up
// with multiple compose or reader cards in the stack, which is probably
// confusing, and the rapid tapping is likely just an accident, or an incorrect
// user belief that double taps are needed for activation.
// Using one entry time tracker across all gate entries since ideally we do not
// want to handle a second fast action regardless of source. We want the first
// one to have a chance of getting a bit further along. If this becomes an issue
// though, the closure created inside getEntry could track a unique time for
// each gateEntry use.
var lastEntryTime = 0;
function gateEntry(fn) {
  return function() {
    var entryTime = Date.now();
    // Only one entry per second.
    if (entryTime < lastEntryTime + 1000) {
      console.log('email entry gate blocked fast repeated action');
      return;
    }
    lastEntryTime = entryTime;

    return fn.apply(null, slice.call(arguments));
  };
}

appMessages.on('activity', gateEntry(function(type, data, rawActivity) {
  function initComposer() {
    Cards.pushCard('compose', 'default', 'immediate', {
      activity: rawActivity,
      composerData: {
        onComposer: function(composer, composeCard) {
          var attachmentBlobs = data.attachmentBlobs;
          /* to/cc/bcc/subject/body all have default values that shouldn't
          be clobbered if they are not specified in the URI*/
          if (data.to) {
            composer.to = data.to;
          }
          if (data.subject) {
            composer.subject = data.subject;
          }
          if (data.body) {
            composer.body = { text: data.body };
          }
          if (data.cc) {
            composer.cc = data.cc;
          }
          if (data.bcc) {
            composer.bcc = data.bcc;
          }
          if (attachmentBlobs) {
            var attachmentsToAdd = [];
            for (var iBlob = 0; iBlob < attachmentBlobs.length; iBlob++) {
              attachmentsToAdd.push({
                name: data.attachmentNames[iBlob],
                blob: attachmentBlobs[iBlob]
              });
            }
            composeCard.addAttachmentsSubjectToSizeLimits(attachmentsToAdd);
          }
        }
      }
    });
  }

  function promptEmptyAccount() {
    common.ConfirmDialog.show(mozL10n.get('setup-empty-account-prompt'),
    function(confirmed) {
      if (!confirmed) {
        rawActivity.postError('cancelled');
      }

      waitingForCreateAccountPrompt = false;

      // No longer need to wait for the activity to complete, it needs
      // normal card flow
      waitForAppMessage = false;

      activityCallback = initComposer;

      // Always just reset to setup account in case the system does
      // not properly close out the email app on a cancelled activity.
      resetCards('setup_account_info');
    });
  }

  // Remove previous cards because the card stack could get
  // weird if inserting a new card that would not normally be
  // at that stack level. Primary concern: going to settings,
  // then trying to add a compose card at that stack level.
  // More importantly, the added card could have a "back"
  // operation that does not mean "back to previous state",
  // but "back in application flowchart". Message list is a
  // good known jump point, so do not needlessly wipe that one
  // out if it is the current one. Message list is a good
  // known jump point, so do not needlessly wipe that one out
  // if it is the current one.
  if (!isCurrentCardMessageList()) {
    Cards.removeAllCards();
  }

  if (model.inited) {
    if (model.hasAccount()) {
      initComposer();
    } else {
      waitingForCreateAccountPrompt = true;
      promptEmptyAccount();
    }
  } else {
    // Be optimistic and start rendering compose as soon as possible
    // In the edge case that email is not configured, then the empty
    // account prompt will be triggered quickly in the next section.
    initComposer();

    waitingForCreateAccountPrompt = true;
    model.latestOnce('acctsSlice', function activityOnAccount() {
      if (!model.hasAccount()) {
        promptEmptyAccount();
      }
    });
  }
}));

appMessages.on('notification', gateEntry(function(data) {
  data = data || {};
  var type = data.type || '';
  var folderType = data.folderType || 'inbox';

  model.latestOnce('foldersSlice', function latestFolderSlice() {
    function onCorrectFolder() {
      function onPushed() {
        waitForAppMessage = false;
      }

      // Remove previous cards because the card stack could get
      // weird if inserting a new card that would not normally be
      // at that stack level. Primary concern: going to settings,
      // then trying to add a reader or message list card at that
      // stack level. More importantly, the added card could have
      // a "back" operation that does not mean "back to previous
      // state", but "back in application flowchart". Message
      // list is a good known jump point, so do not needlessly
      // wipe that one out if it is the current one.
      if (!isCurrentCardMessageList()) {
        Cards.removeAllCards();
      }

      if (type === 'message_list') {
        showMessageList({
          onPushed: onPushed
        });
      } else if (type === 'message_reader') {
        headerCursor.setCurrentMessageBySuid(data.messageSuid);

        Cards.pushCard(type, 'default', 'immediate', {
            messageSuid: data.messageSuid,
            onPushed: onPushed
        });
      } else {
        console.error('unhandled notification type: ' + type);
      }
    }

    var acctsSlice = model.acctsSlice,
        accountId = data.accountId;

    if (model.account.id === accountId) {
      // folderType will often be 'inbox' (in the case of a new message
      // notification) or 'outbox' (in the case of a "failed send"
      // notification).
      return model.selectFirstFolderWithType(folderType, onCorrectFolder);
    } else {
      var newAccount;
      acctsSlice.items.some(function(account) {
        if (account.id === accountId) {
          newAccount = account;
          return true;
        }
      });

      if (newAccount) {
        model.changeAccount(newAccount, function() {
          model.selectFirstFolderWithType(folderType, onCorrectFolder);
        });
      }
    }
  });
}));

model.init();
});

// Run the app module, bring in fancy logging
requirejs(['console_hook', 'cards/message_list', 'mail_app']);
