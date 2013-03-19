'use strict';

var dom = {};

var ids = ['player', 'thumbnails', 'overlay', 'overlay-title',
           'overlay-text', 'videoControls', 'videoFrame', 'videoBar',
           'close', 'play', 'playHead', 'timeSlider', 'elapsedTime',
           'video-title', 'duration-text', 'elapsed-text', 'bufferedTime',
           'slider-wrapper', 'throbber', 'delete-video-button'];

ids.forEach(function createElementRef(name) {
  dom[toCamelCase(name)] = document.getElementById(name);
});

dom.player.mozAudioChannelType = 'content';

var playing = false;

// if this is true then the video tag is showing
// if false, then the gallery is showing
var playerShowing = false;
var ctxTriggered = false; // Workaround for bug 766813

// keep the screen on when playing
var screenLock;
var endedTimer;

// same thing for the controls
var controlShowing = false;
var controlFadeTimeout = null;

var videodb;
var currentVideo;  // The data for the currently playing video
var videos = [];
var firstScanEnded = false;

var THUMBNAIL_WIDTH = 160;  // Just a guess at a size for now
var THUMBNAIL_HEIGHT = 160;

// Enumerating the readyState for html5 video api
var HAVE_NOTHING = 0;

var storageState;
var currentOverlay;

var dragging = false;

// Videos recorded by our own camera have filenames of this form
var FROMCAMERA = /^DCIM\/\d{3}MZLLA\/VID_\d{4}\.3gp$/;

function init() {

  initDB();

  // We can't do this in the mouse down handler below because
  // calling confirm() from the mousedown generates a contextmenu
  // event when the alert goes away.
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=829214
  dom.deleteVideoButton.onclick = function() {
    document.mozCancelFullScreen();
    deleteFile(currentVideo.name);
  };
}

function initDB() {
  videodb = new MediaDB('videos', metaDataParser);

  videodb.onunavailable = function(event) {
    storageState = event.detail;
    updateDialog();
  };
  videodb.onready = function() {
    storageState = false;
    updateDialog();
    createThumbnailList();
  };

  videodb.onscanstart = function() {
    dom.throbber.classList.add('throb');
  };
  videodb.onscanend = function() {
    dom.throbber.classList.remove('throb');
    if (!firstScanEnded) {
      firstScanEnded = true;
      updateDialog();
    }
  };

  videodb.oncreated = function(event) {
    event.detail.forEach(videoCreated);
  };
  videodb.ondeleted = function(event) {
    event.detail.forEach(videoDeleted);
  };
}

// This comparison function is used for sorting arrays and doing binary
// search on the resulting sorted arrays.
function compareVideosByDate(a, b) {
  return b.date - a.date;
}

// Assuming that array is sorted according to comparator, return the
// array index at which element should be inserted to maintain sort order
function binarysearch(array, element, comparator, from, to) {
  if (comparator === undefined)
    comparator = function(a, b) {
      return a - b;
    };

  if (from === undefined)
    return binarysearch(array, element, comparator, 0, array.length);

  if (from === to)
    return from;

  var mid = Math.floor((from + to) / 2);

  var result = comparator(element, array[mid]);
  if (result < 0)
    return binarysearch(array, element, comparator, from, mid);
  else
    return binarysearch(array, element, comparator, mid + 1, to);
}

function videoAdded(videodata) {
  if (!videodata || !videodata.metadata.isVideo) {
    return;
  }

  videos.push(videodata);  // remember the file

  // create its thumbnail
  var thumbnail = createThumbnailItem(videos.length - 1);
  dom.thumbnails.appendChild(thumbnail);
  var text = thumbnail.querySelector('.details');
  textTruncate(text);
}

function videoCreated(videodata) {
  if (!videodata || !videodata.metadata.isVideo) {
    return;
  }

  var insertPosition;

  // If this new video is newer than the first one, it goes first
  // This is the most common case for bluetooth received video
  if (videos.length === 0 || videodata.date > videos[0].date) {
    insertPosition = 0;
  }
  else {
    // Otherwise we have to search for the right insertion spot
    insertPosition = binarysearch(videos, videodata, compareVideosByDate);
  }

  // Insert the video info into the array
  videos.splice(insertPosition, 0, videodata);

  // Create a thumbnail for this video and insert it at the right spot
  var thumbnail = createThumbnailItem(insertPosition);
  var thumbnailElts = dom.thumbnails.querySelectorAll('.thumbnail');
  dom.thumbnails.insertBefore(thumbnail, thumbnailElts[insertPosition]);

  var text = thumbnail.querySelector('.details');
  textTruncate(text);

  // increment the index of each of the thumbnails after the new one
  for (var i = insertPosition; i < thumbnailElts.length; i++) {
    thumbnailElts[i].dataset.index = i + 1;
  }
}

dom.thumbnails.addEventListener('contextmenu', function(evt) {
  var node = evt.target;
  while (node) {
    if (node.dataset.name) {
      ctxTriggered = true;
      deleteFile(node.dataset.name);
      return;
    }
    node = node.parentNode;
  }
});

function deleteFile(file) {
  var msg = navigator.mozL10n.get('confirm-delete');
  if (confirm(msg + ' ' + file)) {
    if (FROMCAMERA.test(file)) {
      // If we're deleting a video file recorded by our camera,
      // we also need to delete the poster image associated with
      // that video.
      var postername = file.replace('.3gp', '.jpg');
      navigator.getDeviceStorage('pictures'). delete(postername);
    }

    // Whether or not there was a poster file to delete, delete the
    // actual video file. This will cause the MediaDB to send a 'deleted'
    // event, and the handler for that event will call videoDeleted() below.
    videodb.deleteFile(file);
  }
}

function videoDeleted(filename) {
  // Find the deleted video in our videos array
  for (var n = 0; n < videos.length; n++) {
    if (videos[n].name === filename)
      break;
  }

  if (n >= videos.length)  // It was a video we didn't know about
    return;

  // Remove the video from the array
  var deletedVideoData = videos.splice(n, 1)[0];

  dom.thumbnails.removeChild(getThumbnailDom(filename));

  // Change the index associated with all the thumbnails after the deleted one
  // This keeps the data-index attribute of each thumbnail element in sync
  // with the files[] array.
  var thumbnailElts = dom.thumbnails.querySelectorAll('.thumbnail');
  for (var i = n + 1; i < thumbnailElts.length; i++) {
    thumbnailElts[i].dataset.index = i - 1;
  }

  updateDialog();
}

// Only called on startup to generate initial list of already
// scanned media, once this is build videoDeleted/Created are used
// to keep it up to date
function createThumbnailList() {
  if (dom.thumbnails.firstChild !== null) {
    dom.thumbnails.textContent = '';
  }
  // Clean up the videos array
  videos = [];

  videodb.enumerate('date', null, 'prev', videoAdded);
}

function updateDialog() {
  if (videos.length !== 0 && (!storageState || playerShowing)) {
    showOverlay(null);
    return;
  }
  if (storageState === MediaDB.NOCARD) {
    showOverlay('nocard');
  } else if (storageState === MediaDB.UNMOUNTED) {
    showOverlay('pluggedin');
  } else if (firstScanEnded && videos.length === 0) {
    showOverlay('empty');
  }
}

//
// Create a thumbnail item
//
function createThumbnailItem(videonum) {
  var poster;
  var videodata = videos[videonum];

  var inner = document.createElement('div');
  inner.className = 'inner';

  if (videodata.metadata.poster) {
    poster = document.createElement('div');
    poster.className = 'img';
    setPosterImage(poster, videodata.metadata.poster);
  }

  var details = document.createElement('div');
  details.className = 'details';
  if (isFinite(videodata.metadata.duration)) {
    var d = Math.round(videodata.metadata.duration);
    details.dataset.after = formatDuration(d);
  }
  details.textContent = videodata.metadata.title;

  var thumbnail = document.createElement('li');
  thumbnail.className = 'thumbnail';
  if (poster) {
    inner.appendChild(poster);
  }

  if (!videodata.metadata.watched) {
    var unread = document.createElement('div');
    unread.classList.add('unwatched');
    inner.appendChild(unread);
  }

  thumbnail.dataset.name = videodata.name;
  thumbnail.dataset.index = videonum;

  thumbnail.addEventListener('click', function(e) {
    // When the user presses and holds to delete a video, we get a
    // contextmenu event, but still apparently get a click event after
    // they lift their finger. This ctxTriggered flag prevents us from
    // playing a video after a contextmenu event.
    // See https://bugzilla.mozilla.org/show_bug.cgi?id=766813
    if (!ctxTriggered) {
      showPlayer(videodata, true);
    } else {
      ctxTriggered = false;
    }
  });
  inner.appendChild(details);
  thumbnail.appendChild(inner);
  return thumbnail;
}

function metaDataParser(videofile, callback, metadataError, delayed) {
  // XXX
  // When the camera records a video, it saves the video file and then
  // uses a <video> tag to create a poster image for that video.
  // But if the Video app is running, we get an event from device storage
  // and start parsing the metadata when the video file is created. So now
  // the Camera app and the Video app are both trying to use the video
  // decoding hardware at the same time. The camera app really has to
  // succeed. We should modify this app to wait for and use the poster image
  // the way that the Gallery app does. For now, however, we avoid the problem
  // by just waiting to give the Camera app time to save the poster image.
  // In the worst case, we could fail to parse the metadata here. But that
  // is better than having the camera fail to record the video correctly.
  //
  if (!delayed && FROMCAMERA.test(videofile.name)) {
    setTimeout(function() {
      metaDataParser(videofile, callback, metadataError, true);
    }, 2000);
    return;
  }

  var previewPlayer = document.createElement('video');
  var completed = false;

  if (!previewPlayer.canPlayType(videofile.type)) {
    return callback({isVideo: false});
  }

  var url = URL.createObjectURL(videofile);
  var metadata = {
    isVideo: true,
    title: fileNameToVideoName(videofile.name)
  };

  previewPlayer.preload = 'metadata';
  previewPlayer.style.width = THUMBNAIL_WIDTH + 'px';
  previewPlayer.style.height = THUMBNAIL_HEIGHT + 'px';
  previewPlayer.src = url;
  previewPlayer.onerror = function(e) {
    if (!completed) {
      metadataError(metadata.title);
    }
    previewPlayer.removeAttribute('src');
    previewPlayer.load();
  };
  previewPlayer.onloadedmetadata = function() {

    // File Object only does basic detection for content type,
    // if videoWidth is 0 then this is likely an audio file (ogg / mp4)
    if (!previewPlayer.videoWidth) {
      return callback({isVideo: false});
    }

    metadata.duration = previewPlayer.duration;
    metadata.width = previewPlayer.videoWidth;
    metadata.height = previewPlayer.videoHeight;

    function createThumbnail() {
      captureFrame(previewPlayer, metadata, function(poster) {
        metadata.poster = poster;
        URL.revokeObjectURL(url);
        completed = true;
        previewPlayer.removeAttribute('src');
        previewPlayer.load();
        callback(metadata);
      });
    }

    // If this is a .3gp video file, look for its rotation matrix and
    // then create the thumbnail. Otherwise set rotation to 0 and
    // create the thumbnail.
    // getVideoRotation is defined in shared/js/media/get_video_rotation.js
    if (/.3gp$/.test(videofile.name)) {
      getVideoRotation(videofile, function(rotation) {
        if (typeof rotation === 'number')
          metadata.rotation = rotation;
        else if (typeof rotation === 'string')
          console.warn('Video rotation:', rotation);
        createThumbnail();
      });
    } else {
      metadata.rotation = 0;
      createThumbnail();
    }
  };
}

function captureFrame(player, metadata, callback) {
  var skipped = false;
  var image = null;
  function doneSeeking() {
    player.onseeked = null;
    try {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      canvas.width = THUMBNAIL_WIDTH;
      canvas.height = THUMBNAIL_HEIGHT;
      // If a rotation is specified, rotate the canvas context
      if ('rotation' in metadata) {
        ctx.save();
        switch (metadata.rotation) {
        case 90:
          ctx.translate(THUMBNAIL_WIDTH, 0);
          ctx.rotate(Math.PI / 2);
          break;
        case 180:
          ctx.translate(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
          ctx.rotate(Math.PI);
          break;
        case 270:
          ctx.translate(0, THUMBNAIL_HEIGHT);
          ctx.rotate(-Math.PI / 2);
          break;
        }
      }
      ctx.drawImage(player, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
      if (metadata.rotation) {
        ctx.restore();
      }
      image = canvas.mozGetAsFile('poster', 'image/jpeg');
    } catch (e) {
      console.error('Failed to create a poster image:', e);
    }
    if (skipped) {
      player.currentTime = 0;
    }
    callback(image);
  }

  // If we are on the first frame, lets skip into the video since some
  // videos just start with a black screen
  if (player.currentTime === 0) {
    player.currentTime = Math.floor(player.duration / 4);
    skipped = true;
  }

  if (player.seeking) {
    player.onseeked = doneSeeking;
  } else {
    doneSeeking();
  }
}

function getThumbnailDom(filename) {
  return dom.thumbnails.querySelectorAll('[data-name="' + filename + '"]')[0];
}

function setPosterImage(dom, poster) {
  if (dom.dataset.uri) {
    URL.revokeObjectURL(dom.dataset.uri);
  }
  dom.dataset.uri = URL.createObjectURL(poster);
  dom.style.backgroundImage = 'url(' + dom.dataset.uri + ')';
}

function showOverlay(id) {
  currentOverlay = id;

  if (id === null) {
    dom.overlay.classList.add('hidden');
    return;
  }

  dom.overlayTitle.textContent = navigator.mozL10n.get(id + '-title');
  dom.overlayText.textContent = navigator.mozL10n.get(id + '-text');
  dom.overlay.classList.remove('hidden');
}

function setControlsVisibility(visible) {
  dom.videoControls.classList[visible ? 'remove' : 'add']('hidden');
  controlShowing = visible;
}

function setVideoPlaying(playing) {
  if (playing) {
    play();
  } else {
    pause();
  }
}

function playerMousedown(event) {
  // If we interact with the controls before they fade away,
  // cancel the fade
  if (controlFadeTimeout) {
    clearTimeout(controlFadeTimeout);
    controlFadeTimeout = null;
  }
  if (!controlShowing) {
    setControlsVisibility(true);
    return;
  }
  if (event.target == dom.play) {
    setVideoPlaying(dom.player.paused);
  } else if (event.target == dom.close) {
    hidePlayer();
  } else if (event.target == dom.sliderWrapper) {
    dragSlider(event);
  } else {
    setControlsVisibility(false);
  }
}

// Make the video fit the container
function setPlayerSize() {
  var containerWidth = window.innerWidth;
  var containerHeight = window.innerHeight;

  // Don't do anything if we don't know our size.
  // This could happen if we get a resize event before our metadata loads
  if (!dom.player.videoWidth || !dom.player.videoHeight)
    return;

  var width, height; // The size the video will appear, after rotation
  var rotation = 'metadata' in currentVideo ?
    currentVideo.metadata.rotation : 0;

  switch (rotation) {
  case 0:
  case 180:
    width = dom.player.videoWidth;
    height = dom.player.videoHeight;
    break;
  case 90:
  case 270:
    width = dom.player.videoHeight;
    height = dom.player.videoWidth;
  }

  var xscale = containerWidth / width;
  var yscale = containerHeight / height;
  var scale = Math.min(xscale, yscale);

  // scale large videos down and scale small videos up
  // this might result in lower image quality for small videos
  width *= scale;
  height *= scale;

  var left = ((containerWidth - width) / 2);
  var top = ((containerHeight - height) / 2);

  var transform;
  switch (rotation) {
  case 0:
    transform = 'translate(' + left + 'px,' + top + 'px)';
    break;
  case 90:
    transform =
      'translate(' + (left + width) + 'px,' + top + 'px) ' +
      'rotate(90deg)';
    break;
  case 180:
    transform =
      'translate(' + (left + width) + 'px,' + (top + height) + 'px) ' +
      'rotate(180deg)';
    break;
  case 270:
    transform =
      'translate(' + left + 'px,' + (top + height) + 'px) ' +
      'rotate(270deg)';
    break;
  }

  transform += ' scale(' + scale + ')';

  dom.player.style.transform = transform;
}

function setVideoUrl(player, video, callback) {
  if ('name' in video) {
    videodb.getFile(video.name, function(file) {
      var url = URL.createObjectURL(file);
      player.onloadedmetadata = callback;
      player.src = url;
    });
  } else if ('url' in video) {
    player.onloadedmetadata = callback;
    player.src = video.url;
  }
}

// show video player
function showPlayer(data, autoPlay) {
  currentVideo = data;

  dom.thumbnails.classList.add('hidden');

  // switch to the video player view
  updateDialog();
  dom.player.preload = 'metadata';

  function doneSeeking() {
    dom.player.onseeked = null;
    setControlsVisibility(true);
    controlFadeTimeout = setTimeout(function() {
      setControlsVisibility(false);
    }, 250);

    if (autoPlay) {
      play();
    }

    if ('metadata' in currentVideo) {
      currentVideo.metadata.watched = true;
      videodb.updateMetadata(currentVideo.name, currentVideo.metadata);
    }
  }

  setVideoUrl(dom.player, currentVideo, function() {

    dom.durationText.textContent = formatDuration(dom.player.duration);
    timeUpdated();

    dom.videoFrame.classList.remove('hidden');
    dom.play.classList.remove('paused');
    playerShowing = true;
    setPlayerSize();

    if ('name' in currentVideo && FROMCAMERA.test(currentVideo.name)) {
      dom.deleteVideoButton.classList.remove('hidden');
    }

    if ('metadata' in currentVideo) {
      if (currentVideo.metadata.currentTime === dom.player.duration) {
        currentVideo.metadata.currentTime = 0;
      }
      dom.videoTitle.textContent = currentVideo.metadata.title;
      dom.player.currentTime = currentVideo.metadata.currentTime || 0;
    } else {
      dom.videoTitle.textContent = currentVideo.title || '';
      dom.player.currentTime = 0;
    }

    if (dom.player.seeking) {
      dom.player.onseeked = doneSeeking;
    } else {
      doneSeeking();
    }
  });
}

function hidePlayer() {
  if (!playerShowing)
    return;

  dom.player.pause();
  dom.deleteVideoButton.classList.add('hidden');

  function completeHidingPlayer() {
    // switch to the video gallery view
    dom.videoFrame.classList.add('hidden');
    dom.videoBar.classList.remove('paused');
    dom.thumbnails.classList.remove('hidden');
    playerShowing = false;
    updateDialog();

    // Unload the video. This releases the video decoding hardware
    // so other apps can use it. Note that any time the video app is hidden
    // (by switching to another app) we leave player mode, and this
    // code gets triggered, so if the video app is not visible it should
    // not be holding on to the video hardware
    dom.player.removeAttribute('src');
    dom.player.load();
  }

  if (!('metadata' in currentVideo)) {
    completeHidingPlayer();
    return;
  }

  var video = currentVideo;
  var li = getThumbnailDom(video.name);

  // Record current information about played video
  video.metadata.currentTime = dom.player.currentTime;
  captureFrame(dom.player, currentVideo.metadata, function(poster) {
    currentVideo.metadata.poster = poster;
    dom.player.currentTime = 0;

    // Allow the screen to blank now.
    if (screenLock) {
      screenLock.unlock();
      screenLock = null;
    }

    var posterImg = li.querySelector('.img');
    if (poster && posterImg) {
      setPosterImage(posterImg, poster);
    }

    var unwatched = li.querySelector('.unwatched');
    if (unwatched) {
      unwatched.parentNode.removeChild(unwatched);
    }

    videodb.updateMetadata(video.name, video.metadata, completeHidingPlayer);
  });
}

function playerEnded() {
  if (dragging) {
    return;
  }
  if (endedTimer) {
    clearTimeout(endedTimer);
    endedTimer = null;
  }

  dom.player.currentTime = 0;
  hidePlayer();
}

function play() {
  // Switch the button icon
  dom.play.classList.remove('paused');

  // Start playing
  dom.player.play();
  playing = true;

  // Don't let the screen go to sleep
  if (!screenLock)
    screenLock = navigator.requestWakeLock('screen');
}

function pause() {
  // Switch the button icon
  dom.play.classList.add('paused');

  // Stop playing the video
  dom.player.pause();
  playing = false;

  // Let the screen go to sleep
  if (screenLock) {
    screenLock.unlock();
    screenLock = null;
  }
}

// Update the progress bar and play head as the video plays
function timeUpdated() {
  if (controlShowing) {
    // We can't update a progress bar if we don't know how long
    // the video is. It is kind of a bug that the <video> element
    // can't figure this out for ogv videos.
    if (dom.player.duration === Infinity || dom.player.duration === 0) {
      return;
    }

    var percent = (dom.player.currentTime / dom.player.duration) * 100 + '%';

    dom.elapsedText.textContent = formatDuration(dom.player.currentTime);
    dom.elapsedTime.style.width = percent;
    // Don't move the play head if the user is dragging it.
    if (!dragging)
      dom.playHead.style.left = percent;
  }

  // Since we don't always get reliable 'ended' events, see if
  // we've reached the end this way.
  // See: https://bugzilla.mozilla.org/show_bug.cgi?id=783512
  // If we're within 1 second of the end of the video, register
  // a timeout a half a second after we'd expect an ended event.
  if (!endedTimer) {
    if (!dragging && dom.player.currentTime >= dom.player.duration - 1) {
      var timeUntilEnd = (dom.player.duration - dom.player.currentTime + .5);
      endedTimer = setTimeout(playerEnded, timeUntilEnd * 1000);
    }
  } else if (dragging && dom.player.currentTime < dom.player.duration - 1) {
    // If there is a timer set and we drag away from the end, cancel the timer
    clearTimeout(endedTimer);
    endedTimer = null;
  }
}

// handle drags on the time slider
function dragSlider(e) {

  var isPaused = dom.player.paused;
  dragging = true;

  // We can't do anything if we don't know our duration
  if (dom.player.duration === Infinity)
    return;

  if (!isPaused) {
    dom.player.pause();
  }

  // Capture all mouse moves and the mouse up
  document.addEventListener('mousemove', mousemoveHandler, true);
  document.addEventListener('mouseup', mouseupHandler, true);

  function position(event) {
    var rect = dom.sliderWrapper.getBoundingClientRect();
    var position = (event.clientX - rect.left) / rect.width;
    position = Math.max(position, 0);
    position = Math.min(position, 1);
    return position;
  }

  function mouseupHandler(event) {
    document.removeEventListener('mousemove', mousemoveHandler, true);
    document.removeEventListener('mouseup', mouseupHandler, true);

    dragging = false;

    dom.playHead.classList.remove('active');

    if (dom.player.currentTime === dom.player.duration) {
      pause();
    } else if (!isPaused) {
      dom.player.play();
    }
  }

  function mousemoveHandler(event) {
    var pos = position(event);
    var percent = pos * 100 + '%';
    dom.playHead.classList.add('active');
    dom.playHead.style.left = percent;
    dom.elapsedTime.style.width = percent;
    dom.player.currentTime = dom.player.duration * pos;
    dom.elapsedText.textContent = formatDuration(dom.player.currentTime);
  }

  mousemoveHandler(e);
}

// XXX if we don't have metadata about the video name
// do the best we can with the file name
function fileNameToVideoName(filename) {
  filename = filename.split('/').pop()
    .replace(/\.(webm|ogv|mp4)$/, '')
    .replace(/[_\.]/g, ' ');
  return filename.charAt(0).toUpperCase() + filename.slice(1);
}

function toCamelCase(str) {
  return str.replace(/\-(.)/g, function replacer(str, p1) {
    return p1.toUpperCase();
  });
}

function padLeft(num, length) {
  var r = String(num);
  while (r.length < length) {
    r = '0' + r;
  }
  return r;
}

function formatDuration(duration) {
  var minutes = Math.floor(duration / 60);
  var seconds = Math.floor(duration % 60);
  if (minutes < 60) {
    return padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
  }
  var hours = Math.floor(minutes / 60);
  minutes = Math.floor(minutes % 60);
  return hours + ':' + padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
}

function textTruncate(el) {

  // Define helpers
  var helpers = {
    getLine: function h_getLine(letter) {
      return parseInt((letter.offsetTop - atom.top) / atom.height) + 1;
    },
    hideLetter: function h_hideLetter(letter) {
      letter.style.display = 'none';
    },
    after: function h_after(node, after) {
      if (node.nextSibling) {
        node.parentNode.insertBefore(after, node.nextSibling);
      } else {
        node.parentNode.appendChild(after);
      }
    }
  };

  var text = { el: el };

  // Define real content before
  if (!text.el.dataset.raw) {
    text.el.dataset.raw = el.textContent;
  }
  text.el.innerHTML = text.el.dataset.raw;
  delete text.el.dataset.visible;

  var after = { el: document.createElement('span') };
  after.el.className = 'after';
  document.body.appendChild(after.el);

  // Set positionable all letter
  var t = text.el.innerHTML.replace(/(.)/g, '<span>$1</span>');
  text.el.innerHTML = t;

  // get atomic letter dimension
  var atom = {
    left: text.el.firstChild.offsetLeft,
    top: text.el.firstChild.offsetTop,
    width: text.el.firstChild.offsetWidth,
    height: text.el.firstChild.offsetHeight
  };

  // Possible lines number
  text.lines = (text.el.offsetHeight -
    (text.el.offsetHeight) % atom.height) / atom.height;

  // Prepare ... element to be append if necessary
  var etc = document.createElement('span');
  etc.innerHTML = '...';
  after.el.appendChild(etc);

  // Append duration this is required
  var duration = document.createElement('span');
  duration.innerHTML = text.el.dataset.after;
  after.el.appendChild(duration);

  // Init width left to include the after element
  text.widthLeft = text.el.clientWidth;

  // After element
  after.width = after.el.offsetWidth;

  // Each letter
  var line;
  var i = 0;
  var children = text.el.children;
  var space = document.createTextNode(' ');

  while (children[i]) {
    var letter = children[i];
    if (letter.className == after.el.className) {
      i++;
      continue;
    }
    line = helpers.getLine(letter);
    // If in last line truncate
    if (text.lines == line) {
      if (letter.textContent != ' ') {
        // If enought space left to print after element
        text.widthLeft -= letter.offsetWidth;
        if (text.widthLeft - after.width < 3 * atom.width && !after.already) {
          after.already = true;
          helpers.after(letter, space);
          helpers.after(letter, after.el);
          after.el.insertBefore(space, after.el.lastChild);
        } else if (after.already) {
          helpers.hideLetter(letter);
        }
      }
    } else if (text.lines <= line || after.already == true) {
      helpers.hideLetter(letter);
    }
    i++;
  }
  // This can be optimized, for sure !
  if (!after.already) {
    if (text.lines > line) {
      // Remove etc child from after element
      after.el.removeChild(etc);
      text.el.appendChild(after.el);
      text.el.insertBefore(space, after.el);
    } else {
      after.el.style.display = 'none';
    }
  }
  text.el.dataset.visible = 'true';
}

 // Pause on visibility change
document.addEventListener('mozvisibilitychange', function visibilityChange() {
  if (document.mozHidden) {
    if (playing)
      pause();

    if (playerShowing)
      releaseVideo();
  }
  else {
    if (playerShowing) {
      setControlsVisibility(true);
      restoreVideo();
    }
  }
});

// This app uses deprecated-hwvideo permission to access video decoding hardware
// But Camera and Gallery also need to use that hardware, and those three apps
// may only have one video playing at a time among them. So we need to be
// careful to relinquish the hardware when we are not visible.

var restoreTime;

// Call this when the app is hidden
function releaseVideo() {
  restoreTime = dom.player.currentTime;
  dom.player.removeAttribute('src');
  dom.player.load();
}

// Call this when the app becomes visible again
function restoreVideo() {
  setVideoUrl(dom.player, currentVideo, function() {
    dom.player.currentTime = restoreTime;
  });
}

// show|hide controls over the player
dom.videoControls.addEventListener('mousedown', playerMousedown);

// Rescale when window size changes. This should get called when
// orientation changes
window.addEventListener('resize', function() {
  if (dom.player.readyState !== HAVE_NOTHING) {
    setPlayerSize();
  }

  // reTruncate text
  var texts = document.querySelectorAll('.details');
  for (var i = 0; i < texts.length; i++) {
    textTruncate(texts[i]);
  }
});

dom.player.addEventListener('timeupdate', timeUpdated);
dom.player.addEventListener('ended', playerEnded);

// Set the 'lang' and 'dir' attributes to <html> when the page is translated
window.addEventListener('localized', function showBody() {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');

  // If this is the first time we've been called, initialize the database.
  // Don't reinitialize it if the user switches languages while we're running
  if (!videodb)
    init();
});

// We get headphoneschange event when the headphones is plugged or unplugged
var acm = navigator.mozAudioChannelManager;
if (acm) {
  acm.addEventListener('headphoneschange', function onheadphoneschange() {
    if (!acm.headphones && playing) {
      setVideoPlaying(false);
    }
  });
}
