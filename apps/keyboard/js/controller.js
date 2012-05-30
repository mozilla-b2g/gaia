/*
  Controller is in charge of receive interaction events and transform them
  into KeyEvent as well as control interface's update.
*/

const IMEController = (function() {
  var BASIC_LAYOUT = -1,
      ALTERNATE_LAYOUT = -2,
      SWITCH_KEYBOARD = -3,
      TOGGLE_CANDIDATE_PANEL = -4,
      DOT_COM = -5;

  var LAYOUT_MODE_DEFAULT = 'Default',
      LAYOUT_MODE_SYMBOLS_I = 'Symbols_1',
      LAYOUT_MODE_SYMBOLS_II = 'Symbols_2';

  // current state of the keyboard
  var _isPressing = null,
      _isWaitingForSecondTap = false,
      _currentKey = null,
      _baseLayout = '',
      _layoutMode = LAYOUT_MODE_DEFAULT,
      _isUpperCase = false,
      _currentInputType = 'text';

  // timeout and interval for delete, they could be cancelled on mouse over
  var _deleteTimeout = 0,
      _deleteInterval = 0;

  // backspace repeat delay and repeat rate
  var _kRepeatRate = 100,
      _kRepeatTimeout = 700;

    // Taps the shift key twice within kCapsLockTimeout
    // to lock the keyboard at upper case state.
  var _kCapsLockTimeout = 450,
      _isUpperCaseLocked = false;

  function _mapType(type) {
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

  // depending on current layout mode, return the next switch ABC/SYMBOLS button
  function _getSwitchKey(layoutMode) {
    var value, keyCode;

    // next is SYMBOLS
    if (layoutMode === LAYOUT_MODE_DEFAULT) {
      value = '?123';
      keyCode = ALTERNATE_LAYOUT;

    // next is ABC
    } else {
      value = 'ABC';
      keyCode = BASIC_LAYOUT;
    }

    return {
      value: value,
      ratio: 2,
      keyCode: keyCode
    };
  };

  // add some special keys depending on the input's type
  function _getTypeSensitiveKeys(inputType, ratio, overwrites) {
    var newKeys = [];
    switch (inputType) {
      case 'url':
        newKeys.push({ value: '.', ratio: 1, keyCode: 46 });
        newKeys.push({ value: '/', ratio: 2, keyCode: 47 });
        newKeys.push({ value: '.com', ratio: 2, keyCode: DOT_COM });
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

    return newKeys;
  };

  // build the actual layout depending on baseLayout selected, the input's type and layoutMode
  function _buildLayout(baseLayout, inputType, layoutMode, uppercase) {

    function deepCopy(obj) {
      return JSON.parse(JSON.stringify(obj));
    }

    var layout, l,
        switchKey,
        newKeys = [],
        ratio = 8;

    // these types force specific layouts
    if (inputType === 'number' || inputType === 'tel')
      return deepCopy(Keyboards[inputType + 'Layout']);

    // Clone the layout
    layout = deepCopy(Keyboards[baseLayout]);

    // Transform to uppercase
    if (uppercase) {
      layout.keys.forEach(function(row) {
        row.forEach(function(key) {
          var v = key.value;

          if (layout.upperCase && layout.upperCase[v]) {
            key.value = layout.upperCase[v];

          } else {
            key.value = key.value.toLocaleUpperCase();
          }
        });
      });
    }

    // Switch Languages button
    var severalLanguages = IMEManager.keyboards.length > 1 && !layout['hidesSwitchKey'];

    if (severalLanguages) {
      // Switch keyboard key
      ratio -= 1;
      newKeys.push({ value: '&#x1f310;', ratio: 1, keyCode: SWITCH_KEYBOARD });
    }

    // Switch ABC/SYMBOLS button
    if (!layout['disableAlternateLayout']) {
      switchKey = _getSwitchKey(layoutMode);
      if (severalLanguages === false)
        switchKey.ratio += 1;
      newKeys.push(switchKey);
      ratio -= switchKey.ratio;
    }
    // Text types specific keys
    if (!layout['typeInsensitive']) {
      newKeys = newKeys.concat(_getTypeSensitiveKeys(inputType, ratio, layout.textLayoutOverwrite));
    }

    // Return key
    newKeys.push({ value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN });

    // TODO: Review this, why to always discard the last row?
    layout.keys.pop(); // remove last row
    layout.keys.push(newKeys);

    return layout;
  }

  // recompute the layout to display
  function _handleSymbolLayoutRequest(keycode) {
    var base, computedLayout;

    // request for SYMBOLS (page 1)
    if (keycode === ALTERNATE_LAYOUT) {
      _layoutMode = LAYOUT_MODE_SYMBOLS_I;
      base = 'alternateLayout';

    // altern between pages 1 and 2 of SYMBOLS
    } else if (keycode === KeyEvent.DOM_VK_ALT) {

      if (_layoutMode === LAYOUT_MODE_SYMBOLS_I) {
        _layoutMode = LAYOUT_MODE_SYMBOLS_II;
        base = 'symbolLayout';

      } else {
        _layoutMode = LAYOUT_MODE_SYMBOLS_I;
        base = 'alternateLayout';
      }

    // request for ABC
    } else {
      _layoutMode = LAYOUT_MODE_DEFAULT;
      base = _baseLayout;
    }

    computedLayout = _buildLayout(base, _currentInputType, _layoutMode);
    IMERender.draw(computedLayout);
    _updateTargetWindowHeight();
  }

  function _updateTargetWindowHeight() {
    var resizeAction = {action: 'resize', height: IMERender.ime.scrollHeight + 'px'};
    parent.postMessage(JSON.stringify(resizeAction), '*');
  }

  // sends a delete code to remove last character
  function _sendDelete(feedback) {
    if (feedback)
      IMEFeedback.triggerFeedback();
    if (Keyboards[_baseLayout].type == 'ime' &&
        _layoutMode === LAYOUT_MODE_DEFAULT) {
      // XXX: Not yet implemented
      // this.currentEngine.click(keyCode);
      return;
    }
    window.navigator.mozKeyboard.sendKey(KeyboardEvent.DOM_VK_BACK_SPACE, 0);
  };

  function _highlightKey(target) {
    if (target.dataset.keycode != KeyboardEvent.DOM_VK_SPACE) {
      IMERender.highlightKey(target);
    }
  }

  function _showAlternatives(key) {
    var r = key.dataset.row, c = key.dataset.column;
    if (r < 0 || c < 0)
      return;

    // get alternatives from layout
    var layout = Keyboards[_baseLayout];
    var value = Keyboards[_baseLayout].keys[r][c].value;
    var alternatives = layout.alt && layout.alt[value] ? layout.alt[value].split('') : [];
    if (!alternatives.length)
      return;

    // to uppercase
    if (_isUpperCase) {
      for (var i = 0; i < alternatives.length; i += 1) {
        var alt = alternatives[i];
        if (layout.upperCase && layout.upperCase[alt]) {
          alternatives[i] = layout.upperCase[alt];
        } else {
          alternatives[i] = alternatives[i].toLocaleUpperCase();
        }
      }
    }

    IMERender.showAlternativesCharMenu(key, alternatives);
  }

  //
  // EVENTS HANDLERS
  //

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
      _showAlternatives(_currentKey);
    }), this.kAccentCharMenuTimeout);

    // Special key: delete
    if (keyCode === KeyEvent.DOM_VK_BACK_SPACE) {

      // First, just pressing (without feedback)
      _sendDelete(false);

      // Second, after a delay (with feedback)
      _deleteTimeout = window.setTimeout(function() {
        _sendDelete(true);

        // Third, after shorter delay (with feedback too)
        _deleteInterval = setInterval(function() {
          _sendDelete(true);
        }, _kRepeatRate);

      }, _kRepeatTimeout);

    }
  }

  function _onMouseOver(evt) {
    var target = evt.target;

    // do nothing if no pressing (mouse events) or same key
    if (!_isPressing || _currentKey == target)
      return;

    // do nothing if no keycode
    var keyCode = parseInt(target.dataset.keycode);
    if (!keyCode && !target.dataset.selection)
      return;

    // remove current highlight
    IMERender.unHighlightKey(_currentKey);

    // ignore if moving over del key
    if (keyCode == KeyEvent.DOM_VK_BACK_SPACE)
      return;

    _highlightKey(target);
    _currentKey = target;

    // reset imminent menus or actions
    clearTimeout(_deleteTimeout);
    clearInterval(_deleteInterval);
    clearTimeout(this._menuTimeout);

    // control hide of alternatives menu
    if (target.parentNode === IMERender.menu) {
      clearTimeout(this._hideMenuTimeout);
    } else {
      this._hideMenuTimeout = window.setTimeout(
        (function hideMenuTimeout() {
          IMERender.hideAlternativesCharMenu();
          }),
          this.kHideAlternativesCharMenuTimeout
        );
    }

    // control showing alternatives menu
    if (target.dataset.alt) {
      this._menuTimeout = window.setTimeout((function menuTimeout() {
        _showAlternatives(target);
      }), this.kAccentCharMenuTimeout);
    }
  }

  function _onMouseLeave(evt) {
    var target = evt.target;
    if (!_isPressing || !_currentKey)
      return;

    IMERender.unHighlightKey(_currentKey);
    this._hideMenuTimeout = window.setTimeout((function hideMenuTimeout() {
        IMERender.hideAlternativesCharMenu();
    }), this.khideAlternativesCharMenuTimeout);

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

    IMERender.hideAlternativesCharMenu();

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
      case BASIC_LAYOUT:
      case ALTERNATE_LAYOUT:
      case KeyEvent.DOM_VK_ALT:
        _handleSymbolLayoutRequest(keyCode);
      break;

      case SWITCH_KEYBOARD:

        // If the user has specify a keyboard in the menu,
        // switch to that keyboard.
        if (target.dataset.keyboard) {

          if (IMEManager.keyboards.indexOf(target.dataset.keyboard) === -1)
            _baseLayout = IMEManager.keyboards[0];
          else
            _baseLayout = target.dataset.keyboard;

          _layoutMode = LAYOUT_MODE_DEFAULT;
          _isUpperCase = false;
          IMERender.draw(_buildLayout(_baseLayout, _currentInputType, _layoutMode, _isUpperCase));
          _updateTargetWindowHeight();
        } else {
          // If this is the last keyboard in the stack, start
          // back from the beginning.
          var keyboards = IMEManager.keyboards;
          var index = keyboards.indexOf(_baseLayout);
          if (index >= keyboards.length - 1 || index < 0)
            _baseLayout = keyboards[0];
          else
            _baseLayout = keyboards[++index];

          _layoutMode = LAYOUT_MODE_DEFAULT;
          _isUpperCase = false;
          IMERender.draw(_buildLayout(_baseLayout, _currentInputType, _layoutMode, _isUpperCase));
          _updateTargetWindowHeight();
        }

/* XXX: Not yet implemented
        if (Keyboards[_baseLayout].type == 'ime') {
          if (this.currentEngine.show) {
            this.currentEngine.show(_currentInputType);
          }
        }
*/

        break;

      case TOGGLE_CANDIDATE_PANEL:
        if (IMERender.ime.classList.contains('candidate-panel')) {
          IMERender.ime.classList.remove('candidate-panel');
          IMERender.ime.classList.add('full-candidate-panel');
        } else {
          IMERender.ime.classList.add('candidate-panel');
          IMERender.ime.classList.remove('full-candidate-panel');
        }
        _updateTargetWindowHeight();
        break;

      case DOT_COM:
        ('.com').split('').forEach((function sendDotCom(key) {
          window.navigator.mozKeyboard.sendKey(0, key.charCodeAt(0));
        }).bind(this));
        break;

      case KeyEvent.DOM_VK_CAPS_LOCK:

        // lock caps
        if (_isWaitingForSecondTap) {
          _isWaitingForSecondTap = false;

          _isUpperCase = _isUpperCaseLocked = true;
          IMERender.setUpperCaseLock(true);
          IMERender.draw(
            _buildLayout(_baseLayout, _currentInputType, _layoutMode, _isUpperCase)
          );

        // normal behavior: set timeut for second tap and toggle caps
        } else {

          // timout for second tap
          _isWaitingForSecondTap = true;
          window.setTimeout(
            function() {
              _isWaitingForSecondTap = false;
            },
            _kCapsLockTimeout
          );

          // toggle caps
          _isUpperCase = !_isUpperCase;
          _isUpperCaseLocked = false;
          IMERender.setUpperCaseLock(false);
          IMERender.draw(
            _buildLayout(_baseLayout, _currentInputType, _layoutMode, _isUpperCase)
          );
        }

        break;

      case KeyEvent.DOM_VK_RETURN:
        if (Keyboards[_baseLayout].type == 'ime' &&
            _layoutMode === LAYOUT_MODE_DEFAULT) {
          this.currentEngine.click(keyCode);
          break;
        }

        window.navigator.mozKeyboard.sendKey(keyCode, 0);
        break;

      // To handle the case when double tapping the space key
      case KeyEvent.DOM_VK_SPACE:
        if (this.isWaitingForSpaceSecondTap &&
            !this.isContinousSpacePressed) {

          if (Keyboards[_baseLayout].type == 'ime' &&
            _layoutMode === LAYOUT_MODE_DEFAULT) {

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

  function _reset() {
    // TODO: _baseLayout is only set by IMEManager (it should not be mine)
    _layoutMode = LAYOUT_MODE_DEFAULT;
    _isUpperCase = false;
  }

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

    // IME Engines are self registering here.
    IMEngines: {},
    get currentEngine() {
      return this.IMEngines[Keyboards[_baseLayout].imEngine];
    },

    // show accent char menu (if there is one) after kAccentCharMenuTimeout
    kAccentCharMenuTimeout: 700,

    // if user leave the original key and did not move to
    // a key within the accent character menu,
    // after khideAlternativesCharMenuTimeout the menu will be removed.
    khideAlternativesCharMenuTimeout: 500,

    // Taps the space key twice within kSpaceDoubleTapTimeoout
    // to produce a "." followed by a space
    kSpaceDoubleTapTimeout: 700,

    get currentKeyboard() {
      return _baseLayout;
    },

    set currentKeyboard(value) {
      _baseLayout = value;
    },

    init: _init,
    uninit: _uninit,

    showIME: function(type) {
      var computedLayout;
      _currentInputType = _mapType(type); // TODO: this should be unneccesary
      _reset();

      computedLayout = _buildLayout(_baseLayout, _currentInputType, _layoutMode);
      IMERender.draw(computedLayout);

/* XXX: Not yet implemented
      if (Keyboards[_baseLayout].type == 'ime') {
        if (this.currentEngine.show) {
          this.currentEngine.show(type);
        }
      }
*/

      _updateTargetWindowHeight();
    },

    onResize: function(nWidth, nHeight, fWidth, fHeihgt) {
      if (IMERender.ime.dataset.hidden)
        return;

      // we presume that the targetWindow has been restored by
      // window manager to full size by now.
      IMERender.getTargetWindowMetrics();
      IMERender.draw(Keyboards[_baseLayout]);
      _updateTargetWindowHeight();
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

    handleMouseDownEvent: function km_handleMouseDownEvent(keyCode) {
      if (Keyboards[_baseLayout].type == 'ime' &&
          !_layoutMode) {
            this.currentEngine.click(keyCode);
            return;
          }

      window.navigator.mozKeyboard.sendKey(0, keyCode);

      if (_isUpperCase &&
          !_isUpperCaseLocked && _layoutMode === LAYOUT_MODE_DEFAULT) {
            _isUpperCase = false;
            //Do we need to re-draw?
            IMERender.draw(
              _buildLayout(_baseLayout, _currentInputType, _layoutMode)
            );
          }
    }
  };
})();
