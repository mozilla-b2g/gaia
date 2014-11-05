'use strict';

var TransitionUtils = {
  fadeOut: function(elem, done) {
    setTimeout(function() {
      elem.classList.add('faded');
      if (done) {
        Utils.runEventOnce(elem, 'transitionend', function() {
          elem.classList.add('hidden');
            done();
        });
      }
    }, 20);
  },
  fadeIn: function(elem, done) {
    elem.classList.remove('hidden');
    elem.classList.add('faded');
    setTimeout(function() {
      elem.classList.remove('faded');
      if (done) {
        Utils.runEventOnce(elem, 'transitionend', function() {
            done();
        });
      }
    }, 20);
  }
};
