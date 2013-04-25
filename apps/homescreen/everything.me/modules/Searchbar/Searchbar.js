Evme.Searchbar = new function Evme_Searchbar() {
    var NAME = 'Searchbar', self = this,
        el = null, elCursor = null,
        value = '', isFocused = false,
        timeoutSearchOnBackspace = null, timeoutPause = null, timeoutIdle = null,
        intervalPolling = null,

        SEARCHBAR_POLLING_INTERVAL = 300,
        TIMEOUT_BEFORE_SEARCHING_ON_BACKSPACE = 500,
        TIMEOUT_BEFORE_SENDING_PAUSE_EVENT = 'FROM CONFIG',
        TIMEOUT_BEFORE_SENDING_IDLE_EVENT = 'FROM CONFIG',
        RETURN_KEY_CODE = 13,
        BACKSPACE_KEY_CODE = 8,
        DELETE_KEY_CODE = 46,
        
        CURSOR_INITIAL_POSITION = 0,
        MAX_FONT_SIZE = 0;

    this.init = function init(options) {
      !options && (options = {});

      el = options.el;
      elCursor = options.elCursor;
      
      options.elShortcutsButton.addEventListener('touchstart', onShortcutsButtonTap);

      TIMEOUT_BEFORE_SENDING_PAUSE_EVENT = options.timeBeforeEventPause;
      TIMEOUT_BEFORE_SENDING_IDLE_EVENT = options.timeBeforeEventIdle;
      
      MAX_FONT_SIZE = parseInt(getComputedStyle(el).fontSize.replace('px', ''), 10);
      
      el.addEventListener('focus', cbFocus);
      el.addEventListener('blur', cbBlur);
      el.addEventListener('keydown', inputKeyDown);
      el.addEventListener('keyup', inputKeyUp);
      el.addEventListener('touchmove', function onTouchMove(e) {
        e.preventPanning = true;
      });

      // when language is changed, the placeholder text changes as well
      // this makes sure the text doesn't overflow
      var observer = new MutationObserver(function onAttributeChange(mutations) {
        for (var i=0, mutation; mutation=mutations[i++];) {
          if (mutation.attributeName === 'placeholder') {
            self.updateFontSize();
          }
        }
      });
      observer.observe(el, {"attributes": true});
      
      options.elClearButton.addEventListener('touchstart', function onTouchStart(e){
        e.preventDefault();
        e.stopPropagation();
        clearButtonClick(e);
      });
      options.elSaveButton.addEventListener('touchstart', function onTouchStart(e){
        e.preventDefault();
        e.stopPropagation();
        saveButtonClick(e);
      });

      Evme.EventHandler.trigger(NAME, 'init');
    };
    
    this.getValue = function getValue() {
      return value;
    };
    
    this.isEmpty = function isEmpty() {
      return value === '';
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
      value = '';
      el.value = '';
    };

    this.clearIfHasQuery = function clearIfHasQuery() {
      if (el.value) {
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
    
    this.isFocused = function focused() {
      return isFocused;
    };

    this.updateFontSize = function updateFontSize(newValue) {
      !newValue && (newValue = el.placeholder);
      
      // make sure we know where the cursor should be
      if (!CURSOR_INITIAL_POSITION) {
        CURSOR_INITIAL_POSITION = elCursor.getBoundingClientRect().left;
      }

      // create a test element with which we'll check the font size
      var elTest = Evme.$create('span', {'class': 'font-size-test'}, newValue),
          fontSize = MAX_FONT_SIZE,
          offsetLeft = el.getBoundingClientRect().left,
          maxWidth = CURSOR_INITIAL_POSITION - offsetLeft;

      // set the font of the test element to be the same as the input's
      elTest.style.fontFamily = getComputedStyle(el).fontFamily;
      el.parentNode.appendChild(elTest);

      // make the font smaller until it fits inside the area
      while (elTest.offsetWidth > maxWidth) {
        fontSize -= 1;
        elTest.style.fontSize = fontSize + 'px';
      }

      // give the original input the proper font size
      el.style.fontSize = fontSize + 'px';
      
      // position the blinking cursor in the correct position
      elCursor.style.cssText += '; top: ' + elTest.offsetTop + 'px;' +
                                '; left: ' + (elTest.offsetLeft + elTest.offsetWidth) + 'px;' +
                                '; height: ' + elTest.offsetHeight + 'px;';

      Evme.$remove(elTest);

      return fontSize;
    };

    function onShortcutsButtonTap(e) {
      Evme.EventHandler.trigger(NAME, 'shortcutsButtonClick', {
        "e": e
      });
    }

    function clearButtonClick(e) {
      if (self.isFocused() && !self.isEmpty()) {
        e.stopPropagation();
        e.preventDefault();
      }

      Evme.EventHandler.trigger(NAME, 'clearButtonClick', {
        "e": e
      });
    }
    
    function saveButtonClick(e) {
      Evme.EventHandler.trigger(NAME, 'saveButtonClick', {
        "e": e
      });
    }

    function inputKeyDown(e) {
      window.clearTimeout(timeoutPause);
      window.clearTimeout(timeoutIdle);
    }
    
    function inputKeyUp(e) {
      var currentValue = el.value;

      if (currentValue !== value) {
        value = currentValue;

        if (value === '') {
          timeoutSearchOnBackspace && window.clearTimeout(timeoutSearchOnBackspace);
          cbEmpty();
        } else {
          if (e.keyCode === BACKSPACE_KEY_CODE) {
            timeoutSearchOnBackspace && window.clearTimeout(timeoutSearchOnBackspace);
            timeoutSearchOnBackspace = window.setTimeout(function onTimeout(){
                cbValueChanged(value);
            }, TIMEOUT_BEFORE_SEARCHING_ON_BACKSPACE);
          } else {
            cbValueChanged(value);
          }
        }
      } else {
        if (e.keyCode === RETURN_KEY_CODE) {
          cbReturnPressed(e, value);
        }
      }
    }

    function pasted(e) {
      // Setting timeout because otherwise the value of the input is the one
      // before the paste.
      window.setTimeout(function onTimeout(){
        inputKeyUp({
            "keyCode": ''
        });
      }, 0);
    }

    function cbValueChanged(val) {
      timeoutPause = window.setTimeout(cbPause, TIMEOUT_BEFORE_SENDING_PAUSE_EVENT);
      timeoutIdle = window.setTimeout(cbIdle, TIMEOUT_BEFORE_SENDING_IDLE_EVENT);
      
      Evme.EventHandler.trigger(NAME, 'valueChanged', {
        "value": val
      });
    }
    
    function cbEmpty() {
      Evme.EventHandler.trigger(NAME, 'empty', {
        "sourceObjectName": NAME
      });
    }
    
    function cbReturnPressed(e, val) {
      Evme.EventHandler.trigger(NAME, 'returnPressed', {
        "e": e,
        "value": val
      });
    }
    
    function cbClear() {
      Evme.EventHandler.trigger(NAME, "clear");
    }
    
    function cbFocus(e) {
      if (isFocused) {
        return;
      }
      isFocused = true;
      
      Evme.Utils.switchAttrs(el, 'placeholder', 'tempph');

      Evme.Brain.catchCallback(NAME, 'focus', {
        "e": e
      });
    }
    
    function cbBlur(e) {
      if (!isFocused) {
        return;
      }

      Evme.Utils.switchAttrs(el, 'tempph', 'placeholder');

      isFocused = false;

      Evme.Brain.catchCallback(NAME, 'blur', {
        "e": e
      });
    }
    
    function cbPause(e) {
      Evme.EventHandler.trigger(NAME, "pause", {
        "query": value
      });
    }
    
    function cbIdle(e) {
      Evme.EventHandler.trigger(NAME, "idle", {
        "query": value
      });
    }
}