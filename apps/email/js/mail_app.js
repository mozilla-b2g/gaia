/**
 * Application logic that isn't specific to cards, specifically entailing
 * startup and mozSetMessageHandler message listening.
 **/
 /*global globalOnAppMessage */
'use strict';

define(function(require, exports, module) {

var mozL10n = require('l10n!'),
    activityComposerData = require('activity_composer_data'),
    cards = require('cards'),
    evt = require('evt'),
    model = require('model'),
    headerCursor = require('header_cursor').cursor,
    htmlCache = require('html_cache'),
    waitingRawActivity, activityCallback;

require('shared/js/font_size_utils');
require('metrics');
require('wake_locks');

var started = false;

function pushStartCard(id, addedArgs) {
  var args = {};

  // Mix in addedArgs to the args object that is passed to pushCard. Use a new
  // object in case addedArgs is reused again by the caller.
  if (addedArgs) {
    Object.keys(addedArgs).forEach(function(key) {
      args[key] = addedArgs[key];
    });
  }

  if (!started) {
    var cachedNode = cards._cardsNode.children[0];

    // Add in cached node to use, if it matches the ID type.
    if (cachedNode && id === htmlCache.nodeToKey(cachedNode)) {
      // l10n may not see this as it was injected before l10n.js was loaded,
      // so let it know it needs to translate it.
      mozL10n.translateFragment(cachedNode);
      args.cachedNode = cachedNode;
    }

    //Set body class to a solid background, see bug 1077605.
    document.body.classList.add('content-visible');
  }

  cards.pushCard(id, 'immediate', args);

  started = true;
}

// Handles visibility changes: if the app becomes visible after starting up
// hidden because of a request-sync, start showing some UI.
document.addEventListener('visibilitychange', function onVisibilityChange() {
  if (!document.hidden && !started) {
    pushStartCard('message_list');
  }
}, false);

/*
 * Determines if current card is a nonsearch message_list
 * card, which is the default kind of card.
 */
function isCurrentCardMessageList() {
  var cardType = cards.getCurrentCardType();
  return (cardType && cardType === 'message_list');
}


// The add account UI flow is requested.
evt.on('addAccount', function() {
  cards.removeAllCards();

  // Show the first setup card again.
  pushStartCard('setup_account_info', {
    allowBack: true
  });
});

function resetApp() {
  // Clear any existing local state and reset UI/model state.
  activityCallback = waitingRawActivity = undefined;
  cards.removeAllCards();

  model.init(false, function() {
    var cardId = model.hasAccount() ?
                 'message_list' : 'setup_account_info';
    pushStartCard(cardId);
  });
}

// An account was deleted. Burn it all to the ground and rise like a phoenix.
// Prefer a UI event vs. a slice listen to give flexibility about UI
// construction: an acctsSlice splice change may not warrant removing all the
// cards.
evt.on('accountDeleted', resetApp);
evt.on('resetApp', resetApp);

// Called when account creation canceled, most likely from setup_account_info.
// Need to complete the activity postError flow if an activity is waiting, then
// update the UI to the latest state.
evt.on('setupAccountCanceled', function(fromCard) {
  if (waitingRawActivity) {
    waitingRawActivity.postError('cancelled');
  }

  if (!model.foldersSlice) {
    // No account has been formally initialized, but one likely exists given
    // that this back button should only be available for cases that have
    // accounts. Likely just need the app to reset to load model.
    evt.emit('resetApp');
  } else {
    cards.removeCardAndSuccessors(fromCard, 'animate', 1);
  }
});

// A request to show the latest account in the UI. Usually triggered after an
// account has been added.
evt.on('showLatestAccount', function() {
  cards.removeAllCards();

  model.latestOnce('acctsSlice', function(acctsSlice) {
    var account = acctsSlice.items[acctsSlice.items.length - 1];

    model.changeAccount(account, function() {
      pushStartCard('message_list', {
        // If waiting to complete an activity, do so after pushing the message
        // list card.
        onPushed: function() {
          if (activityCallback) {
            var activityCb = activityCallback;
            activityCallback = null;
            activityCb();
            return true;
          }
          return false;
        }
      });
    });
  });
});

evt.on('apiBadLogin', function(account, problem, whichSide) {
  switch (problem) {
    case 'bad-user-or-pass':
      cards.pushCard('setup_fix_password', 'animate',
                { account: account,
                  whichSide: whichSide,
                  restoreCard: cards.activeCardIndex },
                'right');
      break;
    case 'imap-disabled':
    case 'pop3-disabled':
      cards.pushCard('setup_fix_gmail', 'animate',
                { account: account, restoreCard: cards.activeCardIndex },
                'right');
      break;
    case 'needs-app-pass':
      cards.pushCard('setup_fix_gmail_twofactor', 'animate',
                { account: account, restoreCard: cards.activeCardIndex },
                'right');
      break;
    case 'needs-oauth-reauth':
      cards.pushCard('setup_fix_oauth2', 'animate',
                { account: account, restoreCard: cards.activeCardIndex },
                'right');
      break;
  }
});

// Start init of main view/model modules now that all the registrations for
// top level events have happened, and before triggering of entry points start.
cards.init();
// If config could have already started up the model if there was no cache set
// up, so only trigger init if it is not already started up, for efficiency.
if (!model.inited) {
  model.init();
}

/**
 * Register setMozMessageHandler listeners with the plumbing set up in
 * html_cache_restore
 */
var startupData = globalOnAppMessage({
  activity: function(rawActivity) {
    // Remove previous cards because the card stack could get weird if inserting
    // a new card that would not normally be at that stack level. Primary
    // concern: going to settings, then trying to add a compose card at that
    // stack level. More importantly, the added card could have a "back"
    // operation that does not mean "back to previous state", but "back in
    // application flowchart". Message list is a good known jump point, so do
    // not needlessly wipe that one out if it is the current one.
    if (!isCurrentCardMessageList()) {
      cards.removeAllCards();
    }

    function activityCompose() {
      var cardArgs = {
        activity: rawActivity,
        composerData: activityComposerData(rawActivity)
      };

      pushStartCard('compose', cardArgs);
    }

    if (globalOnAppMessage.hasAccount()) {
      activityCompose();
    } else {
      activityCallback = activityCompose;
      waitingRawActivity = rawActivity;
      pushStartCard('setup_account_info', {
        allowBack: true,
        launchedFromActivity: true
      });
    }
  },

  notification: function(data) {
    data = data || {};
    var type = data.type || '';
    var folderType = data.folderType || 'inbox';

    model.latestOnce('foldersSlice', function latestFolderSlice() {
      function onCorrectFolder() {
        // Remove previous cards because the card stack could get weird if
        // inserting a new card that would not normally be at that stack level.
        // Primary concern: going to settings, then trying to add a reader or
        // message list card at that stack level. More importantly, the added
        // card could have a "back" operation that does not mean "back to
        // previous state", but "back in application flowchart". Message list is
        // a good known jump point, so do not needlessly wipe that one out if it
        // is the current one.
        if (!isCurrentCardMessageList()) {
          cards.removeAllCards();
        }

        if (type === 'message_list') {
          pushStartCard('message_list', {});
        } else if (type === 'message_reader') {
          headerCursor.setCurrentMessageBySuid(data.messageSuid);

          pushStartCard(type, {
              messageSuid: data.messageSuid
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
  }
});

console.log('startupData: ' + JSON.stringify(startupData, null, '  '));

// If not a mozSetMessageHandler entry point, start up the UI now. Or, if
// a request-sync started the app, but the app became visible during the
// startup. In that case, make sure we show something to the user.
if (startupData.entry === 'default' ||
   (startupData.entry === 'request-sync' && !document.hidden)) {
  pushStartCard(startupData.view);
}

});
