/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const IMEManager = {
  BASIC_LAYOUT: -1,
  ALTERNATE_LAYOUT: -2,
  SWITCH_KEYBOARD: -3,
  TOGGLE_CANDIDATE_PANEL: -4,
  DOT_COM: -5,

  // IME Engines are self registering here.
  IMEngines: {},
  get currentEngine() {
    return this.IMEngines[Keyboards[this.currentKeyboard].imEngine];
  },

  currentKeyboard: '',
  currentKeyboardMode: '',
  // keyboard layouts selected by the user from settings
  keyboards: [],

  // layouts to turn on correspond to keyboard.layouts.* setting
  // TODO: gaia issue 347, better setting UI and setting data store
  keyboardSettingGroups: {
    'english': ['en'],
    'dvorak': ['en-Dvorak'],
    'otherlatins': ['fr', 'de', 'nb', 'sk', 'tr'],
    'cyrillic': ['ru', 'sr-Cyrl'],
    'hebrew': ['he'],
    'zhuying': ['zh-Hant-Zhuying'],
    'pinyin': ['zh-Hans-Pinyin']
  },

  kMozSettingsTimeout: 800,
  loadKeyboardSettings: function loadKeyboardSettings(callback) {
    var completed = false;
    var completeSettingRequests = (function completeSettingRequests() {

      if (completed)
        return;

      clearTimeout(settingTimer);

      if (!this.keyboards.length)
        this.keyboards =
          [].concat(
            this.keyboardSettingGroups['english'],
            this.keyboardSettingGroups['zhuying'],
            this.keyboardSettingGroups['pinyin']
          );

      if (this.keyboards.indexOf(this.currentKeyboard) === -1)
        this.currentKeyboard = this.keyboards[0];

      this.keyboards.forEach((function loadIMEngines(name) {
        this.loadKeyboard(name);
      }).bind(this));

      completed = true;
      callback();
    }).bind(this);

    // XXX: Fallback if MozSettings timed out
    var settingTimer = setTimeout(function () {
      dump('Keyboard: MozSettings timed out. Skip user settings.');
      completeSettingRequests();

    }, this.kMozSettingsTimeout);

    this.keyboards = [];
    var keyboardSettingGroupKeys = [];
    for (var key in this.keyboardSettingGroups) {
      keyboardSettingGroupKeys.push(key);
    }
    // XXX: shift() & length is neater than this
    var i = 0;

    var keyboardSettingRequest = function keyboardSettingRequest(key) {
      var request = navigator.mozSettings.get('keyboard.layouts.' + key);
      request.onsuccess = (function onsuccess(evt) {
        // XXX: workaround with gaia issue 342
        if (keyboardSettingGroupKeys.indexOf(key) !== i)
          return;

        if (request.result.value === 'true') {
          this.keyboards = this.keyboards.concat(
            this.keyboardSettingGroups[key]
          );
        }

        if (++i === keyboardSettingGroupKeys.length) {
          completeSettingRequests();
        } else {
          keyboardSettingRequest.call(this, keyboardSettingGroupKeys[i]);
        }
      }).bind(this);

      request.onerror = (function onerror(evt) {
        // XXX: workaround with gaia issue 342
        if (keyboardSettingGroupKeys.indexOf(key) !== i)
          return;

        dump('Having trouble getting setting for keyboard setting group: ' + key);

        if (++i === keyboardSettingGroupKeys.length) {
          completeSettingRequests();
        } else {
          keyboardSettingRequest.call(this, keyboardSettingGroupKeys[i]);
        }

      }).bind(this);
    };

    keyboardSettingRequest.call(this, keyboardSettingGroupKeys[i]);
  },

  currentType: 'text',

  isUpperCase: false,

  get isAlternateLayout() {
    var alternateLayouts = ['Alternate', 'Symbol'];
    return alternateLayouts.indexOf(this.currentKeyboardMode) > -1;
  },

  set isAlternateLayout(isAlternateLayout) {
    if (isAlternateLayout) {
      this.currentKeyboardMode = 'Alternate';
      this.updateLayout('alternateLayout');
    } else {
      this.currentKeyboardMode = '';
      this.updateLayout();
    }
  },

  get isSymbolLayout() {
    return this.currentKeyboardMode == 'Symbol';
  },

  set isSymbolLayout(isSymbolLayout) {
    if (isSymbolLayout) {
      this.currentKeyboardMode = 'Symbol';
      this.updateLayout('symbolLayout');
    } else {
      this.currentKeyboardMode = 'Alternate';
      this.updateLayout('alternateLayout');
    }
  },

  // backspace repeat delay and repeat rate
  kRepeatTimeout: 700,
  kRepeatRate: 100,

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

  get ime() {
    delete this.ime;
    return this.ime = document.getElementById('keyboard');
  },

  get candidatePanel() {
    delete this.candidatePanel;
    var candidatePanel = document.createElement('div');
    candidatePanel.id = 'keyboard-candidate-panel';
    return this.candidatePanel = candidatePanel;
  },

  updateKeyHighlight: function km_updateKeyHighlight() {
    var keyHighlight = this.keyHighlight;
    var target = this.currentKey;

    keyHighlight.classList.remove('show');

    if (!target || target.dataset.keyboard)
      return;

    keyHighlight.textContent = target.textContent;
    keyHighlight.classList.add('show');

    var width = keyHighlight.offsetWidth;
    var top = target.offsetTop;
    var left = target.offsetLeft + target.offsetWidth / 2 - width / 2;

    var menu = this.menu;
    if (target.parentNode === menu) {
      top += menu.offsetTop;
      left += menu.offsetLeft;
    }

    left = Math.max(left, 5);
    left = Math.min(left, window.innerWidth - width - 5);

    keyHighlight.style.top = top + 'px';
    keyHighlight.style.left = left + 'px';
  },

  showAccentCharMenu: function km_showAccentCharMenu() {
    var target = this.currentKey;
    if (!target)
      return;

    var keyCode = parseInt(this.currentKey.dataset.keycode);
    var content = '';

    if (!target.dataset.alt && keyCode !== this.SWITCH_KEYBOARD)
      return;

    clearTimeout(this._hideMenuTimeout);

    var cssWidth = target.style.width;

    var menu = this.menu;
    if (keyCode == this.SWITCH_KEYBOARD) {

      this.keyHighlight.classList.remove('show');

      menu.className = 'show menu';

      for (var i in this.keyboards) {
        var keyboard = this.keyboards[i];
        var className = 'keyboard-key keyboard-key-special';

        if (this.currentKeyboard == keyboard)
          className += ' current-keyboard';

        content += '<span class="' + className + '" ' +
          'data-keyboard="' + keyboard + '" ' +
          'data-keycode="' + this.SWITCH_KEYBOARD + '" ' +
          '>' +
          Keyboards[keyboard].menuLabel +
          '</span>';
      }

      menu.innerHTML = content;
      menu.style.top = (target.offsetTop - menu.offsetHeight) + 'px';
      menu.style.left = '10px';

      return;
    }

    var before = (window.innerWidth / 2 > target.offsetLeft);
    var dataset = target.dataset;
    if (before) {
      content += '<span class="keyboard-key" ' +
        'data-keycode="' + dataset.keycode + '" ' +
        'data-active="true"' +
        'style="width:' + cssWidth + '"' +
        '>' +
        target.innerHTML +
        '</span>';
    }

    var altChars = target.dataset.alt.split('');
    if (!before)
      altChars = altChars.reverse();

    altChars.forEach(function(keyChar) {
      content += '<span class="keyboard-key" ' +
        'data-keycode="' + keyChar.charCodeAt(0) + '"' +
        'style="width:' + cssWidth + '"' +
        '>' +
        keyChar +
        '</span>';
    });

    if (!before) {
      content += '<span class="keyboard-key" ' +
        'data-keycode="' + dataset.keycode + '" ' +
        'data-active="true"' +
        'style="width:' + cssWidth + '"' +
        '>' +
        target.innerHTML +
        '</span>';
    }

    menu.innerHTML = content;
    menu.className = 'show';

    menu.style.top = target.offsetTop + 'px';

    var left = target.offsetLeft;
    left += (before) ? -7 : (7 - menu.offsetWidth + target.offsetWidth);
    menu.style.left = left + 'px';

    delete target.dataset.active;

    var redirectMouseOver = function redirectMouseOver(target) {
      this.redirect = function km_menuRedirection(ev) {
        ev.stopPropagation();

        var event = document.createEvent('MouseEvent');
        event.initMouseEvent(
          'mouseover', true, true, window, 0,
          ev.screenX, ev.screenY, ev.clientX, ev.clientY,
          false, false, false, false, 0, null
        );
        target.dispatchEvent(event);
      };
      this.addEventListener('mouseover', this.redirect);
    };

    var sibling = target;
    if (before) {
      var index = 0;

      while (menu.childNodes.item(index)) {
        redirectMouseOver.call(sibling, menu.childNodes.item(index));
        sibling = sibling.nextSibling;
        index++;
      }
    } else {
      var index = menu.childNodes.length - 1;

      while (menu.childNodes.item(index)) {
        redirectMouseOver.call(sibling, menu.childNodes.item(index));
        sibling = sibling.previousSibling;
        index--;
      }
    }

    this._currentMenuKey = target;

    this.currentKey = (before) ? menu.firstChild : menu.lastChild;

    this.updateKeyHighlight();

  },
  hideAccentCharMenu: function km_hideAccentCharMenu() {
    if (!this._currentMenuKey)
      return;

    var menu = this.menu;
    menu.className = '';
    menu.innerHTML = '';

    var siblings = this._currentMenuKey.parentNode.childNodes;
    for (var key in siblings) {
      siblings[key].removeEventListener('mouseover', siblings[key].redirect);
    }

    delete this._currentMenuKey;
  },

  // data URL for keyboard click sound
  kAudio: 'data:audio/x-wav;base64,' +
  'UklGRiADAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YfwCAAAW/Fzsqe9O' +
  'AONWB0Pt3Mf1hsS38mJcc0mq9mzpwsIwsChOBxay/ikHV6Tr8ioJNQa0ErvFzbXrw97j' +
  '5C2LQII7aBg77Tr+I+wH0QWp/7xowHegIf0yD1UkhzRRIbUGoeOgJptCHVB+WZg5ehgs' +
  'EcofKwKaAb7+cuzd9doICAx0FZEm+gEq+z//D/yJDtEJx/O73MHkifPK/BoLXwwuBt3p' +
  '5eBq2h3YT/OR+MH/5xDGB7sHowyp9rrrL++06mnt/PpcALcI7RDSCz4GwwWaAXYNVhLw' +
  'D20VYQsvCWUPxApJCVUH3P0jA54EIP0RBUYHVgtlD68KtQWI/9MB4f8Q/Fr4UvLz7nPq' +
  'yOzV9AvzKfEB7azl/+ee6jbrSOw16mjpPepD7d3yT/hL/RIDBAXQAHcDIAZ1BVsPIhAZ' +
  'CT4Ntwc2CJsQnhV+GlYcJR67GF0WaRK5CewGSQdSBboCfgWGBaQACP0e+8f3O/Y4+Yn1' +
  '4e8l9Mf3lvns/eT75fbx9t359/lw+6L+XP+5AdsFSgZECK8LvQlVCWYJ1wetBD8AGALl' +
  'AJUAVAbPBEkDpALfADn/Cv4c/+7+OP/jAAb/7vie+Xr7GvYa9g30rPBc9OL1wveo+3D+' +
  '8/xG+Zn5tPsi/vX/xv4I/Oj5DPaL8mbxmfMM+80AXQbiCisNvhC8Dt4LGwwyDJkNlAxR' +
  'CWYGswcHCn0KyA5cDsQKYgrZB+cFlATlAh4A3P5kAOsAOwLbA+ED8gLAAM/+h/vq+Lb5' +
  'qPgY+GH5i/nE+SX6V/s9+gv69vl89nv33fhc+Zb6nvse/lEA4wMjBrQEugPc/4/8pvux' +
  '+//9Kf9tAGcBXAFxAtgCuwMeBFQE6AQdA4gCGAJiADsAuwC7/53+a/4J/tv88fte+R74' +
  'dPhd+HD5LPmf+If5VPsp/noASALRAbsB+wJ+Ak0CuQPiBAsFpwYTB5wFtgZ/DE4P8AuH' +
  'B4kD3QKPBcAHhgaHBDAEngO6BBcFbwJ2/qD7rPtG/voBwQGU/pn9Lv3T/g==',

  set clicksound(enable) {
    if (!enable && this._audio)
      delete this._audio;

    if (enable && !this._audio) {
      this._audio = new Audio(this.kAudio);
    }
  },

  get clicksound() {
    return !!this._audio;
  },

  triggerFeedback: function() {
    if (this.vibrate) {
      try {
        if (this.vibrate)
          navigator.mozVibrate(50);
      } catch (e) {}
    }

    if (this.clicksound) {
      this._audio.cloneNode(false).play();
    }
  },

  events: ['mouseup', 'showime', 'hideime', 'unload', 'appclose'],
  imeEvents: ['mousedown', 'mouseover', 'mouseleave'],
  init: function km_init() {
    this.events.forEach((function attachEvents(type) {
      window.addEventListener(type, this);
    }).bind(this));

    this.imeEvents.forEach((function imeEvents(type) {
      this.ime.addEventListener(type, this);
    }).bind(this));
  },

  uninit: function km_uninit() {
    this.events.forEach((function attachEvents(type) {
      window.removeEventListener(type, this);
    }).bind(this));

    this.imeEvents.forEach((function imeEvents(type) {
      this.ime.removeEventListener(type, this);
    }).bind(this));
  },

  loadKeyboard: function km_loadKeyboard(name) {
    var keyboard = Keyboards[name];
    if (keyboard.type !== 'ime')
      return;

    var sourceDir = './imes/';
    var imEngine = keyboard.imEngine;

    // Same IME Engine could be load by multiple keyboard layouts
    // keep track of it by adding a placeholder to the registration point
    if (this.IMEngines[imEngine])
      return;

    this.IMEngines[imEngine] = {};

    var script = document.createElement('script');
    script.src = sourceDir + imEngine + '/' + imEngine + '.js';
    var self = this;
    var glue = {
      path: sourceDir + imEngine,
      sendCandidates: function(candidates) {
        self.showCandidates(candidates);
      },
      sendKey: function(keyCode) {
        switch (keyCode) {
          case KeyEvent.DOM_VK_BACK_SPACE:
          case KeyEvent.DOM_VK_RETURN:
            window.navigator.mozKeyboard.sendKey(keyCode, keyCode);
            break;

          default:
            window.navigator.mozKeyboard.sendKey(0, keyCode);
            break;
        }
      },
      sendString: function(str) {
        for (var i = 0; i < str.length; i++)
          this.sendKey(str.charCodeAt(i));
      }
    };

    script.addEventListener('load', (function IMEnginesLoaded() {
      var engine = this.IMEngines[imEngine];
      engine.init(glue);
    }).bind(this));

    document.body.appendChild(script);
  },

  handleEvent: function km_handleEvent(evt) {
    var activeWindow = Gaia.AppManager.foregroundWindow;
    var target = evt.target;

    switch (evt.type) {
      case 'showime':
        // cancel hideIME that imminently happen before showIME
        clearTimeout(this.hideIMETimer);

        // TODO: gaia issue 346
        // Instead of reading the latest setting every time
        // when showime and relay on the callback,
        // allow attachment of a read-only event listener
        // to add/remove keyboard as setting changes
        // see bug 712778
        this.loadKeyboardSettings(
          (function showIMEAfterSettingLoaded() {
            this.showIME(activeWindow, evt.detail.type);
          }).bind(this)
        );

        // TODO: workaround gaia issue 374
        setTimeout((function keyboardVibrateSettingRequest() {
          var request = navigator.mozSettings.get('keyboard.vibration');
          request.addEventListener('success', (function onsuccess(evt) {
            this.vibrate = (request.result.value === 'true');
          }).bind(this));

          setTimeout((function keyboardClickSoundSettingRequest() {
            var request = navigator.mozSettings.get('keyboard.clicksound');
            request.addEventListener('success', (function onsuccess(evt) {
              this.clicksound = (request.result.value === 'true');
            }).bind(this));
          }).bind(this), 0);

        }).bind(this), 0);

        break;

      case 'hideime':
      case 'appclose':
        this.hideIMETimer = setTimeout((function execHideIME() {
          this.hideIME(activeWindow);
        }).bind(this), 0);

        break;

      case 'mousedown':
        var keyCode = parseInt(target.dataset.keycode);
        target.dataset.active = 'true';
        this.currentKey = target;
        this.isPressing = true;

        if (!keyCode && !target.dataset.selection)
          return;

        this.updateKeyHighlight();
        this.triggerFeedback();

        this._menuTimeout = setTimeout((function menuTimeout() {
            this.showAccentCharMenu();
          }).bind(this), this.kAccentCharMenuTimeout);

        if (keyCode != KeyEvent.DOM_VK_BACK_SPACE)
          return;

        var sendDelete = (function sendDelete(feedback) {
          if (feedback)
            this.triggerFeedback();
          if (Keyboards[this.currentKeyboard].type == 'ime' &&
              !this.currentKeyboardMode) {
            this.currentEngine.click(keyCode);
            return;
          }
          window.navigator.mozKeyboard.sendKey(keyCode, keyCode);
        }).bind(this);

        sendDelete(false);
        this._deleteTimeout = setTimeout((function deleteTimeout() {
          sendDelete(true);

          this._deleteInterval = setInterval(function deleteInterval() {
            sendDelete(true);
          }, this.kRepeatRate);
        }).bind(this), this.kRepeatTimeout);
        break;

      case 'mouseover':
        if (!this.isPressing || this.currentKey == target)
          return;

        var keyCode = parseInt(target.dataset.keycode);

        if (!keyCode && !target.dataset.selection)
          return;

        if (this.currentKey)
          delete this.currentKey.dataset.active;

        if (keyCode == KeyEvent.DOM_VK_BACK_SPACE) {
          delete this.currentKey;
          this.updateKeyHighlight();
          return;
        }

        target.dataset.active = 'true';

        this.currentKey = target;

        this.updateKeyHighlight();

        clearTimeout(this._deleteTimeout);
        clearInterval(this._deleteInterval);
        clearTimeout(this._menuTimeout);

        if (target.parentNode === this.menu) {
          clearTimeout(this._hideMenuTimeout);
        } else {
          if (this.menu.className) {
            this._hideMenuTimeout = setTimeout(
              (function hideMenuTimeout() {
                this.hideAccentCharMenu();
              }).bind(this),
              this.kHideAccentCharMenuTimeout
            );
          }

          var needMenu =
            target.dataset.alt || keyCode === this.SWITCH_KEYBOARD;
          if (needMenu) {
            this._menuTimeout = setTimeout((function menuTimeout() {
                this.showAccentCharMenu();
              }).bind(this), this.kAccentCharMenuTimeout);
          }
        }

        break;

      case 'mouseleave':
        if (!this.isPressing || !this.currentKey)
          return;

        delete this.currentKey.dataset.active;
        delete this.currentKey;
        this.updateKeyHighlight();
        this._hideMenuTimeout = setTimeout((function hideMenuTimeout() {
            this.hideAccentCharMenu();
          }).bind(this), this.kHideAccentCharMenuTimeout);

        break;

      case 'mouseup':
        this.isPressing = false;

        if (!this.currentKey)
          return;

        clearTimeout(this._deleteTimeout);
        clearInterval(this._deleteInterval);
        clearTimeout(this._menuTimeout);

        this.hideAccentCharMenu();

        var target = this.currentKey;
        var keyCode = parseInt(target.dataset.keycode);
        if (!keyCode && !target.dataset.selection)
          return;

        var dataset = target.dataset;
        if (dataset.selection) {
          this.currentEngine.select(target.textContent, dataset.data);
          delete this.currentKey.dataset.active;
          delete this.currentKey;

          this.updateKeyHighlight();
          return;
        }

        delete this.currentKey.dataset.active;
        delete this.currentKey;

        this.updateKeyHighlight();

        if (keyCode == KeyEvent.DOM_VK_BACK_SPACE)
          return;

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

              if (this.keyboards.indexOf(target.dataset.keyboard) === -1)
                this.currentKeyboard = this.keyboards[0];
              else
                this.currentKeyboard = target.dataset.keyboard;

              this.currentKeyboardMode = '';
              this.isUpperCase = false;
              this.updateLayout();

              break;
            }

            // If this is the last keyboard in the stack, start
            // back from the beginning.
            var keyboards = this.keyboards;
            var index = keyboards.indexOf(this.currentKeyboard);
            if (index >= keyboards.length - 1 || index < 0)
              this.currentKeyboard = keyboards[0];
            else
              this.currentKeyboard = keyboards[++index];

            this.currentKeyboardMode = '';
            this.isUpperCase = false;
            this.updateLayout();
          break;

          case this.TOGGLE_CANDIDATE_PANEL:
            var panel = this.candidatePanel;
            var className = (panel.className == 'full') ? 'show' : 'full';
            panel.className = target.className = className;
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
                this.updateLayout();

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

            setTimeout(
              (function removeCapsLockTimeout() {
                delete this.isWaitingForSecondTap;
              }).bind(this),
              this.kCapsLockTimeout
            );

            this.isUpperCaseLocked = false;
            this.isUpperCase = !this.isUpperCase;
            this.updateLayout();
          break;

          case KeyEvent.DOM_VK_RETURN:
            if (Keyboards[this.currentKeyboard].type == 'ime' &&
                !this.currentKeyboardMode) {
              this.currentEngine.click(keyCode);
              break;
            }

            window.navigator.mozKeyboard.sendKey(keyCode, keyCode);
          break;

          default:
            if (Keyboards[this.currentKeyboard].type == 'ime' &&
                !this.currentKeyboardMode) {
              this.currentEngine.click(keyCode);
              break;
            }

            window.navigator.mozKeyboard.sendKey(0, keyCode);

            if (this.isUpperCase && !this.isUpperCaseLocked) {
              this.isUpperCase = false;
              this.updateLayout();
            }
          break;
        }
        break;

      case 'unload':
        this.uninit();
        break;
    }
  },

  updateLayout: function km_updateLayout(keyboard) {
    var layout;

    switch (this.currentType) {
      case 'number':
        layout = Keyboards['numberLayout'];
      break;
      case 'tel':
        layout = Keyboards['telLayout'];
      break;
      default:
        layout = Keyboards[keyboard] || Keyboards[this.currentKeyboard];
      break;
    }

    var content = '';
    var width = window.innerWidth;

    if (!layout.upperCase)
      layout.upperCase = {};
    if (!layout.alt)
      layout.alt = {};
    if (!layout.textLayoutOverwrite)
      layout.textLayoutOverwrite = {};

    // Append each row of the keyboard into content HTML

    var size = (width / (layout.width || 10));

    var buildKey = function buildKey(code, label, className, ratio, alt) {
      return '<span class="keyboard-key ' + className + '"' +
        ' data-keycode="' + code + '"' +
        ' style="width:' + (size * ratio - 4) + 'px"' +
        ((alt) ? ' data-alt=' + alt : '') +
      '>' + label + '</span>';
    };

    layout.keys.forEach((function buildKeyboardRow(row) {
      content += '<div class="keyboard-row">';

      row.forEach((function buildKeyboardColumns(key) {
        var specialCodes = [
          KeyEvent.DOM_VK_BACK_SPACE,
          KeyEvent.DOM_VK_CAPS_LOCK,
          KeyEvent.DOM_VK_RETURN,
          KeyEvent.DOM_VK_ALT
        ];
        var keyChar = key.value;

        // This gives layout author the ability to rewrite toUpperCase()
        // for languages that use special mapping, e.g. Turkish.
        var hasSpecialCode = specialCodes.indexOf(key.keyCode) > -1;
        if (!(key.keyCode < 0 || hasSpecialCode) && this.isUpperCase)
          keyChar = layout.upperCase[keyChar] || keyChar.toUpperCase();

        var code = key.keyCode || keyChar.charCodeAt(0);


        if (code == KeyboardEvent.DOM_VK_SPACE) {
          // space key: replace/append with control and type keys

          var ratio = key.ratio || 1;

          if (this.keyboards.length > 1) {
            // Switch keyboard key
            ratio -= 1;
            content += buildKey(
              this.SWITCH_KEYBOARD,
              '&#x1f310;',
              'keyboard-key-special',
              1
            );
          }

          // Alternate layout key
          ratio -= 2;
          if (this.currentKeyboardMode == '') {
            content += buildKey(
              this.ALTERNATE_LAYOUT,
              '?123',
              'keyboard-key-special',
              2
            );
          } else {
            content += buildKey(
              this.BASIC_LAYOUT,
              'ABC',
              'keyboard-key-special',
              2
            );
          }

          switch (this.currentType) {
            case 'url':
              var size = Math.floor(ratio / 3);
              ratio -= size * 2;
              content += buildKey(46, '.', '', size);
              content += buildKey(47, '/', '', size);
              content += buildKey(this.DOT_COM, '.com', '', ratio);
            break;
            case 'email':
              ratio -= 2;
              content += buildKey(
                KeyboardEvent.DOM_VK_SPACE, key.value, 'spacekey', ratio);
              content += buildKey(64, '@', '', 1);
              content += buildKey(46, '.', '', 1);
            break;
            case 'text':
              if (layout.textLayoutOverwrite['.'] !== false)
                ratio -= 1;
              if (layout.textLayoutOverwrite[','] !== false)
                ratio -= 1;

              if (layout.textLayoutOverwrite[',']) {
                content += buildKey(
                  layout.textLayoutOverwrite[','].charCodeAt(0),
                  layout.textLayoutOverwrite[','],
                  '',
                  1
                );
              } else if (layout.textLayoutOverwrite[','] !== false) {
                content += buildKey(44, ',', '', 1);
              }

              content += buildKey(
                KeyboardEvent.DOM_VK_SPACE, key.value, 'spacekey', ratio);

              if (layout.textLayoutOverwrite['.']) {
                content += buildKey(
                  layout.textLayoutOverwrite['.'].charCodeAt(0),
                  layout.textLayoutOverwrite['.'],
                  '',
                  1
                );
              } else if (layout.textLayoutOverwrite['.'] !== false) {
                content += buildKey(46, '.', '', 1);
              }
            break;
          }

          return;
        }

        var className = '';

        if (code < 0 || specialCodes.indexOf(code) > -1)
          className += ' keyboard-key-special';

        if (code == KeyEvent.DOM_VK_CAPS_LOCK)
          className += ' toggle';

        var alt = '';
        if (layout.alt[keyChar] != undefined) {
          alt = layout.alt[keyChar];
        } else if (layout.alt[key.value] != undefined && this.isUpperCase) {
          alt = layout.alt[key.value].toUpperCase();
        }

        content += buildKey(code, keyChar, className, key.ratio || 1, alt);

      }).bind(this));
      content += '</div>';
    }).bind(this));

    // Append empty accent char menu and key highlight into content HTML

    content += '<span id="keyboard-accent-char-menu"></span>';
    content += '<span id="keyboard-key-highlight"></span>';

    // Inject the HTML and assign this.menu & this.keyHighlight

    this.ime.innerHTML = content;
    this.menu = document.getElementById('keyboard-accent-char-menu');
    this.keyHighlight = document.getElementById('keyboard-key-highlight');

    // insert candidate panel if the keyboard layout needs it

    if (layout.needsCandidatePanel) {
      var toggleButton = document.createElement('span');
      toggleButton.innerHTML = '⇪';
      toggleButton.id = 'keyboard-candidate-panel-toggle-button';
      toggleButton.dataset.keycode = this.TOGGLE_CANDIDATE_PANEL;
      this.ime.insertBefore(toggleButton, this.ime.firstChild);

      this.ime.insertBefore(this.candidatePanel, this.ime.firstChild);
      this.showCandidates([]);
      this.currentEngine.empty();
    }

    this.updateKeyboardHeight();
  },

  updateKeyboardHeight: function km_updateKeyboardHeight() {
    var ime = this.ime;
    var targetWindow = this.targetWindow;

    if (ime.dataset.hidden) {
      targetWindow.classList.add('keyboardTransition');
      var showIMEafterTransition = function showIMEtransitionend(evt) {
        targetWindow.classList.remove('keyboardTransition');
        ime.removeEventListener('transitionend', showIMEafterTransition);
      };
      ime.addEventListener('transitionend', showIMEafterTransition);
    }

    // Need these to correctly measure scrollHeight
    ime.style.height = null;
    ime.style.overflowY = 'hidden';
    var scrollHeight = ime.scrollHeight;
    ime.style.overflowY = null;

    targetWindow.style.height =
      (targetWindow.dataset.rectHeight - scrollHeight) + 'px';
    ime.style.height = scrollHeight + 'px';
  },

  showIME: function km_showIME(targetWindow, type) {

    if (targetWindow.classList.contains('keyboardTransition')) {
      // keyboard is transitioning, run showIME after transition
      var deferShowIMEafterTransition = (function deferShowIME(evt) {
        targetWindow.removeEventListener('transitionend', deferShowIMEafterTransition);
        this.showIME(targetWindow, type);
      }).bind(this);
      targetWindow.addEventListener('transitionend', deferShowIMEafterTransition);
      return;
    }

    switch (type) {
      // basic types
      case 'url':
      case 'tel':
      case 'email':
      case 'number':
      case 'text':
        this.currentType = type;
      break;

      // default fallback and textual types
      case 'password':
      case 'search':
      default:
        this.currentType = 'text';
      break;

      case 'range': // XXX: should be different from number
        this.currentType = 'number';
      break;
    }

    if (this.ime.dataset.hidden) {
      // keyboard is in the quiet hidden state
      this.targetWindow = targetWindow;
      var oldHeight = targetWindow.style.height;
      targetWindow.dataset.cssHeight = oldHeight;
      targetWindow.dataset.rectHeight =
        targetWindow.getBoundingClientRect().height;
    }

    this.updateLayout();
    delete this.ime.dataset.hidden;

  },

  hideIME: function km_hideIME(targetWindow) {

    if (this.ime.dataset.hidden)
      return;

    var ime = this.ime;
    var hideIMEafterTransition = (function hideIMEtransitionend(evt) {
      targetWindow.classList.remove('keyboardTransition');
      ime.removeEventListener('transitionend', hideIMEafterTransition);

      // hideIME is canceled by the showIME that fires after
      if (ime.style.height !== '0px')
        return;

      delete this.targetWindow;

      delete targetWindow.dataset.cssHeight;
      delete targetWindow.dataset.rectHeight;
      ime.dataset.hidden = 'true';
      delete ime.style.height;

      ime.innerHTML = '';

    }).bind(this);

    ime.addEventListener('transitionend', hideIMEafterTransition);
    targetWindow.classList.add('keyboardTransition');
    targetWindow.style.height = targetWindow.dataset.cssHeight;
    ime.style.height = '0px';

  },

  showCandidates: function km_showCandidates(candidates) {
    // TODO: candidate panel should be allow toggled to fullscreen
    var candidatePanel = document.getElementById('keyboard-candidate-panel');
    var toggleButton =
      document.getElementById('keyboard-candidate-panel-toggle-button');

    candidatePanel.innerHTML = '';

    if (!candidates.length) {
      toggleButton.className = '';
      candidatePanel.className = '';
      this.updateKeyboardHeight();
      return;
    }

    toggleButton.className = toggleButton.className || 'show';
    candidatePanel.className = candidatePanel.className || 'show';

    if (toggleButton.className == 'show')
      this.updateKeyboardHeight();

    candidates.forEach(function buildCandidateEntry(candidate) {
      var span = document.createElement('span');
      span.dataset.data = candidate[1];
      span.dataset.selection = true;
      span.textContent = candidate[0];
      candidatePanel.appendChild(span);
    });
  }
};

window.addEventListener('load', function initIMEManager(evt) {
  window.removeEventListener('load', initIMEManager);
  IMEManager.init();
});

