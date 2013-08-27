const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const CC = Components.Constructor;

const systemPrincipal = CC('@mozilla.org/systemprincipal;1', 'nsIPrincipal')();

function loadSandbox(uri) {
  let proto = {
    sandboxPrototype: {
      loadSandbox: loadSandbox,
      ChromeWorker: ChromeWorker
    }
  };
  let sandbox = Cu.Sandbox(systemPrincipal, proto);
  // Create a fake commonjs environnement just to enable loading loader.js
  // correctly
  sandbox.exports = {};
  sandbox.module = { uri: uri, exports: sandbox.exports };
  sandbox.require = function(id) {
    if (id !== 'chrome')
      throw new Error('Bootstrap sandbox `require` method isn\'t implemented.');

    return Object.freeze({ Cc: Cc, Ci: Ci, Cu: Cu, Cr: Cr, Cm: Cm,
      CC: bind(CC, Components), components: Components,
      ChromeWorker: ChromeWorker });
  };
  scriptLoader.loadSubScript(uri, sandbox, 'UTF-8');
  return sandbox;
}

const scriptLoader = Cc['@mozilla.org/moz/jssubscript-loader;1'].
                     getService(Ci.mozIJSSubScriptLoader);
const loaderURI = 'resource://gre/modules/commonjs/toolkit/loader.js';
const loaderSandbox = loadSandbox(loaderURI);
const loaderModule = loaderSandbox.exports;

var { Loader } = Components.utils.import(loaderURI, {});
var loader = Loader.Loader({
  paths: {
    'toolkit/': 'resource://gre/modules/commonjs/toolkit/',
    'sdk/': 'resource://gre/modules/commonjs/sdk/',
    '': GAIA_BUILD_DIR
  },
  modules: {
    'toolkit/loader': loaderModule
  },
  resolve: function(id, base) {
    if (id == 'chrome' || id.startsWith('@')) {
      return id;
    }
    return Loader.resolve(id, base);
  }
});

var module = Loader.Module('main', 'gaia://');
var require = Loader.Require(loader, module);
