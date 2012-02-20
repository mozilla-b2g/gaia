'use strict';

const SAMPLE_PHOTOS_DIR = 'sample_photos/';
const SAMPLE_THUMBNAILS_DIR = 'sample_photos/thumbnails/';
const SAMPLE_FILENAMES = ['bigcat.jpg', 'bison.jpg', 'butterfly.jpg',
    'cat.jpg', 'catterpillar.jpg', 'cow.jpg', 'duck.jpg', 'elephant.jpg',
    'fly.jpg', 'giraffe.jpg', 'grasshopper.jpg', 'hippo.jpg', 'hoverfly.jpg',
    'kangaroo.jpg', 'lizard.jpg', 'mantis.jpg', 'ostrich.jpg', 'peacock.jpg',
    'rabbit.jpg', 'sheep.jpg', 'snail.jpg', 'tortoise.jpg', 'wolf.jpg',
    'zebra.jpg'];

//-----------------------------------------------------------------------------
// XXX: share this with homescreen.  Paginated panning is a gap.
//
function createPhysicsFor(iconGrid) {
  return new DefaultPhysics(iconGrid);
}

function DefaultPhysics(iconGrid) {
  this.iconGrid = iconGrid;
  this.moved = false;
  this.touchState = { active: false, startX: 0, startY: 0 };
}

DefaultPhysics.prototype = {
  onTouchStart: function(e) {
    var touchState = this.touchState;
    this.moved = false;
    touchState.active = true;
    touchState.startX = e.pageX;
    touchState.startY = e.pageY;
    touchState.startTime = e.timeStamp;
  },
  onTouchMove: function(e) {
    var iconGrid = this.iconGrid;
    var touchState = this.touchState;
    if (touchState.active) {
      var dx = touchState.startX - e.pageX;
      if (dx !== 0) {
        iconGrid.pan(-dx);
        this.moved = true;
      }
      e.stopPropagation();
    }
  },
  onTouchEnd: function(e) {
    var touchState = this.touchState;
    if (!touchState.active)
      return;
    touchState.active = false;

    var startX = touchState.startX;
    var endX = e.pageX;
    var diffX = endX - startX;
    var dir = (diffX > 0) ? -1 : 1;

    var quick = (e.timeStamp - touchState.startTime < 200);

    var small = Math.abs(diffX) < 20;

    var flick = quick && !small;
    var tap = small;
    var drag = !quick;

    var iconGrid = this.iconGrid;
    var currentPage = iconGrid.currentPage;
    if (tap) {
      iconGrid.tap();
      return;
    } else if (flick) {
      iconGrid.setPage(currentPage + dir, 0.2);
    } else {
      if (Math.abs(diffX) < this.containerWidth / 2)
        iconGrid.setPage(currentPage, 0.2);
      else
        iconGrid.setPage(currentPage + dir, 0.2);
    }
    e.stopPropagation();
  }
};

var Mouse2Touch = {
  'mousedown': 'touchstart',
  'mousemove': 'touchmove',
  'mouseup': 'touchend'
};

var Touch2Mouse = {
  'touchstart': 'mousedown',
  'touchmove': 'mousemove',
  'touchend': 'mouseup'
};

var ForceOnWindow = {
  'touchmove': true,
  'touchend': true,
  'sleep': true
}

function AddEventHandlers(target, listener, eventNames) {
  for (var n = 0; n < eventNames.length; ++n) {
    var name = eventNames[n];
    target = ForceOnWindow[name] ? window : target;
    name = Touch2Mouse[name] || name;
    target.addEventListener(name, {
      handleEvent: function(e) {
        if (Mouse2Touch[e.type]) {
          var original = e;
          e = {
            type: Mouse2Touch[original.type],
            target: original.target,
            touches: [original],
            preventDefault: function() {
              original.preventDefault();
            }
          };
          e.changedTouches = e.touches;
        }
        return listener.handleEvent(e);
      }
    }, true);
  }
}

function RemoveEventHandlers(target, listener, eventNames) {
  for (var n = 0; n < eventNames.length; ++n) {
    var name = eventNames[n];
    target = ForceOnWindow[name] ? window : target;
    name = Touch2Mouse[name] || name;
    target.removeEventListener(name, listener);
  }
}

//-----------------------------------------------------------------------------

var Gallery = {

  currentPage: 0,
  photoTranslation: 0,          // pixels

  physics: null,

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

      this.showPhotos(target.dataset);
/*
      db.getPhoto(target.id, (function showPhotos(photo) {
        this.showPhotos(photo);
      }).bind(this));
*/
    }).bind(this));

    this.physics = createPhysicsFor(this);
    AddEventHandlers(this.photos, this, ['touchstart', 'touchmove', 'touchend']);

    this.backButton.addEventListener('click', (function backButtonClick(evt) {
      this.showThumbnails();
    }).bind(this));

    window.addEventListener('keypress', (function keyPressHandler(evt) {
      if (this.focusedPhoto && evt.keyCode == evt.DOM_VK_ESCAPE) {
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
    var blob = window.URL.createObjectURL(thumbnail.data);
    var filename = thumbnail.filename;

    var li = document.createElement('li');
    li.dataset.filename = filename;
    li.dataset.index = this.thumbnails.childNodes.length;
    li.classList.add('thumbnailHolder');

    var img = document.createElement('img');
    img.src = blob;
    img.classList.add('thumbnail');
    li.appendChild(img);

    this.thumbnails.appendChild(li);

    this.addPhoto(blob, filename);
  },

  addPhoto: function galleryAddPhoto(thumbnailBlob, filename) {
    var photos = this.photos;
    var div = document.createElement('div');
    div.id = filename;

    var img = document.createElement('img');
    img.src = thumbnailBlob;
    img.classList.add('photo');
    div.appendChild(img);

    this.photos.appendChild(div);
  },

  showThumbnails: function galleryShowThumbnails() {
    this.thumbnails.classList.remove('hidden');
    this.photos.classList.add('hidden');
    this.playerControls.classList.add('hidden');
    this.header.classList.remove('hidden');

    this.focusedPhoto = null;
    this.photoTransform = '';
  },

  showPhotos: function galleryShowPhotos(focusedPhoto) {
    this.thumbnails.classList.add('hidden');
    this.header.classList.add('hidden');
    this.photos.classList.remove('hidden');
    this.playerControls.classList.remove('hidden');

    this.currentPage = parseInt(focusedPhoto.index);

    this.pan(0);
  },

  toggleControls: function galleryToggleControls() {
    this.playerControls.classList.toggle('hidden');
  },

  // Touch handling
  pan: function galleryPan(x, duration) {
    var pages = this.photos.childNodes;
    var currentPage = this.currentPage;
    for (var p = 0; p < pages.length; ++p) {
      var page = pages[p];
      var style = page.style;
      // -1 because the pages are positioned offscreen to the right,
      // by the width of a page right
      var pageOffset = (p - currentPage) - 1;
      style.MozTransform = 'translate(-moz-calc('+ pageOffset +'00% + '+ x +'px))';
      style.MozTransition = duration ? ('all '+ duration + 's ease') : '';
    }
  },

  setPage: function(number, duration) {
    var pages = this.photos.childNodes;
    if (number < 0)
      number = 0;
    else if (number >= pages.length)
      number = pages.length - 1;
    this.currentPage = number;
    this.pan(0, duration);
  },

  tap: function() {

  },

  handleEvent: function(e) {
    var physics = this.physics;
    switch (e.type) {
    case 'touchstart':
      physics.onTouchStart(e.touches[0]);
      break;
    case 'touchmove':
      physics.onTouchMove(e.touches[0]);
      break;
    case 'touchend':
      document.releaseCapture();
      physics.onTouchEnd(e.changedTouches[0]);
      break;
    default:
      return;
    }
    e.preventDefault();
  },
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
