'use strict';

function MockVcardParser(textToParse) {
  this.text = textToParse;
}

MockVcardParser.prototype.process = function process(cb) {
  cb();
};

function MockVCFReader(textToParse) {
  var f = 0;
  this.text = textToParse;
}

MockVCFReader.prototype.process = function process(cb) {
  var importedContacts = [];
  if (this.onerror && this.text == 'error') {
    this.onerror({ message: 'error importing'});
  } else {
    var count = this.text.match(/END:VCARD/g).length;
    if (this.onimported) {
      for (var i = 0; i < count; i++) {
        this.onimported();
        importedContacts.push({id: (i + 1)});
      }
      if (this.onread) {
        this.onread(count);
      }
    }
  }
  cb(importedContacts);
};
