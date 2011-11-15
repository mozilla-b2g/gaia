var gallery = {};
var indexedDB = window.mozIndexedDB;

gallery.indexedDB = {};
gallery.indexedDB.db = null;

/**
 * Database Error
 */
gallery.indexedDB.onerror = function(e) {
  console.log("Database error: ", e);
}

/**
 * Open Database
 */
gallery.indexedDB.open = function() {
  var request = indexedDB.open("gallery");
  
  request.onsuccess = function(e) {
    var version = "1.0";
    gallery.indexedDB.db = e.target.result;
    var db = gallery.indexedDB.db;

    // Create/replace object store if database version is old
    if(version != db.version) {
      var setVrequest = db.setVersion(version);
      setVrequest.onerror = gallery.indexedDB.onerror;

      setVrequest.onsuccess = function(e) {
        if(db.objectStoreNames.contains("gallery")) {
          db.deleteObjectStore("gallery");
        }

        var store = db.createObjectStore("gallery", {keyPath: "id"});
        gallery.indexedDB.populateSampleData();
      };
    }
    gallery.indexedDB.getAllPhotos();
  };

  request.onerror = gallery.indexedDB.onerror;
};

/**
 * Populate Sample Data
 */
gallery.indexedDB.populateSampleData = function() {
  var db = gallery.indexedDB.db;
  var trans = db.transaction(["gallery"], IDBTransaction.READ_WRITE);
  var store = trans.objectStore("gallery");

  for(photoID in sample_data) {
    var request = store.put(sample_data[photoID]);
    request.onsuccess = function(e) {
      console.log("added photo");
     }
    request.onerror = function(e) {
      console.log("error adding photo");
    }
  }
  gallery.indexedDB.getAllPhotos();
  
};

/**
 * Get All Photos
 */
gallery.indexedDB.getAllPhotos = function() {
  var thumbnails = document.getElementById("thumbnails");
  thumbnails.innerHTML = "";

  var db = gallery.indexedDB.db;
  var trans = db.transaction(["gallery"], IDBTransaction.READ_WRITE);
  var store = trans.objectStore("gallery");

  var keyRange = IDBKeyRange.lowerBound(0);
  var cursorRequest = store.openCursor(keyRange);

  cursorRequest.onsuccess = function(e) {
    var result = e.target.result;
    if(!!result == false) {
      return;
    }
    gallery.renderPhoto(result.value);
    result.continue();
  };
  cursorRequest.onerror = function(e) {
    console.log("Error getting all photos");
  };
};

/**
 *  Render Photo
 */
gallery.renderPhoto = function(photo) {
  var thumbnails = document.getElementById("thumbnails");
  thumbnails.innerHTML += '<li><a href="#" class="thumbnail_link"><img class="thumbnail" src="data:image/jpeg;base64,' + photo.data + '"></a></li>'
};


/**
 * Initialise Gallery App
 */
gallery.init = function() {
  gallery.indexedDB.open();
};

window.addEventListener("DOMContentLoaded", gallery.init, false);
