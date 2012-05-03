'use strict';

window.addEventListener('DOMContentLoaded', function() {
  function $(id) {
    return document.getElementById(id);
  }
  var player = $('player');
  var subtitles = null;

  // This is the list of sample videos built in to the app
  var samples = [
    {
      title: 'Mozilla Manifesto',
      video: 'samples/manifesto.ogv',
      poster: 'samples/manifesto.png',
      subtitles: 'samples/manifesto.json',
      width: '640',
      height: '360',
      duration: '2:05'
    },
    {
      title: 'Meet The Cubs',
      video: 'samples/meetthecubs.webm',
      poster: 'samples/meetthecubs.png',
      subtitles: 'samples/meetthecubs.json',
      width: '640',
      height: '360',
      duration: '1:18'
    }
  ];

  // Build the thumbnails screen from the list of videos
  samples.forEach(function(sample) {
    var poster = document.createElement('img');
    poster.src = sample.poster;

    var title = document.createElement('p');
    title.className = 'name';
    title.textContent = sample.title;

    var duration = document.createElement('p');
    duration.className = 'time';
    duration.textContent = sample.duration;

    var thumbnail = document.createElement('li');
    thumbnail.appendChild(poster);
    thumbnail.appendChild(title);
    thumbnail.appendChild(duration);
    thumbnail.addEventListener('click', function(e) {
      showPlayer(sample);
    });

    $('thumbnails').appendChild(thumbnail);
  });

  // if this is true then the video tag is showing
  // if false, then the gallery is showing
  var playerShowing = false;

  // XXX workaround for the appCache bug (see showPlayer())
  var playerDuration;

  // keep the screen on when playing
  var screenLock;

  // same thing for the controls
  var controlShowing = false;

  // fullscreen doesn't work properly yet -- here's an ugly shim
  var realFullscreen = false;
  if (realFullscreen) {
    document.cancelFullScreen = document.mozCancelFullScreen;
    player.requestFullScreen = player.mozRequestFullScreen;
  }
  else {
    // compute a CSS transform that centers & maximizes the <video> element
    document.cancelFullScreen = function() {
      player.style.mozTransform = 'none';
    };
    player.requestFullScreen = function() {
      var style = getComputedStyle(document.body);
      var bWidth = parseInt(style.width, 10);
      var bHeight = parseInt(style.height, 10);
      var scale = Math.floor(
          Math.min(bHeight / player.srcWidth, bWidth / player.srcHeight) * 20
        ) / 20; // round to the lower 5%
      var yOffset = -Math.floor((bWidth + scale * player.srcHeight) / 2);
      var xOffset = Math.floor((bHeight - scale * player.srcWidth) / 2);
      var transform = 'rotate(90deg)' +
        ' translate(' + xOffset + 'px, ' + yOffset + 'px)' +
        ' scale(' + scale + ')';
      player.style.MozTransformOrigin = 'top left';
      player.style.MozTransform = transform;
    }
  }

  // show|hide controls over the player
  $('videoControls').addEventListener('click', function(event) {
    if (!controlShowing) {
      this.classList.remove('hidden');
      controlShowing = true;
    }
    else if (this == event.target) {
      this.classList.add('hidden');
      controlShowing = false;
    }
  });

  // show|hide video player
  function showPlayer(sample) {
    // switch to the video player view
    $('videoControls').classList.add('hidden');
    document.body.classList.add('fullscreen');
    $('videoBar').classList.remove('paused');

    //TODO: fetch subtitles from UniversalSubtitles.org
    var req = new XMLHttpRequest();
    req.open('GET', sample.subtitles, false);
    req.send();
    subtitles = eval(req.response);

    function secs(str){
      var t = str.split(":");
      var h = t[0];
      var m = t[1];
      var s = parseFloat(t[2]);
      return (h*60+m)*60+s;
    }

    player.ontimeupdate = function(){
      var time = player.currentTime;

      for (var s in subtitles){
        if (time > secs(subtitles[s][0]) && time <= secs(subtitles[s][0]) + secs(subtitles[s][1])){
          $('videoSubtitles').innerHTML = subtitles[s][2];
          continue;
        }
      }
    }

    // start player
    player.src = sample.video;
    player.srcWidth = sample.width;   // XXX use player.videoWidth instead
    player.srcHeight = sample.height; // XXX use player.videoHeight instead
    player.play();
    player.requestFullScreen();

    // XXX in appCache mode, player.duration == Infinity
    // here's a workaround until this bug is fixed on the platform
    // https://github.com/andreasgal/gaia/issues/1062
    // https://bugzilla.mozilla.org/show_bug.cgi?id=740124
    playerDuration = player.duration;
    if (isNaN(player.duration) || player.duration >= Infinity) {
      var tmp = sample.duration.split(':');
      playerDuration = 60 * parseInt(tmp[0], 10) + parseInt(tmp[1], 10);
    }

    playerShowing = true;
    controlShowing = false;
    screenLock = navigator.requestWakeLock('screen');
  }
  function hidePlayer() {
    if (!playerShowing)
      return;

    // switch to the video gallery view
    document.cancelFullScreen();
    document.body.classList.remove('fullscreen');
    $('videoBar').classList.remove('paused');

    // stop player
    player.pause();
    player.currentTime = 0;

    //clear currently displayed caption
    $('videoSubtitles').innerHTML = "";

    playerShowing = false;
    screenLock.unlock();
  }
  $('close').addEventListener('click', hidePlayer);
  player.addEventListener('ended', function() {
    if (!controlShowing)
      hidePlayer();
  });
  window.addEventListener('keyup', function(event) {
    if (playerShowing && event.keyCode == event.DOM_VK_ESCAPE) {
      hidePlayer();
      event.preventDefault();
    }
    if (event.keyCode == event.DOM_VK_HOME) {
      hidePlayer();
    }
  });

  // control buttons: play|pause, rwd|fwd
  $('videoBar').addEventListener('click', function(event) {
    if (!controlShowing)
      return;
    switch (event.target.id) {
      case 'play':
        if (player.paused) {
          this.classList.remove('paused');
          player.play();
        }
        else {
          this.classList.add('paused');
          player.pause();
        }
        break;
      case 'rwd':
        player.currentTime -= 15;
        break;
      case 'fwd':
        player.currentTime += 15;
        break;
    }
  });

  // handle drags/clicks on the time slider
  var isDragging = false;
  var playHead = $('playHead');
  var timeSlider = $('timeSlider');
  var elapsedTime = $('elapsedTime');
  var rect = null;
  function getTimePos(event) {
    if (!rect)
      rect = timeSlider.getBoundingClientRect();
    return (event.clientY - rect.top) / rect.height;
  }
  function setProgress(event) {
    var progress = isDragging ?
      getTimePos(event) : player.currentTime / playerDuration;
    var pos = progress * 100 + '%';
    playHead.style.top = pos;
    elapsedTime.style.height = pos;
  }
  function setCurrentTime(event) {
    if (controlShowing)
      player.currentTime = getTimePos(event) * playerDuration;
  }
  player.addEventListener('timeupdate', setProgress);
  playHead.addEventListener('mousemove', setProgress);
  playHead.addEventListener('mousedown', function() {
    if (controlShowing)
      isDragging = true;
  });
  timeSlider.addEventListener('mouseup', setCurrentTime);
  timeSlider.addEventListener('mouseout', function(event) {
    if (isDragging)
      setCurrentTime(event);
  });
});

// Set the 'lang' and 'dir' attributes to <html> when the page is translated
window.addEventListener('localized', function showBody() {
  var html = document.querySelector('html');
  var lang = document.mozL10n.language;
  html.lang = lang.code;
  html.dir = lang.direction;
  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
});
