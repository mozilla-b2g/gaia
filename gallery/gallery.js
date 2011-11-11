window.onload = function() {
  var thumbnails = document.getElementById("thumbnails");
  
  for(photo in photos) {
    thumbnails.innerHTML += '<li><a href="#" class="thumbnail_link"><img class="thumbnail" src="data:image/jpeg;base64,' + photos[photo].data + '"></a></li>'
  }
};

/* Database code will not work due to https://bugzilla.mozilla.org/show_bug.cgi?id=643318

// Open connection to database
var db;
var request = mozIndexedDB.open("gaia-gallery");
request.onerror = function(event) {
  alert("IndexedDB returned an error when trying to open the database");
};
request.onsuccess = function(event) {
  db = request.result;
};
db.onerror = function(event) {
  alert("Database error: " + event.target.errorCode);
};

// Create object store and insert sample base64 encoded JPEGs
if (db.version != "1.0") {
  var request = db.setVersion("1.0");
  request.onsuccess = function(event) {
    var objectStore = db.createObjectSTore("photos", { keyPath: "id" });
    for(photo in photos) {
      objectStore.add(photos[photo]);
    }
  }
};

// Try to read back the data into an array
var retrieved_photos = [];
objectStore.openCursor().onsuccess = function(event) {
  var cursor = event.target.result;
  if(cursor) {
    retrieved_photos.push(cursor.value);
    cursor.continue();
  }
}*/
