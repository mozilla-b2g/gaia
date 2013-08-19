/*jshint browser: true */
/*global define, console */
define(function(require) {
  var evt = require('evt'),
      queryURI = require('query_uri');

  var appMessages = evt.mix({
    /**
     * Whether or not we have pending messages.
     *
     * @param {string} type message type.
     * @return {boolean} Whether or there are pending message(s) of the type.
     */
    hasPending: function(type) {
      // htmlCacheRestoreDetectedActivity defined in html_cache_restore,
      // see comment for it.
      return (type === 'activity' && window.htmlCacheRestoreDetectedActivity) ||
             (navigator.mozHasPendingMessage &&
              navigator.mozHasPendingMessage(type));
    }
  });

  /**
   * Perform requested activity.
   *
   * @param {MozActivityRequestHandler} req activity invocation.
   */
  function onActivityRequest(req) {
    // Parse the activity request.
    var source = req.source;
    var sourceData = source.data;
    var activityName = source.name,
        attachmentBlobs = sourceData.blobs,
        attachmentNames = sourceData.filenames,
        url = sourceData.url || sourceData.URI,
        urlParts = url ? queryURI(url) : [],
        dataType = sourceData.type;

    // To assist in bug analysis, log the start of the activity here.
    dump('Received activity: ' + activityName);

    if (activityName === 'share' && dataType === 'url') {
      appMessages.emitWhenListener('activity', 'share', {
        body: url
      }, req);

      return;
    }

    appMessages.emitWhenListener('activity', activityName, {
      to: urlParts[0],
      subject: urlParts[1],
      body: typeof urlParts[2] === 'string' ? urlParts[2] : null,
      cc: urlParts[3],
      bcc: urlParts[4],
      attachmentBlobs: attachmentBlobs,
      attachmentNames: attachmentNames
    }, req);
  }

  if ('mozSetMessageHandler' in navigator) {
    navigator.mozSetMessageHandler('activity', onActivityRequest);
  } else {
    console.warn('Activity support disabled!');
  }

  return appMessages;
});
