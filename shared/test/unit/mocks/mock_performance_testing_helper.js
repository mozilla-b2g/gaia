'use strict';
/* exported MockPerformanceTestingHelper */

var MockPerformanceTestingHelper = {
  el: document.createElement('div'),
  dispatch: function(name) {
    this.el.dispatchEvent(new CustomEvent(name));
  }
};
