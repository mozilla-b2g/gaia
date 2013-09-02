'use strict';

function MockFileReader() {}

MockFileReader.prototype.readAsText = function readAsText(file) {
  if (this.onloadend) {
    this.result = file;
    this.onloadend();
  }
};
