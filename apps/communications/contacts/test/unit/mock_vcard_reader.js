'use strict';

function MockVCardReader(textToParse) {
  this.text = textToParse;
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
