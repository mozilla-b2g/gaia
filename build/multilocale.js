'use strict';

/* global exports, require, dump, OS */

const { Cu } = require('chrome');
Cu.import('resource://gre/modules/osfile.jsm');

const utils = require('utils');
const RE_SECTION_LINE = /\[(.*)\]/;
const RE_IMPORT_LINE = /@import url\((.*)\)/;
const RE_PROPERTY_LINE = /(.*)\s*[:=]\s*(.*)/;
const RE_MANIFEST_FILE = /locales[\/\\].+\.manifest$/;
const RE_PROPERTIES_FILE = /\.([\w-]+)\.properties$/;
const MODNAME = 'multilocale';

function L10nManager(gaiaDir, localesFilePath, localeBasedir, defaultLocale) {
  function checkArg(arg) {
    return Boolean(arg);
  }
  if (arguments.length !== 4 &&
    !Array.prototype.every.call(arguments, checkArg)) {
    throw new TypeError('Illegal constructor');
  }

  var self = this;
  var localesFile = utils.resolve(localesFilePath, gaiaDir);
  var baseDir = utils.resolve(localeBasedir, gaiaDir);

  [utils.getFile(gaiaDir), localesFile, baseDir]
  .forEach(function(file) {
    if (!file.exists()) {
      throw new Error('file not found: ' + file.path);
    }
  });

  [this.locales, this.localeBasedir, this.gaiaDir] =
    [Object.keys(utils.getJSON(localesFile)), baseDir.path, gaiaDir];


  function localizeL10nManifest(manifestFile, webapp) {
    var localesClone = JSON.parse(JSON.stringify(self.locales));

    var origin = utils.getFileContent(manifestFile);
    var json = JSON.parse(origin);

    // XXX: This should happen even without LOCALE_BASEDIR
    json.default_language = defaultLocale;
    json.languages = localesClone;
    
    var newManifest = JSON.stringify(json);

    utils.writeContent(manifestFile, newManifest);
  }

  /**
   * Remove locale files that aren't explicitely listed in locales file.
   */
  function cleanLocaleFiles(stageDir) {
    utils.ls(stageDir, true).forEach(function(file) {
      var matched = RE_PROPERTIES_FILE.exec(file.leafName);
      if (matched && self.locales.indexOf(matched[1]) === -1) {
        file.remove(false);
      }
    });
  }

  /**
   * localize all manifest, INI file and copy properties files.
   *
   * @param {nsIFile[]} files        - all files in webapp source tree
   * @param {Object} webapp          - A webapp object for specific app
   */
  function localize(files, webapp) {
    // Using manifest.properties to localize manifest.webapp
    var manifest = localizeManifest(webapp);
    utils.writeContent(webapp.buildManifestFile, JSON.stringify(manifest));

    // Localize ini files and copy properties files into build_stage directory
    files.filter(function(file) {
      return RE_MANIFEST_FILE.test(file.path);
    }).forEach(function(manifestFile) {
      localizeL10nManifest(manifestFile, webapp);
    });

    cleanLocaleFiles(webapp.buildDirectoryFile);
    var localeObjDir = webapp.buildDirectoryFile.clone();
    localeObjDir.append('locales-obj');
    if (localeObjDir.exists()) {
      localeObjDir.remove(true);
    }
  }

  /**
   * given a webapp object to return a localized manifest file.
   *
   * @param  {Object} webapp - A webapp object for specific app
   * @returns {Object} return a JSON object.
   */
  function localizeManifest(webapp) {
    var localesProps = [];
    var localesForManifest = self.locales.filter(function(locale) {
      var parent = webapp.sourceDirectoryFile.parent.leafName;
      var propFile = utils.getFile(self.localeBasedir, locale, parent,
        webapp.sourceDirectoryName, 'manifest.properties');
      if (!propFile.exists() ) {
        // we don't show warning message if it isn't in "apps" directory.
        if (locale !== 'en-US' && parent === 'apps') {
          utils.log(MODNAME, 'App "' + webapp.sourceDirectoryName +
            '" doesn\'t have app manifest localization. A .properties file is' +
            ' missing at following path: ' + propFile.path);
        }
        return false;
      }
      var content = utils.getFileContent(propFile);
      localesProps.push(parseManifestProperties(content));
      return true;
    });

    var manifestFile = webapp.buildManifestFile;
    if (!manifestFile || !manifestFile.exists()) {
      throw new Error('Missing webapp manifest for multilocale: ' +
        manifestFile.path);
    }

    var manifest = addLocaleManifest(localesForManifest, localesProps,
      utils.getJSON(manifestFile));
    return manifest;
  }

  /**
   * Add additional languages into manifest.webapp
   * @param {String[]} locales
   * @param {Object} localesProps - Array of properties from *.properties files
   * @param {Object} original     - original manifest object
   */
  function addLocaleManifest(locales, localesProps, original) {
    var manifest = JSON.parse(JSON.stringify(original));
    var isEntryPointsTranslated = true;
    locales.forEach(function(locale, index) {
      if (manifest.entry_points) {
        // localization for entry_points in manifest.
        for (var name in manifest.entry_points) {
          var ep = manifest.entry_points[name];
          if (!ep.locales) {
            utils.log(MODNAME, 'locales field doesn\'t exist in entry point "' +
              name  + '" in ' + manifest.name + ' manifest file.');
            isEntryPointsTranslated = false;
            continue;
          }
          if (!localesProps[index].entry_points[name]) {
            utils.log(MODNAME, 'Translation of ' + locale + ' is not ' +
              'available for entry point "' + name + '" in ' + manifest.name +
              ' manifest file.');
            isEntryPointsTranslated = false;
            continue;
          }
          ep.locales[locale] = localesProps[index].entry_points[name];
        }
      }
      if (manifest.locales) {
        manifest.locales[locale] = localesProps[index].default;
      } else if (!isEntryPointsTranslated) {
        utils.log(MODNAME, 'locales field doesn\'t exist in ' + manifest.name +
          ' manifest file.');
      }
    });
    return manifest;
  }

  /**
   * parsing a properties file for manifest localization to an object.
   *
   * @param  {String} content - content of properties file.
   * @returns {Object} object - an object with "default" and "entry_points"
   *                            fields, Special keys with one dot, like
   *                            "dialer.name = Foo" will be store in entrypoints
   *                            as "dialer" attribute refering to the object
   *                            {"name": "foo"}. And all other regular keys are
   *                            returned as a dictionary in default attribute.
   */
  function parseManifestProperties(content) {
    var prop = {
      'default': {},
      'entry_points': {}
    };
    content.split('\n').forEach(function(line) {
      var matched = line.match(RE_PROPERTY_LINE);
      if (!matched || line.trim().startsWith('#')) {
        return;
      }
      var value = matched[2].trim();
      var parts = matched[1].split('.');
      var entryPoint, key;
      // if we got a key with "." such as dialer.name, create an new
      // entry_point for it.
      if (parts.length === 2) {
        [entryPoint, key] = parts;
        if (!prop.entry_points[entryPoint]) {
          prop.entry_points[entryPoint] = {};
        }
        prop.entry_points[entryPoint][key.trim()] = value;
      } else if (parts.length > 2) {
        throw new Error('More than one dot in an entry: ' + line);
      } else {
        key = matched[1];
        prop['default'][key.trim()] = value;
      }
    });
    return prop;
  }


  this.localize = localize;
  this.localizeManifest = localizeManifest;
}

function execute(options) {
  if (!options.LOCALE_BASEDIR) {
    utils.log('multilocale', 'multilocale command requires LOCALES_BASEDIR ' +
      'to be set');
    return;
  }
  var gaia = utils.gaia.getInstance(options);

  // Bug 952901: remove getLocaleBasedir() if bug 952900 fixed.
  var localeBasedir = utils.getLocaleBasedir(options.LOCALE_BASEDIR);
  var l10nManager = new L10nManager(
    options.GAIA_DIR,
    options.LOCALES_FILE,
    options.GAIA_DEFAULT_LOCALE,
    localeBasedir);

  gaia.webapps.forEach(function(webapp) {
    if (options.BUILD_APP_NAME != '*' &&
      webapp.sourceDirectoryName != options.BUILD_APP_NAME)
      return;

    if (utils.isExternalApp(webapp)) {
      return;
    }
    var files = utils.ls(webapp.buildDirectoryFile, true);
    l10nManager.localize(files, webapp);
  });
}

exports.execute = execute;
exports.L10nManager = L10nManager;
