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
  // we need to load two text from youtube, for vevo videos.
  var videoInfoText;
  var videoPageText;

  // helper function to download content, if page is true, loads responseText to
  // videoPageText, otherwise to videoInfoText.
  function downloadContent(url, page) {
    var request = new XMLHttpRequest({ mozSystem: true, mozAnon: true });
    request.open('GET', url);
    request.onload = function _onload() {
      if (request.status !== 200) {
        console.error('Youtube query return status', request.status, query);
        errorCallback();
        return;
      }
      if (page) {
        videoPageText = request.responseText;
      } else {
        videoInfoText = request.responseText;
      }
      startToParse();
    };
    request.onerror = function downloadError() {
      console.error('error while querying: ', url);
      errorCallback();
    };
    request.send();
  }

  function startToParse() {
    // we need video info and video page to start parse
    if (!videoInfoText || !videoPageText) {
      return;
    }

    try {
      var info = parseYoutubeVideoInfo(videoInfoText, videoPageText);
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
  }

  // download video info from youtube
  var query = 'http://www.youtube.com/get_video_info?&video_id=' + videoId;
  downloadContent(query, false);

  // download web page from youtube, use nomobile=1 to get desktop version.
  var queryToWebPage = 'http://www.youtube.com/watch?nomobile=1&v=' + videoId;
  downloadContent(queryToWebPage, true);

  //
  // Parse the videoInfo and pageText from a youtube queries.
  //
  // If youtube's videoInfo is a failure, this function returns an object
  // with status, errorcode, type and reason properties. Otherwise, it returns
  // an object with status, url, and type properties, and optional
  // title, poster, and duration properties.
  // If youtube's pageText contains vevo info, we use url_encoded_fmt_stream_map
  // from pageText instead of videoInfo.
  //
  function parseYoutubeVideoInfo(videoInfo, pageText) {
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
    // helper function to decrypt signature with length 87. We don't know how to
    // decode others.
    function decryptSignature(s) {
      if (s.length == 88) {
        return s.substring(48, 49) +
               s.substring(68, 82).split('').reverse().join('') +
               s.substring(82, 83) +
               s.substring(63, 67).split('').reverse().join('') +
               s.substring(85, 86) +
               s.substring(49, 62).split('').reverse().join('') +
               s.substring(67, 68) +
               s.substring(13, 48).split('').reverse().join('') +
               s.substring(3, 4) +
               s.substring(4, 12).split('').reverse().join('') +
               s.substring(2, 3) +
               s.substring(12, 13);
      } else if (s.length == 87) {
        return s.substring(62, 63) +
               s.substring(63, 83).split('').reverse().join('') +
               s.substring(83, 84) +
               s.substring(53, 62).split('').reverse().join('') +
               s.substring(0, 1) +
               s.substring(3, 52).split('').reverse().join('');
      } else if (s.length == 86) {
        return s.substring(2, 63) + s.substring(82, 83) + s.substring(64, 82) +
               s.substring(63, 64);
      } else if (s.length == 85) {
        return s.substring(76, 77) +
               s.substring(77, 83).split('').reverse().join('') +
               s.substring(83, 84) +
               s.substring(61, 76).split('').reverse().join('') +
               s.substring(0, 1) +
               s.substring(51, 60).split('').reverse().join('') +
               s.substring(1, 2) +
               s.substring(3, 50).split('').reverse().join('');
      } else if (s.length == 84) {
        return s.substring(37, 84).split('').reverse().join('') +
               s.substring(2, 3) +
               s.substring(27, 36).split('').reverse().join('') +
               s.substring(3, 4) +
               s.substring(4, 26).split('').reverse().join('') +
               s.substring(26, 27);
      } else if (s.length == 83) {
        return s.substring(52, 53) +
               s.substring(56, 82).split('').reverse().join('') +
               s.substring(2, 3) +
               s.substring(53, 55).split('').reverse().join('') +
               s.substring(82, 83) +
               s.substring(37, 52).split('').reverse().join('') +
               s.substring(55, 56) +
               s.substring(3, 36).split('').reverse().join('') +
               s.substring(36, 37);
      } else if (s.length == 82) {
        return s.substring(36, 37) +
               s.substring(68, 80).split('').reverse().join('') +
               s.substring(81, 82) +
               s.substring(41, 67).split('').reverse().join('') +
               s.substring(33, 34) +
               s.substring(37, 40).split('').reverse().join('') +
               s.substring(40, 41) +
               s.substring(35, 36) +
               s.substring(0, 1) +
               s.substring(67, 68) +
               s.substring(1, 33).split('').reverse().join('') +
               s.substring(34, 35);
      } else {
        throw Error('Unknown signature structure: ' + s);
      }
    }

    var params = extractParameters(videoInfo);

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
    var streamsText;
    var regexp = /;ytplayer\.config = ({.*?});/m;
    var mobj = regexp.exec(pageText);
    if (mobj && mobj.length > 1) {
      var info = JSON.parse(mobj[1]);
      streamsText = info.args.url_encoded_fmt_stream_map;
    } else {
      // use data from get_video_info
      streamsText = params.url_encoded_fmt_stream_map;
    }

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

    var sig = (bestStream.sig || decryptSignature(bestStream.s) || '');

    result.url = bestStream.url + '&signature=' + sig;
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


