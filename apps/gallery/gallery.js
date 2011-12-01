var Gallery = {
  init: function galleryInit() {
    var db = this.db;
    db.open(this.showThumbnails);

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
  },

  showThumbnails: function galleryShowThumbnail(thumbnails) {
    var content = '';
    thumbnails.forEach(function showThumbnail(thumbnail) {
      var img = 'data:image/jpeg;base64,' + thumbnail.data;
      content += '<li id="' + thumbnail.id + '">' +
                 '  <a href="#">' +
                 '    <img class="thumbnail" src="' + img + '">' +
                 '  </a>' +
                 '</li>';
    });
    document.getElementById('thumbnails').innerHTML = content;
  },

  showPhoto: function galleryShowPhoto(photo) {
    ['thumbnails', 'galleryHeader'].forEach(function hideElement(id) {
      document.getElementById(id).classList.add('hidden');
    });

    ['photoFrame'].forEach(function showElement(id) {
      document.getElementById(id).classList.remove('hidden');
    });

    var border = document.getElementById('photoBorder');
    var img = 'data:image/jpeg;base64,' + photo.data;
    border.innerHTML = '<img id="photo" src="' + img + '">';

    setTimeout(function() {
      document.getElementById('photo').setAttribute('data-visible', 'true');
    }, 10);
  }
};


Gallery.db = {
  _db: null,
  open: function dbOpen(callback) {
    const DB_NAME = 'gallery';
    var request = window.mozIndexedDB.open(DB_NAME, 2);

    var empty = false;
    request.onupgradeneeded = (function onUpgradeNeeded(evt) {
      this._db = evt.target.result;
      this._initializeDB();
      empty = true;
    }).bind(this);

    request.onsuccess = (function onSuccess(evt) {
      this._db = evt.target.result;
      if (empty)
        this._fillDB();

      this.getPhotos(callback);
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
      db.createObjectStore(store, { keyPath: 'id' });
    });
  },

  _fillDB: function dbFillDB() {
    var stores = ['thumbnails', 'photos'];
    var transaction = this._db.transaction(stores, IDBTransaction.READ_WRITE);

    var samples = [sample_thumbnails, sample_photos];
    stores.forEach(function populateStore(store, index) {
      var objectStore = transaction.objectStore(store);

      var sample = samples[index];
      for (var element in sample) {
        var request = objectStore.put(sample[element]);

        request.onsuccess = function onsuccess(e) {
          console.log('Add a new element to ' + store);
        }

        request.onerror = function onerror(e) {
          console.log('Error while adding an element to: ' + store);
        }
      }
    });
  },

  getPhotos: function dbGetPhotos(callback) {
    var transaction = this._db.transaction(['thumbnails'],
                                           IDBTransaction.READ_ONLY);
    var store = transaction.objectStore('thumbnails');
    var cursorRequest = store.openCursor(IDBKeyRange.lowerBound(0));

    var thumbnails = [];
    cursorRequest.onsuccess = function onsuccess(e) {
      var result = e.target.result;
      if (!result) {
        callback(thumbnails);
        return;
      }

      thumbnails.push(result.value);
      result.continue();
    };

    cursorRequest.onerror = function onerror(e) {
      console.log('Error getting all photos');
    };
  },

  getPhoto: function dbGetPhoto(id, callback) {
    var transaction = this._db.transaction(['photos'],
                                           IDBTransaction.READ_ONLY);
    var request = transaction.objectStore('photos').get(id);
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

