'use strict';

const { Cc, Ci, Cr, Cu } = require('chrome');
Cu.import('resource://gre/modules/osfile.jsm');

const utils = require('./utils');
const webappZip = require('./webapp-zip');
const RE_SECTION_LINE = /\[(.*)\]/;
const RE_IMPORT_LINE = /@import url\((.*)\)/;
const RE_PROPERTY_LINE = /(.*)\s*[:=]\s*(.*)/;
const RE_INI_FILE = /locales[\/\\].+\.ini$/;
const MODNAME = 'multilocale';

// Make all timestamps the same so we always generate the same
// output zip file for the same inputs
const DEFAULT_TIME = 0;

function L10nManager(gaiaDir, sharedDir, localesFilePath, localeBasedir) {
  function checkArg(arg) {
    return new Boolean(arg);
  }
  if (arguments.length !== 4 &&
    !Array.prototype.every.call(arguments, checkArg)) {
    throw new TypeError('Illegal constructor');
  }

  var self = this;
  var localesFile = utils.resolve(localesFilePath, gaiaDir);
  var baseDir = utils.resolve(localeBasedir, gaiaDir);

  [utils.getFile(gaiaDir), utils.getFile(sharedDir), localesFile, baseDir]
  .forEach(function(file) {
    if (!file.exists()) {
      throw new Error('file not found: ' + file.path);
    }
  });

  [this.locales, this.localeBasedir, this.gaiaDir, this.sharedDir] =
    [Object.keys(utils.getJSON(localesFile)), baseDir.path, gaiaDir, sharedDir];


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
   * For a given webapp zip, localize one INI file and all related .properties
   * files into zip file.
   *
   * @param {nsIZipWriter} zip          - zip file for specific app in profile
   *                                      directory
   * @param {nsIFile}      iniFile      - INI file object
   * @param {Object}       webapp       - A webapp object for specific app
   * @param {String}       IniPathInZip - INI file path in zip
   */
  function localizeIni(zip, iniFile, webapp, IniPathInZip) {
    var localesClone = JSON.parse(JSON.stringify(self.locales));

    var enIndex = localesClone.indexOf('en-US');
    if (enIndex !== -1) {
      localesClone.splice(enIndex, 1);
    }

    var origin = utils.getFileContent(iniFile);
    var ini = modifyLocaleIni(origin, localesClone);
    var iniContent = serializeIni(ini);

    if (zip.hasEntry(IniPathInZip)) {
      zip.removeEntry(IniPathInZip, false);
    }

    webappZip.addEntryStringWithTime(zip, IniPathInZip, iniContent, DEFAULT_TIME);

    localesClone.forEach(function(locale) {
      ini[locale].forEach(function(path) {
        var origin = utils.getFile(iniFile.parent.path, path);
        var propFile = getPropertiesFile(webapp, origin.path);
        if (!propFile.exists()) {
          utils.log(MODNAME, 'Properties file not found: ' + propFile.path);
          return;
        }
        var propsFilePathInZip = getPropertiesPathInZip(origin.path, webapp);
        if (zip.hasEntry(propsFilePathInZip)) {
          zip.removeEntry(propsFilePathInZip, false);
        }
        webappZip.addEntryFileWithTime(zip, propsFilePathInZip, propFile,
          DEFAULT_TIME);
      });
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
    // Also, whereas ini and properties files are segregated in app 'locales' folder,
    // in multilocale repos, they are just put in matching app folder.
    // So /gaia/apps/system/locales/system.en-US.properties
    // maps to /gaia-l10n/en-US/system/system.properties
    function removeLocale(str, locale) {
      return str.replace('.' + locale, '').replace(/locales[\\\/]/, '');
    }

    var isShared = originalPath.contains(self.sharedDir);
    var locale = /\.([\w-]+)\.properties$/.exec(originalPath)[1];
    var propFile, relativePath, dirLength;
    var {getFile} = utils;
    var paths = [self.localeBasedir, locale];

    originalPath = OS.Path.normalize(originalPath);

    if (isShared) {
      // for shared directory, we need to change a path like:
      // "<GAIA_DIR>/shared/locales/tz/tz.<LANG>.properties"
      // to:
      // "<LOCALE_BASEDIR>/<LANG>/shared/tz/tz.properties"
      dirLength = self.sharedDir.length;
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
   * given a properties file in webapp directory and get the path in zip.
   *
   * @param   {String} propPath - path of properties file in webapp directory
   * @param   {String} gaiaDir  - path of gaia source tree
   * @param   {Object} webapp
   * @returns {String} returns a path in zip.
   */
  function getPropertiesPathInZip(propPath, webapp) {
    var pathInZip;
    if (propPath.contains(self.sharedDir)) {
      pathInZip = propPath.substr(self.gaiaDir.length);
    } else {
      pathInZip = propPath.substr(webapp.buildDirectoryFile.path.length);
    }
    return pathInZip.substr(1);
  }

  /**
   * localize all manifest, INI file and copy properties files.
   *
   * @param {nsIFile[]} files        - all files in webapp source tree
   * @param {nsIZipWriter} zip       - zip file for specific app in profile
   *                                   directory
   * @param {Object} webapp          - A webapp object for specific app
   * @param {Boolean} inlineOrConcat - if GAIA_INLINE_LOCALES or
   *                                   GAIA_CONCAT_LOCALES is "1"
   */
  function localize(files, zip, webapp, inlineOrConcat) {
    // Using manifest.properties to localize manifest.webapp
    var manifest = localizeManifest(webapp);
    if (zip.hasEntry('manifest.webapp')) {
      zip.removeEntry('manifest.webapp', false);
    }
    webappZip.addEntryStringWithTime(zip, 'manifest.webapp',
      JSON.stringify(manifest, undefined, 2));

    // Ignore l10n files if they have been inlined or concatenated
    if (inlineOrConcat) {
      return;
    }

    // Localize ini files and copy properties files into zip file.
    files.filter(function(file) {
      return RE_INI_FILE.test(file.path);
    }).forEach(function(iniFile) {
      var pathInZip = getPropertiesPathInZip(iniFile.path, webapp);
      var localizedIni = localizeIni(zip, iniFile, webapp, pathInZip);
    });
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

    var manifest = addLocaleManifest(localesForManifest, localesProps,
      utils.getJSON(webapp.manifestFile));
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
    function _section(locale) {
      return '[' + locale + ']';
    }
    function _import(path) {
      return '@import url(' + path + ')';
    }
    var output = [];
    for (var locale in ini) {
      if (locale === 'default') {
        ini[locale].forEach(function(path) {
          output.unshift(_import(path));
        });
        continue;
      }
      output.push(_section(locale));
      ini[locale].forEach(function(path) {
        output.push(_import(path));
      });
    }
    return output.join('\n');
  }

  function debug(msg) {
    // utils.log('multilocale', msg);
  }

  this.modifyLocaleIni = modifyLocaleIni;
  this.localizeIni = localizeIni;
  this.getPropertiesFile = getPropertiesFile;
  this.getPropertiesPathInZip = getPropertiesPathInZip;
  this.localize = localize;
  this.localizeManifest = localizeManifest;
  this.serializeIni = serializeIni;
}

exports.L10nManager = L10nManager;
