/* global File */
/* exported ensureFileBackedBlob */

// HACK HACK HACK
//
// To work around bug 1063658, we need to use a file backed blob for
// pick and share activities. So if the blob passed to this function
// is not already a file, it is saved to a temporary file before the
// callback is invoked. If it is already a file, it is just passed
// directly to the callback.
//
// When bug 1079546 is fixed, this workaround can be removed.
//
function ensureFileBackedBlob(blob, callback) {
  'use strict';

  // If the blob is already a File, then we don't have to do anything
  if (blob instanceof File) {
    return callback(blob);
  }

  var TMPDIR = '.gallery/tmp';
  var storage = navigator.getDeviceStorage('pictures');

  // Clean old files out of the temporary directory, then save this blob as
  // a file in that directory, and then pass that file to the callback. Note
  // that we do the cleanup first because in the case of pick activities
  // we might not live long enough after we return a file to do this cleanup.
  cleanupTempDir(function() {
    saveAsTempFile(blob, function(file) {
      callback(file);
    });
  });

  // Clean up any old files in the temporary directory and then call callback.
  function cleanupTempDir(callback) {
    var yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    var cursor = storage.enumerate(TMPDIR);
    cursor.onsuccess = function() {
      var file = cursor.result;
      if (file) {
        if (file.lastModifiedDate < yesterday) {
          var request = storage.delete(file.name);
          // Make sure the deletion is complete before moving on.
          request.onsuccess = request.onerror = function() {
            cursor.continue();
          };
        }
        else {
          cursor.continue();
        }
      }
      else {
        // Enumeration and cleanup is done
        callback();
      }
    };
    cursor.onerror = function() {
      // We expect an error if TMPDIR does not exist yet,
      // so only report it if it is something unexpected.
      if (cursor.error.name !== 'NotFoundError') {
        console.error('Failed to clean temp directory', cursor.error.name);
      }
      callback();
    };
  }

  // Pick a random filename and save the blob with that name in the temp
  // directory. Then read it back and pass the File object to the callback.
  function saveAsTempFile(blob, callback) {
    // Pick a random number, remove the "0." prefix from it,
    // add a dot then add the mime type with the "image/" removed from it
    // to get a unique temporary filename for the image.
    var filename = TMPDIR + '/' +
      Math.random().toString().substring(2) + '.' +
      blob.type.substring(6);

    var write = storage.addNamed(blob, filename);
    write.onsuccess = function() {
      var read = storage.get(filename);
      read.onsuccess = function() {
        callback(read.result);
      };
      read.onerror = fail;
    };
    write.onerror = fail;

    // If either the read or the write operation above fails, then
    // the best we can do is to try using the memory-backed blob and
    // hope it works.
    function fail() {
      console.error('Failed to save memory-backed blob as a file.');
      callback(blob);
    }
  }
}
