'use strict';

function execute(options) {
  require('./clean-stage-app').execute(options);

  require('./svoperapps').execute(options);

  require('./webapp-manifests').execute(options);

  require('./contacts-import-services').execute(options);

  require('./search-provider').execute(options);

  require('./keyboard-layouts').execute(options);

  require('./preferences').execute(options);

  if (options.BUILD_APP_NAME == '*') {
    require('./settings').execute(options);
  }

  require('./webapp-shared').execute(options);

  require('./copy-common-files').execute(options);
}

exports.execute = execute;
