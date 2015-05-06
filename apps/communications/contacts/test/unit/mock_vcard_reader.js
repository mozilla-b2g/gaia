'use strict';

/**
 * Returns a mock vCardReader which works with either a string representing a
 * vCard file or an array of mozContacts. This mock doesn't takes into account
 * the content of the contacts, just the quantity of them.
 *
 * @param data - String representing vCard or array of mozContacts.
 * @constructor
 */
function MockVCardReader(data) {
  if (Array.isArray(data)) {
    this.contacts = data;
  } else {
    this.text = data;
  }
}

MockVCardReader.prototype.process = function process(cb) {
  cb();
};

MockVCardReader.prototype.getAll = function() {
  var count = 0;

  if (this.text && this.text.length) {
    var match = this.text.match(/END:VCARD/g);
    if (match) {
      count = match.length;
    }
  }

  if (this.contacts && this.contacts.length) {
    count = this.contacts.length;
  }

  function Cursor() {
    var self = this;
    var i = 0;

    this._doRead = function() {
      i++;
      if (i <= count) {
        self.result = { id: 0 };
      } else {
        self.result = null;
      }
      self.callback({ target: self });
    };

    Object.defineProperty(this, 'onsuccess', {
      set: function(cb) {
        self.callback = cb;
        self._doRead();
      }
    });

    this.continue = function() {
      if (self.result) {
        self._doRead();
      }
    };
  }

  return new Cursor();
};
