window.addEventListener('DOMContentLoaded', function() {
  var dbschema = {
    version: 1,                     // IndexedDB database version #
    name: 'videos',                 // IndexedDB name
    storename: 'videos',            // Object store name. Only 1 allowed
    keyprop: 'key',                 // Which property is the key
    blobprops: ['video', 'poster'], // Which properties are blobs to fetch
    objects: [                      // An array of objects for the db
      {
        key: 1,                          // This is the key property
        title: 'Mozilla Manifesto',      // Some other property
        video: 'samples/manifesto.ogv',  // These two blob properties
        poster: 'samples/manifesto.png' // are URLs to fetch.
      },
      {
        key: 2,
        title: 'Meet The Cubs',
        video: 'samples/meetthecubs.webm',
        poster: 'samples/meetthecubs.png'
      }
    ]
  };

  var db = new SimpleDB(dbschema);
  db.eachObject(function(o) {
    insertPoster(o.title, o.poster, o.video);
  });

  function insertPoster(title, posterblob, videoblob) {
    var posterurl = window.URL.createObjectURL(posterblob);
    var videourl = window.URL.createObjectURL(videoblob);

    var poster = elt('li', { title: title },
                     elt('a', { href: '#'},
                         elt('img', {
                           src: posterurl,
                           'class': 'thumbnail'
                         })));

    poster.addEventListener('click', function(e) {
      showPlayer(videourl);
    });

    $('thumbnails').appendChild(poster);
  }

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
      player.setAttribute('data-visible', 'true');
    }, 100);
  }

  window.addEventListener('keypress', function(evt) {
    if (playerShowing && evt.keyCode == evt.DOM_VK_ESCAPE) {
      showGallery();
      evt.preventDefault();
    }
  });
});
