define(function(require, exports) {
'use strict';

var core = require('core');

exports.get = function(id) {
  var settingStore = core.storeFactory.get('Setting');
  return settingStore.getValue(id);
};

exports.set = function(id, value) {
  var settingStore = core.storeFactory.get('Setting');
  return settingStore.set(id, value);
};

exports.observe = function(stream, id) {
  var settingStore = core.storeFactory.get('Setting');

  var writeOnChange = function(value) {
    stream.write(value);
  };

  settingStore.on(`${id}Change`, writeOnChange);

  stream.cancel = function() {
    settingStore.off(`${id}Change`, writeOnChange);
  };

  exports.get(id).then(writeOnChange);
};

});
