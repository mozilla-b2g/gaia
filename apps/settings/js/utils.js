/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

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
  if ('#' + dialogID == Settings.currentPanel)
    return;

  var origin = Settings.currentPanel;
  var dialog = document.getElementById(dialogID);

  var submit = dialog.querySelector('[type=submit]');
  if (submit) {
    submit.onclick = function onsubmit() {
      if (onSubmit)
        (onSubmit.bind(dialog))();
      Settings.currentPanel = origin; // hide dialog box
    };
  }

  var reset = dialog.querySelector('[type=reset]');
  if (reset) {
    reset.onclick = function onreset() {
      if (onReset)
        (onReset.bind(dialog))();
      Settings.currentPanel = origin; // hide dialog box
    };
  }

  Settings.currentPanel = dialogID; // show dialog box
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
 * JSON loader
 */

function loadJSON(href, callback) {
  if (!callback)
    return;
  var xhr = new XMLHttpRequest();
  xhr.onerror = function() {
    console.error('Failed to fetch file: ' + href, xhr.statusText);
  };
  xhr.onload = function() {
    callback(xhr.response);
  };
  xhr.open('GET', href, true); // async
  xhr.responseType = 'json';
  xhr.send();
}

/**
 * L10n helper
 */

var localize = navigator.mozL10n.localize;

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

  function showFormatedSize(element, l10nId, size) {
    if (size === undefined || isNaN(size)) {
      element.textContent = '';
      return;
    }

    // KB - 3 KB (nearest ones), MB, GB - 1.2 MB (nearest tenth)
    var fixedDigits = (size < 1024 * 1024) ? 0 : 1;
    var sizeInfo = FileSizeFormatter.getReadableFileSize(size, fixedDigits);

    var _ = navigator.mozL10n.get;
    element.textContent = _(l10nId, {
      size: sizeInfo.size,
      unit: _('byteUnit-' + sizeInfo.unit)
    });
  }

  return {
    getStat: getStat,
    getFreeSpace: getFreeSpace,
    showFormatedSize: showFormatedSize
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
    // In some future version of gaia that will only be used with gecko v23+,
    // we can remove the bug344618_polyfill stuff.
    console.warn("bug344618 has landed, there's some dead code to remove.");
    var sel = 'label:not(.without_bug344618_polyfill) > input[type="range"]';
    var ranges = document.querySelectorAll(sel);
    for (var i = 0; i < ranges.length; i++) {
      var label = ranges[i].parentNode;
      label.classList.add('without_bug344618_polyfill');
    }
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

    // move the throbber to the proper position, according to touch events
    var updatePosition = function updatePosition(event) {
      var pointer = event.changedTouches && event.changedTouches[0] ?
                    event.changedTouches[0] :
                    event;
      var rect = slider.getBoundingClientRect();
      var pos = (pointer.clientX - rect.left) / rect.width;
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
        // preventDefault prevents vertical scrolling
        event.preventDefault();
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

    slider.addEventListener('touchstart', onClick);
    thumb.addEventListener('touchstart', onDragStart);
    label.addEventListener('touchmove', onDragMove);
    label.addEventListener('touchend', onDragStop);
    label.addEventListener('touchcancel', onDragStop);

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
  var fakeNetwork = { shortName: 'Fake Orange F', mcc: '208', mnc: '1' };
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
    get data() {
      return initialized ? { network: fakeNetwork } : null;
    },
    get voice() {
      return initialized ? fakeVoice : null;
    }
  };
};

var getBluetooth = function() {
  var navigator = window.navigator;
  if ('mozBluetooth' in navigator)
    return navigator.mozBluetooth;
  return {
    enabled: false,
    addEventListener: function(type, callback, bubble) {},
    onenabled: function(event) {},
    onadapteradded: function(event) {},
    ondisabled: function(event) {},
    getDefaultAdapter: function() {}
  };
};

/*
 * An Observable is able to notify its property change. It is initialized by an
 * ordinary object.
 */
var Observable = function(obj) {
  var _eventHandlers = {};
  var _observable = {
    observe: function o_observe(p, handler) {
      var handlers = _eventHandlers[p];
      if (handlers) {
        handlers.push(handler);
      }
    }
  };

  var _getFunc = function(p) {
    return function() {
      return _observable['_' + p];
    };
  };

  var _setFunc = function(p) {
    return function(value) {
      var oldValue = _observable['_' + p];
      if (oldValue !== value) {
        _observable['_' + p] = value;
        var handlers = _eventHandlers[p];
        if (handlers) {
          handlers.forEach(function(handler) {
            handler(value, oldValue);
          });
        }
      }
     };
  };

  for (var p in obj) {
    _eventHandlers[p] = [];

    Object.defineProperty(_observable, '_' + p, {
      value: obj[p],
      writable: true
    });

    Object.defineProperty(_observable, p, {
      enumerable: true,
      get: _getFunc(p),
      set: _setFunc(p)
    });
  }

  return _observable;
};

/*
 * An ObservableArray is able to notify its change through four basic operations
 * including 'insert', 'remove', 'replace', 'reset'. It is initialized by an
 * ordinary array.
 */
var ObservableArray = function(array) {
  var _array = array || [];
  var _eventHandlers = {
    'insert': [],
    'remove': [],
    'replace': [],
    'reset': []
  };

  var _notify = function(eventType, data) {
    var handlers = _eventHandlers[eventType];
    handlers.forEach(function(handler) {
      handler({
        type: eventType,
        data: data
      });
    });
  };

  return {
    get length() {
      return _array.length;
    },

    get array() {
      return _array;
    },

    forEach: function oa_foreach(func) {
      _array.forEach(func);
    },

    observe: function oa_observe(eventType, handler) {
      var handlers = _eventHandlers[eventType];
      if (handlers) {
        handlers.push(handler);
      }
    },

    push: function oa_push(item) {
      _array.push(item);

      _notify('insert', {
        index: _array.length - 1,
        count: 1,
        items: [item]
      });
    },

    pop: function oa_pop() {
      var item = _array.pop();

      _notify('remove', {
        index: _array.length,
        count: 1
      });

      return item;
    },

    splice: function oa_splice(index, count) {
      if (arguments.length < 2)
        return;

      var addedItems = Array.prototype.slice.call(arguments, 2);
      _array.splice(_array, arguments);

      _notify('remove', {
        index: index,
        count: count
      });

      _notify('insert', {
        index: index,
        count: addedItems.length,
        items: addedItems
      });
    },

    set: function oa_set(index, value) {
      if (index < 0 || index >= _array.length)
        return;

      var oldValue = _array[index];
      _array[index] = value;
      _notify('replace', {
        index: index,
        oldValue: oldValue,
        newValue: value
      });
    },

    get: function oa_get(index) {
      return _array[index];
    },

    reset: function oa_reset(array) {
      _array = array;
      _notify('reset', {
        items: _array
      });
    }
  };
};

/*
 * A ListView takes an ObservableArray or an ordinary array, and generate the
 * corresponding DOM elements of the content in the array using the specified
 * template function. If the array is an ObservableArray, ListView updates the
 * DOM elements accordingly when the array is manipulated.
 */
var ListView = function(root, observableArray, templateFunc) {
  var _observableArray = null;
  var _root = root;
  var _templateFunc = templateFunc;
  var _enabled = true;

  var _handleEvent = function(event) {
    if (!_enabled) {
      return;
    }

    var data = event.data;
    switch (event.type) {
      case 'insert':
        _insert(data.index, data.items);
        break;
      case 'remove':
        _remove(data.index, data.count);
        break;
      case 'replace':
        _replace(data.index, data.newValue);
        break;
      case 'reset':
        _reset(data.items || []);
      default:
        break;
    }
  };

  var _insert = function(index, items) {
    // add DOM elements
    if (items.length > 0) {
      var nextElement =
        _root.querySelector('li:nth-child(' + (index + 1) + ')');
      for (var i = items.length - 1; i >= 0; i--) {
        var curElement = _templateFunc(items[i]);
        _root.insertBefore(curElement, nextElement);
        nextElement = curElement;
      }
    }
  };

  var _remove = function(index, count) {
    if (count === 0)
      return;

    // remove DOM elements
    if (count === _root.childElementCount) {
      // clear all
      while (_root.firstElementChild) {
        _root.removeChild(_root.firstElementChild);
      }
    } else {
      var nextElement =
        _root.querySelector('li:nth-child(' + (index + 1) + ')');
      for (var i = 0; i < count; i++) {
        if (nextElement) {
          var temp = nextElement.nextElementSibling;
          _root.removeChild(nextElement);
          nextElement = temp;
        }
      }
    }
  };

  var _replace = function(index, value) {
    var element = _root.querySelector('li:nth-child(' + (index + 1) + ')');
    if (element) {
      _templateFunc(value, element);
    }
  };

  var _reset = function(items) {
    var itemCount = items.length;
    var elementCount = _root.childElementCount;

    if (itemCount == 0) {
      _remove(0, elementCount);
    } else if (itemCount <= elementCount) {
      items.forEach(function(item, index) {
        _replace(index, item);
      });
      // remove extra elements
      _remove(itemCount, elementCount - itemCount);
    } else {
      var slicedItems = items.slice(0, elementCount);
      var remainingItems = items.slice(elementCount);

      slicedItems.forEach(function(item, index) {
        _replace(index, item);
      });
      // add extra elements
      _insert(elementCount, remainingItems);
    }
  };

  var _enabledChanged = function() {
    if (_enabled) {
      _reset(_observableArray.array);
    }
  };

  var view = {
    set: function lv_set(observableArray) {
      // clear all existing items
      if (_observableArray) {
        _remove(0, _observableArray.length);
      }

      _observableArray = observableArray;
      if (_observableArray) {
        if (_observableArray.constructor === Array) {
          _insert(0, _observableArray);
        } else {
          _observableArray.observe('insert', _handleEvent);
          _observableArray.observe('remove', _handleEvent);
          _observableArray.observe('replace', _handleEvent);
          _observableArray.observe('reset', _handleEvent);

          _insert(0, _observableArray.array);
        }
      }
    },

    set enabled(value) {
      if (_enabled !== value) {
        _enabled = value;
        _enabledChanged();
      }
    },

    get enabled() {
      return _enabled;
    }
  };

  view.set(observableArray);
  return view;
};

