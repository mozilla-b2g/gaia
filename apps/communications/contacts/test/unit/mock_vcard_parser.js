'use strict';

function MockVcardParser(textToParse) {
  this.text = textToParse;
}

MockVcardParser.prototype.process = function process(cb) {
  cb();
};
