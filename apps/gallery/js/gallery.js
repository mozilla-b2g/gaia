const SAMPLE_PHOTOS_DIR = 'sample_photos/';
const SAMPLE_THUMBNAILS_DIR = 'sample_photos/thumbnails/';
const SAMPLE_FILENAMES = ['bigcat.jpg', 'bison.jpg', 'butterfly.jpg',
    'cat.jpg', 'catterpillar.jpg', 'cow.jpg', 'duck.jpg', 'elephant.jpg',
    'fly.jpg', 'giraffe.jpg', 'grasshopper.jpg', 'hippo.jpg', 'hoverfly.jpg',
    'kangaroo.jpg', 'lizard.jpg', 'mantis.jpg', 'ostrich.jpg', 'peacock.jpg',
    'rabbit.jpg', 'sheep.jpg', 'snail.jpg', 'tortoise.jpg', 'wolf.jpg',
    'zebra.jpg'];

var Gallery = {
  photoSelected: false,
  init: function galleryInit() {
    var db = this.db;
    db.open(this.addThumbnail);
    var self = this;
    var thumbnails = document.getElementById('thumbnails');

    thumbnails.addEventListener('click', function thumbnailsClick(evt) {
      var target = evt.target;
      if (!target)
        return;

      db.getPhoto(target.id, function showPhoto(photo) {
        self.showPhoto(photo);
      });
    });

    window.addEventListener('keypress', function keyPressHandler(evt) {
      if (Gallery.photoSelected && evt.keyCode == evt.DOM_VK_ESCAPE) {
        Gallery.showThumbnails();
        evt.preventDefault();
      }
    });
  },

  getSamplePhotos: function galleryGetSamplePhotos() {
    // create separate callback function for each XHR to prevent overwriting
    for (var i in SAMPLE_FILENAMES) {
      var getSamplePhoto = function(i) {
        var thumbnailRequest = Gallery.createPhotoRequest(SAMPLE_FILENAMES[i],
          SAMPLE_THUMBNAILS_DIR);
        var photoRequest = Gallery.createPhotoRequest(SAMPLE_FILENAMES[i],
          SAMPLE_PHOTOS_DIR);
        thumbnailRequest.send();
        photoRequest.send();
      };
      getSamplePhoto(i);
    }
  },

  createPhotoRequest: function galleryCreatePhotoRequest(filename, directory) {
    var photoRequest = new XMLHttpRequest();
    var photoURL = directory + filename;
    photoRequest.open('GET', photoURL, true);
    photoRequest.responseType = 'blob';
    photoRequest.onload = function photoRequestLoaded(e) {
      if (this.status != 200)
        return;

      var blob = this.response;
      var photoEntry = {
        filename: filename,
        data: blob
      };
      if (directory == SAMPLE_THUMBNAILS_DIR)
        Gallery.db.savePhoto(photoEntry, 'thumbnails', Gallery.addThumbnail);
      else
        Gallery.db.savePhoto(photoEntry, 'photos');
    };
    return photoRequest;
  },

  addThumbnail: function galleryAddThumbnail(thumbnail) {
    var thumbnails = this.thumbnails;
    var li = document.createElement('li');
    li.id = thumbnail.filename;

    var a = document.createElement('a');
    a.href = '#';

    var img = document.createElement('img');
    img.src = window.URL.createObjectURL(thumbnail.data);
    img.classList.add('thumbnail');
    a.appendChild(img);
    li.appendChild(a);

    document.getElementById('thumbnails').appendChild(li);
  },

  showThumbnails: function galleryShowThumbnails(thumbnails) {
    ['thumbnails'].forEach(function hideElement(id) {
      document.getElementById(id).classList.remove('hidden');
    });

    ['photoFrame'].forEach(function showElement(id) {
      document.getElementById(id).classList.add('hidden');
    });
    Gallery.photoSelected = false;
  },

  showPhoto: function galleryShowPhoto(photo) {
    ['thumbnails'].forEach(function hideElement(id) {
      document.getElementById(id).classList.add('hidden');
    });

    ['photoFrame'].forEach(function showElement(id) {
      document.getElementById(id).classList.remove('hidden');
    });

    var imgURL = window.URL.createObjectURL(photo.data);
    document.getElementById('photoBorder').innerHTML =
      '<img id="photo" src="' + imgURL + '">';

    setTimeout(function() {
      document.getElementById('photo').setAttribute('data-visible', 'true');
    }, 100);

    Gallery.photoSelected = true;
  }
};


Gallery.db = {
  _db: null,
  open: function dbOpen(callback) {
    const DB_VERSION = 3;
    const DB_NAME = 'gallery';
    var request = window.mozIndexedDB.open(DB_NAME, DB_VERSION);
    var empty = false;

    request.onupgradeneeded = (function onUpgradeNeeded(evt) {
      this._db = evt.target.result;
      this._initializeDB();
      empty = true;
    }).bind(this);

    request.onsuccess = (function onSuccess(evt) {
      this._db = evt.target.result;
      if (empty)
        Gallery.getSamplePhotos();
      else
        this.getThumbnails(callback);
      window.parent.postMessage('appready', '*');
    }).bind(this);

    request.onerror = (function onDatabaseError(error) {
      console.log('Database error: ', error);
    }).bind(this);
  },

  _initializeDB: function dbInitializeDB() {
    var db = this._db;
    var stores = ['thumbnails', 'photos'];
    stores.forEach(function createStore(store) {
      if (db.objectStoreNames.contains(store))
        db.deleteObjectStore(store);
      db.createObjectStore(store, { keyPath: 'filename' });
    });
  },

  savePhoto: function dbSavePhoto(entry, store, callback) {
    var transaction = this._db.transaction(store, IDBTransaction.READ_WRITE);
    var objectStore = transaction.objectStore(store);
    var request = objectStore.put(entry);

    request.onsuccess = (function onsuccess(e) {
      console.log('Added the photo ' + entry.filename + ' to the ' +
        store + ' store');
      if (callback)
        callback(entry);
    }).bind(this);

    request.onerror = function onerror(e) {
      console.log('Error while adding a photo to the store');
    };
  },

  getThumbnails: function dbGetThumbnails(callback) {
    var transaction = this._db.transaction(['thumbnails'],
                                           IDBTransaction.READ_ONLY);
    var store = transaction.objectStore('thumbnails');
    var cursorRequest = store.openCursor(IDBKeyRange.lowerBound(0));

    var thumbnails = [];
    cursorRequest.onsuccess = function onsuccess(e) {
      var result = e.target.result;
      if (!result) {
        return;
      }
      callback(result.value);
      result.continue();
    };

    cursorRequest.onerror = function onerror(e) {
      console.log('Error getting all photos');
    };
  },

  getPhoto: function dbGetPhoto(filename, callback) {
    var transaction = this._db.transaction(['photos'],
                                           IDBTransaction.READ_ONLY);
    var request = transaction.objectStore('photos').get(filename);
    request.onsuccess = function onsuccess(e) {
      callback(e.target.result);
    };

    request.onerror = function onerror(e) {
      console.log('Error retrieving photo: ' + e);
    };
  }
};

window.addEventListener('DOMContentLoaded', function GalleryInit() {
  Gallery.init();
});
