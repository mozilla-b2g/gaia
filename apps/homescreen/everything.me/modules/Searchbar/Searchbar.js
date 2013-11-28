'use strict';

Evme.Searchbar = new function Evme_Searchbar() {
  var NAME = 'Searchbar', self = this,
      el = null, elForm = null,
      value = '', isFocused = false,
      timeoutSearchOnBackspace = null, timeoutPause = null, timeoutIdle = null,
      intervalPolling = null,

      pending,

      SEARCHBAR_POLLING_INTERVAL = 300,
      TIMEOUT_BEFORE_SEARCHING_ON_BACKSPACE = 500,
      TIMEOUT_BEFORE_SENDING_PAUSE_EVENT = 'FROM CONFIG',
      TIMEOUT_BEFORE_SENDING_IDLE_EVENT = 'FROM CONFIG',
      RETURN_KEY_CODE = 13,
      SET_FOCUS_ON_CLEAR = true,
      BACKSPACE_KEY_CODE = 8,
      DELETE_KEY_CODE = 46;

  this.init = function init(options) {
    !options && (options = {});

    el = options.el;
    elForm = options.elForm;

    if (typeof options.setFocusOnClear === 'boolean') {
      SET_FOCUS_ON_CLEAR = options.setFocusOnClear;
    }

    elForm.addEventListener('submit', function oSubmit(e) {
      e.preventDefault();
      e.stopPropagation();
      clearTimeouts();
      cbReturnPressed(e, el.value);
    });

    TIMEOUT_BEFORE_SENDING_PAUSE_EVENT = options.timeBeforeEventPause;
    TIMEOUT_BEFORE_SENDING_IDLE_EVENT = options.timeBeforeEventIdle;

    el.addEventListener('focus', cbFocus);
    el.addEventListener('blur', cbBlur);
    el.addEventListener('input', inputChanged);
    el.addEventListener('contextmenu', onContextMenu);

    var elButtonClear = Evme.$('#button-clear');
    elButtonClear.addEventListener('touchstart', function onTouchStart(e) {
      e.preventDefault();
      e.stopPropagation();
      clearButtonClick();
    });

    Evme.EventHandler.trigger(NAME, 'init');
  };

  this.getValue = function getValue() {
    return trim(value) === '' ? '' : value;
  };

  this.isFocused = function getIsFocused() {
    return isFocused;
  };

  this.setValue = function setValue(newValue, bPerformSearch, bDontBlur) {
    if (value !== newValue) {
      value = newValue;
      el.value = value;

      if (bPerformSearch) {
        if (value === '') {
          cbEmpty();
        } else {
          cbValueChanged(value);
        }
      }

      if (!bDontBlur) {
        self.blur();
      }
    }
  };

  this.clear = function clear() {
    self.updateClearButtonState();
    value = '';
    el.value = '';
  };

  this.clearIfHasQuery = function clearIfHasQuery() {
    if (value) {
      self.setValue('', true);
      return true;
    }

    return false;
  };

  this.focus = function focus() {
    if (isFocused) {
      return;
    }

    el.focus();
    cbFocus();
  };

  this.blur = function blur(e) {
    if (!isFocused) {
      return;
    }

    el.blur();
    cbBlur(e);
  };

  this.getElement = function getElement() {
    return el;
  };

  this.startRequest = function startRequest() {
    pending = true;
  };

  this.endRequest = function endRequest() {
    pending = false;
  };

  this.isWaiting = function isWaiting() {
    return pending;
  };

  this.updateClearButtonState = function updateClearButtonState() {
    if (self.getValue() === '') {
      // hide clear button
      Evme.$('#search-header').classList.remove('clear-visible');
    } else {
      // show clear button
      Evme.$('#search-header').classList.add('clear-visible');
    }
  };

  function clearButtonClick() {
    self.setValue('', false, true);

    if (SET_FOCUS_ON_CLEAR) {
      el.focus();
    }

    window.setTimeout(function onTimeout() {
      cbClear();
      cbEmpty();
    }, 0);

    Evme.EventHandler.trigger(NAME, 'clearButtonClick');
  }

  function clearTimeouts() {
    window.clearTimeout(timeoutPause);
    window.clearTimeout(timeoutIdle);
  }

  function inputChanged(e) {
    clearTimeouts();

    var currentValue = el.value;

    if (currentValue !== value) {
      value = currentValue;

      self.updateClearButtonState();
      if (self.getValue() === '') {
        timeoutSearchOnBackspace &&
          window.clearTimeout(timeoutSearchOnBackspace);
        cbEmpty();
      } else {
        if (e.keyCode === BACKSPACE_KEY_CODE) {
          timeoutSearchOnBackspace &&
            window.clearTimeout(timeoutSearchOnBackspace);
          timeoutSearchOnBackspace = window.setTimeout(function onTimeout() {
            cbValueChanged(value);
          }, TIMEOUT_BEFORE_SEARCHING_ON_BACKSPACE);
        } else {
          cbValueChanged(value);
        }
      }
    }
  }

  function onContextMenu(e) {
    e.stopPropagation();
  }

  function pasted(e) {
    //
     // Setting timeout because otherwise the value of the input is the one
     // before the paste.
     //
    window.setTimeout(function onTimeout() {
      inputChanged({
        'keyCode': ''
      });
    }, 0);
  }

  function cbValueChanged(val) {
    timeoutPause =
      window.setTimeout(cbPause, TIMEOUT_BEFORE_SENDING_PAUSE_EVENT);
    timeoutIdle =
      window.setTimeout(cbIdle, TIMEOUT_BEFORE_SENDING_IDLE_EVENT);

    Evme.EventHandler.trigger(NAME, 'valueChanged', {
      'value': val
    });
  }

  function cbEmpty() {
    self.updateClearButtonState();
    Evme.EventHandler.trigger(NAME, 'empty', {
      'sourceObjectName': NAME
    });
  }

  function cbReturnPressed(e, val) {
    Evme.EventHandler.trigger(NAME, 'returnPressed', {
      'e': e,
      'value': val
    });
  }

  function cbClear() {
    Evme.EventHandler.trigger(NAME, 'clear');
  }

  function cbFocus(e) {
    if (isFocused) {
      return;
    }
    isFocused = true;
    self.updateClearButtonState();

    Evme.Brain && Evme.Brain[NAME].onfocus({
      'e': e
    });
  }

  function cbBlur(e) {
    if (!isFocused) {
      return;
    }

    self.updateClearButtonState();
    isFocused = false;

    Evme.Brain && Evme.Brain[NAME].onblur({
      'e': e
    });
  }

  function cbPause(e) {
    Evme.EventHandler.trigger(NAME, 'pause', {
      'query': value
    });
  }

  function cbIdle(e) {
    Evme.EventHandler.trigger(NAME, 'idle', {
      'query': value
    });
  }
}
