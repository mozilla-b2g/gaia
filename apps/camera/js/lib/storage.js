define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('storage');
var bindAll = require('lib/bind-all');
var dcf = require('lib/dcf');
var events = require('evt');
var storageSingleton;

/**
 * Locals
 */

var createFilename = dcf.createDCFFilename;

/**
 * Expose `Storage`
 */

module.exports = Storage;

/**
 * Mixin event emitter
 */

events(Storage.prototype);

/**
 * Initialize a new `Storage`.
 *
 * @param {Object} options
 */
function Storage(options) {
  if (storageSingleton) {
    return storageSingleton;
  }
  storageSingleton = this;
  bindAll(this);
  this.maxFileSize = 0;
  options = options || {};
  this.createFilename = options.createFilename || createFilename; // test hook
  this.dcf = options.dcf || dcf;
  this.dcf.init();
  navigator.mozSettings.addObserver(
    'device.storage.writable.name',
    this.onStorageVolumeChanged);
  this.configure();
  debug('initialized');
}

/**
 * Save the image Blob to DeviceStorage
 * then lookup the File reference and
 * return that in the callback as well
 * as the resulting paths.
 *
 * You always want to forget about the
 * Blob you told us about and use the
 * File instead since otherwise you
 * are wasting precious memory.
 *
 * @param {Object} [options]
 * @param {String} options.filepath
 *   The path to save the image to.
 */
Storage.prototype.addPicture = function(blob, options, done) {
  if (typeof options === 'function') {
    done = options;
    options = {};
  }

  done = done || function() {};
  var filepath = options && options.filepath;
  var self = this;
  debug('add picture', filepath);

  // Create a filepath if
  // one hasn't been given.
  if (!filepath) {
    debug('creating filename');
    this.createFilename(this.picture, 'image', onCreated);
  } else {
    onCreated(filepath);
  }

  function onCreated(filepath) {
    var req = self.picture.addNamed(blob, filepath);
    req.onerror = function() { self.emit('error'); };
    req.onsuccess = function(e) {
      debug('image stored', filepath);
      var absolutePath = e.target.result;

      // `addNamed` does not give us a File
      // handle so we need to get() it again.
      refetchFile(filepath, absolutePath);
    };
  }

  function refetchFile(filepath, absolutePath) {
    var req = self.picture.get(filepath);
    req.onerror = function() {
      self.emit('error');
      done('Error adding picture to storage');
    };
    req.onsuccess = function(e) {
      debug('image file blob handle retrieved');
      var fileBlob = e.target.result;
      done(null, filepath, absolutePath, fileBlob);
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
 * If the request errors it can mean that
 * there is a file that already exists
 * in that name. If so, we attempt to delete
 * it and try to create the filepath again.
 *
 * @param  {Function} done
 * @public
 */
Storage.prototype.createVideoFilepath = function(done) {
  var videoStorage = this.video;
  var self = this;

  this.createFilename(this.video, 'video', function(filepath) {
    var dummyFilepath = getDir(filepath) + '.tmp.3gp';
    var blob = new Blob([''], { type: 'video/3gpp' });
    var req = videoStorage.addNamed(blob, dummyFilepath);

    req.onerror = function(e) {
      debug('Failed to add' + filepath + 'to DeviceStorage', e);
      var req = videoStorage.delete(dummyFilepath);
      req.onerror = function() { done('Error creating video file path'); };
      req.onsuccess = function() { self.createVideoFilepath(done); };
    };

    req.onsuccess = function(e) {
      videoStorage.delete(e.target.result);
      done(null, filepath);
    };
  });
};

Storage.prototype.onStorageChange = function(e) {
  debug('state change: %s', e.reason);
  var value = e.reason;

  switch (value) {
    case 'deleted':
      // Emit an `itemdeleted` event to
      // allow parts of the UI to update.
      var filepath = this.checkFilepath(e.path);
      this.emit('itemdeleted', { path: filepath });
      break;
    case 'available':
    case 'shared':
    case 'unavailable':
      this.setState(value);
      break;
  }

  // Check storage
  // has spare capacity
  this.check();
};

Storage.prototype.configure = function(storageVolumeName) {
  var i;
  var videosStorages;
  var picturesStorages;
  // If we had a previous ds for pictures, let's remove the observer
  // we had set as well before fetching new ds.
  if (this.picture) {
    this.picture.removeEventListener('change', this.onStorageChange);
  }
  if (!storageVolumeName) {
    this.video = navigator.getDeviceStorage('videos');
    this.picture = navigator.getDeviceStorage('pictures');
  } else { // We select the volumes with the passed name
    videosStorages = navigator.getDeviceStorages('videos');
    this.video = videosStorages[0];
    for (i = 0; i < videosStorages.length; ++i) {
      if (videosStorages[i].storageName === storageVolumeName) {
        this.video = videosStorages[i];
        break;
      }
    }

    picturesStorages = navigator.getDeviceStorages('pictures');
    this.picture = picturesStorages[0];
    for (i = 0; i < picturesStorages.length; ++i) {
      if (picturesStorages[i].storageName === storageVolumeName) {
        this.picture = picturesStorages[i];
        break;
      }
    }
  }

  // Shouldn't happen?
  if (!this.picture) {
    this.setState('unavailable');
    return;
  }

  this.picture.addEventListener('change', this.onStorageChange);
  this.emit('volumechanged',{
    video: this.video,
    picture: this.picture
  });
};

Storage.prototype.onStorageVolumeChanged = function(setting) {
  debug('default storage volume change: %s', setting.settingValue);
  this.configure(setting.settingValue);
};

Storage.prototype.checkFilepath = function(filepath) {
  var startString = filepath.indexOf('DCIM/');

  if (startString < -1) { return; }
  else if (startString > 0) {
    filepath = filepath.substr(startString);
  }

  // Check whether filepath is a video poster image or not. If filepath
  // contains 'VID' and ends with '.jpg', consider it a video poster
  // image and get the video filepath by changing '.jpg' to '.3gp'
  if (filepath.indexOf('VID') != -1 &&
      filepath.lastIndexOf('.jpg') === filepath.length - 4) {
    filepath = filepath.replace('.jpg', '.3gp');
  }

  return filepath;
};

Storage.prototype.setState = function(value) {
  this.state = value;
  debug('set state: %s', value);
  this.emit('changed', value);
};

Storage.prototype.setMaxFileSize = function(maxFileSize) {
  this.maxFileSize = maxFileSize;
  this.check();
  debug('max file size set: %d', maxFileSize);
};

/**
 * Run a full storage check.
 *
 * @param  {Function} done
 * @public
 */
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
    self.emit('checked', state);
  }
};

/**
 * Checks if there is enough space to
 * accomdate the current `maxFileSize`.
 *
 * @param  {Function} done
 */
Storage.prototype.isSpace = function(done) {
  var maxFileSize = this.maxFileSize;
  this.picture
    .freeSpace()
    .onsuccess = function(e) {
      var freeSpace = e.target.result;
      var result = freeSpace > maxFileSize;
      debug('is space: %s', result, freeSpace, maxFileSize);
      done(result);
    };
};

/**
 * Get current storage state.
 *
 * @param  {Function} done
 */
Storage.prototype.getState = function(done) {
  if (!this.picture) {
    setTimeout(function() {
      done('unavailable');
    });
    return;
  }

  this.picture
    .available()
    .onsuccess = function(e) {
      done(e.target.result);
    };
};

/**
 * States if sotrage is available.
 *
 * @return {Boolean}
 */
Storage.prototype.available = function() {
  return this.state === 'available';
};

/**
 * Delete a picture.
 *
 * @param  {String} filepath
 */
Storage.prototype.deletePicture = function(filepath, done) {
  var req = this.picture.delete(filepath);
  req.onerror = function(e) {
    var message = 'Failed to delete ' + filepath +
      ' from DeviceStorage:' + e.target.error;
    console.warn(message);
    done(message);
  };

  req.onsuccess = function() {
    done(null);
  };
};

/**
 * Delete a video and accompanying
 * poster image.
 *
 * @param  {String} filepath
 */
Storage.prototype.deleteVideo = function(filepath) {
  var poster = filepath.replace('.3gp', '.jpg');

  this.video.delete(filepath).onerror = function(e) {
    console.warn(
      'Failed to delete', filepath,
      'from DeviceStorage:', e.target.error);
  };

  this.picture.delete(poster).onerror = function(e) {
    console.warn(
      'Failed to delete poster image', poster,
      'for video', filepath,
      'from DeviceStorage:', e.target.error);
  };
};

/**
 * Get the directory from a filepath.
 *
 * @param  {String} filepath
 * @return {String}
 */
function getDir(filepath) {
  var index = filepath.lastIndexOf('/') + 1;
  return index ? filepath.substring(0, index) : '';
}

});
