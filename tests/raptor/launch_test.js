'use strict';

var raptor = require('raptor');

var options = {
  phase: 'cold',
  runs: 1,
  apps: []
};

raptor(options, function(runner) {

  runner.on('run', function(next) {
    runner.closeApp().then(next);
  });

});
