/**
 * This file implements a function which performs a
 * a streaming search of a folder to determine the count of
 * headers which match a particular filter.
 */


define(
  [
    'module',
    'exports'
  ],
  function(
    $module,
    exports) {


exports.countHeaders = function(storage, filter, options, callback) {

  var fetchClobber = null;
  if (typeof options === "function") {
    callback = options;
  } else {
    fetchClobber = options.fetchSize;
  }
  var matched = 0;

  // Relatively arbitrary value, but makes sure we don't use too much
  // memory while streaming
  var fetchSize = fetchClobber || 100;
  var startTS = null;
  var startUID = null;

  function gotMessages(dir, callback, headers, moreMessagesComing) {
    // conditionally indent messages that are non-notable callbacks since we
    // have more messages coming.  sanity measure for asuth for now.
    var logPrefix = moreMessagesComing ? 'sf: ' : 'sf:';
    console.log(logPrefix, 'gotMessages', headers.length, 'more coming?',
                moreMessagesComing);
    // update the range of what we have seen and searched
    if (headers.length) {
        var lastHeader = headers[headers.length - 1];
        startTS = lastHeader.date;
        startUID = lastHeader.id;
    }

    var checkHandle = function checkHandle(headers) {
      // Update the matched count
      for (var i = 0; i < headers.length; i++) {
        var header = headers[i];
        var isMatch = filter(header);
        if (isMatch) {
          matched++;
        }
      }

      var atBottom = storage.headerIsOldestKnown(
                        startTS, startUID);
      var canGetMore = !atBottom,
          wantMore = !moreMessagesComing && canGetMore;

      if (wantMore) {
        console.log(logPrefix, 'requesting more because want more');
        getNewMessages(dir, false, true, callback);
      } else if (!moreMessagesComing) {
        callback(matched);
      }

      // (otherwise we need to wait for the additional messages to show before
      //  doing anything conclusive)
    };

    checkHandle(headers);
  }


  function getNewMessages (dirMagnitude, userRequestsGrowth, autoDoNotDesireMore,
    callback) {

    storage.flushExcessCachedBlocks('countHeaders');

    storage.getMessagesBeforeMessage(startTS, startUID,
        fetchSize, gotMessages.bind(null, 1, callback));

  }

  storage.getMessagesInImapDateRange(
    0, null, fetchSize, fetchSize,
    gotMessages.bind(null, 1, callback));

};

}); // end define
