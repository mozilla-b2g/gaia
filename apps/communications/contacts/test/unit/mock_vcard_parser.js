'use strict';

function MockVcardParser(textToParse) {
  this.text = textToParse;
}

MockVcardParser.prototype.process = function process(cb) {
  cb();
};

function MockVCFReader(textToParse) {
  this.text = textToParse;
}

MockVCFReader.prototype.process = function process(cb) {
  cb();
};
