/*jshint browser: true */
/*global define, console */
define(function(require) {

var appSelf = require('app_self'),
    evt = require('evt'),
    queryURI = require('query_uri'),
    queryString = require('query_string'),
    appMessages = evt.mix({}),
    pending = {},
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

  navigator.mozSetMessageHandler('notification', function(msg) {
    if (!msg.clicked)
      return;

    appSelf.latest('self', function(app) {
      if (document.hidden)
        app.launch();
    });

    console.log('email got notification click: ' + msg);
    console.log(JSON.stringify(msg, null, '  '));

    // icon url parsing is a cray cray way to pass day day
    var data = queryString.toObject((msg.imageURL || '').split('#')[1]);
    appMessages.emitWhenListener('notification', data);
  });

  // Do not listen for navigator.mozSetMessageHandler('alarm') type, that is
  // only done in the back end's cronsync for now.
}
else {
  console.warn('Activity support disabled!');
}

return appMessages;

});
