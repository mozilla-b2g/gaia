'use strict';

var raptor = require('raptor');

var options = {
  phase: 'restart-b2g',
  runs: 1,
  timeout: 300 * 1000
};

raptor(options, function(runner) {

  runner.on('run', function(next) {
    next();
  });

});
