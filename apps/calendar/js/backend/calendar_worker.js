'use strict';

require.config({
  paths: {
    common: '../common',
    models: '../common/models',
    ext: '../ext'
  }
});

require(['calendar_service'], service => service.start());
