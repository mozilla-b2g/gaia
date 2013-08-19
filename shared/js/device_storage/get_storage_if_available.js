'use strict';
//
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
