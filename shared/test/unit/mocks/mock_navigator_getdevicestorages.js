console.time("mock_navigator_getdevicestorages.js");
'use strict';
/* global MockGetDeviceStorage */
/* exported MockGetDeviceStorages */

var MockGetDeviceStorages = function(storageName) {
  return [MockGetDeviceStorage()];
};
console.timeEnd("mock_navigator_getdevicestorages.js");
