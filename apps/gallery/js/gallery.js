'use strict';

window.addEventListener('DOMContentLoaded', function() {
  var dbschema = {
    version: 6,
    name: 'gallery',
    storename: 'photos',
    keyprop: 'key',
    blobprops: ['photo', 'thumbnail'],
    objects: [
      {
        key: 1,
        photo: 'sample_photos/bigcat.jpg',
        thumbnail: 'sample_photos/thumbnails/bigcat.jpg'
      },
      {
        key: 2,
        photo: 'sample_photos/bison.jpg',
        thumbnail: 'sample_photos/thumbnails/bison.jpg'
      },
      {
        key: 3,
        photo: 'sample_photos/butterfly.jpg',
        thumbnail: 'sample_photos/thumbnails/butterfly.jpg'
      },
      {
        key: 4,
        photo: 'sample_photos/cat.jpg',
        thumbnail: 'sample_photos/thumbnails/cat.jpg'
      },
      {
        key: 5,
        photo: 'sample_photos/caterpillar.jpg',
        thumbnail: 'sample_photos/thumbnails/caterpillar.jpg'
      },
      {
        key: 6,
        photo: 'sample_photos/cow.jpg',
        thumbnail: 'sample_photos/thumbnails/cow.jpg'
      },
      {
        key: 7,
        photo: 'sample_photos/duck.jpg',
        thumbnail: 'sample_photos/thumbnails/duck.jpg'
      },
      {
        key: 8,
        photo: 'sample_photos/elephant.jpg',
        thumbnail: 'sample_photos/thumbnails/elephant.jpg'
      },
      {
        key: 9,
        photo: 'sample_photos/fly.jpg',
        thumbnail: 'sample_photos/thumbnails/fly.jpg'
      },
      {
        key: 10,
        photo: 'sample_photos/giraffe.jpg',
        thumbnail: 'sample_photos/thumbnails/giraffe.jpg'
      },
      {
        key: 11,
        photo: 'sample_photos/grasshopper.jpg',
        thumbnail: 'sample_photos/thumbnails/grasshopper.jpg'
      },
      {
        key: 12,
        photo: 'sample_photos/hippo.jpg',
        thumbnail: 'sample_photos/thumbnails/hippo.jpg'
      },
      {
        key: 13,
        photo: 'sample_photos/hoverfly.jpg',
        thumbnail: 'sample_photos/thumbnails/hoverfly.jpg'
      },
      {
        key: 14,
        photo: 'sample_photos/kangaroo.jpg',
        thumbnail: 'sample_photos/thumbnails/kangaroo.jpg'
      },
      {
        key: 15,
        photo: 'sample_photos/lizard.jpg',
        thumbnail: 'sample_photos/thumbnails/lizard.jpg'
      },
      {
        key: 16,
        photo: 'sample_photos/mantis.jpg',
        thumbnail: 'sample_photos/thumbnails/mantis.jpg'
      },
      {
        key: 17,
        photo: 'sample_photos/ostrich.jpg',
        thumbnail: 'sample_photos/thumbnails/ostrich.jpg'
      },
      {
        key: 18,
        photo: 'sample_photos/peacock.jpg',
        thumbnail: 'sample_photos/thumbnails/peacock.jpg'
      },
      {
        key: 19,
        photo: 'sample_photos/rabbit.jpg',
        thumbnail: 'sample_photos/thumbnails/rabbit.jpg'
      },
      {
        key: 20,
        photo: 'sample_photos/sheep.jpg',
        thumbnail: 'sample_photos/thumbnails/sheep.jpg'
      },
      {
        key: 21,
        photo: 'sample_photos/snail.jpg',
        thumbnail: 'sample_photos/thumbnails/snail.jpg'
      },
      {
        key: 22,
        photo: 'sample_photos/tortoise.jpg',
        thumbnail: 'sample_photos/thumbnails/tortoise.jpg'
      },
      {
        key: 23,
        photo: 'sample_photos/wolf.jpg',
        thumbnail: 'sample_photos/thumbnails/wolf.jpg'
      },
      {
        key: 24,
        photo: 'sample_photos/zebra.jpg',
        thumbnail: 'sample_photos/thumbnails/zebra.jpg'
      }
    ]
  };

  // Find the UI elements we care about
  var header = $('header');
  var thumbnails = $('thumbnails');
  var photos = $('photos');
  var playerControls = $('player-controls');
  var backButton = $('back-button');

  // Start off in the thumbnail display
  showThumbnails();

  // Set up the database of sample photos
  var db = new SimpleDB(dbschema);

  // Loop through sample photos in the database and create thumbnails for each
  db.eachObject(function(record) {
    var key = record.key;
    var thumbnailURL = URL.createObjectURL(record.thumbnail);
    var thumbnail = elt('li',
                        {'class': 'thumbnailHolder' },
                        elt('img',
                            { src: thumbnailURL, 'class': 'thumbnail'}));

    thumbnail.addEventListener('click', function() {
      showPhoto(key);
    });

    thumbnails.appendChild(thumbnail);
  });

  // Handle the phone's back button to take us back to thumbnail view
  window.addEventListener('keypress', function(evt) {
    // If it is the back button and the thumbnails are hidden
    if (evt.keyCode == evt.DOM_VK_ESCAPE &&
        thumbnails.classList.contains('hidden')) {
      showThumbnails();
      evt.preventDefault();
    }
  });

  // The app also has a back button to go back to thumbnail view
  backButton.addEventListener('click', function() {
    showThumbnails();
  });

  // Handle clicks on the photos by showing or hiding the player controls
  photos.addEventListener('click', function() {
    playerControls.classList.toggle('hidden');
  });

  function showThumbnails() {
    // Show the header and thumbnails container.
    header.classList.remove('hidden');
    thumbnails.classList.remove('hidden');
    // Hide the photo container and controls
    photos.classList.add('hidden');
    playerControls.classList.add('hidden');
    // Remove any content in the photos container
    photos.textContent = '';
  }

  function showPhoto(key) {
    // Hide header and thumbnails container
    header.classList.add('hidden');
    thumbnails.classList.add('hidden');

    // Show photo container and controls
    photos.classList.remove('hidden');
    playerControls.classList.remove('hidden');

    // Now look up the photo associated with the key and display it
    db.getObject(key, function(record) {
      var photoURL = URL.createObjectURL(record.photo);
      photos.appendChild(elt('li', {},
                             elt('img', {
                               src: photoURL,
                               'class': 'photo'
                             })));
    });
  }
});
