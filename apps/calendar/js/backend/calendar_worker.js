'use strict';
importScripts('../ext/alameda.js');

require.config({
  baseUrl: '/js/backend',
  paths: {
    common: '/js/common',
    ext: '/js/ext'
  }
});

require(['calendar_service'], service => service.start());
