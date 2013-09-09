const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const CC = Components.Constructor;
const loaderURI = 'resource://gre/modules/commonjs/toolkit/loader.js';

var { Loader } = Components.utils.import(loaderURI, {});
var loader = Loader.Loader({
  paths: {
    'toolkit/': 'resource://gre/modules/commonjs/toolkit/',
    'sdk/': 'resource://gre/modules/commonjs/sdk/',
    '': GAIA_BUILD_DIR
  },
  modules: {
    'toolkit/loader': Loader
  }
});

var module = Loader.Module('main', 'gaia://');
var require = Loader.Require(loader, module);
