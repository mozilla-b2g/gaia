(function() {
'use strict';

if (navigator.getDeviceStorages &&
    navigator.getDeviceStorage) {
  return;
}

const PRELOAD_FILES = [
  '/media/1-01%20Whole%20Lotta%20Love.mp3',
  '/media/1-02%20What%20Is%20and%20What%20Should%20Never%20Be.mp3',
  '/media/1-03%20The%20Lemon%20Song.mp3',
  '/media/1-04%20Thank%20You.mp3',
  '/media/1-05%20Heartbreaker.mp3',
  '/media/1-06%20Living%20Loving%20Maid%20(She\'s%20Just%20a%20Woman).mp3',
  '/media/1-07%20Ramble%20On.mp3',
  '/media/1-08%20Moby%20Dick.mp3',
  '/media/1-09%20Bring%20It%20On%20Home.mp3',
  '/media/soundgarden/1-01%20Let%20Me%20Drown.mp3',
  '/media/soundgarden/1-02%20My%20Wave.mp3',
  '/media/soundgarden/1-03%20Fell%20On%20Black%20Days.mp3',
  '/media/soundgarden/1-04%20Mailman.mp3',
  '/media/soundgarden/1-05%20Superunknown.mp3',
  '/media/soundgarden/1-06%20Head%20Down.mp3',
  '/media/soundgarden/1-07%20Black%20Hole%20Sun.mp3',
  '/media/soundgarden/1-08%20Spoonman.mp3',
  '/media/soundgarden/1-09%20Limo%20Wreck.mp3',
  '/media/soundgarden/1-10%20The%20Day%20I%20Tried%20to%20Live.mp3',
  '/media/soundgarden/1-11%20Kickstand.mp3',
  '/media/soundgarden/1-12%20Fresh%20Tendrils.mp3',
  '/media/soundgarden/1-13%204th%20of%20July.mp3',
  '/media/soundgarden/1-14%20Half.mp3',
  '/media/soundgarden/1-15%20Like%20Suicide.mp3',
  '/media/soundgarden/1-16%20She%20Likes%20Surprises.mp3'
];

navigator.getDeviceStorages = navigator.getDeviceStorages || getDeviceStorages;
navigator.getDeviceStorage  = navigator.getDeviceStorage  || getDeviceStorage;

var deviceStorages = {};

function getDeviceStorages(storageName) {
  return [getDeviceStorage(storageName)];
}

function getDeviceStorage(storageName) {
  if (deviceStorages[storageName]) {
    return deviceStorages[storageName];
  }

  return (deviceStorages[storageName] = new DeviceStorage(storageName));
}

function DeviceStorage(storageName) {
  this.storageName = storageName;

  this.canBeFormatted = false;
  this.canBeMounted = false;
  this.canBeShared = false;
  this.default = true;
  this.isRemovable = false;

  this.onchange = null;

  this.addEventListener('change', (evt) => {
    if (typeof this.onchange === 'function') {
      this.onchange(evt);
    }
  });

  this._files = [];

  var preloadNextFile = (function(index) {
    if (index >= PRELOAD_FILES.length) {
      return;
    }

    var path = PRELOAD_FILES[index];

    fetch(path)
      .then((result) => {
        result.blob().then((file) => {
          preloadNextFile(++index);

          file.name = decodeURIComponent(path);
          file.lastModifiedDate = new Date();

          this._files.push(file);

          this.dispatchEvent('change', {
            reason: 'created',
            path: file.name
          });
          this.dispatchEvent('change', {
            reason: 'modified',
            path: file.name
          });
        });
      })
      .catch((error) => {
        preloadNextFile(++index);

        console.log('Unable to retrieve preloaded file', path, error);
      });
  }).bind(this);

  preloadNextFile(0);
}

DeviceStorage.prototype = new EventTarget();
DeviceStorage.prototype.constructor = DeviceStorage;

DeviceStorage.prototype.add = function(file) {
  if (file instanceof Blob) {
    return this.addNamed(file, '/' + this.storageName + '/' + generateRandomFileName());
  }

  throw 'TypeError: Argument 1 of DeviceStorage.add does not implement interface Blob.';
};

DeviceStorage.prototype.addNamed = function(file, name) {
  if (file instanceof Blob) {
    return new DOMRequest((success, error) => {
      var exists = !!this._files.find(f => f.name === name);
      if (exists) {
        return error({ name: 'Unknown', message: '' });
      }

      file.lastModifiedDate = new Date();
      file.name = name;

      this._files.push(file);
      this.dispatchEvent('change', {
        reason: 'created',
        path: file.name
      });
      this.dispatchEvent('change', {
        reason: 'modified',
        path: file.name
      });

      success(name);
    });
  }

  throw 'TypeError: Argument 1 of DeviceStorage.addNamed does not implement interface Blob.';
};

DeviceStorage.prototype.appendNamed = function() {

};

DeviceStorage.prototype.available = function() {
  return new DOMRequest(success => success('available'));
};

DeviceStorage.prototype.delete = function() {
  return new DOMRequest((success, error) => {
    var file = this._files.find(f => f.name === fileName);
    if (file) {
      this._files.splice(this._files.indexOf(file), 1);
      this.dispatchEvent('change', {
        reason: 'deleted',
        path: file.name
      });

      success();
      return;
    }

    error({ name: 'Unknown', message: '' });
  });
};

DeviceStorage.prototype.enumerate = function(path, options) {
  return new DOMRequest((success, error) => {
    var files = [];

    if (typeof path === 'object') {
      options = path;
      path = '';
    }

    if (!path) {
      options = options || {};
      path = '';
    }

    this._files.forEach((file) => {
      if (options.since instanceof Date &&
          file.lastModifiedDate < options.since) {
        return;
      }

      if (file.name.startsWith(path)) {
        files.push(file);
      }
    });

    if (files.length === 0) {
      return error({ name: 'Unknown', message: '' });
    }

    success(files);
  });
};

DeviceStorage.prototype.enumerateEditable = function() {
  // NOOP
};

DeviceStorage.prototype.format = function() {
  return new DOMRequest(success => success('formatting'));
};

DeviceStorage.prototype.freeSpace = function() {
  return new DOMRequest(success => success(1000000000));
};

DeviceStorage.prototype.get = function(fileName) {
  return new DOMRequest((success, error) => {
    var file = this._files.find(f => f.name === fileName);
    if (file) {
      success(file);
      return;
    }

    error({ name: 'Unknown', message: '' });
  });
};

DeviceStorage.prototype.getEditable = function() {
  // NOOP
};

DeviceStorage.prototype.getRoot = function() {
  // NOOP
};

DeviceStorage.prototype.mount = function() {
  return new DOMRequest(success => success('mounting'));
};

DeviceStorage.prototype.storageStatus = function() {
  return new DOMRequest(success => success('Mounted'));
};

DeviceStorage.prototype.unmount = function() {
  return new DOMRequest(success => success('unmounting'));
};

DeviceStorage.prototype.usedSpace = function() {
  return new DOMRequest(success => success(
    this._files.reduce((a, b) => (a.size || a) + b.size))
  );
};

function DOMRequest(callback) {
  var success = (result) => {
    this.readyState = 'done';
    this.result = result;

    if (typeof this.onsuccess === 'function') {
      this.onsuccess();
    }
  };

  var error = (error) => {
    this.readyState = 'done';
    this.error = error;

    if (typeof this.onerror === 'function') {
      this.onerror();
    }
  };

  this.readyState = 'pending';

  this.onsuccess = null;
  this.onerror = null;

  if (typeof callback === 'function') {
    setTimeout(() => callback(success, error));
  }
};

DOMRequest.prototype.constructor = DOMRequest;

function DOMCursor(callback) {
  var success = (results) => {
    this.readyState = 'done';

    this._results = results;
    this._index = -1;

    this.continue();
  };

  var error = (error) => {
    this.readyState = 'done';
    this.error = error;

    if (typeof this.onerror === 'function') {
      this.onerror();
    }
  };

  this.readyState = 'pending';
  this.done = false;

  this.onsuccess = null;
  this.onerror = null;

  if (typeof callback === 'function') {
    setTimeout(() => callback(success, error));
  }
};

DOMCursor.prototype = new DOMRequest();
DOMCursor.prototype.constructor = DOMCursor;

DOMCursor.prototype.continue = function() {
  if (this._index >= this._results.length - 1) {
    return;
  }

  this.result = this._results[++this._index];

  if (this._index >= this._results.length - 1) {
    this.done = true;
  }

  if (typeof this.onsuccess === 'function') {
    this.onsuccess();
  }
};

function EventTarget(object) {
  if (typeof object !== 'object') {
    return;
  }

  for (var property in object) {
    this[property] = object[property];
  }
}

EventTarget.prototype.constructor = EventTarget;

EventTarget.prototype.dispatchEvent = function(name, data) {
  var events    = this._events || {};
  var listeners = events[name] || [];
  listeners.forEach(listener => listener.call(this, data));
};

EventTarget.prototype.addEventListener = function(name, listener) {
  var events    = this._events = this._events || {};
  var listeners = events[name] = events[name] || [];
  if (listeners.find(fn => fn === listener)) {
    return;
  }

  listeners.push(listener);
};

EventTarget.prototype.removeEventListener = function(name, listener) {
  var events    = this._events || {};
  var listeners = events[name] || [];
  for (var i = listeners.length - 1; i >= 0; i--) {
    if (listeners[i] === listener) {
      listeners.splice(i, 1);
      return;
    }
  }
};

function generateRandomFileName() {
  var fileName = ''
  for (var i = 0; i < 8; i++) {
    fileName += Math.floor((1 + Math.random()) * 0x10000).toString(16).substr(1);
  }

  return fileName;
}

})();
