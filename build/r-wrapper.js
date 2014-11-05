'use strict';

/* global exports, require, Services, dump, Components */

const utils = require('utils');
const { Cu } = require('chrome');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/reflect.jsm');

exports.get = function(gaiaDir) {
  var rjs = utils.getFile(gaiaDir);
  rjs.append('build');
  rjs.append('r.js');
  var ruri = Services.io.newFileURI(rjs).spec;

  var global = Cu.Sandbox(Services.scriptSecurityManager.getSystemPrincipal());
  global.print = function() {
    dump(Array.prototype.join.call(arguments, ' ') + '\n');
  };
  global.arguments = [];
  global.requirejsAsLib = true;
  // XXX: Dark matter. Reflect.jsm introduces slowness by instanciating Reflect
  // API in Reflect.jsm scope (call JS_InitReflect on jsm global). For some
  // reasons, most likely wrappers, Reflect API usages from another
  // compartments/global ends up being slower...
  Cu.evalInSandbox('new ' + function sandboxScope() {
    var init = Components.classes['@mozilla.org/jsreflect;1'].createInstance();
    init();
  }, global);

  Services.scriptloader.loadSubScript(ruri, global);
  return global.requirejs;
};
