'use strict';
/* global APP_BUILD_DIR */
/* global GAIA_BUILD_DIR */
/* exported require */

const loaderURI = 'resource://gre/modules/commonjs/toolkit/loader.js';

var { Loader } = Components.utils.import(loaderURI, {});

var paths = {
  'toolkit/': 'resource://gre/modules/commonjs/toolkit/',
  'sdk/': 'resource://gre/modules/commonjs/sdk/',
  '': GAIA_BUILD_DIR
};

if (typeof APP_BUILD_DIR !== 'undefined') {
  paths['app/'] = APP_BUILD_DIR;
}

var loader = Loader.Loader({
  paths: paths,
  modules: {
    'toolkit/loader': Loader
  }
});

var module = Loader.Module('main', 'gaia://');
var require = Loader.Require(loader, module);
