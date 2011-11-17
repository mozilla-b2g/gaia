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
    gallery.renderThumbnail(result.value);
    result.continue();
  };
  cursorRequest.onerror = function(e) {
    console.log("Error getting all photos");
  };
  thumbnails.addEventListener("click", function(e){
    if(e.target && e.target.classList.contains("thumbnail")) {
      gallery.renderPhoto(e.target);
      e.preventDefault();
    }
  }, false);
};

/**
 *  Render Thumbnail
 */
gallery.renderThumbnail = function(photo) {
  var thumbnails = document.getElementById("thumbnails");
  thumbnails.innerHTML += '<li>' +
                          '  <a id="photo_' + photo.id + '" href="#" class="thumbnail_link">' +
                          '    <img class="thumbnail" src="data:image/jpeg;base64,' + photo.data + '">' +
                          '  </a>' +
                          '</li>';
  var thumbnail_link = document.getElementById("photo_" + photo.id);
};

/**
 * Render Photo
 */
gallery.renderPhoto = function(thumbnail) {
  // Turn thumbnail into photo
  var photo = thumbnail.cloneNode(false);
  photo.classList.remove("thumbnail");
  // Hide thumbnails and header and show photo
  var thumbnails = document.getElementById("thumbnails");
  thumbnails.classList.add("hidden");
  var header = document.getElementById("galleryHeader");
  header.classList.add("hidden");
  // Make photo full screen (taking into account screen orientation)
  if(window.innerWidth <= window.innerHeight) {
    photo.style.width = '100%';
    photo.style.height = 'auto';
  } else if(window.innerWidth > window.innerHeight) {
    photo.style.width = 'auto';
    photo.style.height = '100%';
  }
  // Insert photo into DOM and make it visible
  var frame = document.getElementById("photoFrame");
  var border = document.getElementById("photoBorder");
  border.appendChild(photo);
  frame.classList.remove("hidden");
};


/**
 * Initialise Gallery App
 */
gallery.init = function() {
  gallery.indexedDB.open();
};

window.addEventListener("DOMContentLoaded", gallery.init, false);
