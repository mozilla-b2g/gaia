/* globals evt */

(function(exports) {
  'use strict';

  var MockXScrollable = function() {
    this.currentItem = document.createElement('button');
  };

  MockXScrollable.prototype = evt({
    m_items: [],
    m_colspan: 0,
    CLASS_NAME: 'XScrollable',
    addNode: function() {},
    resetScroll: function() {},
    clean: function() {},
    getNode: function(index) {
      return this.m_items[index];
    },
    setColspanOnFocus: function(colspan) {
      this.m_colspan = colspan;
    },
    focus: function() {}
  });

  exports.MockXScrollable = MockXScrollable;
}(window));
