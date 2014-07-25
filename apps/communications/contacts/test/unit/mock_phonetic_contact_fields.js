'use strict';
/* exported MockPhonetic */

var MockPhonetic = {
  setJapaneseLang: function(flag) {
    this.lang = flag;
  },
  isJapaneseLang: function() {
    return this.lang;
  },
  isCJK: function() {}
};
