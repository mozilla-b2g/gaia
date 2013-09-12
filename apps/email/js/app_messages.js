/*jshint browser: true */
/*global define, console */
define(function(require) {

var appSelf = require('app_self'),
    evt = require('evt'),
    queryURI = require('query_uri'),
    queryString = require('query_string'),
    appMessages = evt.mix({}),
    pending = {},
    lastNotifyId = 0,
    // htmlCacheRestorePendingMessage defined in html_cache_restore,
    // see comment for it.
    cachedList = (window.htmlCacheRestorePendingMessage &&
              window.htmlCacheRestorePendingMessage.length) ?
              window.htmlCacheRestorePendingMessage : [];

// Convert the cached list to named properties on pending.
cachedList.forEach(function(type) {
  pending[type] = true;
});

appMessages.hasPending = function(type) {
  return pending.hasOwnProperty(type) || (navigator.mozHasPendingMessage &&
                                          navigator.mozHasPendingMessage(type));
};

function onNotification(msg) {

  console.log('email got notification: ' + JSON.stringify(msg, null, '  '));

  // icon url parsing is a cray cray way to pass day day
  var data = queryString.toObject((msg.imageURL || '').split('#')[1]);

  // Do not handle duplicate notifications. May be a bug in the
  // notifications system.
  if (data.notifyId && data.notifyId === lastNotifyId)
    return;
  lastNotifyId = data.notifyId;

  console.log('dispatching notification');

  if (document.hidden) {
    appSelf.latest('self', function(app) {
        app.launch();
    });
  }
  appMessages.emitWhenListener('notification', data);
}

if ('mozSetMessageHandler' in navigator) {
  navigator.mozSetMessageHandler('activity', function onActivity(message) {
    var activityName = message.source.name,
        attachmentBlobs = message.source.data.blobs,
        attachmentNames = message.source.data.filenames,
        url = message.source.data.url || message.source.data.URI,
        urlParts = url ? queryURI(url) : [];

    // To assist in bug analysis, log the start of the activity here.
    console.log('activity!', activityName);

    var composeData = {
      to: urlParts[0],
      subject: urlParts[1],
      body: typeof urlParts[2] === 'string' ? urlParts[2] : null,
      cc: urlParts[3],
      bcc: urlParts[4],
      attachmentBlobs: attachmentBlobs,
      attachmentNames: attachmentNames
    };

    appMessages.emitWhenListener('activity',
                                 activityName, composeData, message);
  });

  // Notifications can come from outside the app via the system,
  // by calling the mozSetMessageHandler listener. That happens
  // if the app is closed. If the app is open, then the app has
  // to listen for the onclick on the notification, and a
  // synthetic "event" is triggered via evt.
  navigator.mozSetMessageHandler('notification', onNotification);
  evt.on('notification', onNotification);

  // Do not listen for navigator.mozSetMessageHandler('alarm') type, that is
  // only done in the back end's cronsync for now.
}
else {
  console.warn('Activity support disabled!');
}

return appMessages;

});
