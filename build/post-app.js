'use strict';

exports.execute = function(options) {
  require('./media-resolution').execute(options);

  require('./post-manifest').execute(options);

  require('./multilocale').execute(options);

  require('./copy-build-stage-data').execute(options);

  if (options.RAPTOR_TRANSFORM === '1') {
    require('./raptor-test-transformer').execute(options);
  }

  require('./webapp-optimize').execute(options).then(function() {
    if (options.DEBUG === '0') {
      require('./webapp-zip').execute(options);
    }
  });
};
