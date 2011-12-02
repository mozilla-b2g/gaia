
const IMEManager = {
  BASIC_LAYOUT: -1,
  ALTERNATE_LAYOUT: -2,

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

    this.layout = KeyboardAndroid.basicLayout;
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
        break;
      case 'touchend':
        var keyCode = parseInt(evt.target.getAttribute('data-keycode'));
        if (!keyCode)
          return;
        delete evt.target.dataset.active;
        break;
      case 'click':
        var keyCode = parseInt(evt.target.getAttribute('data-keycode'));
        if (!keyCode)
          return;

        if (keyCode == IMEManager.BASIC_LAYOUT) {
          this.layout = KeyboardAndroid.basicLayout;
          this.ime.innerHTML = this.getLayout(window.innerWidth);
          return;
        } else if (keyCode == IMEManager.ALTERNATE_LAYOUT) {
          this.layout = KeyboardAndroid.alternateLayout;
          this.ime.innerHTML = this.getLayout(window.innerWidth);
          return;
        }

        window.navigator.mozKeyboard.sendKey(keyCode);
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

