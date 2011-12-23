/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const IMEManager = {
  isUpperCase: false,
  currentKeyboard: 0,

  BASIC_LAYOUT: -1,
  ALTERNATE_LAYOUT: -2,
  SWITCH_KEYBOARD: -3,

  // IME Engines are self registering to this object
  IMEngines: {},
  get currentEngine() {
    return this.IMEngines[this.layout.imEngine];
  },

  keyboards: [
    'qwertyLayout', 'azertyLayout', 'qwertzLayout', 'hebrewLayout',
    'jcukenLayout', 'serbianCyrillicLayout', 'dvorakLayout',
    'zhuyingGeneralLayout'
  ],
  
  // backspace repeat delay and repeat rate
  kRepeatDelay: 700,
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

    // TODO: allow user to select desired keyboards in settings
    // see bug 712778
    this.layout = Keyboards[this.keyboards[0]];

    this.keyboards.forEach((function loadIMEngines(name) {
      var keyboard = Keyboards[name];
      if (keyboard.type !== 'ime')
        return;

      var sourceDir = './imes/';
      var imEngine = keyboard.imEngine;

      var script = document.createElement('script');
      script.src = sourceDir + imEngine + '/loader.js';
      script.addEventListener('load', (function IMEnginesLoaded() {
        var self = this;
        function sendChoices() {
          self.showCompositions.apply(self, arguments);
        }

        function sendKey(key) {
          window.navigator.mozKeyboard.sendKey(key);
        }

        function sendString(str) {
          for (var i = 0; i < str.length; i++)
            window.navigator.mozKeyboard.sendKey(str.charCodeAt(i));
        }

        var engine = this.IMEngines[imEngine];
        engine.init(sourceDir + imEngine, sendChoices, sendKey, sendString);
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

        var sendKey = (function sendKey(key) {
          if (this.layout.type == 'ime')
            this.currentEngine.click(keyCode);
          else
            window.navigator.mozKeyboard.sendKey(keyCode);
        }).bind(this);

        this._timeout = setTimeout((function km_deleteDelay() {
          sendKey(keyCode);

          this._interval = setInterval(function km_deleteRepeat() {
            sendKey(keyCode);
          }, this.kRepeatRate);
        }).bind(this), this.kRepeatDelay);
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
        if (!keyCode || keyCode == KeyEvent.DOM_VK_BACK_SPACE)
          return;

        switch (keyCode) {
          case this.BASIC_LAYOUT:
            var keyboard = this.keyboards[this.currentKeyboard];
            this.updateLayout(Keyboards[keyboard]);
          break;

          case this.ALTERNATE_LAYOUT:
            this.updateLayout(Keyboards.alternateLayout);
          break;

          case this.SWITCH_KEYBOARD:
            // If this is the last keyboard in the stack, start
            // back from the beginning.
            this.currentKeyboard++;
            if (this.currentKeyboard == this.keyboards.length)
              this.currentKeyboard = 0;

            var keyboard = this.keyboards[this.currentKeyboard];
            this.updateLayout(Keyboards[keyboard]);
          break;

          case KeyEvent.DOM_VK_CAPS_LOCK:
            var keyboard = this.keyboards[this.currentKeyboard];
            var uppercase = this.isUpperCase;
            this.isUpperCase = !this.isUpperCase;

            var layout = uppercase ? Keyboards[keyboard]
                                   : Keyboards[keyboard + 'UpperCaps'];
            this.updateLayout(layout);
          break;

          default:
            if (this.layout.type === 'ime') {
              this.currentEngine.click(keyCode);
              this.updateKeyboardHeight();
              break;
            }

            window.navigator.mozKeyboard.sendKey(keyCode);

            if (this.isUpperCase) {
              this.isUpperCase = !this.isUpperCase;
              var keyboard = this.keyboards[this.currentKeyboard];
              this.updateLayout(Keyboards[keyboard]);
            }
          break;
        }
        break;

      case 'unload':
        this.uninit();
        break;
    }
  },

  updateLayout: function km_updateLayout(layout) {
    this.layout = layout;

    var content = '', width = window.innerWidth, self = this;
    layout.keys.forEach(function buildKeyboardRow(row) {
      content += '<div class="keyboard-row">';

      row.forEach(function buildKeyboardColumns(key) {
        var code = key.keyCode || key.value.charCodeAt(0);
        var size = ((width - (row.length * 2)) / (self.layout.width || 10));
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

    this.updateLayout(this.layout);
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
    var converter = this.converter;
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

