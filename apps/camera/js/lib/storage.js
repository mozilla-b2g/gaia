define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var createFilename = require('lib/dcf').createDCFFilename;
var debug = require('debug')('storage');
var events = require('vendor/evt');

/**
 * Expose `Storage`
 */

module.exports = Storage;

// Mixin event emitter
events(Storage.prototype);

function Storage() {
  this.maxFileSize = 0;
  this.check = this.check.bind(this);
  this.onStorageChange = this.onStorageChange.bind(this);
  this.video = navigator.getDeviceStorage('videos');
  this.image = navigator.getDeviceStorage('pictures');
  this.image.addEventListener('change', this.onStorageChange);
  this.createVideoFilepath = this.createVideoFilepath.bind(this);
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

/**
 * Create a new video filepath.
 *
 * The CameraControl API will not
 * automatically create directories
 * for the new file if they do not
 * exist.
 *
 * So we write a dummy file to the
 * same directory via DeviceStorage
 * to ensure that the directory exists
 * before attempting to record to this
 * filepath.
 *
 * @param  {Function} done
 * @public
 */
Storage.prototype.createVideoFilepath = function(done) {
  var videoStorage = this.video;
  createFilename(this.video, 'video', function(filepath) {
    var dummyFilepath = getDir(filepath) + 'tmp.3gp';
    var blob = new Blob([''], { type: 'video/3gpp' });
    var req = videoStorage.addNamed(blob, dummyFilepath);
    req.onsuccess = function(e) {
      videoStorage.delete(e.target.result);
      done(filepath);
    };
  });
};

function getDir(filepath) {
  var index = filepath.lastIndexOf('/') + 1;
  return index ? filepath.substring(0, index) : '';
}

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
  this.check();
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
