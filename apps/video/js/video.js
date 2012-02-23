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

    thumbnail.addEventListener('click', function(e) {
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

  // Switch to the video gallery view
  function showGallery() {
    document.body.classList.remove('fullscreen');
    document.cancelFullScreen();

    // stop player
    player.pause();
    player.currentTime = 0;

    playerShowing = false;
  }

  // Switch to the video player view and play the video!
  function showPlayer(sample) {
    document.body.classList.add('fullscreen');

    // start player
    player.src = sample.video;
    player.srcWidth = sample.width;
    player.srcHeight = sample.height;
    player.play();
    player.requestFullScreen();

    playerShowing = true;
  }

  // XXX temp hack until we get proper fullscreen controls
  player.addEventListener('click', showGallery, false);

  window.addEventListener('keypress', function(evt) {
    if (playerShowing && evt.keyCode == evt.DOM_VK_ESCAPE) {
      showGallery();
      evt.preventDefault();
    }
  });
});
