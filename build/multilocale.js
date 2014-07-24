'use strict';

/* global exports, require, dump, OS */

const { Cu } = require('chrome');
Cu.import('resource://gre/modules/osfile.jsm');

const utils = require('utils');
const RE_SECTION_LINE = /\[(.*)\]/;
const RE_IMPORT_LINE = /@import url\((.*)\)/;
const RE_PROPERTY_LINE = /(.*)\s*[:=]\s*(.*)/;
const RE_INI_FILE = /locales[\/\\].+\.ini$/;
const RE_PROPERTIES_FILE = /\.([\w-]+)\.properties$/;
const MODNAME = 'multilocale';

function L10nManager(gaiaDir, localesFilePath, localeBasedir, official) {
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

  [this.locales, this.localeBasedir, this.gaiaDir, this.official] =
    [Object.keys(utils.getJSON(localesFile)), baseDir.path, gaiaDir, official];


  /**
   * Modify original locales.ini file by keeping default 'en-US' .properties,
   * and duplicating them for each locale specified in locales.
   * We just replace "en-US" in .properties file path with the locale name.
   *
   * @param  {String} original - original content of INI file.
   * @param  {String[]} locales - locale names such as ['zh-TW', 'en-US']
   * @returns {String} returns a localized ini object
   */
  function modifyLocaleIni(original, locales) {
    var imports = {
      'default': parseIni(original)['default']
    };
    locales.forEach(function(locale) {
      imports[locale] = [];
      imports['default'].forEach(function(path) {
        if (!path.contains('en-US')) {
          throw new Error('"en-US" doesn\'t exist in path: ' + path);
        }
        var localePath = path.replace('en-US', locale);
        imports[locale].push(localePath);
      });
    });
    return imports;
  }

  /**
   * parsing a ini file for localization to an object.
   *
   * @param {String}      content           - content of .ini properties file
   * @returns {Object}    iniObject         - localization information from the
   *                                          ini file
   * @property {String[]} iniObject.default - properties files for default
   *                                          language
   * @property {String[]} iniObject[lang]   - properties files for other
   *                                          languages.
   */
  function parseIni(content) {
    // the first key/value which is not in any section will be the
    // default localization
    var section = 'default';
    var ini = { 'default': [] };
    content.split('\n').forEach(function(line) {
      if (line.trim() === '' || line.startsWith('!') ||
        line.startsWith('#')) {
        return;
      } else if (line.trim().startsWith('[')) {
        // create a section for each language
        section = line.match(RE_SECTION_LINE)[1];
        ini[section] = [];
      } else if (line.contains('@import')) {
        var propertyLine = line.match(RE_IMPORT_LINE)[1];
        ini[section].push(propertyLine);
      } else {
        dump('multilocale.js: found a line with unexpected content "' +
          line.trim() + '"');
      }
    });
    return ini;
  }

  /**
   * For a given webapp object, localize one INI file and all related
   * .properties files into build_stage directory
   *
   * @param {nsIFile}      iniFile      - INI file object
   * @param {Object}       webapp       - A webapp object for specific app
   */
  function localizeIni(iniFile, webapp) {
    var localesClone = JSON.parse(JSON.stringify(self.locales));
    var enIndex = localesClone.indexOf('en-US');
    if (enIndex !== -1) {
      localesClone.splice(enIndex, 1);
    }

    var origin = utils.getFileContent(iniFile);
    var ini = modifyLocaleIni(origin, localesClone);
    var iniContent = serializeIni(ini);

    utils.writeContent(iniFile, iniContent);

    localesClone.forEach(function(locale) {
      ini[locale].forEach(function(path) {
        var targetFile = utils.getFile(iniFile.parent.path, path);
        var propFile = getPropertiesFile(webapp, targetFile.path);
        if (utils.isSubjectToBranding(propFile.parent.path)) {
          var brandings = {
            target: { original: targetFile },
            src: { original: propFile }
          };
          for (var key in brandings) {
            brandings[key].modified = brandings[key].original.parent.clone();
            brandings[key].modified.append((self.official === '1') ?
              'official' : 'unofficial');
            brandings[key].modified.append(brandings[key].original.leafName);
          }
          targetFile = brandings.target.modified;
          propFile = brandings.src.modified;
        }

        if (!propFile.exists()) {
          utils.log(MODNAME, 'Properties file not found: ' + propFile.path);
          return;
        }
        if (targetFile.exists()) {
          targetFile.remove(false);
        }
        propFile.copyTo(targetFile.parent, targetFile.leafName);
      });
    });
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
   * For a given properties file from gaia repo, returns the matching properties
   * file from multilocale repos being hosted in LOCALE_BASEDIR
   *
   * @param   {Object} webapp        - A webapp object for specific app
   * @param   {nsIFile} originalPath - original properties file object.
   *
   * @returns {nsIFile} returns a properties file object in LOCALE_BASEDIR
   */
  function getPropertiesFile(webapp, originalPath) {
    // properties file name in multilocale repo don't contain locale name,
    // instead, they are sorted in folder whose name is the locale name.
    // Also, whereas ini and properties files are segregated in app 'locales'
    // folder, in multilocale repos, they are just put in matching app folder.
    // So /gaia/apps/system/locales/system.en-US.properties
    // maps to /gaia-l10n/en-US/system/system.properties
    function removeLocale(str, locale) {
      return str.replace('.' + locale, '').replace(/locales[\\\/]/, '');
    }

    var sharedDir = utils.joinPath(webapp.buildDirectoryFile.path, 'shared');
    var isShared = originalPath.contains(sharedDir);
    var locale = RE_PROPERTIES_FILE.exec(originalPath)[1];
    var propFile, dirLength;
    var {getFile} = utils;
    var paths = [self.localeBasedir, locale];

    originalPath = OS.Path.normalize(originalPath);

    if (isShared) {
      // for shared directory, we need to change a path like:
      // "<GAIA_DIR>/shared/locales/tz/tz.<LANG>.properties"
      // to:
      // "<LOCALE_BASEDIR>/<LANG>/shared/tz/tz.properties"
      dirLength = sharedDir.length;
      paths.push(
        'shared',
        removeLocale(originalPath.substr(dirLength), locale)
      );
    } else {
      // for app directory, we need to change a path like:
      // "<GAIA_DIR>/apps/system/locales/system.<LANG>.properties"
      // to:
      // "<LOCALE_BASEDIR>/<LANG>/apps/system/system.properties"
      dirLength = webapp.buildDirectoryFile.path.length;
      paths.push(
        webapp.sourceDirectoryFile.parent.leafName,
        webapp.sourceDirectoryFile.leafName,
        removeLocale(originalPath.substr(dirLength), locale)
      );
    }
    propFile = getFile.apply(null, paths);

    return propFile;
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
      return RE_INI_FILE.test(file.path);
    }).forEach(function(iniFile) {
      localizeIni(iniFile, webapp);
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
      if (locale === 'en-US') {
        return false;
      }
      var parent = webapp.sourceDirectoryFile.parent.leafName;
      var propFile = utils.getFile(self.localeBasedir, locale, parent,
        webapp.sourceDirectoryName, 'manifest.properties');
      if (!propFile.exists()) {
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


  /**
   * Serialize an INI object to string
   *
   * @param  {Object} ini - INI object
   * @returns {String} serialized content
   */
  function serializeIni(ini) {
    var output = [];
    function _section(locale) {
      return '[' + locale + ']';
    }
    function _import(path) {
      return '@import url(' + path + ')';
    }
    function _unshift(path) {
      output.unshift(_import(path));
    }
    function _push(path) {
      output.push(_import(path));
    }
    for (var locale in ini) {
      if (locale === 'default') {
        ini[locale].forEach(_unshift);
        continue;
      }
      output.push(_section(locale));
      ini[locale].forEach(_push);
    }
    return output.join('\n');
  }

  this.modifyLocaleIni = modifyLocaleIni;
  this.localizeIni = localizeIni;
  this.getPropertiesFile = getPropertiesFile;
  this.localize = localize;
  this.localizeManifest = localizeManifest;
  this.serializeIni = serializeIni;
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
    localeBasedir,
    options.OFFICIAL);

  gaia.webapps.forEach(function(webapp) {
    if (utils.isExternalApp(webapp)) {
      return;
    }
    var files = utils.ls(webapp.buildDirectoryFile, true);
    l10nManager.localize(files, webapp);
  });
}

exports.execute = execute;
exports.L10nManager = L10nManager;
