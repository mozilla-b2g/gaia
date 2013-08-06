'use strict';
//
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
    var version = 0;
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

    var newname = dir + base + '_' + (version + 1) + ext;
    getUnusedFilename(storage, newname, callback);
  };
}
