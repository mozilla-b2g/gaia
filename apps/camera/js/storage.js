define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var evt = require('vendor/evt');
var debug = require('debug')('storage');
var createFilename = require('dcf').createDCFFilename;

/**
 * Expose `Storage`
 */

module.exports = Storage;

evt.mix(Storage.prototype);

function Storage() {
  this.check = this.check.bind(this);
  this.onStorageChange = this.onStorageChange.bind(this);
  this.video = navigator.getDeviceStorage('videos');
  this.image = navigator.getDeviceStorage('pictures');
  this.image.addEventListener('change', this.onStorageChange);
  debug('initialized');
}

Storage.prototype.addImage = function(blob, options, done) {
  if (typeof options === 'function') {
    done = options;
    options = {};
  }

  done = done || function() {};
  var filepath = options && options.filepath;
  var self = this;
  debug('add image', filepath);

  // Create a filepath if
  // one hasn't been given.
  if (!filepath) {
    debug('creating filename');
    createFilename(this.image, 'image', onCreated);
  } else {
    onCreated(filepath);
  }

  function onCreated(filepath) {
    var req = self.image.addNamed(blob, filepath);
    req.onerror = function() { self.emit('error'); };
    req.onsuccess = function(e) {
      var absolutePath = e.target.result;
      debug('image stored', filepath);
      done(filepath, absolutePath);
    };
  }
};

Storage.prototype.addVideo = function(blob, done) {
  debug('adding video');
  var storage = this.video;
  var self = this;

  createFilename(this.video, 'video', onCreated);

  function onCreated(filepath) {
    debug('filename created', filepath);
    var req = storage.addNamed(blob, filepath);
    req.onerror = onError;
    req.onsuccess = onStored;

    function onStored(e) {
      debug('video stored', e.target.result);
      var absolutePath = e.target.result;
      var req = storage.get(filepath);
      req.onerror = onError;
      req.onsuccess = onGotBlob;

      function onGotBlob() {
        var blob = req.result;
        done(blob, filepath, absolutePath);

        // Healthcheck the storage
        // *after* the callback, to give
        // the user chance to delete
        // the old blob.
        self.check();
      }
    }
  }

  function onError() {
    self.emit('error');
  }
};

Storage.prototype.onStorageChange = function(e) {
  debug('state change: %s', e.reason);
  var value = e.reason;

  // Emit an `itemdeleted` event to
  // allow parts of the UI to update.
  if (value === 'deleted') {
    this.emit('itemdeleted', { path: e.path });
  } else {
    this.setState(value);
  }

  // Check storage
  // has spare capacity
  this.check();
};

Storage.prototype.setState = function(value) {
  this.state = value;
  debug('set state: %s', value);
  this.emit('statechange', value);
};

Storage.prototype.setMaxFileSize = function(maxFileSize) {
  this.maxFileSize = maxFileSize;
  debug('max file size set: %d', maxFileSize);
};

Storage.prototype.check = function(done) {
  debug('check');

  var self = this;
  done = done || function() {};

  this.getState(function(result) {
    self.setState(result);

    if (!self.available()) {
      onComplete('unhealthy');
      return;
    }

    self.isSpace(function(result) {
      if (!result) { self.setState('nospace'); }
      onComplete('healthy');
    });
  });

  function onComplete(state) {
    self.emit('checked');
    self.emit('checked:' + state);
  }
};

Storage.prototype.isSpace = function(done) {
  var maxFileSize = this.maxFileSize;
  this.image
    .freeSpace()
    .onsuccess = function(e) {
      var freeSpace = e.target.result;
      var result = freeSpace > maxFileSize;
      debug('is space: %s', result, freeSpace, maxFileSize);
      done(result);
    };
};

Storage.prototype.getState = function(done) {
  this.image
    .available()
    .onsuccess = function(e) {
      done(e.target.result);
    };
};

Storage.prototype.available = function() {
  return this.state === 'available';
};

});
