'use strict';

var MockLazyLoader = {
  load: function(scripts, cb) {
    cb();
  }
};
