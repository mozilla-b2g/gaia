'use strict';

document.addEventListener('mozvisibilitychange', function visibility(e) {
  var url = document.location.href;
  var data = e.data;
  var params = (function makeURL() {
    var a = document.createElement('a');
    a.href = url;

    var rv = {};
    var params = a.search.substring(1, a.search.length).split('&');
    for (var i = 0; i < params.length; i++) {
      var data = params[i].split('=');
      rv[data[0]] = data[1];
    }
    return rv;
  })();

  if (!document.mozHidden) {
    Recents.startUpdatingDates();

    var choice = params['choice'];
    var contacts = document.getElementById('contacts-label');
    if (choice == 'contact' || contacts.hasAttribute('data-active')) {
      Contacts.load();
      choiceChanged(contacts);
    }
  } else {
    Recents.stopUpdatingDates();
  }
});

function choiceChanged(target) {
  var choice = target.dataset.choice;
  if (!choice)
    return;

  if (choice == 'contacts') {
    Contacts.load();
  }

  var view = document.getElementById(choice + '-view');
  if (!view)
    return;

  var tabs = document.getElementById('tabs').querySelector('fieldset');
  var tabsCount = tabs.childElementCount;
  for (var i = 0; i < tabsCount; i++) {
    var tab = tabs.children[i];
    delete tab.dataset.active;

    var tabView = document.getElementById(tab.dataset.choice + '-view');
    if (tabView)
      tabView.hidden = true;
  }

  target.dataset.active = true;
  view.hidden = false;
}

var CallHandler = {
  _onCall: false,
  _screenLock: null,

  // callbacks
  call: function ch_call(number) {
    var host = document.location.host;
    window.open('http://' + host + '/oncall.html#calling',
                'dialer_calling', 'attention');

    var sanitizedNumber = number.replace(/-/g, '');

    var telephony = window.navigator.mozTelephony;
    if (telephony) {
      telephony.dial(sanitizedNumber);
    }
  },

  // properties / methods
  get numberView() {
    delete this.numberView;
    return this.numberView = document.getElementById('call-number-view');
  }
};

window.addEventListener('localized', function startup(evt) {
  window.removeEventListener('localized', startup);

  KeyHandler.init();

  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  var html = document.querySelector('html');
  var lang = document.mozL10n.language;
  html.lang = lang.code;
  html.dir = lang.direction;

  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
});
