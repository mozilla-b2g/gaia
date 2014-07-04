'use strict';

/* global Components, FileUtils, Services, dump, quit */
/* exported run, require */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const loaderURI = 'resource://gre/modules/commonjs/toolkit/loader.js';
const env = Cc['@mozilla.org/process/environment;1'].
            getService(Ci.nsIEnvironment);
let { Loader } = Cu.import(loaderURI, {});

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');

var CommonjsRunner = function(module) {
  const GAIA_DIR = env.get('GAIA_DIR');
  const APP_DIR = env.get('APP_DIR');

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
    '': Services.io.newFileURI(buildDirFile).asciiSpec
  };

  if (appBuildDirFile) {
    paths['app/'] = Services.io.newFileURI(appBuildDirFile).asciiSpec;
  }

  let loader = Loader.Loader({
    paths: paths,
    modules: {
      'toolkit/loader': Loader
    }
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
    let options = JSON.parse(env.get('BUILD_CONFIG'));
    // ...and to allow doing easily such thing \o/
    if (this.appDirFile) {
      var stageAppDir = this.gaiaDirFile.clone();
      stageAppDir.append('build_stage');
      stageAppDir.append(this.appDirFile.leafName);
      options.STAGE_APP_DIR = stageAppDir.path;
      options.APP_DIR = this.appDirFile.path;
      output += this.appDirFile.leafName;
    }
    output += '/' + this.module;
    dump('run-js-command ' + output + '\n');

    this.require(this.module).execute(options);

    // When an xpcshell module throws exception which is already captured by
    // JavaScript module, some exceptions will make xpcshell returns error code.
    // We put quit(0); to override the return code when all exceptions are
    // handled in JavaScript module.
    quit(0);
  } catch(e) {
    dump('Exception: ' + e + '\n' + e.stack + '\n');
    throw(e);
  }
};

function run(module) {
  var runner = new CommonjsRunner(module);
  runner.run();
}

function require(module) {
  var runner = new CommonjsRunner(module);
  return runner.require(module);
}
