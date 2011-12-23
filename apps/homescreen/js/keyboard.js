
const IMEManager = {
  BASIC_LAYOUT: -1,
  ALTERNATE_LAYOUT: -2,
  SWITCH_KEYBOARD: -3,
  // TBD: allow user to select desired keyboards in settings
  keyboards: ['qwertyLayout', 'azertyLayout', 'qwertzLayout', 'hebrewLayout', 'jcukenLayout', 'serbianCyrillicLayout', 'dvorakLayout'],
  // backspace repeat delay and repeat rate
  kRepeatDelay: 700,
  kRepeatRate: 100,

  get ime() {
    delete this.ime;
    return this.ime = document.getElementById('keyboard');
  },
  events: ['showime', 'hideime', 'unload', 'appclose'],
  init: function km_init() {
    this.events.forEach((function attachEvents(type) {
      window.addEventListener(type, this);
    }).bind(this));

    this.ime.addEventListener('touchstart', this);
    this.ime.addEventListener('touchend', this);
    this.ime.addEventListener('click', this);

    this.layout = KeyboardAndroid[IMEManager.keyboards[0]];
    this.currentKeyboard = 0;
    this.isUpperCase = false;
  },
  uninit: function km_uninit() {
    this.events.forEach((function attachEvents(type) {
      window.removeEventListener(type, this);
    }).bind(this));

    this.ime.removeEventListener('touchstart', this);
    this.ime.removeEventListener('touchend', this);
    this.ime.removeEventListener('click', this);
  },
  handleEvent: function km_handleEvent(evt) {
    var activeWindow = Gaia.AppManager.foregroundWindow;

    switch (evt.type) {
      case 'showime':
        this.showIME(activeWindow, evt.detail.type);
        break;
      case 'hideime':
      case 'appclose':
        this.hideIME(activeWindow);
        break;
      case 'touchstart':
        var keyCode = parseInt(evt.target.getAttribute('data-keycode'));
        if (!keyCode)
          return;
        evt.target.dataset.active = 'true';
        if (keyCode === KeyEvent.DOM_VK_BACK_SPACE) {
          window.navigator.mozKeyboard.sendKey(keyCode);
          var self = this;
          this._timer = setTimeout(
            function km_backspaceDelay() {
              window.navigator.mozKeyboard.sendKey(keyCode);
              self._timer = setInterval(
                function km_backspaceRepeat() {
                  window.navigator.mozKeyboard.sendKey(keyCode);
                },
                IMEManager.kRepeatRate
              );
            },
            IMEManager.kRepeatDelay
          );
        }
        break;
      case 'touchend':
        var keyCode = parseInt(evt.target.getAttribute('data-keycode'));
        if (!keyCode)
          return;
        delete evt.target.dataset.active;
        clearTimeout(this._timer);
        clearInterval(this._timer);
        delete this._timer;
        break;
      case 'click':
        var keyCode = parseInt(evt.target.getAttribute('data-keycode'));
        if (!keyCode && keyCode === KeyEvent.DOM_VK_BACK_SPACE)
          return;

        switch (keyCode) {
          case IMEManager.BASIC_LAYOUT:
            var keyboard = IMEManager.keyboards[this.currentKeyboard];
            this.layout = KeyboardAndroid[keyboard];
            this.ime.innerHTML = this.getLayout(window.innerWidth);
          break;
          case IMEManager.ALTERNATE_LAYOUT:
            this.layout = KeyboardAndroid.alternateLayout;
            this.ime.innerHTML = this.getLayout(window.innerWidth);
          break;
          case IMEManager.SWITCH_KEYBOARD:
            this.currentKeyboard++;
            if (this.currentKeyboard === IMEManager.keyboards.length)
              this.currentKeyboard = 0;

            var keyboard = IMEManager.keyboards[this.currentKeyboard];
            this.layout = KeyboardAndroid[keyboard];
            this.ime.innerHTML = this.getLayout(window.innerWidth);
          break;
          case KeyEvent.DOM_VK_CAPS_LOCK:
            var keyboard = IMEManager.keyboards[this.currentKeyboard];
            if (this.isUpperCase) {
              this.layout = KeyboardAndroid[keyboard];
            } else {
              this.layout = KeyboardAndroid[keyboard + 'UpperCaps'];
            }
            this.isUpperCase = !this.isUpperCase;
            this.ime.innerHTML = this.getLayout(window.innerWidth);
          break;
          default:
            window.navigator.mozKeyboard.sendKey(keyCode);
            if (this.isUpperCase) {
              this.isUpperCase = !this.isUpperCase;
              var keyboard = IMEManager.keyboards[this.currentKeyboard];
              this.layout = KeyboardAndroid[keyboard];
              this.ime.innerHTML = this.getLayout(window.innerWidth);
            }
          break;
        }
        break;
      case 'unload':
        this.uninit();
        break;
    }
  },
  getLayout: function km_getLayout(width) {
    var content = '', self = this;
    this.layout.keys.forEach(function buildKeyboardRow(row) {
      content += '<div class="keyboard-row">';

      row.forEach(function buildKeyboardColumns(key) {
        var code = key.keyCode || key.value.charCodeAt(0);
        var size = ((width - (row.length * 2)) / (self.layout.width || 10)) * (key.ratio || 1) - 2;
        content += '<span class="keyboard-key"' +
                          'data-keycode="' + code + '"' +
                          'style="width:' + size + 'px"' +
                   '>' +
                   key.value +
                   '</span>';
      });
      content += '</div>';
    });

    return content;
  },
  showIME: function km_showIME(targetWindow, type) {
    var oldHeight = targetWindow.style.height;
    targetWindow.dataset.height = oldHeight;

    var ime = this.ime;
    ime.innerHTML = this.getLayout(window.innerWidth);

    delete ime.dataset.hidden;
    var newHeight = targetWindow.getBoundingClientRect().height -
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
  hideIME: function km_hideIME(targetWindow) {
    targetWindow.style.height = targetWindow.dataset.height;
    delete targetWindow.dataset.height;

    var ime = this.ime;
    ime.dataset.hidden = 'true';
    ime.innerHTML = '';
  }
};

window.addEventListener('load', function initIMEManager(evt) {
  window.removeEventListener('load', initIMEManager);
  IMEManager.init();
});

