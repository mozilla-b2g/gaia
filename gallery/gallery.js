var gallery = {};
var indexedDB = window.mozIndexedDB;

gallery.indexedDB = {};
gallery.indexedDB.db = null;
gallery.indexedDB.upgraded = false;

/**
 * Database Error
 */
gallery.indexedDB.onerror = function onerror(e) {
  console.log('Database error: ', e);
}

/**
 * Create IndexedDB Stores
 */
gallery.indexedDB.createStores = function createStores() {
    var db = gallery.indexedDB.db;

    if (db.objectStoreNames.contains('thumbnails'))
      db.deleteObjectStore('thumbnails');

    db.createObjectStore('thumbnails', {keyPath: 'id'});

    if (db.objectStoreNames.contains('photos'))
      db.deleteObjectStore('photos');

    db.createObjectStore('photos', {keyPath: 'id'});
}

/**
 * Open Database
 */
gallery.indexedDB.open = function open() {
  var request = indexedDB.open('gallery', 2);

  // For Firefox 11 (Nightly)
  request.onupgradeneeded = function onupgradeneeded(e) {
    gallery.indexedDB.db = e.target.result;
    gallery.indexedDB.createStores();
    gallery.indexedDB.upgraded = true;
  }

  request.onsuccess = function onsuccess(e) {
    gallery.indexedDB.db = e.target.result;
    
    // For Firefox 8
    var db = gallery.indexedDB.db;
    if (typeof db.setVersion == 'function') {
      var version = '2';
      var db = gallery.indexedDB.db;
      if (version != db.version) {
        var setVersionRequest = db.setVersion(version);
        setVersionRequest.onerror = gallery.indexedDB.onerror;
  
        setVersionRequest.onsuccess = function onsucess(e) {
          gallery.indexedDB.createStores();
          gallery.indexedDB.populateSampleData();
        };
      }
    }

    if (gallery.indexedDB.upgraded) {
      gallery.indexedDB.populateSampleData();
      gallery.indexedDB.upgraded = false;
    } else {
      gallery.indexedDB.getAllPhotos();
    }
  }

  request.onerror = gallery.indexedDB.onerror;
};

/**
 * Populate Sample Data
 */
gallery.indexedDB.populateSampleData = function populateSampleData() {
  // Set up the transaction
  var db = gallery.indexedDB.db;
  var trans = db.transaction(['thumbnails', 'photos'], IDBTransaction.READ_WRITE);
 
  // Store thumbnails
  var thumbnail_store = trans.objectStore('thumbnails');  
  for (photoID in sample_thumbnails) {
    var request = thumbnail_store.put(sample_thumbnails[photoID]);
    request.onsuccess = function onsuccess(e) {
      console.log('added thumbnail');
     }
    request.onerror = function onerror(e) {
      console.log('error adding thumbnail');
    }
  }
  
  // Store photos
  photo_store = trans.objectStore('photos');
  for (photoID in sample_photos) {
    var request = photo_store.put(sample_photos[photoID]);
    request.onsuccess = function onsuccess(e) {
      console.log('added photo');
     }
    request.onerror = function onerror(e) {
      console.log('error adding photo');
    }
  }

  // Display all thumbnails
  gallery.indexedDB.getAllPhotos();
  
};

/**
 * Get All Photos
 */
gallery.indexedDB.getAllPhotos = function getAllPhotos() {
  var thumbnails = document.getElementById('thumbnails');
  thumbnails.innerHTML = '';

  var db = gallery.indexedDB.db;
  var trans = db.transaction(['thumbnails'], IDBTransaction.READ_ONLY);
  var store = trans.objectStore('thumbnails');

  var keyRange = IDBKeyRange.lowerBound(0);
  var cursorRequest = store.openCursor(keyRange);

  cursorRequest.onsuccess = function onsuccess(e) {
    var result = e.target.result;
    if (!!result == false) {
      return;
    }
    gallery.renderThumbnail(result.value);
    result.continue();
  };
  cursorRequest.onerror = function onerror(e) {
    console.log('Error getting all photos');
  };
  thumbnails.addEventListener('click', function clickListener(e){
    if (e.target && e.target.classList.contains('thumbnail')) {
      gallery.indexedDB.getPhoto(e.target.parentNode.id);
      e.preventDefault();
    }
  }, false);
};

/**
 * Get Photo
 */
gallery.indexedDB.getPhoto = function getPhoto(photoID) {
  var db = gallery.indexedDB.db;
  var trans = db.transaction(['photos'], IDBTransaction.READ_ONLY);
  var store = trans.objectStore('photos');
  var request = store.get(photoID);
  request.onerror = function onerror(e) {
    console.log('Error getting photo');
  };
  request.onsuccess = function onsuccess(e) {
    gallery.renderPhoto(request.result);
  }
};

/**
 *  Render Thumbnail
 */
gallery.renderThumbnail = function renderThumbnail(photo) {
  var thumbnails = document.getElementById('thumbnails');
  thumbnails.innerHTML += '<li>' +
                          '  <a id="'+ photo.id + '" href="#" class="thumbnail_link">' +
                          '    <img class="thumbnail" src="data:image/jpeg;base64,' + photo.data + '">' +
                          '  </a>' +
                          '</li>';
  var thumbnail_link = document.getElementById(photo.id);
};

/**
 * Render Photo
 */
gallery.renderPhoto = function renderPhoto(photo) {
  var border = document.getElementById('photoBorder');
  border.innerHTML += '<img id="photo" src="data:image/jpeg;base64,' + photo.data + '">';

  // Hide thumbnails and header and show photo
  var thumbnails = document.getElementById('thumbnails');
  thumbnails.classList.add('hidden');
  var header = document.getElementById('galleryHeader');
  header.classList.add('hidden');

  // Make photo visible
  var frame = document.getElementById('photoFrame');
  frame.classList.remove('hidden');
  setTimeout('gallery.zoomIn()',100);
};


/**
 * Zoom in to Photo
 */
gallery.zoomIn = function zoomIn() {
  var photo = document.getElementById('photo');
  photo.style.width = '100%';
};


/**
 * Initialise Gallery App
 */
gallery.init = function init() {
  gallery.indexedDB.open();
};

window.addEventListener('DOMContentLoaded', gallery.init, false);
