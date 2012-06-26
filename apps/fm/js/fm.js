'use strict';

function $(id) {
  return document.getElementById(id);
}

function $$(expr) {
  return document.querySelectorAll(expr);
}

// XXX fake mozFMRadio object for UI testing on PC
var mozFMRadio = navigator.mozFMRadio || {
  frequency: 91.5,

  enabled: false,

  antennaAvailable: true,

  onfrequencychanged: function emptyFunction() { },

  onpowerchanged: function emptyFunction() { },

  onantennachanged: function emptyFunction() { },

  setEnabled: function fm_setEnabled(enabled) {
    var previousValue = this.enabled;
    this.enabled = enabled;
    if (previousValue != enabled) {
      this.onpowerchanged();
    }
  },

  setFrequency: function fm_setFrequency(freq) {
    freq = parseFloat(freq.toFixed(1));
    var previousValue = this.frequency;
    this.frequency = freq;
    if (previousValue != freq) {
      this.onfrequencychanged();
    }
  },

  seekUp: function fm_seekUp() {
    this.setFrequency(this.frequency + 0.2);
  },

  seekDown: function fm_seekDown() {
    this.setFrequency(this.frequency - 0.2);
  },

  cancelSeek: function fm_cancelSeek() { }
};

function enableFM(enable) {
  if (!mozFMRadio.antennaAvailable) {
    updateAntennaUI();
    return;
  }

  var request = null;
  try {
    request = mozFMRadio.setEnabled(enable);
  } catch (e) {
    console.log(e);
  }

  request.onsuccess = function turnon_onsuccess() {
    console.log('FM status is changed to ' + mozFMRadio.enabled);
  };

  request.onerror = function turnon_onerror() {
    console.log('Failed to turn on FM!');
  };
}

function setFreq(freq) {
  var request = null;
  try {
    request = mozFMRadio.setFrequency(freq);
  } catch (e) {
    console.log(e);
  }

  request.onsuccess = function setfreq_onsuccess() {
    console.log('Set freq successfully!' + freq);
  };

  request.onerror = function sefreq_onerror() {
    console.log('Fail to set fm freq');
  };
}

function updateFreqUI() {
  $('frequency').textContent = mozFMRadio.frequency;
  $('bookmark-button').className =
       favoritesList.contains(mozFMRadio.frequency) ? 'in-fav-list' : '';
}

function updatePowerUI() {
  console.log('Power status: ' + (mozFMRadio.enabled ? 'on' : 'off'));
  $('power-switch').className = mozFMRadio.enabled ? 'poweron' : 'poweroff';
}

function updateAntennaUI() {
  $('antenna-warning').hidden = mozFMRadio.antennaAvailable;
}

function seekUp() {
  var request = null;
  try {
    request = mozFMRadio.seekUp();
  } catch (e) {
    console.log(e);
  }

  request.onsuccess = function seekup_onsuccess() {
    $('current_freq').innerHTML = mozFMRadio.frequency;
    console.log('Seek up complete, and got new program.');
  };

  request.onerror = function seekup_onerror() {
    console.log('Failed to seek up.');
  };
}

function seekDown() {
  var request = null;
  try {
    request = mozFMRadio.seekDown();
  } catch (e) {
    console.log(e);
  }

  request.onsuccess = function seekdown_onsuccess() {
    $('current_freq').innerHTML = mozFMRadio.frequency;
    console.log('Seek down complete, and got new program.');
  };

  request.onerror = function seekdown_onerror() {
    console.log('Failed to seek down.');
  };
}

function cancelSeek() {
  var request = null;
  try {
    request = mozFMRadio.cancelSeek();
  } catch (e) {
    console.log(e);
  }

  request.onsuccess = function cancel_onsuccess() {
    console.log('Seeking is canceled.');
  };

  request.onerror = function cancel_onerror() {
    console.log('Failed to cancel seek.');
  };
}

var favoritesList = {
  _favList: null,

  KEYNAME: 'favlist',

  editing: false,

  init: function() {
    var savedList = localStorage.getItem(this.KEYNAME);
    this._favList = !savedList ? { } : JSON.parse(savedList);

    this._showListUI();

    $('edit-button').addEventListener('click',
                         this.startEdit.bind(this), false);
    $('cancel-button').addEventListener('click',
                         this.cancelEdit.bind(this), false);
    $('delete-button').addEventListener('click',
                         this.delSelectedItems.bind(this), false);
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
    elem.textContent = item.frequency;
    container.appendChild(elem);

    var self = this;
    var _timeout = null;

    function onmouseup_item(event) {
      window.clearTimeout(_timeout);
      if (!self.editing) {
        setFreq(self._getElemFreq(event.target));
      } else {
        event.target.classList.toggle('selected');
      }
    }

    elem.addEventListener('mousedown', function onmousedown_item(event) {
      elem.addEventListener('mouseup', onmouseup_item, false);

      if (self.editing) {
        return;
      }

      window.clearTimeout(_timeout);
      _timeout = window.setTimeout(function() {
        // prevent opening the frequency
        elem.removeEventListener('mouseup', onmouseup_item, false);
        self._showPopupDelUI(elem, event);
      }, 1000);
    }, false);

    this._autoShowHideEditBtn();
  },

  _removeItemFromListUI: function(freq) {
    if (!this.contains(freq)) {
      return;
    }

    var itemElem = $(this._getUIElemId(this._favList[freq]));
    if (itemElem) {
      itemElem.parentNode.removeChild(itemElem);
    }
    this._autoShowHideEditBtn();
  },

  _autoShowHideEditBtn: function() {
    $('edit-button').hidden = $$('#fav-list-container div').length == 0;
  },

  _getUIElemId: function(item) {
    return 'freq-' + item.frequency;
  },

  _getElemFreq: function(elem) {
    return parseFloat(elem.id.substring(elem.id.indexOf('-') + 1));
  },

  _showPopupDelUI: function(elem, event) {
    // Show popup just below the cursor
    var box = $('popup-delete-box');
    box.hidden = false;
    var max = document.body.clientWidth - box.clientWidth - 10;
    var min = 10;
    var left = event.clientX - box.clientWidth / 2;
    left = left < min ? min : (left > max ? max : left);
    box.style.top = event.clientY + 10 + 'px';
    box.style.left = left + 'px';

    function _onclick_delete_button(event) {
      self.remove(self._getElemFreq(elem));
      updateFreqUI();
      _hidePopup();
      _clearEventListeners();
    }

    function _hidePopup() {
      $('popup-delete-box').hidden = true;
      $('popup-delete-button').removeEventListener('click',
                                 _onclick_delete_button, false);
    }

    function _mousedown_del_box(event) {
      event.stopPropagation();
    }

    function _mousedown_body(event) {
      _hidePopup();
      _clearEventListeners();
    }

    function _clearEventListeners() {
      document.body.removeEventListener('mousedown', _mousedown_body, false);
      $('popup-delete-box').removeEventListener('mousedown',
                              _mousedown_del_box, true);
    }

    function _addEventListeners() {
      // Hide popup when tapping
      document.body.addEventListener('mousedown', _mousedown_body, false);
      $('popup-delete-box').addEventListener('mousedown',
                              _mousedown_del_box, true);
    }
    _addEventListeners();

    var self = this;

    $('popup-delete-button').addEventListener('click',
                               _onclick_delete_button, false);
  },

  startEdit: function(event) {
    this.editing = true;
    $('switch-bar').hidden = true;
    $('edit-bar').hidden = false;
  },

  cancelEdit: function(event) {
    this.editing = false;
    $('switch-bar').hidden = false;
    $('edit-bar').hidden = true;
    var selectedItems = $$('#fav-list-container > div.selected');
    for (var i = 0; i < selectedItems.length; i++) {
      selectedItems[i].classList.remove('selected');
    }
  },

  delSelectedItems: function(event) {
    var selectedItems = $$('#fav-list-container > div.selected');
    for (var i = 0; i < selectedItems.length; i++) {
      this.remove(this._getElemFreq(selectedItems[i]));
    }
    updateFreqUI();
  },

  forEach: function(f) {
    for (var freq in this._favList) {
      f(this._favList[freq]);
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

      this._addItemToListUI(this._favList[freq]);
      this._save();

      // show the item in favorites list.
      $('fav-list').scrollTop =
               $('fav-list').scrollHeight - $('fav-list').clientHeight;
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

  $('freq-op-seekdown').addEventListener('click', seekDown, false);
  $('freq-op-seekup').addEventListener('click', seekUp, false);

  $('freq-op-100khz-down').addEventListener('click', function set_freq_down() {
    setFreq(mozFMRadio.frequency - 0.1);
  }, false);

  $('freq-op-100khz-up').addEventListener('click', function set_freq_up() {
    setFreq(mozFMRadio.frequency + 0.1);
  }, false);

  $('power-switch').addEventListener('click', function toggle_fm() {
    enableFM(!mozFMRadio.enabled);
  }, false);

  $('bookmark-button').addEventListener('click', function toggle_bookmark() {
    if (favoritesList.contains(mozFMRadio.frequency)) {
      favoritesList.remove(mozFMRadio.frequency);
    } else {
      favoritesList.add(mozFMRadio.frequency);
    }
    updateFreqUI();
  }, false);

  mozFMRadio.onfrequencychanged = updateFreqUI;
  mozFMRadio.onpowerchanged = updatePowerUI;
  mozFMRadio.onantennachanged = function onAntennaChange() {
    updateAntennaUI();
    if (mozFMRadio.antennaAvailable) {
      enableFM(true);
    }
  };

  updateFreqUI();
  enableFM(true);
  updatePowerUI();
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

