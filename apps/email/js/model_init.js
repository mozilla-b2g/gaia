'use strict';
define(function(require) {
  return function modelInit(model, api) {
    require('sync')(model, api);

    var evt = require('evt'),
        mozL10n = require('l10n!');

    // If our password is bad, we need to pop up a card to ask for the updated
    // password.
    api.onbadlogin = function(account, problem, whichSide) {
      // Use emitWhenListener here, since the model can be started up before
      // the mail_app and cards infrastructure is available.
      evt.emitWhenListener('apiBadLogin', account, problem, whichSide);
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
  };
});
