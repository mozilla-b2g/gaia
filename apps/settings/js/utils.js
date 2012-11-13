/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

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

function audioPreview(element) {
  var audio = document.querySelector('#sound-selection audio');
  var source = audio.src;
  var playing = !audio.paused;

  audio.src = 'resources/ringtones/' + element.querySelector('input').value;
  if (source === audio.src && playing) {
    audio.stop();
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

    var request = deviceStorage.stat();
    request.onsuccess = function(e) {
      var totalSize = e.target.result.totalBytes;
      callback(e.target.result.totalBytes, e.target.result.freeBytes);
    };
  }

  return { getStat: getStat };
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
  var ranges = document.querySelectorAll('label > input[type="range"]');
  for (var i = 0; i < ranges.length; i++) {
    polyfill(ranges[i]);
  }
}

/**
 * Fire a callback when as soon as all l10n resources are ready and the UI has
 * been translated.
 * Note: this could be exposed as `navigator.mozL10n.onload'...
 */

function onLocalized(callback) {
  if (navigator.mozL10n.readyState == 'complete') {
    callback();
  } else {
    window.addEventListener('localized', callback);
  }
}

