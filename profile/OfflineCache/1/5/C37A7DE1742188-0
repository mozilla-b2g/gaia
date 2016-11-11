window.addEventListener('DOMContentLoaded', function() {
  'use strict';
  var player = $('player');

  // This is the list of sample videos built in to the app
  var samples = [
    {
      title: 'Mozilla Manifesto',
      video: 'samples/manifesto.ogv',
      poster: 'samples/manifesto.png',
      width: '640',
      height: '360',
      duration: '2:05'
    },
    {
      title: 'Meet The Cubs',
      video: 'samples/meetthecubs.webm',
      poster: 'samples/meetthecubs.png',
      width: '640',
      height: '360',
      duration: '1:18'
    }
  ];

  // Build the thumbnails screen from the list of videos
  samples.forEach(function(sample) {
    var thumbnail = elt('li', {}, [
                      elt('img', { src: sample.poster }),
                      elt('p', { class: 'name' }, sample.title),
                      elt('p', { class: 'time' }, sample.duration)
                    ]);

    thumbnail.addEventListener('click', function(e) {
      showPlayer(sample);
    });

    $('thumbnails').appendChild(thumbnail);
  });

  // if this is true then the video tag is showing
  // if false, then the gallery is showing
  var playerShowing = false;

  // same thing for the controls
  var controlShowing = false;

  // fullscreen doesn't work properly yet -- here's an ugly shim
  var realFullscreen = false;
  if (realFullscreen) {
    document.cancelFullScreen = document.mozCancelFullScreen;
    player.requestFullScreen = player.mozRequestFullScreen;
  } else {
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
    } else if (this == event.target) {
      this.classList.add('hidden');
      controlShowing = false;
    }
  }, false);

  // show|hide video player
  function showPlayer(sample) {
    // switch to the video player view
    $('videoControls').classList.add('hidden');
    document.body.classList.add('fullscreen');
    $('videoBar').classList.remove('paused');

    // start player
    player.src = sample.video;
    player.srcWidth = sample.width;   // XXX use player.videoWidth instead
    player.srcHeight = sample.height; // XXX use player.videoHeight instead
    player.play();
    player.requestFullScreen();

    playerShowing = true;
    controlShowing = false;
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

    playerShowing = false;
  }
  $('close').addEventListener('click', hidePlayer, false);
  player.addEventListener('ended', function() {
    if (!controlShowing)
      hidePlayer();
  }, false);
  window.addEventListener('keyup', function(event) {
    if (playerShowing && event.keyCode == event.DOM_VK_ESCAPE) {
      hidePlayer();
      event.preventDefault();
    }
    if (event.keyCode == event.DOM_VK_HOME) {
      hidePlayer();
    }
  }, false);

  // control buttons: play|pause, rwd|fwd
  $('play').addEventListener('click', function() {
    if (!controlShowing)
      return;
    if (player.paused) {
      $('videoBar').classList.remove('paused');
      player.play();
    } else {
      $('videoBar').classList.add('paused');
      player.pause();
    }
  }, false);
  $('rwd').addEventListener('click', function() {
    if (controlShowing)
      player.currentTime -= 15;
  }, false);
  $('fwd').addEventListener('click', function() {
    if (controlShowing)
      player.currentTime += 15;
  }, false);

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
      getTimePos(event) : player.currentTime / player.duration;
    var pos = progress * 100 + '%';
    playHead.style.top = pos;
    elapsedTime.style.height = pos;
  }
  function setCurrentTime(event) {
    isDragging = false;
    if (controlShowing)
      player.currentTime = getTimePos(event) * player.duration;
  }
  player.addEventListener('timeupdate', setProgress, false);
  playHead.addEventListener('mousemove', setProgress, false);
  playHead.addEventListener('mousedown', function() {
    if (controlShowing)
      isDragging = true;
  }, false);
  timeSlider.addEventListener('mouseup', setCurrentTime, false);
  timeSlider.addEventListener('mouseout', function(event) {
    if (isDragging)
      setCurrentTime(event);
  }, false);
});
