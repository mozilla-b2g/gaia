'use strict';

var raptor = require('raptor');

var options = {
  phase: 'reboot',
  runs: 1
};

raptor(options, function(runner) {

  runner.on('run', function(next) {
    next();
  });

});
