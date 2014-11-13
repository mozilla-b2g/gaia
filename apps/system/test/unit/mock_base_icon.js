'use strict';

(function(exports) {
  var MockBaseIcon = function(name) {
    if (name) {
      this.name = name;
    }
    this.element = document.createElement('div');
  };
  MockBaseIcon.prototype = {
    element: null,
    name: 'MockBaseIcon',
    show: function() {},
    hide: function() {},
    isVisible: function() {}
  };
  exports.MockBaseIcon = MockBaseIcon;
}(window));
