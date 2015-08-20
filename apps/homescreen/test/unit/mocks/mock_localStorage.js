/* exported mockLocalStorage */
'use strict';

var _rawContent = {};

var mockLocalStorage = {
  setItem: (key, val) => {
    _rawContent[key] = val;
  },
  getItem: key => {
    return _rawContent[key];
  },

  set mRawContent(val) {
    _rawContent = val;
  },
  get mRawContent() {
    return _rawContent;
  },
  mSetup: () => {
    _rawContent = {};
  }
};
