/*
  Controller is in charge of receive interaction events and transform them
  into KeyEvent as well as control interface's update.
*/

const IMEController = (function() {

  // current state of the keyboard
  var _currentKey = null,
      _isPressing = null,
      _currentKeyboard = '',
      _currentKeyboardMode = '';

  // timeout and interval for delete, they could be cancelled on mouse over
  var _deleteTimeout = 0,
      _deleteInterval = 0;

  // backspace repeat delay and repeat rate
  var _kRepeatRate = 100,
      _kRepeatTimeout = 700;

  function _mapType (type) {
    switch (type) {
      // basic types
      case 'url':
      case 'tel':
      case 'email':
      case 'text':
        return type;
      break;

      // default fallback and textual types
      case 'password':
      case 'search':
      default:
        return 'text';
      break;

      case 'number':
      case 'range': // XXX: should be different from number
        return 'number';
      break;
    }
  }
  
  
  var specialKeys = function kr_addSpecialKeys(layout) {
    var newKeys = [];
    var ratio = 8;
    var width = layout.width ? layout.width : 10;

    // Alternate Keyboards
    if (!layout['disableAlternateLayout']) {
      ratio -=2;
      var alternateKey = addAlternateKeys(_currentKeyboardMode);
      newKeys.push(alternateKey);
    }

    // Text specific Keys
    if (!layout['typeInsensitive']) {
      addTypeSensitiveKeys(IMEController.currentType, ratio, newKeys, layout.textLayoutOverwrite);
    }

    // Return Key
    newKeys.push({ value: '↵', ratio: ratio, keyCode: KeyEvent.DOM_VK_RETURN });

    return newKeys;
  };


  var addAlternateKeys = function kr_addAlternateKeys(currentKeyboardMode) {
    var alternateLayoutKey, alternateKey = '';
    if (currentKeyboardMode == '') {
      alternateLayoutKey = '?123';
      alternateKey = { value: alternateLayoutKey, ratio: 2, keyCode: IMEController.ALTERNATE_LAYOUT };
    } else {
      alternateLayoutKey = 'ABC';
      alternateKey = { value: alternateLayoutKey, ratio: 2, keyCode: IMEController.BASIC_LAYOUT };
    }
    return alternateKey;
  };

  var addTypeSensitiveKeys = function kr_addTypeSensitiveKeys(type, ratio, newKeys, overwrites) {
    switch (type) {
      case 'url':
        var size = Math.floor(ratio / 3);
        ratio -= size * 2;
        newKeys.push({ value: '.', ratio: size, keyCode: 46 });
        newKeys.push({ value: '/', ratio: size, keyCode: 47 });
        newKeys.push({ value: '.com', ratio: ratio, keyCode: IMEController.DOT_COM });
      break;
      case 'email':
        ratio -= 2;
        newKeys.push({ value: ' ', ratio: ratio, keyCode: KeyboardEvent.DOM_VK_SPACE });
        newKeys.push({ value: '@', ratio: 1, keyCode: 64 });
        newKeys.push({ value: '.', ratio: 1, keyCode: 46 });
      break;
      case 'text':

        // TODO: Refactor
        if (overwrites) {
          if (overwrites['.'] !== false)
            ratio -= 1;
          if (overwrites[','] !== false)
            ratio -= 1;
          if (overwrites[',']) {
            newKeys.push({ value: overwrites[','], ratio: 1, keyCode: overwrites[','].charCodeAt(0) });
          } else if (overwrites[','] !== false) {
            newKeys.push({ value: overwrites[','], ratio: 1, keyCode: 44 });
          }

          if (overwrites['.']) {
            newKeys.push({ value: overwrites['.'], ratio: 1, keyCode: overwrites['.'].charCodeAt(0) });
          } else if (overwrites['.'] !== false) {
            newKeys.push({ value: '.', ratio: 1, keyCode: 46 });
          }
        }
        newKeys.push({ value: ' ', ratio: ratio, keyCode: KeyboardEvent.DOM_VK_SPACE });

      break;
    }
  };

  function _highlightKey(target) {
    if (target.dataset.keycode != KeyboardEvent.DOM_VK_SPACE) {
      IMERender.highlightKey(target);
    }
  }

  function _sendDelete (feedback) {
    if (feedback)
      IMEFeedback.triggerFeedback();
    if (Keyboards[_currentKeyboard].type == 'ime' &&
        !_currentKeyboardMode) {
      // XXX: Not yet implemented
      // this.currentEngine.click(keyCode);
      return;
    }
    window.navigator.mozKeyboard.sendKey(KeyboardEvent.DOM_VK_BACK_SPACE, 0);
  };

  function _onMouseDown(evt) {
    _isPressing = true;
    _currentKey = evt.target;
    var keyCode = parseInt(_currentKey.dataset.keycode);

/* XXX: I dont know what is selection
    if (!keyCode && !target.dataset.selection)
      return;
*/

    // Feedback
    _highlightKey(_currentKey);
    IMEFeedback.triggerFeedback();

    // Per key alternatives
    this._menuTimeout = window.setTimeout((function menuTimeout() {
      IMERender.showAccentCharMenu(_currentKey);
    }), this.kAccentCharMenuTimeout);

    // Special key: delete
    if (keyCode === KeyEvent.DOM_VK_BACK_SPACE) {

      // First, just pressing (without feedback)
      _sendDelete(false);

      // Second, after a delay (with feedback)
      _deleteTimeout = window.setTimeout(function () {
        _sendDelete(true);

        // Third, after shorter delay (with feedback too)
        _deleteInterval = setInterval(function () {
          _sendDelete(true);
        }, _kRepeatRate);

      }, _kRepeatTimeout);

    }
  }

  function _onMouseOver(evt) {
    var target = evt.target;
    if (!_isPressing || _currentKey == target)
      return;

    var keyCode = parseInt(target.dataset.keycode);

    if (!keyCode && !target.dataset.selection)
      return;

    if (keyCode == KeyEvent.DOM_VK_BACK_SPACE) {
      IMERender.updateKeyHighlight();
      return;
    }

    IMERender.unHighlightKey(_currentKey);
    _highlightKey(target);
    _currentKey = target;

    clearTimeout(_deleteTimeout);
    clearInterval(_deleteInterval);
    clearTimeout(this._menuTimeout);

    if (target.parentNode === IMERender.menu) {
      clearTimeout(this._hideMenuTimeout);
    } else {
      this._hideMenuTimeout = window.setTimeout(
        (function hideMenuTimeout() {
          IMERender.hideAccentCharMenu();
          }),
          this.kHideAccentCharMenuTimeout
        );
    }

    if (target.dataset.alt) {
      this._menuTimeout = window.setTimeout((function menuTimeout() {
        IMERender.showAccentCharMenu(target);
      }), this.kAccentCharMenuTimeout);
    }
  }

  function _onMouseLeave(evt) {
    var target = evt.target;
    if (!_isPressing || !_currentKey)
      return;

    IMERender.unHighlightKey(_currentKey);
    this._hideMenuTimeout = window.setTimeout((function hideMenuTimeout() {
        IMERender.hideAccentCharMenu();
    }), this.kHideAccentCharMenuTimeout);

    if (evt.type == 'scroll')
      _isPressing = false; // cancel the following mouseover event
  }

  function _onMouseUp(evt) {
    _isPressing = false;

    if (!_currentKey)
      return;

    clearTimeout(_deleteTimeout);
    clearInterval(_deleteInterval);
    clearTimeout(this._menuTimeout);

    IMERender.hideAccentCharMenu();

    var target = _currentKey;
    var keyCode = parseInt(target.dataset.keycode);
    if (!keyCode && !target.dataset.selection)
      return;

    var dataset = target.dataset;
    if (dataset.selection) {
      this.currentEngine.select(target.textContent, dataset.data);

      IMERender.updateKeyHighlight();
      return;
    }


    IMERender.unHighlightKey(target);

    if (keyCode == KeyEvent.DOM_VK_BACK_SPACE)
      return;

    // Reset the flag when a non-space key is pressed,
    // used in space key double tap handling
    if (keyCode != KeyEvent.DOM_VK_SPACE)
      delete this.isContinousSpacePressed;

    switch (keyCode) {
      case this.BASIC_LAYOUT:
        this.isAlternateLayout = false;
        break;

      case this.ALTERNATE_LAYOUT:
        this.isAlternateLayout = true;
        break;

      case this.SWITCH_KEYBOARD:

        // If the user has specify a keyboard in the menu,
        // switch to that keyboard.
        if (target.dataset.keyboard) {

          if (IMEManager.keyboards.indexOf(target.dataset.keyboard) === -1)
            _currentKeyboard = IMEManager.keyboards[0];
          else
            _currentKeyboard = target.dataset.keyboard;

          _currentKeyboardMode = '';
          this.isUpperCase = false;
          IMERender.draw(Keyboards[_currentKeyboard]);
          this.updateTargetWindowHeight();
        } else {
          // If this is the last keyboard in the stack, start
          // back from the beginning.
          var keyboards = IMEManager.keyboards;
          var index = keyboards.indexOf(_currentKeyboard);
          if (index >= keyboards.length - 1 || index < 0)
            _currentKeyboard = keyboards[0];
          else
            _currentKeyboard = keyboards[++index];

          _currentKeyboardMode = '';
          this.isUpperCase = false;
          IMERender.draw(Keyboards[_currentKeyboard]);
          this.updateTargetWindowHeight();
        }

        if (Keyboards[_currentKeyboard].type == 'ime') {
          if (this.currentEngine.show) {
            this.currentEngine.show(this.currentType);
          }
        }

        break;

      case this.TOGGLE_CANDIDATE_PANEL:
        if (IMERender.ime.classList.contains('candidate-panel')) {
          IMERender.ime.classList.remove('candidate-panel');
          IMERender.ime.classList.add('full-candidate-panel');
        } else {
          IMERender.ime.classList.add('candidate-panel');
          IMERender.ime.classList.remove('full-candidate-panel');
        }
        this.updateTargetWindowHeight();
        break;

      case this.DOT_COM:
        ('.com').split('').forEach((function sendDotCom(key) {
          window.navigator.mozKeyboard.sendKey(0, key.charCodeAt(0));
        }).bind(this));
        break;

      case KeyEvent.DOM_VK_ALT:
        this.isSymbolLayout = !this.isSymbolLayout;
        break;

      case KeyEvent.DOM_VK_CAPS_LOCK:
        if (this.isWaitingForSecondTap) {
          this.isUpperCaseLocked = true;
          if (!this.isUpperCase) {
            this.isUpperCase = true;
            IMERender.draw(Keyboards[_currentKeyboard]);

            // XXX: keyboard updated; target is lost.
            var selector =
              'span[data-keycode="' + KeyEvent.DOM_VK_CAPS_LOCK + '"]';
            target = document.querySelector(selector);
          }
          target.dataset.enabled = 'true';
          delete this.isWaitingForSecondTap;
          break;
        }
        this.isWaitingForSecondTap = true;

        window.setTimeout(
          (function removeCapsLockTimeout() {
            delete this.isWaitingForSecondTap;
          }).bind(this),
          this.kCapsLockTimeout
        );

        this.isUpperCaseLocked = false;
        this.isUpperCase = !this.isUpperCase;
        IMERender.draw(Keyboards[_currentKeyboard]);
        break;

      case KeyEvent.DOM_VK_RETURN:
        if (Keyboards[_currentKeyboard].type == 'ime' &&
            !_currentKeyboardMode) {
          this.currentEngine.click(keyCode);
          break;
        }

        window.navigator.mozKeyboard.sendKey(keyCode, 0);
        break;

      // To handle the case when double tapping the space key
      case KeyEvent.DOM_VK_SPACE:
        if (this.isWaitingForSpaceSecondTap &&
            !this.isContinousSpacePressed) {

          if (Keyboards[_currentKeyboard].type == 'ime' &&
            !_currentKeyboardMode) {

            //TODO: need to define the inteface for double tap handling
            //this.currentEngine.doubleTap(keyCode);
            break;
          }

          // Send a delete key to remove the previous space sent
          window.navigator.mozKeyboard.sendKey(KeyEvent.DOM_VK_BACK_SPACE,
                                               0);

          // Send the . symbol followed by a space
          window.navigator.mozKeyboard.sendKey(0, 46);
          window.navigator.mozKeyboard.sendKey(0, keyCode);

          delete this.isWaitingForSpaceSecondTap;

          // a flag to prevent continous replacement of space with "."
          this.isContinousSpacePressed = true;
          break;
        }

        this.isWaitingForSpaceSecondTap = true;

        window.setTimeout(
          (function removeSpaceDoubleTapTimeout() {
            delete this.isWaitingForSpaceSecondTap;
          }).bind(this),
          this.kSpaceDoubleTapTimeout
        );

        this.handleMouseDownEvent(keyCode);
        break;

      default:
        this.handleMouseDownEvent(keyCode);
        break;

    }
  }

  // when attached as event listeners, this will be bound to current this object
  // you can add a closure to add support methods
  var _imeEvents = {
    'mousedown': _onMouseDown,
    'mouseover': _onMouseOver,
    'mouseleave': _onMouseLeave,
    'mouseup': _onMouseUp
  };

  function _init() {
    IMERender.init();
    for (event in _imeEvents) {
      var callback = _imeEvents[event] || null;
      if (callback)
        IMERender.ime.addEventListener(event, callback.bind(this));
    }
  }

  function _uninit() {
    for (event in _imeEvents) {
      var callback = _imeEvents[event] || null;
      if (callback)
        IMERender.ime.removeEventListener(event, callback.bind(this));
    }
    // XXX: Not yet implemented
    // IMERender.uninit();

    for (var engine in this.IMEngines) {
      if (this.IMEngines[engine].uninit)
        this.IMEngines[engine].uninit();
      delete this.IMEngines[engine];
    }
  }

  return {
    // TODO: IMEngines are other kind of controllers, but now they are like
    // controller's plugins. Maybe refactor is required as well but not now.

    BASIC_LAYOUT: -1,
    ALTERNATE_LAYOUT: -2,
    SWITCH_KEYBOARD: -3,
    TOGGLE_CANDIDATE_PANEL: -4,
    DOT_COM: -5,

    // IME Engines are self registering here.
    IMEngines: {},
    get currentEngine() {
      return this.IMEngines[Keyboards[_currentKeyboard].imEngine];
    },

    currentType: 'text',

    isUpperCase: false,

    get isAlternateLayout() {
      var alternateLayouts = ['Alternate', 'Symbol'];
      return alternateLayouts.indexOf(_currentKeyboardMode) > -1;
    },

    set isAlternateLayout(isAlternateLayout) {
      // TODO: move all the pop and push stuff to a single place
      // Think on refactor how the events are handled

      var layout;
      if (isAlternateLayout) {
        _currentKeyboardMode = 'Alternate';
        layout = Keyboards['alternateLayout'];
      } else {
        _currentKeyboardMode = '';
        layout = Keyboards[_currentKeyboard];
      }
      
      layout.keys.pop();
      layout.keys.push(specialKeys(layout));
      IMERender.draw(layout);
      this.updateTargetWindowHeight();
    },

    get isSymbolLayout() {
      return _currentKeyboardMode == 'Symbol';
    },

    set isSymbolLayout(isSymbolLayout) {
      if (isSymbolLayout) {
        _currentKeyboardMode = 'Symbol';
        IMERender.draw(Keyboards['symbolLayout']);
      } else {
        _currentKeyboardMode = 'Alternate';
        IMERender.draw(Keyboards['alternateLayout']);
      }
      this.updateTargetWindowHeight();
    },

    // Taps the shift key twice within kCapsLockTimeout
    // to lock the keyboard at upper case state.
    kCapsLockTimeout: 450,
    isUpperCaseLocked: false,

    // show accent char menu (if there is one) after kAccentCharMenuTimeout
    kAccentCharMenuTimeout: 700,

    // if user leave the original key and did not move to
    // a key within the accent character menu,
    // after kHideAccentCharMenuTimeout the menu will be removed.
    kHideAccentCharMenuTimeout: 500,

    // Taps the space key twice within kSpaceDoubleTapTimeoout
    // to produce a "." followed by a space
    kSpaceDoubleTapTimeout: 700,

    get currentKeyboard() {
      return _currentKeyboard;
    },

    set currentKeyboard(value) {
      _currentKeyboard = value;
    },

    init: _init,
    uninit: _uninit,

    showIME: function(type) {
      this.currentType = _mapType(type);

      switch (this.currentType) {
        case 'number':
          layout = Keyboards['numberLayout'];
        break;
        case 'tel':
          layout = Keyboards['telLayout'];
        break;
        default:
          layout = Keyboards[keyboard] || Keyboards[_currentKeyboard];
          // TODO: Only pass the needed parameters to specialKeys instead the whole layout
          layout.keys.pop();
          layout.keys.push(specialKeys(layout));
        break;
      }

      IMERender.draw(layout);

      if (Keyboards[_currentKeyboard].type == 'ime') {
        if (this.currentEngine.show) {
          this.currentEngine.show(type);
        }
      }
      this.updateTargetWindowHeight();
    },

    onResize: function(nWidth, nHeight, fWidth, fHeihgt) {
      if (IMERender.ime.dataset.hidden)
        return;

      // we presume that the targetWindow has been restored by
      // window manager to full size by now.
      IMERender.getTargetWindowMetrics();
      IMERender.draw(Keyboards[_currentKeyboard]);
      this.updateTargetWindowHeight();
    },

    loadKeyboard: function km_loadKeyboard(name) {
      var keyboard = Keyboards[name];
      if (keyboard.type !== 'ime')
        return;

      var sourceDir = './js/imes/';
      var imEngine = keyboard.imEngine;

      // Same IME Engine could be load by multiple keyboard layouts
      // keep track of it by adding a placeholder to the registration point
      if (this.IMEngines[imEngine])
        return;

      this.IMEngines[imEngine] = {};

      var script = document.createElement('script');
      script.src = sourceDir + imEngine + '/' + imEngine + '.js';
      // TODO: Remvoe variable self
      var self = IMERender;
      var glue = {
        path: sourceDir + imEngine,
        sendCandidates: function(candidates) {
          self.showCandidates(candidates);
        },
        sendPendingSymbols: function(symbols) {
          self.showPendingSymbols(symbols);
        },
        sendKey: function(keyCode) {
          switch (keyCode) {
            case KeyEvent.DOM_VK_BACK_SPACE:
            case KeyEvent.DOM_VK_RETURN:
              window.navigator.mozKeyboard.sendKey(keyCode, 0);
              break;

            default:
              window.navigator.mozKeyboard.sendKey(0, keyCode);
              break;
          }
        },
        sendString: function(str) {
          for (var i = 0; i < str.length; i++)
            this.sendKey(str.charCodeAt(i));
        },
        alterKeyboard: function(keyboard) {
          self.updateLayout(keyboard);
        }
      };

      script.addEventListener('load', (function IMEnginesLoaded() {
        var engine = this.IMEngines[imEngine];
        engine.init(glue);
      }).bind(this));

      document.body.appendChild(script);
    },

    updateTargetWindowHeight: function km_updateTargetWindowHeight() {
      var resizeAction = {action: 'resize', height: IMERender.ime.scrollHeight + 'px'};
      parent.postMessage(JSON.stringify(resizeAction), '*');
    },

    handleMouseDownEvent: function km_handleMouseDownEvent(keyCode) {
      if (Keyboards[_currentKeyboard].type == 'ime' &&
          !_currentKeyboardMode) {
            this.currentEngine.click(keyCode);
            return;
          }

      window.navigator.mozKeyboard.sendKey(0, keyCode);

      if (this.isUpperCase &&
          !this.isUpperCaseLocked && !_currentKeyboardMode) {
            this.isUpperCase = false;
            //Do we need to re-draw?
            IMERender.draw(Keyboards[_currentKeyboard]);
          }
    }
  };
})();
