'use strict';

function $(id) {
  return document.getElementById(id);
}

function $$(expr) {
  return document.querySelectorAll(expr);
}

// XXX fake mozFMRadio object for UI testing on PC
var mozFMRadio = navigator.mozFMRadio || {
  speakerEnabled: false,

  frequency: 91.5,

  enabled: false,

  antennaAvailable: true,

  signalStrength: 1,

  bandRanges: {
    FM: {
      lower: 87.5,
      upper: 108
    }
  },

  onsignalchange: function emptyFunction() { },

  onfrequencychange: function emptyFunction() { },

  onenabled: function emptyFunction() { },

  ondisabled: function emptyFunction() { },

  onantennachange: function emptyFunction() { },

  setEnabled: function fm_setEnabled(enabled) {
    var previousValue = this.enabled;
    this.enabled = enabled;
    if (previousValue != enabled) {
      if (this.enabled) {
        this.onenabled();
      } else {
        this.ondisabled();
      }
    }
    return {};
  },

  setFrequency: function fm_setFrequency(freq) {
    freq = parseFloat(freq.toFixed(1));
    var previousValue = this.frequency;
    this.frequency = freq;
    if (previousValue != freq) {
      this.onfrequencychange();
    }
    return {};
  },

  seekUp: function fm_seekUp() {
    var self = this;
    if (this._seekRequest) {
      return;
    }
    this._seekRequest = {};
    this._seekTimeout = window.setTimeout(function su_timeout() {
      self.setFrequency(self.frequency + 0.5);
      if (self._seekRequest.onsuccess) {
        self._seekRequest.onsuccess();
      }
      self._clearSeekRequest();
    }, 1000);
    return this._seekRequest;
  },

  seekDown: function fm_seekDown() {
    var self = this;
    if (this._seekRequest) {
      return;
    }
    this._seekRequest = {};
    this._seekTimeout = window.setTimeout(function sd_timeout() {
      self.setFrequency(self.frequency - 0.5);
      if (self._seekRequest.onsuccess) {
        self._seekRequest.onsuccess();
      }
      self._clearSeekRequest();
    }, 1000);
    return this._seekRequest;
  },

  cancelSeek: function fm_cancelSeek() {
    this._clearSeekRequest();
  },

  _clearSeekRequest: function fm_clearSeek() {
    if (this._seekTimeout) {
      window.clearTimeout(this._seekTimeout);
      this._seekTimeout = null;
    }
    if (this._seekRequest && this._seekRequest.onerror) {
      this._seekRequest.onerror();
      this._seekRequest = null;
    }
  }
};

function enableFM(enable) {
  console.log('Antenna available: ' + mozFMRadio.antennaAvailable);
  if (!mozFMRadio.antennaAvailable) {
    updateAntennaUI();
    return;
  }

  var request = mozFMRadio.setEnabled(enable);

  request.onsuccess = function turnon_onsuccess() {
    console.log('FM status is changed to ' + mozFMRadio.enabled);
  };

  request.onerror = function turnon_onerror() {
    console.log('Failed to turn on FM!');
  };
}

function updateFreqUI() {
  frequencyDialer.setFrequency(mozFMRadio.frequency);
  $('bookmark-button').setAttribute('data-bookmarked',
       favoritesList.contains(mozFMRadio.frequency));
}

function updatePowerUI() {
  console.log('Power status: ' + (mozFMRadio.enabled ? 'on' : 'off'));
  $('power-switch').setAttribute('data-enabled', mozFMRadio.enabled);
}

function updateAudioUI() {
  $('audio-routing-switch').setAttribute('data-current-state',
                   mozFMRadio.speakerEnabled ? 'speaker' : 'headset');
}

function updateAntennaUI() {
  $('antenna-warning').hidden = mozFMRadio.antennaAvailable;
}

var frequencyDialer = {
  unit: 5,
  _minFrequency: 0,
  _maxFrequency: 0,
  _currentFreqency: 0,

  init: function() {
    this._initUI();
    this.setFrequency(mozFMRadio.frequency);
    this._addEventListeners();
  },

  _addEventListeners: function() {
    function _removeEventListeners() {
      document.body.removeEventListener('mouseup', fd_body_mouseup, false);
      document.body.removeEventListener('mousemove', fd_body_mousemove, false);
    }

    function cloneEvent(evt) {
      if ('touches' in evt) {
        evt = evt.touches[0];
      }
      return { x: evt.pageX, y: evt.pageY, timestamp: evt.timeStamp };
    }

    var self = this;
    var SPEED_THRESHOLD = 0.1;
    var currentEvent, startEvent, currentSpeed;
    var tunedFrequency = 0;

    function toFixed(frequency) {
      return parseFloat(frequency.toFixed(1));
    }

    function _calcSpeed() {
      var movingSpace = startEvent.x - currentEvent.x;
      var deltaTime = currentEvent.timestamp - startEvent.timestamp;
      var speed = movingSpace / deltaTime;
      currentSpeed = parseFloat(speed.toFixed(2));
    }

    function _calcTargetFrequency() {
      return tunedFrequency - getMovingSpace() / self._space;
    }

    // If the user swap really slow, narrow down the moving space
    // So the user can fine tune frequency.
    function getMovingSpace() {
      var movingSpace = currentEvent.x - startEvent.x;
      return Math.abs(currentSpeed) > SPEED_THRESHOLD ?
                                  movingSpace : movingSpace / 4;
    }

    function fd_body_mousemove(event) {
      event.stopPropagation();
      currentEvent = cloneEvent(event);

      _calcSpeed();

      // move dialer
      var dialer = $('frequency-dialer');
      dialer.style.left = parseFloat(dialer.style.left) +
                                getMovingSpace() + 'px';

      tunedFrequency = _calcTargetFrequency();
      var roundedFrequency = Math.round(tunedFrequency * 10) / 10;

      if (roundedFrequency != self._currentFreqency) {
        self.setFrequency(toFixed(roundedFrequency), true);
      }

      startEvent = currentEvent;
    }

    function fd_body_mouseup(event) {
      event.stopPropagation();
      _removeEventListeners();

      // Add animation back
      $('frequency-dialer').classList.add('animation-on');

      // Add momentum if speed is higher than a given threshold.
      if (Math.abs(currentSpeed) > SPEED_THRESHOLD) {
        var direction = currentSpeed > 0 ? 1 : -1;
        tunedFrequency += Math.min(Math.abs(currentSpeed) * 5, 5) * direction;
      }
      tunedFrequency = self.setFrequency(toFixed(tunedFrequency));

      var req = mozFMRadio.setFrequency(tunedFrequency);
      req.onerror = function onerror_setFrequency() {
        tunedFrequency = self.setFrequency(mozFMRadio.frequency);
      };
    }

    function fd_mousedown(event) {
      event.stopPropagation();

      // Stop animation
      $('frequency-dialer').classList.remove('animation-on');

      startEvent = currentEvent = cloneEvent(event);
      tunedFrequency = self._currentFreqency;

      _removeEventListeners();
      document.body.addEventListener('mousemove', fd_body_mousemove, false);
      document.body.addEventListener('mouseup', fd_body_mouseup, false);
    }

    $('frequency-dialer').addEventListener('mousedown', fd_mousedown, false);
  },

  _initUI: function() {
    $('frequency-dialer').innerHTML = '';
    var lower = mozFMRadio.bandRanges.FM.lower;
    var upper = mozFMRadio.bandRanges.FM.upper;

    var unit = this.unit;
    this._minFrequency = lower - lower % unit;
    this._maxFrequency = upper + unit - upper % unit;
    var unitCount = (this._maxFrequency - this._minFrequency) / unit;

    for (var i = 0; i < unitCount; ++i) {
      var start = this._minFrequency + i * unit;
      start = start < lower ? lower : start;
      var end = this._maxFrequency + i * unit + unit;
      end = upper < end ? upper : end;
      this._addDialerUnit(start, end);
    }

    // cache the size of dialer
    this._dialerUnits = $$('#frequency-dialer .dialer-unit');
    this._dialerWidth = this._dialerUnits[0].clientWidth *
                                     this._dialerUnits.length;
    this._space = this._dialerWidth /
                    (this._maxFrequency - this._minFrequency);
  },

  _addDialerUnit: function(start, end) {
    var showFloor = start % this.unit == 0;
    var markStart = start - start % this.unit;
    var html = '';

    if (showFloor) {
      html += '<div class="dialer-unit-floor">' + start + '</div>';
    } else {
      html += '  <div class="dialer-unit-floor hidden-block">' +
                        start + '</div>';
    }
    html += '    <div class="dialer-unit-mark-box">';

    for (var i = 0; i < this.unit; i++) {
      if (markStart + i < start || markStart + i > end) {
        html += '    <div class="dialer-mark hidden-block"></div>';
      } else {
        html += '    <div class="dialer-mark ' +
                            (0 == i ? 'dialer-mark-long' : '') + '"></div>';
      }
    }

    html += '    </div>';
    html += '  </div>';
    var unit = document.createElement('div');
    unit.className = 'dialer-unit';
    unit.innerHTML = html;
    $('frequency-dialer').appendChild(unit);
  },

  _updateUI: function(frequency, ignoreDialer) {
    $('frequency').textContent = parseFloat(frequency.toFixed(1));
    if (true !== ignoreDialer) {
      $('frequency-dialer').style.left =
            (this._minFrequency - frequency) * this._space + 'px';
    }
  },

  setFrequency: function(frequency, ignoreDialer) {
    if (frequency < mozFMRadio.bandRanges.FM.lower) {
      frequency = mozFMRadio.bandRanges.FM.lower;
    }

    if (frequency > mozFMRadio.bandRanges.FM.upper) {
      frequency = mozFMRadio.bandRanges.FM.upper;
    }

    this._currentFreqency = frequency;
    this._updateUI(frequency, ignoreDialer);

    return frequency;
  }
};

var favoritesList = {
  _favList: null,

  KEYNAME: 'favlist',

  init: function() {
    var savedList = localStorage.getItem(this.KEYNAME);
    this._favList = !savedList ? { } : JSON.parse(savedList);

    this._showListUI();

    var self = this;
    var _container = $('fav-list-container');
    _container.addEventListener('click', function _onclick(event) {
      if (event.target.classList.contains('fav-list-remove-button')) {
        // remove from favorites list
        self.remove(self._getElemFreq(event.target));
        updateFreqUI();
      } else {
        mozFMRadio.setFrequency(self._getElemFreq(event.target));
      }
    }, false);
  },

  _save: function() {
    localStorage.setItem(this.KEYNAME, JSON.stringify(this._favList));
  },

  _showListUI: function() {
    var self = this;
    this.forEach(function(f) {
      self._addItemToListUI(f);
    });
  },

  _addItemToListUI: function(item) {
    var container = $('fav-list-container');
    var elem = document.createElement('div');
    elem.id = this._getUIElemId(item);
    elem.className = 'fav-list-item';
    var html = '';
    html += '<div class="fav-list-remove-button"></div>';
    html += '<label class="fav-list-frequency">';
    html += item.frequency.toFixed(1);
    html += '</label>';
    elem.innerHTML = html;

    // keep list ascending sorted
    if (container.childNodes.length == 0) {
      container.appendChild(elem);
    } else {
      var childNodes = container.childNodes;
      for (var i = 0; i < childNodes.length; i++) {
        var child = childNodes[i];
        var elemFreq = this._getElemFreq(child);
        if (item.frequency < elemFreq) {
          container.insertBefore(elem, child);
          break;
        } else if (i == childNodes.length - 1) {
          container.appendChild(elem);
          break;
        }
      }
    }

    return elem;
  },

  _removeItemFromListUI: function(freq) {
    if (!this.contains(freq)) {
      return;
    }

    var itemElem = $(this._getUIElemId(this._favList[freq]));
    if (itemElem) {
      itemElem.parentNode.removeChild(itemElem);
    }
  },

  _getUIElemId: function(item) {
    return 'frequency-' + item.frequency;
  },

  _getElemFreq: function(elem) {
    var isParentListItem = elem.parentNode.classList.contains('fav-list-item');
    var listItem = isParentListItem ? elem.parentNode : elem;
    return parseFloat(listItem.id.substring(listItem.id.indexOf('-') + 1));
  },

  forEach: function(callback) {
    for (var freq in this._favList) {
      callback(this._favList[freq]);
    }
  },

  /**
   *  Check if frequency is in fav list.
   */
  contains: function(freq) {
    return typeof this._favList[freq] != 'undefined';
  },

  /**
   * Add frequency to fav list.
   */
  add: function(freq) {
    if (!this.contains(freq)) {
      this._favList[freq] = {
        name: freq + '',
        frequency: freq
      };

      this._save();

      // show the item in favorites list.
      this._addItemToListUI(this._favList[freq]).scrollIntoView();
    }
  },

  /**
   * Remove frequency from fav list.
   */
  remove: function(freq) {
    var exists = this.contains(freq);
    this._removeItemFromListUI(freq);
    delete this._favList[freq];
    this._save();
    return exists;
  }
};

function init() {
  favoritesList.init();
  frequencyDialer.init();

  var seeking = false;
  function onclick_seekbutton(event) {
    var seekButton = event.target;

    if (seeking) {
      mozFMRadio.cancelSeek();
      return;
    }

    var up = seekButton.id == 'frequency-op-seekup';
    seekButton.setAttribute('data-status', 'seeking');
    seeking = true;
    var request = up ? mozFMRadio.seekUp() : mozFMRadio.seekDown();
    request.onsuccess = function sd_onsuccess() {
      seeking = false;
      seekButton.removeAttribute('data-status', 'seeking');
    };

    request.onerror = function sd_onerror() {
      seeking = false;
      seekButton.removeAttribute('data-status', 'seeking');
      console.log('failed to ' + (up ? 'seek up' : 'seek down'));
    };
  }

  $('frequency-op-seekdown').addEventListener('click',
                                   onclick_seekbutton, false);
  $('frequency-op-seekup').addEventListener('click',
                                   onclick_seekbutton, false);

  $('power-switch').addEventListener('click', function toggle_fm() {
    enableFM(!mozFMRadio.enabled);
  }, false);

  $('audio-routing-switch').addEventListener('click',
      function toggle_speaker() {
        mozFMRadio.speakerEnabled = !mozFMRadio.speakerEnabled;
        updateAudioUI();
      }
  , false);

  $('bookmark-button').addEventListener('click', function toggle_bookmark() {
    if (favoritesList.contains(mozFMRadio.frequency)) {
      favoritesList.remove(mozFMRadio.frequency);
    } else {
      favoritesList.add(mozFMRadio.frequency);
    }
    updateFreqUI();
  }, false);

  mozFMRadio.onfrequencychange = updateFreqUI;
  mozFMRadio.onenabled = updatePowerUI;
  mozFMRadio.ondisabled = updatePowerUI;
  mozFMRadio.onantennachange = function onAntennaChange() {
    updateAntennaUI();
    if (mozFMRadio.antennaAvailable) {
      enableFM(true);
    }
  };

  updateFreqUI();
  enableFM(true);
  updatePowerUI();
  updateAudioUI();
}

window.addEventListener('load', function(e) {
  init();
}, false);

// Turn off radio immediately when window is unloaded.
window.addEventListener('unload', function(e) {
  enableFM(false);
}, false);

// Set the 'lang' and 'dir' attributes to <html> when the page is translated
window.addEventListener('localized', function showBody() {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
});

