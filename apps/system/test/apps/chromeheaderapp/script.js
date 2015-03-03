'use strict';

var testApp = {
  init: function() {
    Array.from(document.querySelectorAll('button'))
    .forEach(function(btn) {
      btn.addEventListener('click', testApp);
    });
  },
  handleEvent: function(evt) {
    switch (evt.target.id) {
      case 'popup-button':
        window.open('/popup.html', '', 'dialog');
        break;
    }
  }
};

testApp.init();
