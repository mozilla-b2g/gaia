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
    var version = "1.1";
    gallery.indexedDB.db = e.target.result;
    var db = gallery.indexedDB.db;

    // Create/replace object store if database version is old
    if(version != db.version) {
      var setVrequest = db.setVersion(version);
      setVrequest.onerror = gallery.indexedDB.onerror;

      setVrequest.onsuccess = function(e) {
        if(db.objectStoreNames.contains("thumbnails")) {
          db.deleteObjectStore("thumbnails");
        }
        var store = db.createObjectStore("thumbnails", {keyPath: "id"});
        if(db.objectStoreNames.contains("photos")) {
          db.deleteObjectStore("photos");
        }
        var store = db.createObjectStore("photos", {keyPath: "id"});
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
  // Set up the transaction
  var db = gallery.indexedDB.db;
  var trans = db.transaction(["thumbnails", "photos"], IDBTransaction.READ_WRITE);
 
  // Store thumbnails
  var thumbnail_store = trans.objectStore("thumbnails");  
  for(photoID in sample_thumbnails) {
    var request = thumbnail_store.put(sample_thumbnails[photoID]);
    request.onsuccess = function(e) {
      console.log("added thumbnail");
     }
    request.onerror = function(e) {
      console.log("error adding thumbnail");
    }
  }
  
  // Store photos
  photo_store = trans.objectStore("photos");
  for(photoID in sample_photos) {
    var request = photo_store.put(sample_photos[photoID]);
    request.onsuccess = function(e) {
      console.log("added photo");
     }
    request.onerror = function(e) {
      console.log("error adding photo");
    }
  }

  // Display all thumbnails
  gallery.indexedDB.getAllPhotos();
  
};

/**
 * Get All Photos
 */
gallery.indexedDB.getAllPhotos = function() {
  var thumbnails = document.getElementById("thumbnails");
  thumbnails.innerHTML = "";

  var db = gallery.indexedDB.db;
  var trans = db.transaction(["thumbnails"], IDBTransaction.READ_ONLY);
  var store = trans.objectStore("thumbnails");

  var keyRange = IDBKeyRange.lowerBound(0);
  var cursorRequest = store.openCursor(keyRange);

  cursorRequest.onsuccess = function(e) {
    var result = e.target.result;
    if(!!result == false) {
      return;
    }
    gallery.renderThumbnail(result.value);
    result.continue();
  };
  cursorRequest.onerror = function(e) {
    console.log("Error getting all photos");
  };
  thumbnails.addEventListener("click", function(e){
    if(e.target && e.target.classList.contains("thumbnail")) {
      gallery.indexedDB.getPhoto(e.target.parentNode.id);
      e.preventDefault();
    }
  }, false);
};

/**
 * Get Photo
 */
gallery.indexedDB.getPhoto = function(photoID) {
  var db = gallery.indexedDB.db;
  var trans = db.transaction(["photos"], IDBTransaction.READ_ONLY);
  var store = trans.objectStore("photos");
  var request = store.get(photoID);
  request.onerror = function(e) {
    console.log("Error getting photo");
  };
  request.onsuccess = function(e) {
    gallery.renderPhoto(request.result);
  }
};

/**
 *  Render Thumbnail
 */
gallery.renderThumbnail = function(photo) {
  var thumbnails = document.getElementById("thumbnails");
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
gallery.renderPhoto = function(photo) {
  // Add photo into DOM
  var border = document.getElementById("photoBorder");
  border.innerHTML += '<img id="photo" src="data:image/jpeg;base64,' + photo.data + '">';

  // Hide thumbnails and header and show photo
  var thumbnails = document.getElementById("thumbnails");
  thumbnails.classList.add("hidden");
  var header = document.getElementById("galleryHeader");
  header.classList.add("hidden");

  // Make photo visible
  var frame = document.getElementById("photoFrame");
  frame.classList.remove("hidden");
  setTimeout("gallery.zoomIn()",100);
};


/**
 * Zoom in to Photo
 */
gallery.zoomIn = function() {
  var photo = document.getElementById("photo");
  photo.style.width = '100%';
};


/**
 * Initialise Gallery App
 */
gallery.init = function() {
  gallery.indexedDB.open();
};

window.addEventListener("DOMContentLoaded", gallery.init, false);
