'use strict';

/* global Components, FileUtils, Services, XPCOMUtils:false, dump, quit */
/* exported run, require */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

const loaderURI = 'resource://gre/modules/commonjs/toolkit/loader.js';
const env = Cc['@mozilla.org/process/environment;1'].
            getService(Ci.nsIEnvironment);
let { Loader } = Cu.import(loaderURI, {});

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

const CONTRACT_ID = '@mozilla.org/xre/app-info;1';
let originalAppInfo = Cc[CONTRACT_ID].getService(Ci.nsIXULRuntime);

try {
  originalAppInfo.QueryInterface(Ci.nsIXULAppInfo);
} catch(e) {
  // Create a fake XULAppInfo to satisfy the eventual needs of the SDK.
  // (xpcshell doesn't implement nsIXULAppInfo interface)
  let XULAppInfo = {
    // nsIXUlAppInfo
    vendor: 'Mozilla',
    name: 'XPCShell',
    ID: 'xpcshell@tests.mozilla.org',
    version: '1',
    appBuildID: '2007010101',
    platformVersion: '1.0',
    platformBuildID: '2007010101',

    // nsIXUlRuntime (partial)
    inSafeMode: originalAppInfo.inSafeMode,
    logConsoleErrors: originalAppInfo.logConsoleErrors,
    OS: originalAppInfo.OS,
    XPCOMABI: originalAppInfo.XPCOMABI,
    invalidateCachesOnRestart:
      originalAppInfo.invalidateCachesOnRestart.bind(originalAppInfo),

    QueryInterface: function (aIID) {
      let interfaces = [Ci.nsIXULAppInfo, Ci.nsIXULRuntime];
      if (!interfaces.some(aIID.equals.bind(aIID))) {
        throw Cr.NS_ERROR_NO_INTERFACE;
      }
      return this;
    }
  };

  let registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
  let CID = Components.ID('7685dac8-3637-4660-a544-928c5ec0e714}');
  registrar.registerFactory(CID, 'XULAppInfo', CONTRACT_ID, {
    createInstance: function (aOuter, aIID) {
      if (aOuter != null) {
        throw Cr.NS_ERROR_NO_AGGREGATION;
      }
      return XULAppInfo.QueryInterface(aIID);
    },
    QueryInterface: XPCOMUtils.generateQI(Ci.nsIFactory)
  });
}

// This is a valid use of this
let xpcshellScope = this; // jshint ignore:line
let options;

try {
  options = JSON.parse(env.get('BUILD_CONFIG'));
} catch (e) {
  // parsing BUILD_CONFIG error or this env variable is not available.
  // we simply skip this exception here and detect BUILD_CONFIG
  // if it is undefined for |options.GAIA_APPDIRS.split(' ')| in
  // CommonjsRunner constructor.
}

var CommonjsRunner = function(module, appOptions) {
  if (appOptions) {
    appOptions = appOptions || '{}';
    try {
      if (typeof appOptions === 'string') {
        appOptions = JSON.parse(appOptions);
      } else {
        options = appOptions;
      }
    } catch (err) {
      dump('Unable to parse appOptions ' + err.message);
      throw err;
    }
  } else {
    appOptions = options;
  }
  const GAIA_DIR = env.get('GAIA_DIR') || appOptions.GAIA_DIR;
  const APP_DIR = (appOptions && appOptions.APP_DIR) || env.get('APP_DIR');
  let gaiaDirFile = new FileUtils.File(GAIA_DIR);
  let appBuildDirFile, appDirFile;

  if (APP_DIR) {
    appDirFile = new FileUtils.File(APP_DIR);
    appBuildDirFile = appDirFile.clone();
    appBuildDirFile.append('build');
  }

  let buildDirFile = gaiaDirFile.clone();
  buildDirFile.append('build');

  let paths = {
    'toolkit/': 'resource://gre/modules/commonjs/toolkit/',
    'sdk/': 'resource://gre/modules/commonjs/sdk/',
    '': Services.io.newFileURI(buildDirFile).spec
  };

  if (appBuildDirFile) {
    paths['app/'] = Services.io.newFileURI(appBuildDirFile).spec;
  }

  // generate a specific require path for each app starting with app folder
  // name, so that we can load each app 'build.js' module.
  if (options && options.GAIA_APPDIRS) {
    options.GAIA_APPDIRS.split(' ').forEach(function(appDir) {
      let appDirFile = new FileUtils.File(appDir);
      let appBuildDirFile = appDirFile.clone();
      appBuildDirFile.append('build');
      paths[appDirFile.leafName + '/'] =
        Services.io.newFileURI(appBuildDirFile).spec + '/';
    });
  }

  // we have to do this the convoluted way to avoid
  // problems where atob/btoa aren't defined
  let globals = {};
  if (typeof atob === 'function') {
    globals.atob = atob;
  }
  if (typeof btoa === 'function') {
    globals.btoa = btoa;
  }
  if (typeof quit === 'function') {
    globals.quit = quit;
  }

  let loader = Loader.Loader({
    paths: paths,
    modules: {
      'toolkit/loader': Loader,
      'xpcshell': Object.create(xpcshellScope)
    },
    globals: globals
  });

  this.require = Loader.Require(loader, Loader.Module('main', 'gaia://'));
  this.gaiaDirFile = gaiaDirFile;
  this.module = module;
  this.appDirFile = appDirFile;
};

CommonjsRunner.prototype.run = function() {
  var output = '';
  // Move this code here, to simplify the Makefile...
  try {
    // ...and to allow doing easily such thing \o/
    if (this.appDirFile) {
      var stageAppDir = this.gaiaDirFile.clone();
      let appPath = this.appDirFile.path;
      stageAppDir.append('build_stage');
      stageAppDir.append(this.appDirFile.leafName);
      options.STAGE_APP_DIR = stageAppDir.path;
      options.APP_DIR = appPath;
      output += this.appDirFile.leafName;
    }
    output += '/' + this.module;

    this.require(this.module).execute(options);

    // When an xpcshell module throws exception which is already captured by
    // JavaScript module, some exceptions will make xpcshell returns error code.
    // We put quit(0); to override the return code when all exceptions are
    // handled in JavaScript module.
    quit(0);
  } catch(e) {
    dump('Exception: ' + e + '\n' + e.stack + '\n');
    quit(1);
  }
};

function run(module, appOptions) {
  var runner = new CommonjsRunner(module, appOptions);
  runner.run();
}

function require(module, appOptions) {
  var runner = new CommonjsRunner(module, appOptions);
  return runner.require(module);
}
