
var kFontStep = 8;
var kMinFontSize = 24;
var kDefaultFontSize = 64;
var gTones = {
  '0': null, '1': null, '2': null, '3': null, '4': null,
  '5': null, '6': null, '7': null, '8': null, '9': null,
  '*': null, '#': null
};

function choiceChanged(evt) {
  var target = evt.target;
  if (!target.classList.contains('choice'))
    return;

  var view = document.getElementById(target.id + '-view');
  if (!view)
    return;

  var views = document.getElementById('views');
  var viewsCount = views.childElementCount;
  for (var i = 0; i < viewsCount; i++)
    views.children[i].setAttribute('hidden', 'true');

  view.removeAttribute('hidden');
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

    var mainKeys = [
      { title: '1', details: '' },
      { title: '2', details: 'abc' },
      { title: '3', details: 'def' },
      { title: '4', details: 'ghi' },
      { title: '5', details: 'jkl' },
      { title: '6', details: 'mno' },
      { title: '7', details: 'pqrs' },
      { title: '8', details: 'tuv' },
      { title: '9', details: 'wxyz' },
      { title: '\u2217', value: '*', details: '' },
      { title: '0', details: '+' },
      { title: '#', details: '' }
    ];

    var mainKey = document.getElementById('mainKeyset');
    var row = null;
    mainKeys.forEach(function(key, index) {
      if (index % 3 == 0) {
        row = document.createElement('div');
        row.className = 'keyboard-row';
        mainKey.appendChild(row);
      }
      
      var container = document.createElement('div');
      container.className = 'keyboard-key';
      container.setAttribute('data-value', 'value' in key ? key.value : key.title);

      var title = document.createElement('span');
      title.appendChild(document.createTextNode(key.title));
      container.appendChild(title);

      var details = document.createElement('span');
      details.appendChild(document.createTextNode(key.details));
      container.appendChild(details);
      row.appendChild(container);
    });
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
    var key = event.target.getAttribute('data-value'); 
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

Contacts = {
  get contactsView() {
    delete this.contactsView;
    return this.contacts = document.getElementById('contacts-view');
  },

  init: function contacts_init() {
    var contacts = window.navigator.mozContacts.contacts;
    var count = contacts.length;

    var fragment = '';
    for (var i = 0; i < count; i++) {
      var contact = contacts[i];
      var title = (contact.name || contact.tel);
      fragment += '<div class="contact">' +
                  '  <span class="contact-name">' + title + '</span>' +
                  '</div>';
    }
    this.contactsView.innerHTML = fragment;
  }
};

window.addEventListener('load', function keyboardInit(evt) {
  window.removeEventListener('load', keyboardInit);
  KeyHandler.init();
  Contacts.init();
});
