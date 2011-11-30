
const KeyboardManager = {
  BASIC_LAYOUT: -1,
  ALTERNATE_LAYOUT: -2,

  get keyboard() {
    delete this.keyboard;
    return this.keyboard = document.getElementById('keyboard');
  },
  events: ['showkeyboard', 'hidekeyboard', 'unload', 'appclose'],
  init: function km_init() {
    this.events.forEach((function attachEvents(type) {
      window.addEventListener(type, this);
    }).bind(this));

    this.keyboard.addEventListener('mousedown', this);
    this.keyboard.addEventListener('mouseup', this);
    this.keyboard.addEventListener('click', this);

    this.layout = KeyboardAndroid.basicLayout;
  }, 
  uninit: function km_uninit() {
    this.events.forEach((function attachEvents(type) {
      window.removeEventListener(type, this);
    }).bind(this));

    this.keyboard.removeEventListener('mousedown', this);
    this.keyboard.removeEventListener('mouseup', this);
    this.keyboard.removeEventListener('click', this);
  }, 
  handleEvent: function km_handleEvent(evt) {
    var activeWindow = Gaia.AppManager.foregroundWindow;

    switch (evt.type) {
      case 'showkeyboard':
        this.showKeyboard(activeWindow);
        break;
      case 'hidekeyboard':
      case 'appclose':
        this.hideKeyboard(activeWindow);
        break;
      case 'mousedown':
        var keyCode = parseInt(evt.target.getAttribute('data-keycode'));
        if (!keyCode)
          return;
        evt.target.dataset.active = 'true';
        break;
      case 'mouseup':
        var keyCode = parseInt(evt.target.getAttribute('data-keycode'));
        if (!keyCode)
          return;
        delete evt.target.dataset.active;
        break;
      case 'click':
        var keyCode = parseInt(evt.target.getAttribute('data-keycode'));
        if (!keyCode)
          return;

        if (keyCode == KeyboardManager.BASIC_LAYOUT) {
          this.layout = KeyboardAndroid.basicLayout;
          this.keyboard.innerHTML = this.getLayout(window.innerWidth);
          return;
        } else if (keyCode == KeyboardManager.ALTERNATE_LAYOUT) {
          this.layout = KeyboardAndroid.alternateLayout;
          this.keyboard.innerHTML = this.getLayout(window.innerWidth);
          return;
        }

        var contentWindow = activeWindow.contentWindow;
        window.navigator.mozKeyboard.sendKey(contentWindow, keyCode);
        break;
      case 'unload':
        this.uninit();
        break;
    }
  },
  getLayout: function km_getLayout(width) {
    var content = '';

    this.layout.forEach(function (row) {
      content += '<div class="keyboard-row">';

      row.forEach(function (key) {
        var code = key.keyCode || key.value.charCodeAt(0);
        var size = ((width - (row.length * 2)) / 10) * (key.ratio || 1) - 2;
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
  showKeyboard: function km_showKeyboard(targetWindow) {
    var oldHeight = targetWindow.style.height;
    targetWindow.dataset.height = oldHeight;

    var keyboard = this.keyboard;
    keyboard.innerHTML = this.getLayout(window.innerWidth);
    delete keyboard.dataset.hidden;

    var newHeight = targetWindow.getBoundingClientRect().height -
                    keyboard.getBoundingClientRect().height;
    targetWindow.style.height = newHeight + 'px';
  },
  hideKeyboard: function km_hideKeyboard(targetWindow) {
    targetWindow.style.height = targetWindow.dataset.height;
    delete targetWindow.dataset.height;

    var keyboard = this.keyboard;
    keyboard.dataset.hidden = 'true';
    keyboard.innerHTML = '';
  }
};

window.addEventListener('load', function initKeyboardManager(evt) {
  window.removeEventListener('load', initKeyboardManager);
  KeyboardManager.init();
});

