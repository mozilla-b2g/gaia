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
  currentKeyboard: 'qwertyLayout',
  currentKeyboardMode: '',
  keyboards: [
    'qwertyLayout', 'azertyLayout', 'qwertzLayout', 'hebrewLayout',
    'jcukenLayout', 'serbianCyrillicLayout', 'dvorakLayout',
    'zhuyingGeneralLayout'
  ],

  get isUpperCase() {
    return (this.currentKeyboardMode == 'UpperCase');
  },

  set isUpperCase(isUpperCase) {
    var keyboard = this.currentKeyboard;
    if (isUpperCase) {
      keyboard += 'UpperCase';
      this.currentKeyboardMode = 'UpperCase';
    } else {
      this.currentKeyboardMode = '';
    }
    this.updateLayout(keyboard);
  },

  get isAlternateLayout() {
    return (this.currentKeyboardMode == 'Alternate');
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

  // backspace repeat delay and repeat rate
  kRepeatTimeout: 700,
  kRepeatRate: 100,

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


  events: ['showime', 'hideime', 'unload', 'appclose'],
  imeEvents: ['touchstart', 'touchend', 'click'],
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
              // XXX until bug 713498 lands in git m-c, always send a keyCode
              // that is not 0
              //window.navigator.mozKeyboard.sendKey(0, keyCode);
              window.navigator.mozKeyboard.sendKey(keyCode, keyCode);
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

      case 'touchstart':
        var keyCode = parseInt(target.getAttribute('data-keycode'));
        target.dataset.active = 'true';

        if (!keyCode)
          return;

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
        this._timeout = setTimeout((function deleteTimeout() {
          sendDelete();

          this._interval = setInterval(function deleteInterval() {
            sendDelete();
          }, this.kRepeatRate);
        }).bind(this), this.kRepeatTimeout);
        break;

      case 'touchend':
        var keyCode = parseInt(target.getAttribute('data-keycode'));
        delete target.dataset.active;

        if (!keyCode)
          return;

        clearTimeout(this._timeout);
        clearInterval(this._interval);
        break;

      case 'click':
        if (target.dataset.selection) {
          this.currentEngine.select(target.textContent, target.dataset.data);
          return;
        }

        var keyCode = parseInt(target.getAttribute('data-keycode'));
        if (!keyCode)
          return;

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
            // If this is the last keyboard in the stack, start
            // back from the beginning.
            var keyboards = this.keyboards;
            var index = keyboards.indexOf(this.currentKeyboard);
            if (index >= keyboards.length - 1)
              this.currentKeyboard = keyboards[0];
            else
              this.currentKeyboard = keyboards[++index];

            this.updateLayout(this.currentKeyboard);
          break;

          case this.TOGGLE_CANDIDATE_PANEL:
            if (this.candidatePanel.className == 'full') {
              this.candidatePanel.className = 'show';
              target.className = 'show';
            } else {
              this.candidatePanel.className = 'full';
              target.className = 'full';
            }
          break;

          case KeyEvent.DOM_VK_CAPS_LOCK:
            this.isUpperCase = !this.isUpperCase;
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

            // XXX until bug 713498 lands in git m-c, always send a keyCode
            // that is not 0
            //window.navigator.mozKeyboard.sendKey(0, keyCode);
            window.navigator.mozKeyboard.sendKey(keyCode, keyCode);

            if (this.isUpperCase)
              this.isUpperCase = false;
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
    layout.keys.forEach(function buildKeyboardRow(row) {
      content += '<div class="keyboard-row">';

      row.forEach(function buildKeyboardColumns(key) {
        var code = key.keyCode || key.value.charCodeAt(0);
        var size = ((width - (row.length * 2)) / (layout.width || 10));
        size = size * (key.ratio || 1) - 2;
        var className = 'keyboard-key';
        if (
          code < 0
          || code == KeyEvent.DOM_VK_BACK_SPACE
          || code == KeyEvent.DOM_VK_CAPS_LOCK
          || code == KeyEvent.DOM_VK_RETURN
          || code == KeyEvent.DOM_VK_ALT
        ) {
          className += ' keyboard-key-special';
        }
        content += '<span class="' + className + '"' +
                          'data-keycode="' + code + '"' +
                          'style="width:' + size + 'px"' +
                   '>' +
                   key.value +
                   '</span>';
      });
      content += '</div>';
    });

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
    var ime = this.ime;
    var oldHeight = targetWindow.style.height;
    targetWindow.dataset.cssHeight = oldHeight;
    targetWindow.dataset.rectHeight =
      targetWindow.getBoundingClientRect().height;

    targetWindow.addEventListener('transitionend', function imeShow() {
      targetWindow.removeEventListener('transitionend', imeShow);
      targetWindow.className += ' noTransition';
    });

    this.updateLayout(this.currentKeyboard);
    delete ime.dataset.hidden;
  },

  hideIME: function km_hideIME(targetWindow) {
    var ime = this.ime;
    var imeHide = (function (evt) {
      targetWindow.removeEventListener('transitionend', imeHide);
      delete this.targetWindow;

      ime.innerHTML = '';
    }).bind(this);

    targetWindow.addEventListener('transitionend', imeHide);
    targetWindow.className = targetWindow.className.replace(/ noTransition/, '');
    targetWindow.style.height = targetWindow.dataset.cssHeight;
    delete targetWindow.dataset.cssHeight;
    delete targetWindow.dataset.rectHeight;

    ime.style.height = null;
    ime.dataset.hidden = 'true';
  },

  showCandidates: function km_showCandidates(candidates) {
    // TODO: candidate panel should be allow toggled to fullscreen
    var candidatePanel = document.getElementById('keyboard-candidate-panel');
    var toggleButton = document.getElementById('keyboard-candidate-panel-toggle-button');

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

