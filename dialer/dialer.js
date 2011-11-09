
var kFontStep = 8;
var kMinFontSize = 24;
var kDefaultFontSize = 64;
var gTones = {
  '0': null, '1': null, '2': null, '3': null, '4': null,
  '5': null, '6': null, '7': null, '8': null, '9': null,
  '*': null, '#': null
};

var KeyHandler = {
  get phoneNumber() {
    delete this.phoneNumber;
    return this.phoneNumber = document.getElementById('phoneNumber');
  },

  get fakePhoneNumberView() {
    delete this.fakePhoneNumberView;
    return this.fakePhoneNumberView = document.getElementById('fakePhoneNumberView');
  },

  get phoneNumberView() {
    delete this.phoneNumberView;
    return this.phoneNumberView = document.getElementById('phoneNumberView');
  },

  init: function() {
    this.phoneNumber.value = '';
      for (var tone in gTones)
          gTones[tone] = document.getElementById('tone' + tone);
  },

  isContactShortcut: function (key) {
    // TODO implement key shortcuts
    return false;
  },

  formatPhoneNumber: function(phoneNumber) {
    // TODO implement formatting depending on locale
    return phoneNumber;
  },

  updateFontSize: function() {
    var self = this;
    function getNextFontSize(fontSize, text) {
      var div = self.fakePhoneNumberView;
      div.style.fontSize = fontSize + 'px';
      div.innerHTML = text;

      var windowWidth = document.body.clientWidth;
      var rect = div.getBoundingClientRect();
      if (rect.width > windowWidth) {
        fontSize = Math.max(fontSize - kFontStep, kMinFontSize);
      } else if (fontSize < kDefaultFontSize) {
        div.style.fontSize = (fontSize + kFontStep) + 'px';
        rect = div.getBoundingClientRect();
        if (rect.width <= windowWidth)
          fontSize += kFontStep;
      }

      return fontSize;
    }

    var view = this.phoneNumberView;
    var computedStyle = window.getComputedStyle(view, null);
    var fontSize = computedStyle.getPropertyValue('font-size');

    var text = this.formatPhoneNumber(this.phoneNumber.value);
    view.innerHTML = text;

    var newFontSize = text ? getNextFontSize(parseInt(fontSize), text)
                           : kDefaultFontSize;
    if (newFontSize != fontSize)
    view.style.fontSize = newFontSize + 'px';
  },

  keyDown: function(event) {
    var key = event.target.getAttribute('value'); 
    if (!key)
      return;

    var callback = function(self) {
      switch (key) {
        case '0':
          self.phoneNumber.value = self.phoneNumber.value.slice(0, -1) + '+';
          break;
        case 'del':
          self.phoneNumber.value = '';
          break;
        default:
          if (self.isContactShortcut(key))
            return;
          break;
      }
      self.updateFontSize();
    };

    if (key == 'del') {
      this.phoneNumber.value = KeyHandler.phoneNumber.value.slice(0, -1);
      this.updateFontSize();
    } else if (key == 'call') {
      try {
        window.navigator.mozPhone.call(this.phoneNumber.value);
      } catch (e) {
        console.log('Error while trying to call number: ' + e);
      }
    } else {
      this.phoneNumber.value += key;
      this.updateFontSize();
      gTones[key].play();
    }

    this._timeout = window.setTimeout(callback, 400, this);
  },

  keyUp: function(event) {
    clearTimeout(this._timeout);
  }
};

