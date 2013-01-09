//
// Given a youtube URL, get the URL of a downloadble version of the
// video in a size and format that we can play, and pass that URL and
// the video title to the successCallback.  If youtube won't allow us
// to play the video for copyright reasons, pass an error message to
// errorCallback instead. Hopefully, youtube will have localized the
// error message for us.  We also call the error callback if anything
// else goes wrong (HTTP error, video not available in a format we can
// play) but in that case, we don't pass a message because it is not
// something that we can localize
//
function getYoutubeVideo(url, successCallback, errorCallback) {
  // The url argument comes to us from the chrome code in
  // b2g/components/YoutubeProtocolHandler.js (via the activities code in
  // b2g/chrome/content/shell.js). The URL will look something like this:
  // vnd.youtube:///iNuKL2Gy_QM?vndapp=youtube_mobile&vndclient=mv-google&...
  // Note that there is no hostname. We ignore the query parameters, and
  // only care about the pathname which is the Youtube ID of the video
  // we want to play
  var videoId = url.slice(15, url.indexOf('?'));
  var query = 'http://www.youtube.com/get_video_info?&video_id=' + videoId;

  var request = new XMLHttpRequest();
  request.open('GET', query);
  request.onerror = function() {
    console.error('error while querying', query);
    errorCallback();
  };
  request.onload = function() {
    if (request.status !== 200) {
      console.error('Youtube query return status', request.status, query);
      errorCallback();
      return;
    }

    try {
      var info = parseYoutubeVideoInfo(request.responseText);
    }
    catch (e) {
      console.error('error parsing youtube query response:', e);
      errorCallback();
      return;
    }

    // If there was an error, display the message that youtube sent.
    // This happens when a video can't be played for copyright reasons.
    // Hopefully the message will be localized.
    if (info.errorcode) {
      errorCallback(info.reason);
      return;
    }

    // Finally, if everything worked, pass the url and title to the callback
    successCallback(info.url, info.title);
  };
  request.send();

  //
  // Parse the response from a youtube get_video_info query.
  //
  // If youtube's response is a failure, this function returns an object
  // with status, errorcode, type and reason properties. Otherwise, it returns
  // an object with status, url, and type properties, and optional
  // title, poster, and duration properties.
  //
  function parseYoutubeVideoInfo(response) {
    // Splits parameters in a query string.
    function extractParameters(q) {
      var params = q.split('&');
      var result = {};
      for (var i = 0, n = params.length; i < n; i++) {
        var param = params[i];
        var pos = param.indexOf('=');
        if (pos === -1)
          continue;
        var name = param.substring(0, pos);
        var value = param.substring(pos + 1);
        result[name] = decodeURIComponent(value);
      }
      return result;
    }

    var params = extractParameters(response);

    // If the request failed, return an object with an error code
    // and an error message
    if (params.status === 'fail') {
      //
      // Hopefully this error message will be properly localized.
      // Do we need to add any parameters to the XMLHttpRequest to
      // specify the language we want?
      //
      // Note that we include fake type and url properties in the returned
      // object. This is because we still need to trigger the video app's
      // view activity handler to display the error message from youtube,
      // and those parameters are required.
      //
      return {
        status: params.status,
        errorcode: params.errorcode,
        reason: (params.reason || '').replace(/\+/g, ' ')
      };
    }

    // Otherwise, the query was successful
    var result = {
      status: params.status
    };

    // Now parse the available streams
    var streamsText = params.url_encoded_fmt_stream_map;
    if (!streamsText)
      throw Error('No url_encoded_fmt_stream_map parameter');
    var streams = streamsText.split(',');
    for (var i = 0, n = streams.length; i < n; i++) {
      streams[i] = extractParameters(streams[i]);
    }

    // This is the list of youtube video formats, ordered from worst
    // (but playable) to best.  These numbers are values used as the
    // itag parameter of each stream description. See
    // https://en.wikipedia.org/wiki/YouTube#Quality_and_codecs
    //
    // XXX
    // Format 18 is H.264, which we can play on the phone, but probably
    // not on desktop. When this code was all in chrome, we used an #ifdef
    // for to enable H.264 for Gonk only. If we still need to do that, then
    // we can modify YoutubeProtocolHandler.js to send an allow_h264 flag
    // along with the url and type and then honor that flag here.
    // The inclusion of H264 might not break b2g desktop anyway; on that
    // platform, viewing youtube seems to launch an external Quicktime
    // viewer or something.
    //
    var formats = [
      '17', // 144p 3GP
      '36', // 240p 3GP
      '43', // 360p WebM
      '18' // 360p H.264
    ];

    // Sort the array of stream descriptions in order of format
    // preference, so that the first item is the most preferred one
    streams.sort(function(a, b) {
      var x = a.itag ? formats.indexOf(a.itag) : -1;
      var y = b.itag ? formats.indexOf(b.itag) : -1;
      return y - x;
    });

    var bestStream = streams[0];

    // If the best stream is a format we don't support give up.
    if (formats.indexOf(bestStream.itag) === -1)
      throw Error('No supported video formats');

    result.url = bestStream.url + '&signature=' + (bestStream.sig || '');
    result.type = bestStream.type;
    // Strip codec information off of the mime type
    if (result.type && result.type.indexOf(';') !== -1) {
      result.type = result.type.split(';', 1)[0];
    }

    if (params.title) {
      result.title = params.title.replace(/\+/g, ' ');
    }
    if (params.length_seconds) {
      result.duration = params.length_seconds;
    }
    if (params.thumbnail_url) {
      result.poster = params.thumbnail_url;
    }

    return result;
  }

}


