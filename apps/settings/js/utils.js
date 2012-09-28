/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Open a URL with a web activity
 */

function openURL(url) {
  var a = new MozActivity({
    name: 'view',
    data: { type: 'url', url: url }
  });
}

/**
 * Dial a number with a web activity
 */

function dialNumber(number) {
  var a = new MozActivity({
    name: 'dial',
    data: {
      type: 'webtelephony/number',
      number: number
    }
  });
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
        onSubmit();
      document.location.hash = origin; // hide dialog box
    };
  }

  var reset = dialog.querySelector('[type=reset]');
  if (reset) {
    reset.onclick = function onreset() {
      if (onReset)
        onReset();
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
  var audio = document.querySelector('#sounds audio');
  var source = audio.src;
  var playing = !audio.paused;

  audio.src = 'style/ringtones/' + element.querySelector('input').value;
  if (source == audio.src && playing) {
    audio.stop();
  } else {
    audio.play();
  }
}

/**
 * Helper class providing some functions for formatting file size strings
 */

var FileSizeFormatter = (function FileSizeFormatter(fixed) {
  // in: size in Bytes
  function getReadableFileSize(size, digits) {
    if (digits === undefined) {
      digits = 0;
    }

    var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var i = 0;
    while (size >= 1024) {
      size /= 1024;
      ++i;
    }

    var sizeString = size.toFixed(digits);
    var sizeDecimal = parseFloat(sizeString);

    return {
      size: sizeDecimal.toString(),
      unit: units[i]
    };
  }

  return {
    getReadableFileSize: getReadableFileSize
  };
})();

