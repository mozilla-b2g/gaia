window.addEventListener('DOMContentLoaded', function() {
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

    // for some reason, the 'click' event doesn't always work on the device
    // and the 'mousedown' event can take up to three seconds to get fired.
    thumbnail.addEventListener('mousedown', function(e) {
      showPlayer(sample);
    });

    $('thumbnails').appendChild(thumbnail);
  });

  // if this is true then the video tag is showing
  // if false, then the gallery is showing
  var playerShowing = false;

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

  // show|hide video player
  function showPlayer(sample) {
    // switch to the video player view
    hideControls();
    document.body.classList.add('fullscreen');
    $('videoBar').classList.remove('paused');

    // start player
    player.src = sample.video;
    player.srcWidth = sample.width;
    player.srcHeight = sample.height;
    player.play();
    player.requestFullScreen();

    playerShowing = true;
  }
  function hidePlayer() {
    // switch to the video gallery view
    hideControls();
    document.cancelFullScreen();
    document.body.classList.remove('fullscreen');
    $('videoBar').classList.remove('paused');

    // stop player
    player.pause();
    player.currentTime = 0;

    playerShowing = false;
  }
  $('close').addEventListener('click', hidePlayer, false);
  player.addEventListener('ended', hidePlayer, false);
  window.addEventListener('keypress', function(evt) {
    if (playerShowing && evt.keyCode == evt.DOM_VK_ESCAPE) {
      hidePlayer();
      evt.preventDefault();
    }
  });

  // show|hide controls over the player
  function showControls() {
    if (!playerShowing)
      return;
    $('videoControls').classList.remove('hidden');
  }
  function hideControls(event) {
    if (event && event.target != $('videoControls'))
      return;
    $('videoControls').classList.add('hidden');
  }
  player.addEventListener('click', showControls, false);
  $('videoControls').addEventListener('click', hideControls, false);

  // media events: play|pause, rwd|fwd, timeupdate
  playHead = $('playHead');
  $('play').addEventListener('click', function() {
    if (player.paused) {
      $('videoBar').classList.remove('paused');
      player.play();
    } else {
      $('videoBar').classList.add('paused');
      player.pause();
    }
  }, false);
  $('rwd').addEventListener('click', function() {
    player.currentTime -= 15;
  }, false);
  $('fwd').addEventListener('click', function() {
    player.currentTime += 15;
  }, false);
  player.addEventListener('timeupdate', function() {
    var pos = (player.currentTime / player.duration) * 100;
    playHead.style.top = pos + '%';
  }, false);
});
