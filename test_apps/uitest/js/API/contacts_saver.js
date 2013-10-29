'use strict';

function ContactsSaver(data) {
  this.data = data;
  var next = 0;
  var self = this;

  this.start = function() {
    saveContact(data[0]);
  };

  function saveContact(cdata) {
    if (cdata.bday) {
      cdata.bday = new Date(cdata.bday);
    }
    if (cdata.anniversary) {
      cdata.anniversary = new Date(cdata.anniversary);
    }
    var contact = new mozContact(cdata);
    var req = navigator.mozContacts.save(contact);
    req.onsuccess = function(e) {
      if (typeof self.onsaved === 'function') {
        self.onsaved(next + 1);
      }
      continuee();
    };

    req.onerror = function(e) {
      if (typeof self.onerror === 'function') {
        self.onerror(self.data[next], e.target.error);
      }
    };
  }

  function continuee() {
    next++;
    if (next < self.data.length) {
      saveContact(self.data[next]);
    }
    else {
          // End has been reached
          if (typeof self.onsuccess === 'function') {
            self.onsuccess();
          }
    }
  }
}
