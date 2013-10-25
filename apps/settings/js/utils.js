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

  // Load dialog contents and show it.
  Settings.currentPanel = dialogID;

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

/**
 * The function returns an object of the supporting state of category of network
 * types. The categories are 'gsm' and 'cdma'.
 */
var getSupportedNetworkInfo = (function() {
  var _result = null;

  return function(callback) {
    if (!callback)
      return;

    // early return if the result is available
    if (_result) {
      callback(_result);
      return;
    }

    // get network type
    loadJSON('/resources/network.json', function loadNetwork(network) {
      _result = {
        gsm: false,
        cdma: false,
        networkTypes: null
      };

      /*
       * Possible values of the item in network.types are:
       * "wcdma/gsm", "gsm", "wcdma", "wcdma/gsm-auto",
       * "cdma/evdo", "cdma", "evdo", "wcdma/gsm/cdma/evdo"
       */
      if (network.types) {
        var types = _result.networkTypes = network.types;
        for (var i = 0; i < types.length; i++) {
          var type = types[i];
          type.split('/').forEach(function(subType) {
            _result.gsm = _result.gsm || (subType === 'gsm') ||
                         (subType === 'gsm-auto') || (subType === 'wcdma');
            _result.cdma = _result.cdma || (subType === 'cdma') ||
                          (subType === 'evdo');
          });

          if (_result.gsm && _result.cdma) {
            break;
          }
        }
      }

      callback(_result);
    });
  };
})();

function isIP(address) {
  return /^\d+\.\d+\.\d+\.\d+$/.test(address);
}

// Remove additional 0 in front of IP digits.
// Notice that this is not following standard dot-decimal notation, just for
// possible error tolarance.
// (Values starting with 0 stand for octal representation by standard)
function sanitizeAddress(input) {
  if (isIP(input)) {
    return input.replace(/0*(\d+)/g, '$1');
  } else {
    return input;
  }
}

function getTruncated(oldName, options) {

  // options
  var maxLine = options.maxLine || 2;
  var node = options.node;
  var ellipsisIndex = options.ellipsisIndex || 3;
  var ellipsisCharacter = options.ellipsisCharacter || '...';

  if (node === null) {
    return oldName;
  }

  // used variables and functions
  function hitsNewline(oldHeight, newHeight) {
    return oldHeight !== newHeight;
  }

  var newName = '';
  var oldHeight;
  var newHeight;
  var baseHeight;
  var currentLine;
  var ellipsisAt;
  var hasNewEllipsisPoint = true;
  var nameBeforeEllipsis = [];
  var nameBeforeEllipsisString;
  var nameAfterEllipsis = oldName.slice(-ellipsisIndex);
  var realVisibility = node.style.visibility;
  var realWordBreak = node.style.wordBreak;

  /*
   * Hide UI, because we are manipulating DOM
   */
  node.style.visibility = 'hidden';

  /*
   * Force breaking on boundaries
   */
  node.style.wordBreak = 'break-all';

  /*
   * Get the base height to count the currentLine at first
   */
  node.textContent = '.';
  baseHeight = node.clientHeight;
  node.textContent = '';

  var needEllipsis = oldName.split('').some(function(character, index) {

    nameBeforeEllipsis.push(character);
    nameBeforeEllipsisString = nameBeforeEllipsis.join('');

    oldHeight = node.clientHeight;
    node.textContent = nameBeforeEllipsisString +
        ellipsisCharacter + nameAfterEllipsis;
    newHeight = node.clientHeight;

    /*
     * When index is 0, we have to update currentLine according to
     * the first assignment (it is possible that at first the currentLine
     * is not 0 if the width of node is too small)
     */
    if (index === 0) {
      currentLine = Math.floor(newHeight / baseHeight);
    }

    if (hitsNewline(oldHeight, newHeight) && index !== 0) {

      /*
       * The reason why we have to check twice is because there is a
       * situation that truncated string is overflowed but there is
       * still room for original string.
       *
       * In this way, we have to memorize the ellipsis index and
       * slice `nameBeforeEllipsis` to the index in the end.
       */
      var testHeight;
      node.textContent = nameBeforeEllipsisString;
      testHeight = node.clientHeight;

      if (hitsNewline(oldHeight, testHeight)) {

        /*
         * We have to make it true again to keep the ellipsisAt
         * up to date.
         */
        hasNewEllipsisPoint = true;
        currentLine += 1;
      } else {
        /*
         * This is the situation that we still have room, so we have
         * to keep the ellipsisAt value for later use.
         */
        if (hasNewEllipsisPoint) {
          ellipsisAt = index;
          hasNewEllipsisPoint = false;
        }
      }
    }

    if (currentLine > maxLine) {
      if (index === 0) {

        /*
         * It means that at first, the whole string is already in
         * an overflowed situation, you have to avoid this situation.
         * And we will bypass oldName back to you.
         *
         * There are some options for you :
         *
         *   1. Check options.ellipsisCharacter
         *   2. Check options.maxLine
         *   3. Check node's width (maybe too narrow)
         */
        console.log(
          'Your string is in a overflowed situation, ' +
          'please check your options');
      }

      /*
       * Remove the last character, because it causes the overflow
       */
      nameBeforeEllipsis.pop();
      node.textContent = '';
      return true;
    }
  });

  // restore UI
  node.style.visibility = realVisibility;
  node.style.wordBreak = realWordBreak;

  if (!needEllipsis) {
    newName = oldName;
  } else {
    newName += nameBeforeEllipsis.join('').slice(0, ellipsisAt);
    newName += ellipsisCharacter;
    newName += nameAfterEllipsis;
  }

  return newName;
}
