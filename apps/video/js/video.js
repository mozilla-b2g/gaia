window.addEventListener('DOMContentLoaded', function() {

  // This is the list of sample videos built in to the app
  var samples = [
    {
      title: 'Mozilla Manifesto',
      video: 'samples/manifesto.ogv',
      poster: 'samples/manifesto.png'

    },
    {
      title: 'Meet The Cubs',
      video: 'samples/meetthecubs.webm',
      poster: 'samples/meetthecubs.png'
    }
  ];

  // Build the thumbnails screen from the list of videos
  samples.forEach(function(sample) {
    var thumbnail = elt('li', { title: sample.title },  // <li> tag
                        elt('a', { href: '#'},          // containing an <a>
                            elt('img', {                // containing an <img>
                              src: sample.poster,
                              alt: sample.title,
                              'class': 'thumbnail'
                            })));

    thumbnail.addEventListener('click', function(e) {
      showPlayer(sample.video);
    });

    $('thumbnails').appendChild(thumbnail);
  });

  // if this is true then the video tag is showing
  // if false, then the gallery is showing
  var playerShowing = false;

  // Switch to the video gallery view
  function showGallery() {
    $('thumbnails').classList.remove('hidden');
    $('videoFrame').classList.add('hidden');

    // If there is a player element, remove it
    $('videoBorder').innerHTML = '';

    playerShowing = false;
  }

  // Switch to the video player view and play the video!
  function showPlayer(url) {
    $('thumbnails').classList.add('hidden');
    $('videoFrame').classList.remove('hidden');
    playerShowing = true;

    var player = elt('video', {
      id: 'player',
      src: url,
      autoplay: 'autoplay',
      controls: 'controls'
    });
    $('videoBorder').appendChild(player);

    setTimeout(function() {
      player.dataset.visible = 'true';
    }, 100);
  }

  window.addEventListener('keypress', function(evt) {
    if (playerShowing && evt.keyCode == evt.DOM_VK_ESCAPE) {
      showGallery();
      evt.preventDefault();
    }
  });
});
