'use strict';

function MockFileReader() {}

MockFileReader.prototype.readAsDataURL = function readAsText(file) {
  if (this.onloadend) {
    this.result = file;
    this.onloadend();
  }
};

window.MockFileReader = MockFileReader;

