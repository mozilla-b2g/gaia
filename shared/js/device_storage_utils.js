// Get a DeviceStorage object for the specified kind of storage and, if it
// is available, and if the specified number of bytes of storage space are
// free then asynchronously pass the DeviceStorage object to the success
// callback. Otherwise, invoke the error callback, if one is specified. If
// the error callback is called because device storage is not available, the
// argument will be a DeviceStorage status string like 'unavailable' or
// 'shared'. If the error callback is called because there is not enough
// storage space, the argument will be the number of bytes that are available.
function getStorageIfAvailable(kind, size, success, error) {
  var storage = navigator.getDeviceStorage(kind);
  storage.available().onsuccess = function(e) {
    if (e.target.result !== 'available') {
      if (error)
        error(e.target.result);
    }
    else {
      storage.freeSpace().onsuccess = function(e) {
        if (e.target.result < size) {
          if (error)
            error(e.target.result);
        }
        else {
          success(storage);
        }
      };
    }
  };
}

// This utility function helps avoid overwriting existing files.
// If no file with the specified name exists in the specified storage, pass
// the name to the callback. Otherwise, add a version number to the name
// and try again. Once a name is found that does not already exist, pass it
// to the callback. If the initial name 'base.ext' does not exist, then new
// names of the form 'base_n.ext', where n is a number are tried.
function getUnusedFilename(storage, name, callback) {
  var getreq = storage.get(name);
  getreq.onerror = function() {
    // We get this error if the file does not already exist, and that
    // is what we want
    callback(name);
  };
  getreq.onsuccess = function() {
    var p = name.lastIndexOf('/');
    var dir = name.substring(0, p + 1);
    var file = name.substring(p + 1);
    p = file.lastIndexOf('.');
    if (p === -1)
      p = file.length;
    var ext = file.substring(p);
    var base = file.substring(0, p);
    var parts = base.match(/^(.*)_(\d{1,2})$/);
    if (parts) {
      base = parts[1];
      version = parseInt(parts[2]);
    }
    else {
      version = 0;
    }

    var newname = dir + base + '_' + (version + 1) + ext;
    getUnusedFilename(storage, newname, callback);
  };
}
