'use strict';

(function(exports) {
  var MockBaseIcon = function(name) {
    if (name) {
      this.name = name;
    }
    this.element = document.createElement('div');
    var pureName = this.name.replace(/Icon$/, '');
    this.dashPureName = this.camelToDash(pureName);
  };
  MockBaseIcon.prototype = {
    element: null,
    name: 'MockBaseIcon',
    show: function() {},
    hide: function() {},
    isVisible: function() {},
    setOrder: function() {}
  };

  MockBaseIcon.prototype.camelToDash = function(strings) {
    var i = 0;
    var ch = '';
    while (i <= strings.length) {
      var character = strings.charAt(i);
      if (character !== character.toLowerCase()) {
        if (ch === '') {
          ch += character.toLowerCase();
        } else {
          ch += '-' + character.toLowerCase();
        }
      } else {
        ch += character;
      }
      i++;
    }
    return ch;
  };
  exports.MockBaseIcon = MockBaseIcon;
}(window));
