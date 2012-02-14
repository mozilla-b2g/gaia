'use strict';

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

  get header() {
    delete this.header;
    return this.header = document.getElementById('header');
  },

  get thumbnails() {
    delete this.thumbnails;
    return this.thumbnails = document.getElementById('thumbnails');
  },

  get photos() {
    delete this.photos;
    return this.photos = document.getElementById('photos');
  },

  get playerControls() {
    delete this.playerControls;
    return this.playerControls = document.getElementById('player-controls');
  },

  get backButton() {
    delete this.backButton;
    return this.backButton = document.getElementById('back-button');
  },

  init: function galleryInit() {
    var db = this.db;
    db.open(this.addThumbnail.bind(this), this.getSamplePhotos.bind(this));

    this.thumbnails.addEventListener('click', (function thumbnailsClick(evt) {
      var target = evt.target;
      if (!target || !target.classList.contains('thumbnailHolder'))
        return;

      db.getPhoto(target.id, (function showPhotos(photo) {
        this.showPhotos(photo);
      }).bind(this));
    }).bind(this));

    this.photos.addEventListener('click', (function photosClick(evt) {
      this.toggleControls();
    }).bind(this));

    this.backButton.addEventListener('click', (function backButtonClick(evt) {
      this.showThumbnails();
    }).bind(this));

    window.addEventListener('keypress', (function keyPressHandler(evt) {
      if (this.photoSelected && evt.keyCode == evt.DOM_VK_ESCAPE) {
        this.showThumbnails();
        evt.preventDefault();
      }
    }).bind(this), true);
  },

  getSamplePhotos: function galleryGetSamplePhotos() {
    var self = this;
    // create separate callback function for each XHR to prevent overwriting
    for (var i in SAMPLE_FILENAMES) {
      var getSamplePhoto = function(i) {
        var thumbnailRequest = self.createPhotoRequest(SAMPLE_FILENAMES[i],
          SAMPLE_THUMBNAILS_DIR);
        var photoRequest = self.createPhotoRequest(SAMPLE_FILENAMES[i],
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

    var db = this.db;
    var self = this;
    photoRequest.onload = function photoRequestLoaded(e) {
      if (this.status != 200)
        return;

      var blob = this.response;
      var photoEntry = {
        filename: filename,
        data: blob
      };

      if (directory == SAMPLE_THUMBNAILS_DIR)
        db.savePhoto(photoEntry, 'thumbnails', self.addThumbnail.bind(self));
      else
        db.savePhoto(photoEntry, 'photos');
    };
    return photoRequest;
  },

  addThumbnail: function galleryAddThumbnail(thumbnail) {
    var li = document.createElement('li');
    li.id = thumbnail.filename;
    li.classList.add('thumbnailHolder');

    var img = document.createElement('img');
    img.src = window.URL.createObjectURL(thumbnail.data);
    img.classList.add('thumbnail');
    li.appendChild(img);

    this.thumbnails.appendChild(li);
  },

  addPhoto: function galleryAddPhoto(photo) {
    var photos = this.photos;
    var li = document.createElement('li');

    var img = document.createElement('img');
    img.src = window.URL.createObjectURL(photo.data);
    img.classList.add('photo');
    li.appendChild(img);

    this.photos.appendChild(li);
  },

  showThumbnails: function galleryShowThumbnails(thumbnails) {
    this.thumbnails.classList.remove('hidden');
    this.photos.classList.add('hidden');
    this.playerControls.classList.add('hidden');
    this.header.classList.remove('hidden');
    this.photoSelected = false;
    var photos = this.photos;
    while (photos.hasChildNodes())
      photos.removeChild(photos.firstChild);
  },

  showPhotos: function galleryShowPhotos(photo) {
    this.photoSelected = true;

    this.thumbnails.classList.add('hidden');
    this.header.classList.add('hidden');
    this.photos.classList.remove('hidden');
    this.playerControls.classList.remove('hidden');

    this.addPhoto(photo);

    var thumbnail = document.getElementById(photo.filename);
    while (thumbnail = thumbnail.nextSibling)
      this.db.getPhoto(thumbnail.id, this.addPhoto.bind(this));
  },

  toggleControls: function galleryToggleControls() {
    this.playerControls.classList.toggle('hidden');
  }
};


Gallery.db = {
  _db: null,
  open: function dbOpen(thumbnailCallback, samplePhotosCallback) {
    const DB_VERSION = 4;
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
      empty ? samplePhotosCallback() : this.getThumbnails(thumbnailCallback);
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
