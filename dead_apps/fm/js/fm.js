'use strict';
/* global
  AirplaneModeHelper */

function $(id) {
  return document.getElementById(id);
}

function $$(expr) {
  return document.querySelectorAll(expr);
}

// XXX fake mozFMRadio object for UI testing on PC
var mozFMRadio = navigator.mozFM || navigator.mozFMRadio || {
  speakerEnabled: false,

  frequency: null,

  enabled: false,

  antennaAvailable: true,

  signalStrength: 1,

  frequencyLowerBound: 87.5,

  frequencyUpperBound: 108,

  channelWidth: 0.1,

  onsignalstrengthchange: function emptyFunction() { },

  onfrequencychange: function emptyFunction() { },

  onenabled: function emptyFunction() { },

  ondisabled: function emptyFunction() { },

  onantennaavailablechange: function emptyFunction() { },

  disable: function fm_disable() {
    if (!this.enabled) {
      return;
    }

    this.enabled = false;
    var self = this;
    window.setTimeout(function() {
      self.ondisabled();
    }, 500);

    return {};
  },

  enable: function fm_enable(frequency) {
    if (this.enabled) {
      return;
    }

    this.enabled = true;
    var self = this;
    window.setTimeout(function() {
      self.onenabled();
      self.setFrequency(frequency);
    }, 500);

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
    var request = {};
    window.setTimeout(function() {
      if (request.onsuccess) {
        request.onsuccess();
      }
    }, 0);
    return request;
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

// XXX fake SpeakerManager object for UI testing on PC
(function(aGlobal) {
  aGlobal.SpeakerManager = aGlobal.SpeakerManager || aGlobal.MozSpeakerManager;

  if (aGlobal.SpeakerManager) {
    return;
  }

  function SpeakerManager() {
    this.speakerforced = false;
  }

  SpeakerManager.prototype = {
    set forcespeaker(enable) {
      if (this.speakerforced != enable) {
        this.speakerforced = enable;
        if (this.onspeakerforcedchange) {
          this.onspeakerforcedchange();
        }
      }
    }
  };

  aGlobal.SpeakerManager = SpeakerManager;
})(window);

var enabling = false;
function updatePowerUI() {
  var enabled = mozFMRadio.enabled;
  var powerSwitch = $('power-switch');
  if (enabled) {
    window.performance.mark('fmRadioEnabled');
    // ACCESSIBILITY - Must set data-l10n-id to reflect Off switch
    powerSwitch.setAttribute('data-l10n-id', 'power-switch-off');
  } else {
    // ACCESSIBILITY - Must set data-l10n-id to reflect On switch
    powerSwitch.setAttribute('data-l10n-id', 'power-switch-on');
  }
  console.log('Power status: ' + (enabled ? 'on' : 'off'));
  powerSwitch.dataset.enabled = enabled;
  powerSwitch.dataset.enabling = enabling;
}

var airplaneModeEnabled = false;
function updateWarningModeUI() {
  $('airplane-mode-warning').hidden = !airplaneModeEnabled;
  $('antenna-warning').hidden = mozFMRadio.antennaAvailable ||
    airplaneModeEnabled;
  $('container').classList.toggle('hidden-block', airplaneModeEnabled ||
    !mozFMRadio.antennaAvailable);
}

function updateFrequencyBarUI() {
  var frequencyBar = $('frequency-bar');
  if (enabling) {
    frequencyBar.classList.add('dim');
  } else {
    frequencyBar.classList.remove('dim');
  }
}

function updateEnablingState(enablingState) {
  enabling = enablingState;
  updatePowerUI();
  updateFrequencyBarUI();
}

function enableFMRadio(frequency) {
  if (airplaneModeEnabled) {
    return;
  }

  var request = mozFMRadio.enable(frequency);
  // Request might fail, see bug862672
  request.onerror = function onerror_enableFMRadio(event) {
    updateEnablingState(false);
  };

  updateEnablingState(true);
}

/**
 * If the FM radio is seeking currently, cancel it and then set frequency.
 *
 * @param {freq} frequency set.
 */
function cancelSeekAndSetFreq(frequency) {
  function setFreq() {
    mozFMRadio.setFrequency(frequency);
  }

  var seeking = !!$('power-switch').getAttribute('data-seeking');
  if (!seeking) {
    setFreq();
  } else {
    var request = mozFMRadio.cancelSeek();
    request.onsuccess = setFreq;
    request.onerror = setFreq;
  }
}

var frequencyDialer = {
  unit: 2,
  _bandUpperBound: 0,
  _bandLowerBound: 0,
  _minFrequency: 0,
  _maxFrequency: 0,
  _currentFreqency: 0,
  _translateX: 0,

  init: function() {
    // First thing is to show a warning if there    // is not antenna.
    updateWarningModeUI();

    this._initUI();
    this.setFrequency(mozFMRadio.frequency);
    this._addEventListeners();
  },

  _addEventListeners: function() {
    function _removeEventListeners() {
      document.body.removeEventListener('touchend', fd_body_touchend, false);
      document.body.removeEventListener('touchmove', fd_body_touchmove, false);
    }

    function cloneEvent(evt) {
      if ('touches' in evt) {
        evt = evt.touches[0];
      }
      return { x: evt.clientX, y: evt.clientX,
               timestamp: evt.timeStamp };
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

    function getMovingSpace() {
      var movingSpace = currentEvent.x - startEvent.x;
      return movingSpace;
    }

    function fd_body_touchmove(event) {
      event.stopPropagation();
      currentEvent = cloneEvent(event);

      _calcSpeed();

      // move dialer
      var dialer = $('frequency-dialer');
      var translateX = self._translateX + getMovingSpace();
      self._translateX = translateX;
      var count = dialer.childNodes.length;
      for (var i = 0; i < count; i++) {
        var child = dialer.childNodes[i];
        child.style.MozTransform = 'translateX(' + translateX + 'px)';
      }

      tunedFrequency = _calcTargetFrequency();
      var roundedFrequency = Math.round(tunedFrequency * 10) / 10;

      if (roundedFrequency != self._currentFreqency) {
        self.setFrequency(toFixed(roundedFrequency), true);
      }

      startEvent = currentEvent;
    }

    function fd_body_touchend(event) {
      event.stopPropagation();
      _removeEventListeners();

      // Add animation back
      $('frequency-dialer').classList.add('animation-on');
      // Add momentum if speed is higher than a given threshold.
      if (Math.abs(currentSpeed) > SPEED_THRESHOLD) {
        var direction = currentSpeed > 0 ? 1 : -1;
        tunedFrequency += Math.min(Math.abs(currentSpeed) * 3, 3) * direction;
      }
      tunedFrequency = self.setFrequency(toFixed(tunedFrequency));
      cancelSeekAndSetFreq(tunedFrequency);

      // Reset vars
      currentEvent = null;
      startEvent = null;
      currentSpeed = 0;
    }

    function fd_touchstart(event) {
      event.stopPropagation();

      // Stop animation
      $('frequency-dialer').classList.remove('animation-on');

      startEvent = currentEvent = cloneEvent(event);
      tunedFrequency = self._currentFreqency;

      _removeEventListeners();
      document.body.addEventListener('touchmove', fd_body_touchmove, false);
      document.body.addEventListener('touchend', fd_body_touchend, false);
    }

    function fd_key(event) {
      if (event.keyCode === event.DOM_VK_UP) {
        tunedFrequency = self._currentFreqency + 0.1;
      } else if (event.keyCode === event.DOM_VK_DOWN) {
        tunedFrequency = self._currentFreqency - 0.1;
      } else {
        return;
      }

      tunedFrequency = self.setFrequency(toFixed(tunedFrequency));
      cancelSeekAndSetFreq(tunedFrequency);
    }

    var dialerContainer = $('dialer-container');
    dialerContainer.addEventListener('touchstart', fd_touchstart, false);
    // ACCESSIBILITY - Add keypress event for screen reader
    dialerContainer.addEventListener('keypress', fd_key, false);
  },

  _initUI: function() {
    $('frequency-dialer').innerHTML = '';
    var lower = this._bandLowerBound = mozFMRadio.frequencyLowerBound;
    var upper = this._bandUpperBound = mozFMRadio.frequencyUpperBound;

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
    var _dialerUnits = $$('#frequency-dialer .dialer-unit');
    var _dialerUnitWidth = _dialerUnits[0].clientWidth;
    this._dialerWidth = _dialerUnitWidth * _dialerUnits.length;
    this._space = this._dialerWidth /
                    (this._maxFrequency - this._minFrequency);

    for (i = 0; i < _dialerUnits.length; i++) {
      _dialerUnits[i].style.left = i * _dialerUnitWidth + 'px';
    }
  },

  _addDialerUnit: function(start, end) {
    var markStart = start - start % this.unit;

    // At the beginning and end of the dial, some of the notches should be
    // hidden. To do this, we use an absolutely positioned div mask.
    // startMaskWidth and endMaskWidth track how wide that mask should be.
    var startMaskWidth = 0;
    var endMaskWidth = 0;

    // unitWidth is how wide each notch is that needs to be covered.
    var unitWidth = 16;

    var total = this.unit * 10;     // 0.1MHz
    for (var i = 0; i < total; i++) {
      var dialValue = markStart + i * 0.1;
      if (dialValue < start) {
        startMaskWidth += unitWidth;
      } else if (dialValue > end) {
        endMaskWidth += unitWidth;
      }
    }

    var container = document.createElement('div');
    container.classList.add('dialer-unit-mark-box');

    if (startMaskWidth > 0) {
      var markEl = document.createElement('div');
      markEl.classList.add('dialer-unit-mark-mask-start');
      markEl.style.width = startMaskWidth + 'px';

      container.appendChild(markEl);
    }

    if (endMaskWidth > 0) {
      var markEnd = document.createElement('div');
      markEnd.classList.add('dialer-unit-mark-mask-end');
      markEnd.style.width = endMaskWidth + 'px';

      container.appendChild(markEnd);
    }

    var width = (100 / this.unit) + '%';
    // Show the frequencies on dialer
    for (var j = 0; j < this.unit; j++) {
      var frequency = Math.floor(markStart) + j;
      var showFloor = frequency >= start && frequency <= end;

      var unit = document.createElement('div');
      unit.classList.add('dialer-unit-floor');
      if (!showFloor) {
        unit.classList.add('hidden-block');
      }
      unit.style.width = width;
      unit.appendChild(document.createTextNode(frequency));
      container.appendChild(unit);
    }

    var dialerUnit = document.createElement('div');
    dialerUnit.className = 'dialer-unit';
    dialerUnit.appendChild(container);
    $('frequency-dialer').appendChild(dialerUnit);
  },

  _updateUI: function(frequency, ignoreDialer) {
    document.l10n.setAttributes($('frequency'), 'frequency-MHz', {
      value: frequency.toFixed(1)
    });
    if (true !== ignoreDialer) {
      this._translateX = (this._minFrequency - frequency) * this._space;
      var dialer = $('frequency-dialer');
      var count = dialer.childNodes.length;
      for (var i = 0; i < count; i++) {
        dialer.childNodes[i].style.MozTransform =
          'translateX(' + this._translateX + 'px)';
      }
      $('dialer-container').setAttribute('aria-valuenow', frequency);
    }
  },

  setFrequency: function(frequency, ignoreDialer) {
    if (frequency < this._bandLowerBound) {
      frequency = this._bandLowerBound;
    }

    if (frequency > this._bandUpperBound) {
      frequency = this._bandUpperBound;
    }

    this._currentFreqency = frequency;
    this._updateUI(frequency, ignoreDialer);

    return frequency;
  },

  getFrequency: function() {
    return this._currentFreqency;
  }
};

var historyList = {

  _historyList: [],

  /**
   * Storage key name.
   * @const
   * @type {string}
   */
  KEYNAME: 'historylist',

  /**
   * Maximum size of the history
   * @const
   * @type {integer}
   */
  SIZE: 1,

  init: function hl_init(callback) {
    var self = this;
    window.asyncStorage.getItem(this.KEYNAME, function storage_getItem(value) {
      self._historyList = value || [];
      if (typeof callback == 'function') {
        callback();
      }
    });
  },

  _save: function hl_save() {
    window.asyncStorage.setItem(this.KEYNAME, this._historyList);
  },

  /**
   * Add frequency to history list.
   *
   * @param {freq} frequency to add.
   */
  add: function hl_add(freq) {
    if (freq == null) {
      return;
    }
    var self = this;
    self._historyList.push({
      name: freq + '',
      frequency: freq
    });
    if (self._historyList.length > self.SIZE) {
      self._historyList.shift();
    }
    self._save();
  },

  /**
   * Get the last frequency tuned
   *
   * @return {freq} the last frequency tuned.
   */
  last: function hl_last() {
    if (this._historyList.length === 0) {
      return null;
    }
    else {
      return this._historyList[this._historyList.length - 1];
    }
  }

};

var favoritesList = {
  _favList: null,

  KEYNAME: 'favlist',

  init: function(callback) {
    var self = this;
    window.asyncStorage.getItem(this.KEYNAME, function storage_getItem(value) {
      self._favList = value || { };
      self._showListUI();

      if (typeof callback == 'function') {
        callback();
      }
    });

    var _container = $('fav-list-container');
    _container.addEventListener('click', function _onclick(event) {
      var frequency = self._getElemFreq(event.target);
      if (!frequency) {
        return;
      }

      if (event.target.classList.contains('fav-list-remove-button')) {
        // Remove the item from the favorites list.
        self.remove(frequency);
        updateFreqUI();
      } else {
        if (mozFMRadio.enabled) {
          cancelSeekAndSetFreq(frequency);
        } else {
          // If fm is disabled, turn the radio on.
          enableFMRadio(frequency);
        }
      }
    });
  },

  _save: function() {
    window.asyncStorage.setItem(this.KEYNAME, this._favList);
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
    elem.setAttribute('role', 'option');

    var subElem = document.createElement('div');
    subElem.className = 'fav-list-frequency';
    document.l10n.setAttributes(subElem, 'fav-frequency-MHz', {
      value: item.frequency.toFixed(1)
    });
    elem.appendChild(subElem);

    subElem = document.createElement('div');
    subElem.className = 'fav-list-remove-button';
    elem.appendChild(subElem);

    // keep list ascending sorted
    if (container.childNodes.length === 0) {
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
    // ensure we get the closest list-item.
    elem = elem.closest('.fav-list-item');
    return parseFloat(elem.id.substring(elem.id.indexOf('-') + 1));
  },

  forEach: function(callback) {
    for (var freq in this._favList) {
      callback(this._favList[freq]);
    }
  },

  /**
   * Check if frequency is in fav list.
   *
   * @param {number} frequence to check.
   *
   * @return {boolean} True if freq is in fav list.
   */
  contains: function(freq) {
    if (!this._favList) {
      return false;
    }
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
      var elem = this._addItemToListUI(this._favList[freq]);
      window.scrollTo(0, elem.offsetTop);
    }
  },

  /**
   * Remove frequency from fav list.
   *
   * @param {number} freq to remove.
   *
   * @return {boolean} True if freq to remove is in fav list.
   */
  remove: function(freq) {
    var exists = this.contains(freq);
    this._removeItemFromListUI(freq);
    delete this._favList[freq];
    this._save();
    return exists;
  },

  select: function(freq) {
    var items = $$('#fav-list-container div.fav-list-item');
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (this._getElemFreq(item) == freq) {
        item.classList.add('selected');
        item.setAttribute('aria-selected', true);
      } else {
        item.classList.remove('selected');
        item.setAttribute('aria-selected', false);
      }
    }
  }
};

function updateFreqUI() {
  historyList.add(mozFMRadio.frequency);
  frequencyDialer.setFrequency(mozFMRadio.frequency);
  var frequency = frequencyDialer.getFrequency();
  favoritesList.select(frequency);
  var bookmarkButton = $('bookmark-button');
  bookmarkButton.dataset.bookmarked = favoritesList.contains(frequency);
  bookmarkButton.setAttribute('aria-pressed',
    favoritesList.contains(frequency));
}

function init() {
  frequencyDialer.init();

  function onclick_seekbutton(event) {
    /* jshint validthis: true */
    var seekButton = this;
    var powerSwitch = $('power-switch');
    var seeking = !!powerSwitch.getAttribute('data-seeking');
    var up = seekButton.id == 'frequency-op-seekup';

    function seek() {
      powerSwitch.dataset.seeking = true;

      var request = up ? mozFMRadio.seekUp() : mozFMRadio.seekDown();

      request.onsuccess = function seek_onsuccess() {
        powerSwitch.removeAttribute('data-seeking');
      };

      request.onerror = function seek_onerror() {
        powerSwitch.removeAttribute('data-seeking');
      };
    }

    // If the FM radio is seeking channel currently, cancel it and seek again.
    if (seeking) {
      var request = mozFMRadio.cancelSeek();
      request.onsuccess = seek;
      request.onerror = seek;
    } else {
      seek();
    }
  }

  $('frequency-op-seekdown').addEventListener('click',
                                   onclick_seekbutton, false);
  $('frequency-op-seekup').addEventListener('click',
                                   onclick_seekbutton, false);

  $('power-switch').addEventListener('click', function toggle_fm() {
    if (mozFMRadio.enabled) {
      mozFMRadio.disable();
    } else {
      enableFMRadio(frequencyDialer.getFrequency());
    }
  }, false);

  $('bookmark-button').addEventListener('click', function toggle_bookmark() {
    var frequency = frequencyDialer.getFrequency();
    if (favoritesList.contains(frequency)) {
      favoritesList.remove(frequency);
    } else {
      favoritesList.add(frequency);
    }
    updateFreqUI();
  }, false);

  var speakerManager = new window.SpeakerManager();
  $('speaker-switch').addEventListener('click', function toggle_speaker() {
    speakerManager.forcespeaker = !speakerManager.speakerforced;
  }, false);

  speakerManager.onspeakerforcedchange = function onspeakerforcedchange() {
    var speakerSwitch = $('speaker-switch');
    speakerSwitch.dataset.speakerOn = speakerManager.speakerforced;
    speakerSwitch.setAttribute('aria-pressed', speakerManager.speakerforced);
  };

  mozFMRadio.onfrequencychange = updateFreqUI;
  mozFMRadio.onenabled = function() {
    updateEnablingState(false);
  };
  mozFMRadio.ondisabled = function() {
    updateEnablingState(false);
  };

  mozFMRadio.onantennaavailablechange = function onAntennaChange() {
    updateWarningModeUI();
    if (mozFMRadio.antennaAvailable) {
      // If the FM radio is enabled or enabling when the antenna is unplugged,
      // turn the FM radio on again.
      if (!!window._previousFMRadioState || !!window._previousEnablingState) {
        enableFMRadio(frequencyDialer.getFrequency());
      }
    } else {
      // Remember the current state of the FM radio
      window._previousFMRadioState = mozFMRadio.enabled;
      window._previousEnablingState = enabling;
      mozFMRadio.disable();
    }
  };

  // Disable the power button and the fav list when the airplane mode is on.
  updateWarningModeUI();

  AirplaneModeHelper.addEventListener('statechange', function(status) {
    airplaneModeEnabled = status === 'enabled';
    updateWarningModeUI();
  });

  // Load the fav list and enable the FM radio if an antenna is available.
  historyList.init(function hl_ready() {
    if (mozFMRadio.antennaAvailable) {
      // Enable FM immediately
      if (historyList.last() && historyList.last().frequency) {
        enableFMRadio(historyList.last().frequency);
      } else {
        enableFMRadio(mozFMRadio.frequencyLowerBound);
      }

      favoritesList.init(updateFreqUI);
    } else {
      // Mark the previous state as True,
      // so the FM radio be enabled automatically
      // when the headset is plugged.
      window._previousFMRadioState = true;
      updateWarningModeUI();
      favoritesList.init();
    }
    updatePowerUI();

    // PERFORMANCE MARKER (5): fullyLoaded
    // Designates that the app is *completely* loaded and all relevant
    // "below-the-fold" content exists in the DOM, is marked visible,
    // has its events bound and is ready for user interaction. All
    // required startup background processing should be complete.
    window.performance.mark('fullyLoaded');
  });
}

document.l10n.ready.then(function() {
  // PERFORMANCE MARKER (1): navigationLoaded
  // Designates that the app's *core* chrome or navigation interface
  // exists in the DOM and is marked as ready to be displayed.
  window.performance.mark('navigationLoaded');

  AirplaneModeHelper.ready(function() {
    airplaneModeEnabled = AirplaneModeHelper.getStatus() == 'enabled';
    init();

    // PERFORMANCE MARKER (2): navigationInteractive
    // Designates that the app's *core* chrome or navigation interface
    // has its events bound and is ready for user interaction.
    window.performance.mark('navigationInteractive');

    // PERFORMANCE MARKER (3): visuallyLoaded
    // Designates that the app is visually loaded (e.g.: all of the
    // "above-the-fold" content exists in the DOM and is marked as
    // ready to be displayed).
    window.performance.mark('visuallyLoaded');

    // PERFORMANCE MARKER (4): contentInteractive
    // Designates that the app has its events bound for the minimum
    // set of functionality to allow the user to interact with the
    // "above-the-fold" content.
    window.performance.mark('contentInteractive');
  });
});


// Turn off radio immediately when window is unloaded.
window.addEventListener('unload', function(e) {
  mozFMRadio.disable();
}, false);

