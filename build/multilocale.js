'use strict';

/* global exports, require, OS */

const { Cu } = require('chrome');
Cu.import('resource://gre/modules/osfile.jsm');

const utils = require('utils');
const RE_PROPERTY_LINE = /(.*)\s*[:=]\s*(.*)/;
const MODNAME = 'multilocale';

function L10nManager(gaiaDir,
                     localesFilePath,
                     localeBasedir,
                     subject,
                     defaultLocale) {
  function checkArg(arg) {
    return Boolean(arg);
  }

  if (arguments.length !== 5 &&
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

  this.locales = Object.keys(utils.getJSON(localesFile));
  this.localeBasedir = baseDir.path;
  this.gaiaDir = gaiaDir;
  this.official = subject.official;
  this.deviceType = subject.deviceType;

  /**
   * Remove locale files from build stage dir
   */
  function cleanLocaleFiles(stageDir) {
    var localesDir = stageDir.clone();
    localesDir.append('locales');
    if (localesDir.exists()) {
      localesDir.remove(true);
    }

    var sharedLocalesDir = stageDir.clone();
    sharedLocalesDir.append('shared');
    sharedLocalesDir.append('locales');
    if (sharedLocalesDir.exists()) {
      sharedLocalesDir.remove(true);
    }
  }

  function getL10nResources(file, webapp) {
    var content = utils.getFileContent(file);

    // if there is no localization word in the file, don't even parse it
    // exit early
    if (content.indexOf('localization') === -1) {
      return;
    }

    var doc = utils.getDocument(content);

    // get all <link rel="localization">
    var links = doc.querySelectorAll('link[rel="localization"]');
    for (var i = 0; i < links.length; i++) {
      var resURL = links[i].getAttribute('href');
      var realURL = resURL;

      // if the resource URL is a subject to branding, then
      // add official/unofficial to the path
      if (utils.isSubjectToBranding(utils.dirname(resURL))) {
        realURL = utils.joinPath(utils.dirname(resURL),
                                 self.official === '1' ?
                                   'official' : 'unofficial',
                                 utils.basename(resURL));
      }

      // XXX: We should use @formFactor for device specific L10N support,
      // isSubjectToDeviceType should be removed after bug 936532 landed.
      if (utils.isSubjectToDeviceType(resURL)) {
        realURL = utils.joinPath(utils.dirname(resURL),
                                 self.deviceType,
                                 utils.basename(resURL));
      }

      for (var loc of self.locales) {
        var propFile;
        if (utils.isSubjectToBranding(utils.dirname(resURL)) &&
            self.official === '1') {
          // if we want official branding, then we will
          // take the content of the en-US file from the gaia dir
          var propPath = utils.joinPath(
              webapp.sourceDirectoryFile.parent.parent.path,
              utils.dirname(realURL),
              utils.basename(realURL.replace('{locale}', defaultLocale)));
          propFile = utils.getFile(propPath);
        } else {
          propFile = getPropertiesFile(webapp, realURL, loc);
        }

        var resFile = utils.getFile(webapp.buildDirectoryFile.path,
                                    realURL.replace('{locale}', loc));
        if (propFile.exists()) {
          utils.ensureFolderExists(resFile.parent);
          propFile.copyTo(resFile.parent, resFile.leafName);
        }
      }
    }
  }

  function getPropertiesFile(webapp, resURL, loc) {
    function cleanPath(str) {
      // removes locales/ and {locale}
      // so transforms:
      // locales/foo.{locale}.res => foo.res
      // ./shared/locales/foo/bar.{locale}.res => ./shared/foo/bar.res
      // foo.properties
      str = str.replace(/locales\/([^\.]*)\.\{locale\}/, '$1');
      return OS.Path.normalize(str);
    }
    var isShared = /^\.?\/?shared/.test(resURL);
    var paths = [self.localeBasedir, loc];

    if (isShared) {
      paths.push(
        cleanPath(resURL)
      );
    } else {
      paths.push(
        webapp.sourceDirectoryFile.parent.leafName,
        webapp.sourceDirectoryFile.leafName,
        cleanPath(resURL)
      );
    }
    var propFile = utils.getFile.apply(null, paths);

    return propFile;
  }

  /**
   * localize all manifest and copy properties files.
   *
   * @param {nsIFile[]} files        - all files in webapp source tree
   * @param {Object} webapp          - A webapp object for specific app
   */

  function localize(files, webapp) {
    cleanLocaleFiles(webapp.buildDirectoryFile);
    // Using manifest.properties to localize manifest.webapp
    var manifest = localizeManifest(webapp);
    utils.writeContent(webapp.buildManifestFile, JSON.stringify(manifest));

    // Copy properties files into build_stage directory
    files.filter(function(file) {
      return utils.getExtension(file.path) == 'html';
    }).forEach(function(htmlFile) {
      getL10nResources(htmlFile, webapp);
    });

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

    // reset the locales list
    manifest.locales = {};

    locales.forEach(function(locale, index) {
      if (manifest.entry_points) {
        // localization for entry_points in manifest.
        for (var name in manifest.entry_points) {
          var ep = manifest.entry_points[name];
          ep.locales = {};
          if (!localesProps[index].entry_points[name]) {
            utils.log(MODNAME, 'Translation of ' + locale + ' is not ' +
              'available for entry point "' + name + '" in ' + manifest.name +
              ' manifest file.');
            continue;
          }
          ep.locales[locale] = localesProps[index].entry_points[name];
        }
      }
      manifest.locales[locale] = localesProps[index].default;
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
    localeBasedir,
    {
      official: options.OFFICIAL,
      deviceType: options.GAIA_DEVICE_TYPE
    },
    options.GAIA_DEFAULT_LOCALE);

  gaia.webapps.forEach(function(webapp) {
    if (options.BUILD_APP_NAME != '*' &&
      webapp.sourceDirectoryName != options.BUILD_APP_NAME) {
      return;
    }

    if (utils.isExternalApp(webapp)) {
      return;
    }
    var files = utils.ls(webapp.buildDirectoryFile, true);
    l10nManager.localize(files, webapp);
  });
}

exports.execute = execute;
exports.L10nManager = L10nManager;
