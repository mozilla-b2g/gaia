/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const IMEManager = {
  BASIC_LAYOUT: -1,
  ALTERNATE_LAYOUT: -2,
  SWITCH_KEYBOARD: -3,

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

  get converter() {
    delete this.converter;
    var converter = document.createElement('div');
    converter.id = 'keyboard-selections';
    return this.converter = converter;
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
        sendChoices: self.showCompositions,
        sendKey: function (keyCode) {
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

      case 'touchstart':
        var keyCode = parseInt(target.getAttribute('data-keycode'));
        if (!keyCode)
          return;
        target.dataset.active = 'true';

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
        if (!keyCode)
          return;
        delete target.dataset.active;

        clearTimeout(this._timeout);
        clearInterval(this._interval);
        break;

      case 'click':
        if (target.dataset.selection) {
          this.currentEngine.select(target.textContent, target.dataset.data);
          this.updateKeyboardHeight();
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

          case KeyEvent.DOM_VK_CAPS_LOCK:
            this.isUpperCase = !this.isUpperCase;
          break;

          case KeyEvent.DOM_VK_RETURN:
            if (Keyboards[this.currentKeyboard].type == 'ime') {
              this.currentEngine.click(keyCode);
              this.updateKeyboardHeight();
              break;
            }

            window.navigator.mozKeyboard.sendKey(keyCode, keyCode);
          break;

          default:
            if (Keyboards[this.currentKeyboard].type == 'ime') {
              this.currentEngine.click(keyCode);
              this.updateKeyboardHeight();
              break;
            }

            window.navigator.mozKeyboard.sendKey(0, keyCode);

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
        content += '<span class="keyboard-key"' +
                          'data-keycode="' + code + '"' +
                          'style="width:' + size + 'px"' +
                   '>' +
                   key.value +
                   '</span>';
      });
      content += '</div>';
    });

    this.ime.innerHTML = content;

    if (layout.selector) {
      this.ime.insertBefore(this.converter, this.ime.firstChild);
      this.showCompositions([]);
      this.currentEngine.empty();
    }

    this.updateKeyboardHeight();
  },

  updateKeyboardHeight: function km_updateKeyboardHeight() {
    var ime = this.ime;
    var targetWindow = this.targetWindow;

    var newHeight = targetWindow.dataset.rectHeight -
                    ime.getBoundingClientRect().height;
    if (ime.getBoundingClientRect().top < window.innerHeight) {
      targetWindow.style.height = newHeight + 'px';
      return;
    }

    ime.addEventListener('transitionend', function imeShow(evt) {
      ime.removeEventListener('transitionend', imeShow);
      targetWindow.style.height = newHeight + 'px';
    });
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
    targetWindow.style.height = targetWindow.dataset.cssHeight;
    delete targetWindow.dataset.cssHeight;
    delete targetWindow.dataset.rectHeight;
    delete this.targetWindow;

    var ime = this.ime;
    ime.dataset.hidden = 'true';
    ime.innerHTML = '';
  },

  showCompositions: function km_showCompositions(compositions) {
    // TODO: converter panel should be allow toggled to fullscreen
    var converter = document.getElementById('keyboard-selections');
    converter.innerHTML = '';
    converter.className = '';

    if (!compositions.length)
      return;

    converter.className = 'show';
    compositions.forEach(function buildComposition(composition) {
      var span = document.createElement('span');
      span.dataset.data = composition[1];
      span.dataset.selection = true;
      span.textContent = composition[0];
      converter.appendChild(span);
    });
  }
};

window.addEventListener('load', function initIMEManager(evt) {
  window.removeEventListener('load', initIMEManager);
  IMEManager.init();
});

