'use strict';

//
// With the removal of composite storage, this function emulates
// the composite storage enumeration (i.e. return files from
// all of the storage areas).
function enumerateAll(storages, dir, options) {
  var storageIndex = 0;
  var ds_cursor = null;

  var cursor = {
    continue: function cursor_continue() {
      ds_cursor.continue();
    }
  };

  function enumerateNextStorage() {
    // The || {} on the next line is required to make enumerate work properly
    // on v1-train.
    ds_cursor = storages[storageIndex].enumerate(dir, options || {});
    ds_cursor.onsuccess = onsuccess;
    ds_cursor.onerror = onerror;
  };

  function onsuccess(e) {
    cursor.result = e.target.result;
    if (!cursor.result) {
      storageIndex++;
      if (storageIndex < storages.length) {
        enumerateNextStorage();
        return;
      }
      // If we've run out of storages, then we fall through and call
      // onsuccess with the null result.
    }
    if (cursor.onsuccess) {
      try {
        cursor.onsuccess(e);
      } catch (err) {
        console.warn('enumerateAll onsuccess threw', err);
      }
    }
  };

  function onerror(e) {
    cursor.error = e.target.error;
    if (cursor.onerror) {
      try {
        cursor.onerror(e);
      } catch (err) {
        console.warn('enumerateAll onerror threw', err);
      }
    }
  };

  enumerateNextStorage();
  return cursor;
}
