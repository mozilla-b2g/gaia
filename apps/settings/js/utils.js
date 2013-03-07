/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Constants
 */
var DEBUG = false;

/**
 * Debug method
 */
function debug(msg, optObject) {
  if (DEBUG) {
    var output = '[DEBUG # Settings] ' + msg;
    if (optObject) {
      output += JSON.stringify(optObject);
    }
    console.log(output);
  }
}

/**
 * Move settings to foreground
 */
function reopenSettings() {
  navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
    var app = evt.target.result;
    app.launch('settings');
  };
}

/**
 * Open a link with a web activity
 */

function openLink(url) {
  if (url.startsWith('tel:')) { // dial a phone number
    new MozActivity({
      name: 'dial',
      data: { type: 'webtelephony/number', number: url.substr(4) }
    });
  } else if (!url.startsWith('#')) { // browse a URL
    new MozActivity({
      name: 'view',
      data: { type: 'url', url: url }
    });
  }
}

/**
 * These so-called "dialog boxes" are just standard Settings panels (<section
 * role="region" />) with reset/submit buttons: these buttons both return to the
 * previous panel when clicked, and each button has its own (optional) callback.
 */

function openDialog(dialogID, onSubmit, onReset) {
  if ('#' + dialogID == document.location.hash)
    return;

  var origin = document.location.hash;
  var dialog = document.getElementById(dialogID);

  var submit = dialog.querySelector('[type=submit]');
  if (submit) {
    submit.onclick = function onsubmit() {
      if (onSubmit)
        (onSubmit.bind(dialog))();
      document.location.hash = origin; // hide dialog box
    };
  }

  var reset = dialog.querySelector('[type=reset]');
  if (reset) {
    reset.onclick = function onreset() {
      if (onReset)
        (onReset.bind(dialog))();
      document.location.hash = origin; // hide dialog box
    };
  }

  document.location.hash = dialogID; // show dialog box
}

/**
 * Audio Preview
 * First click = play, second click = pause.
 */

function audioPreview(element, type) {
  var audio = document.querySelector('#sound-selection audio');
  var source = audio.src;
  var playing = !audio.paused;

  // Both ringer and notification are using notification channel
  audio.mozAudioChannelType = 'notification';

  var url = '/shared/resources/media/' + type + '/' +
            element.querySelector('input').value;
  audio.src = url;
  if (source === audio.src && playing) {
    audio.pause();
    audio.src = '';
  } else {
    audio.play();
  }
}

/**
 * Helper class for formatting file size strings
 * required by *_storage.js
 */

var FileSizeFormatter = (function FileSizeFormatter(fixed) {
  function getReadableFileSize(size, digits) { // in: size in Bytes
    if (size === undefined)
      return {};

    var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var i = 0;
    while (size >= 1024) {
      size /= 1024;
      ++i;
    }

    var sizeString = size.toFixed(digits || 0);
    var sizeDecimal = parseFloat(sizeString);

    return {
      size: sizeDecimal.toString(),
      unit: units[i]
    };
  }

  return { getReadableFileSize: getReadableFileSize };
})();

/**
 * Helper class for getting available/used storage
 * required by *_storage.js
 */

var DeviceStorageHelper = (function DeviceStorageHelper() {
  function getStat(type, callback) {
    var deviceStorage = navigator.getDeviceStorage(type);

    if (!deviceStorage) {
      console.error('Cannot get DeviceStorage for: ' + type);
      return;
    }
    deviceStorage.freeSpace().onsuccess = function(e) {
      var freeSpace = e.target.result;
      deviceStorage.usedSpace().onsuccess = function(e) {
        var usedSpace = e.target.result;
        callback(usedSpace, freeSpace, type);
      };
    };
  }

  function getStats(types, callback) {
    var results = {};

    var current = types.length;

    for (var i = 0; i < types.length; i++) {
      getStat(types[i], function(totalBytes, freeBytes, type) {

        results[type] = totalBytes;
        results['free'] = freeBytes;
        current--;
        if (current == 0)
          callback(results);

      });
    }
  }

  function getFreeSpace(callback) {
    var deviceStorage = navigator.getDeviceStorage('sdcard');

    if (!deviceStorage) {
      console.error('Cannot get free space size in sdcard');
      return;
    }
    deviceStorage.freeSpace().onsuccess = function(e) {
      var freeSpace = e.target.result;
      callback(freeSpace);
    };
  }

  return {
    getStat: getStat,
    getStats: getStats,
    getFreeSpace: getFreeSpace
  };

})();

/**
 * This emulates <input type="range"> elements on Gecko until they get
 * supported natively.  To be removed when bug 344618 lands.
 * https://bugzilla.mozilla.org/show_bug.cgi?id=344618
 */

function bug344618_polyfill() {
  var range = document.createElement('input');
  range.type = 'range';
  if (range.type == 'range') {
    console.warn("bug344618 has landed, there's some dead code to remove.");
    return; // <input type="range"> is already supported, early way out.
  }

  /**
   * The JS polyfill transforms this:
   *
   *   <label>
   *     <input type="range" value="60" />
   *   </label>
   *
   * into this:
   *
   *   <label class="bug344618_polyfill">
   *     <div>
   *       <span style="width: 60%"></span>
   *       <span style="left: 60%"></span>
   *     </div>
   *     <input type="range" value="60" />
   *   </label>
   *
   * JavaScript-wise, two main differences between this polyfill and the
   * standard implementation:
   *   - the `.type' property equals `text' instead of `range';
   *   - the value is a string, not a float.
   */

  var polyfill = function(input) {
    input.dataset.type = 'range';

    var slider = document.createElement('div');
    var thumb = document.createElement('span');
    var fill = document.createElement('span');
    var label = input.parentNode;
    slider.appendChild(fill);
    slider.appendChild(thumb);
    label.insertBefore(slider, input);
    label.classList.add('bug344618_polyfill');

    var min = parseFloat(input.min);
    var max = parseFloat(input.max);

    // move the throbber to the proper position, according to input.value
    var refresh = function refresh() {
      var pos = (input.value - min) / (max - min);
      pos = Math.max(pos, 0);
      pos = Math.min(pos, 1);
      fill.style.width = (100 * pos) + '%';
      thumb.style.left = (100 * pos) + '%';
    };

    // move the throbber to the proper position, according to mouse events
    var updatePosition = function updatePosition(event) {
      var rect = slider.getBoundingClientRect();
      var pos = (event.clientX - rect.left) / rect.width;
      pos = Math.max(pos, 0);
      pos = Math.min(pos, 1);
      fill.style.width = (100 * pos) + '%';
      thumb.style.left = (100 * pos) + '%';
      input.value = min + pos * (max - min);
    };

    // send a 'change' event
    var notify = function notify() {
      var evtObject = document.createEvent('Event');
      evtObject.initEvent('change', true, false);
      input.dispatchEvent(evtObject);
    };

    // user interaction support
    var isDragging = false;
    var onDragStart = function onDragStart(event) {
      updatePosition(event);
      isDragging = true;
    };
    var onDragMove = function onDragMove(event) {
      if (isDragging) {
        updatePosition(event);
      }
    };
    var onDragStop = function onDragStop(event) {
      if (isDragging) {
        updatePosition(event);
        notify();
      }
      isDragging = false;
    };
    var onClick = function onClick(event) {
      updatePosition(event);
      notify();
    };
    slider.onmousedown = onClick;
    thumb.onmousedown = onDragStart;
    label.onmousemove = onDragMove;
    label.onmouseup = onDragStop;

    // expose the 'refresh' method on <input>
    // XXX remember to call it after setting input.value manually...
    input.refresh = refresh;
  };

  // apply to all input[type="range"] elements
  var selector = 'label:not(.bug344618_polyfill) > input[type="range"]';
  var ranges = document.querySelectorAll(selector);
  for (var i = 0; i < ranges.length; i++) {
    polyfill(ranges[i]);
  }
}

/**
 * Connectivity accessors
 */

// create a fake mozMobileConnection if required (e.g. desktop browser)
var getMobileConnection = function() {
  var navigator = window.navigator;
  if (('mozMobileConnection' in navigator) &&
      navigator.mozMobileConnection &&
      navigator.mozMobileConnection.data)
    return navigator.mozMobileConnection;

  var initialized = false;
  var fakeICCInfo = { shortName: 'Fake Free-Mobile', mcc: 208, mnc: 15 };
  var fakeNetwork = { shortName: 'Fake Orange F', mcc: 208, mnc: 1 };
  var fakeVoice = {
    state: 'notSearching',
    roaming: true,
    connected: true,
    emergencyCallsOnly: false
  };

  function fakeEventListener(type, callback, bubble) {
    if (initialized)
      return;

    // simulates a connection to a data network;
    setTimeout(function fakeCallback() {
      initialized = true;
      callback();
    }, 5000);
  }

  return {
    addEventListener: fakeEventListener,
    iccInfo: fakeICCInfo,
    get data() {
      return initialized ? { network: fakeNetwork } : null;
    },
    get voice() {
      return initialized ? fakeVoice : null;
    }
  };
};

// create a fake mozWifiManager if required (e.g. desktop browser)
var getWifiManager = function() {
  var navigator = window.navigator;
  if ('mozWifiManager' in navigator)
    return navigator.mozWifiManager;

  /**
   * fake network list, where each network object looks like:
   * {
   *   ssid              : SSID string (human-readable name)
   *   bssid             : network identifier string
   *   capabilities      : array of strings (supported authentication methods)
   *   relSignalStrength : 0-100 signal level (integer)
   *   connected         : boolean state
   * }
   */

  var fakeNetworks = {
    'Mozilla-G': {
      ssid: 'Mozilla-G',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WPA-EAP'],
      relSignalStrength: 67,
      connected: false
    },
    'Livebox 6752': {
      ssid: 'Livebox 6752',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WEP'],
      relSignalStrength: 32,
      connected: false
    },
    'Mozilla Guest': {
      ssid: 'Mozilla Guest',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: [],
      relSignalStrength: 98,
      connected: false
    },
    'Freebox 8953': {
      ssid: 'Freebox 8953',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WPA2-PSK'],
      relSignalStrength: 89,
      connected: false
    }
  };

  function getFakeNetworks() {
    var request = { result: fakeNetworks };

    setTimeout(function() {
      if (request.onsuccess) {
        request.onsuccess();
      }
    }, 1000);

    return request;
  }

  return {
    // true if the wifi is enabled
    enabled: false,
    macAddress: 'xx:xx:xx:xx:xx:xx',

    // enables/disables the wifi
    setEnabled: function fakeSetEnabled(bool) {
      var self = this;
      var request = { result: bool };

      setTimeout(function() {
        if (request.onsuccess) {
          request.onsuccess();
        }
        if (bool) {
          self.onenabled();
        } else {
          self.ondisabled();
        }
      });

      self.enabled = bool;
      return request;
    },

    // returns a list of visible/known networks
    getNetworks: getFakeNetworks,
    getKnownNetworks: getFakeNetworks,

    // selects a network
    associate: function fakeAssociate(network) {
      var self = this;
      var connection = { result: network };
      var networkEvent = { network: network };

      setTimeout(function fakeConnecting() {
        self.connection.network = network;
        self.connection.status = 'connecting';
        self.onstatuschange(networkEvent);
      }, 0);

      setTimeout(function fakeAssociated() {
        self.connection.network = network;
        self.connection.status = 'associated';
        self.onstatuschange(networkEvent);
      }, 1000);

      setTimeout(function fakeConnected() {
        network.connected = true;
        self.connected = network;
        self.connection.network = network;
        self.connection.status = 'connected';
        self.onstatuschange(networkEvent);
      }, 2000);

      return connection;
    },

    // forgets a network (disconnect)
    forget: function fakeForget(network) {
      var self = this;
      var networkEvent = { network: network };

      setTimeout(function() {
        network.connected = false;
        self.connected = null;
        self.connection.network = null;
        self.connection.status = 'disconnected';
        self.onstatuschange(networkEvent);
      }, 0);
    },

    // event listeners
    onenabled: function(event) {},
    ondisabled: function(event) {},
    onstatuschange: function(event) {},

    // returns a network object for the currently connected network (if any)
    connected: null,

    connection: {
      status: 'disconnected',
      network: null
    }
  };
};
