/*jshint browser: true */
/*global define, console */
define(function(require) {

var evt = require('evt'),
    queryURI = require('query_uri'),
    appMessages = evt.mix({});

appMessages.hasPending = function(type) {
  // htmlCacheRestoreDetectedActivity defined in html_cache_restore,
  // see comment for it.
  return (type === 'activity' && window.htmlCacheRestoreDetectedActivity) ||
         (navigator.mozHasPendingMessage &&
          navigator.mozHasPendingMessage(type));
};

if ('mozSetMessageHandler' in navigator) {
  navigator.mozSetMessageHandler('activity', function actHandle(activity) {
    var activityName = activity.source.name,
        attachmentBlobs = activity.source.data.blobs,
        attachmentNames = activity.source.data.filenames,
        url = activity.source.data.url || activity.source.data.URI,
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
                                 activityName, composeData, activity);
  });
}
else {
  console.warn('Activity support disabled!');
}

return appMessages;

});
