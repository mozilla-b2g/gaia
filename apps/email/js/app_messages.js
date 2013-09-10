/*jshint browser: true */
/*global define, console */
define(function(require) {
  var appSelf = require('app_self'),
      evt = require('evt'),
      queryString = require('query_string'),
      queryURI = require('query_uri');

  var pending = {};
  // htmlCacheRestorePendingMessage defined in html_cache_restore,
  // see comment for it.
  var cachedList = (window.htmlCacheRestorePendingMessage &&
                    window.htmlCacheRestorePendingMessage.length) ?
      window.htmlCacheRestorePendingMessage : [];
  // Convert the cached list to named properties on pending.
  cachedList.forEach(function(type) {
    pending[type] = true;
  });

  var appMessages = evt.mix({
    /**
     * Whether or not we have pending messages.
     *
     * @param {string} type message type.
     * @return {boolean} Whether or there are pending message(s) of the type.
     */
    hasPending: function(type) {
      return pending.hasOwnProperty(type) ||
             (navigator.mozHasPendingMessage &&
              navigator.mozHasPendingMessage(type));
    },

    /**
     * Perform requested activity.
     *
     * @param {MozActivityRequestHandler} req activity invocation.
     */
    onActivityRequest: function(req) {
      // Parse the activity request.
      var source = req.source;
      var sourceData = source.data;
      var activityName = source.name;
      var dataType = sourceData.type;
      var url = sourceData.url || sourceData.URI;

      // To assist in bug analysis, log the start of the activity here.
      console.log('Received activity: ' + activityName);

      var data = {};
      if (dataType === 'url') {
        data.body = url;
      } else {
        var urlParts = url ? queryURI(url) : [];
        data.to = urlParts[0];
        data.subject = urlParts[1];
        data.body = typeof urlParts[2] === 'string' ? urlParts[2] : null;
        data.cc = urlParts[3];
        data.bcc = urlParts[4];
        data.attachmentBlobs = sourceData.blobs;
        data.attachmentNames = sourceData.filenames;
      }

      this.emitWhenListener('activity', activityName, data, req);
    },

    /**
     * TODO: Document and test this!
     */
    onNotificationRequest: function(msg) {
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
    }
  });

  if ('mozSetMessageHandler' in navigator) {
    navigator.mozSetMessageHandler('activity', appMessages.onActivityRequest);
    navigator.mozSetMessageHandler(
      'notification', appMessages.onNotificationRequest);
    // Do not listen for navigator.mozSetMessageHandler('alarm') type, that is
    // only done in the back end's cronsync for now.
  } else {
    console.warn('Activity support disabled!');
  }

  return appMessages;
});
