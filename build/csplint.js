/**
 * Check content for CSP violation
 */
/*global require, exports*/
'use strict';

const utils = require('./utils');

const { Cc, Ci, Cr, Cu } = require('chrome');

Cu.import('resource://gre/modules/Services.jsm');

function debug(msg) {
  dump('-*- csplint.js: ' + msg + '\n');
}

const domParser = Cc['@mozilla.org/xmlextras/domparser;1']
                    .createInstance(Ci.nsIDOMParser);

const xfailFilePath = 'build/csplint/xfail.list';

const fakeApp = {
  title: "Certified app",
  manifest: "app://system.gaiamobile.org/manifest.webapp",
  appStatus: Ci.nsIPrincipal.APP_STATUS_CERTIFIED,
  origin: "app://system.gaiamobile.org/"
};

function execute(config) {
  let retval = 0;
  let gaia = utils.gaia.getInstance(config);
  gaia.webapps.forEach(function(webapp) {
    if (webapp.sourceDirectoryFile.parent.leafName != 'apps') {
      return;
    }

    if (config.BUILD_APP_NAME != '*' &&
      webapp.sourceDirectoryName != config.BUILD_APP_NAME) {
      return;
    }

    let files = [];
    utils.ls(webapp.sourceDirectoryFile, true, /^(docs)$/).forEach(function(file) {
      files.push(file.path);
    });
    retval += CSPLintFiles(config.GAIA_DIR, files);
  });
  return retval;
}

// files is an array of file paths
let CSPLintFiles = function(root, files) {
  let retval = 0;
  let xfail = utils.getFileContent(utils.getFile(root, xfailFilePath)).split('\n');
  files.forEach(function checkCSPFor(file) {
    let filerv = 0;
    let relpath = file.replace(root + "/", "");
    if (xfail.indexOf(relpath) > -1) {
      return;
    }
    let fileObj = utils.getFile(file);
    filerv = new CSPLint(fileObj).retval;
    retval += filerv;
  });
  return retval;
};

let CSPLint = function(file) {
  this._retval = 0;
  this.setup();
  this.sets = {
    events: [],
    attributes: []
  };

  [ 'onclick', 'ondblclick', 'onmousedown', 'onmousemove',
    'onmouseover', 'onmouseout', 'onmouseup', 'onkeydown',
    'onkeypress', 'onkeyup', 'onabort', 'onerror', 'onload',
    'onresize', 'onscroll', 'onunload', 'onblur', 'onchange',
    'onfocus', 'onreset', 'onselect', 'onsubmit', 'ondragdrop',
    'onmove' ].forEach((function(evt) {
    this.sets.events.push({name: evt, regex: new RegExp(evt + "\s*=")});
  }).bind(this));

  ['style'].forEach((function(attr) {
    this.sets.attributes.push({name: attr, regex: new RegExp(attr + "\s*=")})
  }).bind(this));

  if (file) {
    this.checkFile(file);
  }
};

CSPLint.prototype = {

  mapping: [
    [ /\.html$/, 'checkHtmlFile' ],
    [ /\.js$/, 'checkJsFile' ],
  ],

  set retval(value) {
    this._retval = typeof value === 'number' ? value : 0;
  },

  get retval() {
    return this._retval;
  },

  setup: function() {
    this.setupObservers();
    this.setupPrefs();
  },

  setupObservers: function() {
    Services.obs.addObserver(this, 'csp-on-violate-policy', false);
  },

  setupPrefs: function() {
    Services.prefs.setIntPref('media.preload.default', 2);
    Services.prefs.setBoolPref('security.csp.debug', true);
    Services.prefs.setBoolPref('security.csp.speccompliant', true);
    Services.prefs.setCharPref('security.apps.certified.CSP.default', "default-src *; script-src 'self'; object-src 'none'; style-src 'self'");
  },

  observe: function(subject, topic, data) {
    debug("Observe: " + topic);
  },

  getContent: function(file) {
    return utils.getFileContent(file);
  },

  analyzeContent: function(file, set) {
    let content = this.getContent(file);
    let lineNr = 1;
    let errors = {};
    content.split('\n').forEach((function(line) {
      this.sets[set].forEach(function(element) {
        let matches = line.match(element.regex);
        if (matches) {
          if (!(element.name in errors)) {
            errors[element.name] = [];
          }
          errors[element.name].push({file: file, line: lineNr});
        }
      });
      lineNr++;
    }).bind(this));
    return errors;
  },

  dumpResults: function(results) {
    for (let key in results) {
      for (let element in results[key]) {
        let e = results[key][element];
        debug(key + " @ " + e.file.path + ":" + e.line);
      }
    }
  },

  importCheckConsole: function(filename) {
    // Clear any possible leftovers in the console.
    Services.console.reset();
    let document = domParser.parseFromString('<html><body id="main"></body></html>', 'text/html');
    let cspframe = document.createElement('iframe');
    cspframe.setAttribute('mozapp', fakeApp);
    cspframe.setAttribute('mozbrowser', "true");
    cspframe.innerHTML = '<html><body><a href="//url" style="background: black;" onclick="function() {};">link</a></body></html>';
    document.getElementById('main').appendChild(cspframe);
    let messages = Services.console.getMessageArray();
    return messages;
  },

  checkContent: function(file) {
    let errEvents = this.analyzeContent(file, 'events');
    let errAttrs = this.analyzeContent(file, 'attributes');
    this.dumpResults(errEvents);
    this.dumpResults(errAttrs);
    return (Object.keys(errEvents).length + Object.keys(errAttrs).length);
  },

  checkFile: function(file) {
    this.mapping.forEach((function(entry) {
       let ext = entry[0];
       let fun = entry[1];
       if (ext.test(file.leafName)) {
         this._retval += this[fun](file);
	 return;
       }
    }).bind(this));
  },
  
  checkHtmlFile: function(file) {
    let messages = this.importCheckConsole(file.path);
    messages.forEach(function(message) {
      debug(message);
    });
    return this.checkContent(file);
  },

  checkJsFile: function(file) {
    return this.checkContent(file);
  }
}

exports.execute = execute;
exports.CSPLint = CSPLint;
exports.CSPLintFiles = CSPLintFiles;
