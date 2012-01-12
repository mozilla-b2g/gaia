/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const IMEManager = {
  BASIC_LAYOUT: -1,
  ALTERNATE_LAYOUT: -2,
  SWITCH_KEYBOARD: -3,
  TOGGLE_CANDIDATE_PANEL: -4,

  // IME Engines are self registering here.
  IMEngines: {},
  get currentEngine() {
    return this.IMEngines[Keyboards[this.currentKeyboard].imEngine];
  },

  // TODO: allow user to select desired keyboards in settings
  // see bug 712778
  currentKeyboard: 'en',
  currentKeyboardMode: '',
  keyboards: [
    'en', 'fr', 'de', 'he', 'nb',
    'ru', 'sr-Cyrl', 'sk', 'en-Dvorak',
    'tr', 'zh-Hant_Zhuying'
  ],

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
      this.updateLayout(this.currentKeyboard);
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
      this.currentKeyboardMode = '';
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
    var keyHighlight = document.getElementById('keyboard-key-highlight');
    var target = this.currentKey;

    keyHighlight.className = '';

    if (!target)
      return;

    if (target.dataset.keyboard)
      return;

    keyHighlight.textContent = target.textContent;

    var keyHighlightWidth;

    if (target.textContent.length != 1) {
      keyHighlight.className = 'show';
      keyHighlightWidth = keyHighlight.offsetWidth;
    } else {
      keyHighlightWidth = 82;
    }

    var keyHighlightTop = target.offsetTop;
    var keyHighlightLeft =
      target.offsetLeft + target.offsetWidth / 2 - keyHighlightWidth / 2;

    if (target.classList.contains('on-menu')) {
      var menu = document.getElementById('keyboard-accent-char-menu');
      keyHighlightTop += menu.offsetTop;
      keyHighlightLeft += menu.offsetLeft;
    }

    keyHighlightLeft = Math.max(keyHighlightLeft, 5);
    keyHighlightLeft =
      Math.min(
        keyHighlightLeft,
        window.innerWidth - keyHighlightWidth - 5
      );

    keyHighlight.style.top = keyHighlightTop.toString(10) + 'px';
    keyHighlight.style.left = keyHighlightLeft.toString(10) + 'px';

    keyHighlight.className = 'show';
  },

  showAccentCharMenu: function km_showAccentCharMenu() {
    var target = this.currentKey;

    if (!target)
      return;

    var keyCode = parseInt(this.currentKey.getAttribute('data-keycode'));
    var menu = document.getElementById('keyboard-accent-char-menu');
    var content = '';

    if (!target.dataset.alt && keyCode !== this.SWITCH_KEYBOARD)
      return;

    clearTimeout(this._hideMenuTimeout);

    var cssWidth = target.style.width;

    if (keyCode == this.SWITCH_KEYBOARD) {

      document.getElementById('keyboard-key-highlight').className = '';

      menu.className = 'show menu';

      for (var i in this.keyboards) {
        var keyboard = this.keyboards[i];
        var className = 'keyboard-key keyboard-key-special on-menu';

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

      menu.style.top =
        (target.offsetTop - menu.offsetHeight).toString(10) + 'px';

      menu.style.left = '10px';

      return;
    }

    var before = (window.innerWidth / 2 > target.offsetLeft);

    if (before) {
      content += '<span class="keyboard-key on-menu" ' +
        'data-keycode="' + target.dataset.keycode + '" ' +
        'data-active="true"' +
        'style="width:' + cssWidth + '"' +
        '>' +
        target.innerHTML +
        '</span>';
    }

    for (var i in target.dataset.alt) {
      content += '<span class="keyboard-key on-menu" ' +
        'data-keycode="' + target.dataset.alt.charCodeAt(i) + '"' +
        'style="width:' + cssWidth + '"' +
        '>' +
        target.dataset.alt.charAt(i) +
        '</span>';
    }

    if (!before) {
      content += '<span class="keyboard-key on-menu" ' +
        'data-keycode="' + target.dataset.keycode + '" ' +
        'data-active="true"' +
        'style="width:' + cssWidth + '"' +
        '>' +
        target.innerHTML +
        '</span>';
    }

    menu.innerHTML = content;
    menu.className = 'show';

    menu.style.top =
      target.offsetTop.toString(10) + 'px';

    if (before) {
      menu.style.left =
        (target.offsetLeft - 6).toString(10) + 'px';
    } else {
      menu.style.left =
        (
          target.offsetLeft + 6 - menu.offsetWidth + target.offsetWidth
        ).toString(10) + 'px';
    }

    delete target.dataset.active;

    if (before) {
      var index = 0;
      var sibling = target;

      while (menu.childNodes.item(index)) {
        sibling.dataset.redirectToMenu = index;
        sibling = sibling.nextSibling;
        index++;
      }
    } else {
      var index = menu.childNodes.length - 1;
      var sibling = target;

      while (menu.childNodes.item(index)) {
        sibling.dataset.redirectToMenu = index;
        sibling = sibling.previousSibling;
        index--;
      }
    }

    this._currentMenuKey = target;

    this.currentKey = (before) ?
      menu.firstChild : menu.lastChild;

    this.updateKeyHighlight();

  },
  hideAccentCharMenu: function km_hideAccentCharMenu() {
    if (!this._currentMenuKey)
      return;

    var menu = document.getElementById('keyboard-accent-char-menu');
    menu.className = '';
    menu.innerHTML = '';

    var siblings = this._currentMenuKey.parentNode.childNodes;

    for (var key in siblings) {
      delete siblings[key].dataset.redirectToMenu;
    }

    delete this._currentMenuKey;
  },

  events: ['mouseup', 'showime', 'hideime', 'unload', 'appclose'],
  imeEvents: ['mousedown', 'mousemove', 'mouseleave'],
  init: function km_init() {
    this.events.forEach((function attachEvents(type) {
      window.addEventListener(type, this);
    }).bind(this));

    this.imeEvents.forEach((function imeEvents(type) {
      this.ime.addEventListener(type, this);
    }).bind(this));

    this.keyboards.forEach((function loadIMEngines(name) {
      var keyboard = Keyboards[name];
      if (keyboard.type !== 'ime')
        return;

      var sourceDir = './imes/';
      var imEngine = keyboard.imEngine;

      var script = document.createElement('script');
      script.src = sourceDir + imEngine + '/loader.js';

      var self = this;
      var glue = {
        dbOptions: {
          data: sourceDir + imEngine + '/data.json'
        },
        sendChoices: function(candidates) {
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

  handleEvent: function km_handleEvent(evt) {
    var activeWindow = Gaia.AppManager.foregroundWindow;
    var target = evt.target;

    switch (evt.type) {
      case 'showime':
        this.showIME(activeWindow, evt.detail.type);
        break;

      case 'hideime':
      case 'appclose':
        this.hideIME(activeWindow);
        break;

      case 'mousedown':
        var keyCode = parseInt(target.getAttribute('data-keycode'));
        target.dataset.active = 'true';
        this.currentKey = target;
        this.isPressing = true;

        if (!keyCode && !target.dataset.selection)
          return;

        this.updateKeyHighlight();

        this._menuTimeout = setTimeout(
          (function menuTimeout() {
            this.showAccentCharMenu();
          }).bind(this),
          this.kAccentCharMenuTimeout
        );

        if (keyCode != KeyEvent.DOM_VK_BACK_SPACE)
          return;

        var sendDelete = (function sendDelete() {
          if (Keyboards[this.currentKeyboard].type == 'ime') {
            this.currentEngine.click(keyCode);
            return;
          }
          window.navigator.mozKeyboard.sendKey(keyCode, keyCode);
        }).bind(this);

        sendDelete();
        this._deleteTimeout = setTimeout((function deleteTimeout() {
          sendDelete();

          this._deleteInterval = setInterval(function deleteInterval() {
            sendDelete();
          }, this.kRepeatRate);
        }).bind(this), this.kRepeatTimeout);
        break;

      case 'mousemove':
        if (!this.isPressing)
          return;

        if (this.currentKey == target)
          return;

        var keyCode = parseInt(target.getAttribute('data-keycode'));

        if (!keyCode && !target.dataset.selection)
          return;

        if (this.currentKey)
          delete this.currentKey.dataset.active;

        if (keyCode == KeyEvent.DOM_VK_BACK_SPACE) {
          delete this.currentKey;
          this.updateKeyHighlight();
          return;
        }

        if (target.dataset.redirectToMenu !== undefined) {
          // Redirect target to the real button on menu
          target =
            document.getElementById('keyboard-accent-char-menu')
            .childNodes.item(target.dataset.redirectToMenu);
        }

        target.dataset.active = 'true';

        this.currentKey = target;

        this.updateKeyHighlight();

        clearTimeout(this._deleteTimeout);
        clearInterval(this._deleteInterval);
        clearTimeout(this._menuTimeout);

        if (target.classList.contains('on-menu')) {
          clearTimeout(this._hideMenuTimeout);
        } else {
          this._hideMenuTimeout = setTimeout(
            (function hideMenuTimeout() {
              this.hideAccentCharMenu();
            }).bind(this),
            this.kHideAccentCharMenuTimeout
          );
          this._menuTimeout = setTimeout(
            (function menuTimeout() {
              this.showAccentCharMenu();
            }).bind(this),
            this.kAccentCharMenuTimeout
          );
        }

        break;

      case 'mouseleave':
        if (!this.isPressing)
          return;

        if (this.currentKey) {
          delete this.currentKey.dataset.active;
          delete this.currentKey;
          this.updateKeyHighlight();
          this._hideMenuTimeout = setTimeout(
            (function hideMenuTimeout() {
              this.hideAccentCharMenu();
            }).bind(this),
            this.kHideAccentCharMenuTimeout
          );
        }

        break;

      case 'mouseup':
        this.isPressing = false;

        if (!this.currentKey)
          return;

        var target = this.currentKey;
        var keyCode = parseInt(target.getAttribute('data-keycode'));

        clearTimeout(this._deleteTimeout);
        clearInterval(this._deleteInterval);
        clearTimeout(this._menuTimeout);

        this.hideAccentCharMenu();

        if (!keyCode && !target.dataset.selection)
          return;

        if (target.dataset.selection) {
          this.currentEngine.select(
            target.textContent,
            target.dataset.data
          );
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

              this.isUpperCase = false;
              this.updateLayout(this.currentKeyboard);

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

            this.isUpperCase = false;
            this.updateLayout(this.currentKeyboard);
          break;

          case this.TOGGLE_CANDIDATE_PANEL:
            var panel = this.candidatePanel;
            var className = (panel.className == 'full') ? 'show' : 'full';
            panel.className = target.className = className;
          break;

          case KeyEvent.DOM_VK_ALT:
            this.isSymbolLayout = !this.isSymbolLayout;
          break;

          case KeyEvent.DOM_VK_CAPS_LOCK:
            if (this.isWaitingForSecondTap) {
              this.isUpperCaseLocked = true;
              if (!this.isUpperCase) {
                this.isUpperCase = true;
                this.updateLayout(this.currentKeyboard);

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
            this.updateLayout(this.currentKeyboard);
          break;

          case KeyEvent.DOM_VK_RETURN:
            if (Keyboards[this.currentKeyboard].type == 'ime') {
              this.currentEngine.click(keyCode);
              break;
            }

            window.navigator.mozKeyboard.sendKey(keyCode, keyCode);
          break;

          default:
            if (Keyboards[this.currentKeyboard].type == 'ime') {
              this.currentEngine.click(keyCode);
              break;
            }

            window.navigator.mozKeyboard.sendKey(0, keyCode);

            if (this.isUpperCase && !this.isUpperCaseLocked) {
              this.isUpperCase = false;
              this.updateLayout(this.currentKeyboard);
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
    var layout = Keyboards[keyboard];

    var content = '';
    var width = window.innerWidth;

    if (!layout.upperCase)
      layout.upperCase = {};
    if (!layout.alt)
      layout.alt = {};

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
        if (
          !(key.keyCode < 0 || specialCodes.indexOf(key.keyCode) > -1) &&
          this.isUpperCase
        )
          keyChar = layout.upperCase[keyChar] || keyChar.toUpperCase();

        var code = key.keyCode || keyChar.charCodeAt(0);
        var size = ((width - (row.length * 2)) / (layout.width || 10));
        size = size * (key.ratio || 1) - 2;
        var className = 'keyboard-key';

        if (code < 0 || specialCodes.indexOf(code) > -1)
          className += ' keyboard-key-special';

        if (code == KeyEvent.DOM_VK_CAPS_LOCK)
          className += ' toggle';

        var alt = '';
        if (layout.alt[keyChar] != undefined)
          alt = ' data-alt="' + layout.alt[keyChar] + '"';
        else if (layout.alt[key.value] != undefined && this.isUpperCase) {
          alt = ' data-alt="' + layout.alt[key.value].toUpperCase() + '"';
        }

        content += '<span class="' + className + '"' +
                          'data-keycode="' + code + '"' +
                          'style="width:' + size + 'px"' +
                          alt +
                   '>' +
                   keyChar +
                   '</span>';
      }).bind(this));
      content += '</div>';
    }).bind(this));

    content += '<span id="keyboard-accent-char-menu"></span>';
    content += '<span id="keyboard-accent-char-shadow-menu"></span>';

    content += '<span id="keyboard-key-highlight"></span>';

    this.ime.innerHTML = content;

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

    if (ime.offsetHeight !== 0) {
      targetWindow.classList.add('noTransition');
      setTimeout(function remoteNoTransition() {
        targetWindow.classList.remove('noTransition');
      }, 0);
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
    this.targetWindow = targetWindow;
    var oldHeight = targetWindow.style.height;
    targetWindow.dataset.cssHeight = oldHeight;
    targetWindow.dataset.rectHeight =
      targetWindow.getBoundingClientRect().height;

    this.updateLayout(this.currentKeyboard);
    delete this.ime.dataset.hidden;
  },

  hideIME: function km_hideIME(targetWindow) {
    var ime = this.ime;
    var imeHide = (function(evt) {
      targetWindow.removeEventListener('transitionend', imeHide);
      delete this.targetWindow;

      ime.innerHTML = '';
    }).bind(this);

    targetWindow.addEventListener('transitionend', imeHide);
    targetWindow.style.height = targetWindow.dataset.cssHeight;
    delete targetWindow.dataset.cssHeight;
    delete targetWindow.dataset.rectHeight;

    ime.style.height = null;
    ime.dataset.hidden = 'true';
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

