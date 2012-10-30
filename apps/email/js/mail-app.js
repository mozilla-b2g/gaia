/**
 * Application logic that isn't specific to cards, specifically entailing
 * startup and eventually notifications.
 **/

var MailAPI = null;

var App = {
  /**
   * Bind any global notifications, relay localizations to the back-end.
   */
  _init: function() {
    // If our password is bad, we need to pop up a card to ask for the updated
    // password.
    MailAPI.onbadlogin = function(account) {
      Cards.pushCard('setup-fix-password', 'default', 'animate',
                     { account: account, restoreCard: Cards.activeCardIndex },
                     'right');
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
      }
    });
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
                                   acctsSlice.items[0];
        var foldersSlice = MailAPI.viewFolders('account', account);
        foldersSlice.oncomplete = function() {
          var inboxFolder = foldersSlice.getFirstFolderWithType('inbox');
          if (!inboxFolder)
            dieOnFatalError('We have an account without an inbox!',
                foldersSlice.items);

          Cards.assertNoCards();

          // Push the navigation cards
          Cards.pushCard(
            'folder-picker', 'navigation', 'none',
            {
              acctsSlice: acctsSlice,
              curAccount: account,
              foldersSlice: foldersSlice,
              curFolder: inboxFolder
            });
          // Push the message list card
          Cards.pushCard(
            'message-list', 'nonsearch', 'immediate',
            {
              folder: inboxFolder
            });
          if (activityCallback) {
            activityCallback();
            activityCallback = null;
          }
        };
      }
      // - no accounts, show the setup page!
      else {
        acctsSlice.die();
        if (activityCallback) {
          var result = activityCallback();
          activityCallback = null;
          if (!result)
            return;
        }
        Cards.assertNoCards();
        Cards.pushCard(
          'setup-pick-service', 'default', 'immediate',
          {
            allowBack: false
          });
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

var queryURI = function _queryURI(uri) {
  function addressesToArray(addresses) {
    if (!addresses)
      return [''];
    addresses = addresses.split(';');
    var addressesArray = addresses.filter(function notEmpty(addr) {
      return addr.trim() != '';
    });
    return addressesArray;
  }
  var mailtoReg = /^mailto:(.*)/i;

  if (uri.match(mailtoReg)) {
    uri = uri.match(mailtoReg)[1];
    var parts = uri.split('?');
    var subjectReg = /(?:^|&)subject=([^\&]*)/i,
    bodyReg = /(?:^|&)body=([^\&]*)/i,
    ccReg = /(?:^|&)cc=([^\&]*)/i,
    bccReg = /(?:^|&)bcc=([^\&]*)/i;
    var to = addressesToArray(decodeURIComponent(parts[0])),
    subject,
    body,
    cc,
    bcc;

    if (parts.length == 2) {
      var data = parts[1];
      if (data.match(subjectReg))
        subject = decodeURIComponent(data.match(subjectReg)[1]);
      if (data.match(bodyReg))
        body = decodeURIComponent(data.match(bodyReg)[1]);
      if (data.match(ccReg))
        cc = addressesToArray(decodeURIComponent(data.match(ccReg)[1]));
      if (parts[1].match(bccReg))
        bcc = addressesToArray(decodeURIComponent(data.match(bccReg)[1]));
    }
      return [to, subject, body, cc, bcc];

  }

};

var activityCallback = null;
if ('mozSetMessageHandler' in window.navigator) {
  window.navigator.mozSetMessageHandler('activity',
                                        function actHandle(activity) {
    var activityName = activity.source.name;
    if (activityName === 'share') {
      var attachmentUrls = activity.source.data.urls,
          attachmentNames = activity.source.data.filenames;
    } else if (activityName === 'new') {
      var [to, subject, body, cc, bcc] = queryURI(activity.source.data.URI);
      if (!to)
        return;
    }
    var sendMail = function actHandleMail() {
      var folderToUse;
      try {
        folderToUse = Cards._cardStack[Cards
          ._findCard(['folder-picker', 'navigation'])].cardImpl.curFolder;
      } catch (e) {
        var req = confirm(mozL10n.get('setup-empty-account-prompt'));
        // TODO: Since we can not switch back to previous app if activity type
        //       is "window", both buttons in confirm dialog will enter
        //       setup page now(or caller app need to control launch by itself).
        //
        if (!req) {
          // TODO: Since dialog is not working under inline mode, we disable the
          //       postError now or it will switch back to previous app every
          //       time while no account.

          // activity.postError('cancelled');
          // return false;
        }
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
          if (body)
            composer.body = body;
          if (cc)
            composer.cc = cc;
          if (bcc)
            composer.bcc = bcc;
          if (attachmentUrls) {
            for (var iUrl = 0; iUrl < attachmentUrls.length; iUrl++) {
              // our data URIs look like:
              // data:image/png;base64,CONTENT
              // 012345        012345678
              var url = attachmentUrls[iUrl],
                  filename = attachmentNames[iUrl],
                  idxSemicolon = url.indexOf(';'),
                  mimeType = url.substring(5, idxSemicolon),
                  imageString = url.substring(idxSemicolon + 8),
                  imageData = window.atob(imageString),
                  imageArr = new Uint8Array(imageData.length);
              for (var i = 0; i < imageData.length; i++) {
                imageArr[i] = imageData.charCodeAt(i);
              }
              var blob = new Blob([imageArr],
                                  { type: mimeType });
              composer.addAttachment({
                name: filename,
                blob: blob
              });
            }
          }
          // TODO: We may need to add attachments here:
          // if (attachments)
          //   composer.attachments = attachments;
          Cards.pushCard('compose',
            'default', 'immediate', { composer: composer,
            activity: (activityName == 'share' ? activity : null) });
          activityLock = false;
        });
    };

    if (document.readyState == 'complete') {
      sendMail();
    } else {
      activityCallback = sendMail;
    }

  });
}
