'use strict';

/* global exports, require, OS */

const { Cu } = require('chrome');
Cu.import('resource://gre/modules/osfile.jsm');

const utils = require('utils');
const RE_PROPERTY_LINE = /(.*)\s*[:=]\s*(.*)/;
const MODNAME = 'multilocale';

// This is the source locale. We will use it as a reference locale for others
// and use it for locales that lack localization data
const GAIA_SOURCE_LOCALE = 'en-US';

function L10nManager(gaiaDir,
                     localesFilePath,
                     localeBasedir,
                     subject) {
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
   *
   * @param  {String} stageDir - webapp stage directory 
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

  /**
   * Copy l10n resources required by the .html file to build stage directory
   *
   * The resources will be copied either from app's source directory or
   * from l10n repository.
   *
   * @param {nsIFile[]} file - HTML file
   * @param {Object} webapp  - A webapp object for specific app
   */
  function getL10nResources(file, webapp) {
    var content = utils.getFileContent(file);

    // if there is no localization word in the file, don't even parse it
    // exit early
    if (content.indexOf('localization') === -1) {
      return;
    }

    var doc = utils.getDocument(content);
    var isBranding;

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
        isBranding = true;
      } else {
        isBranding = false;
      }

      // XXX: We should use @formFactor for device specific L10N support,
      // isSubjectToDeviceType should be removed after bug 936532 landed.
      if (utils.isSubjectToDeviceType(resURL)) {
        realURL = utils.joinPath(utils.dirname(resURL),
                                 self.deviceType,
                                 utils.basename(resURL));
      }

      for (var loc of self.locales) {
        var relPathInApp =
          file.parent.path.substr(webapp.buildDirectoryFile.path.length);
        var resFile =
          getResourceFile(webapp, relPathInApp, realURL, loc, isBranding);

        var destFile = utils.getFile(webapp.buildDirectoryFile.path,
                                     realURL.replace('{locale}', loc));
        if (!resFile.exists()) {
          utils.log(MODNAME, 'Resource file not found: ' + resFile.path);
          continue;
        }
        utils.ensureFolderExists(destFile.parent);
        resFile.copyTo(destFile.parent, destFile.leafName);
      }
    }
  }

  /**
   * Get l10n resource file for a given locale.
   *
   * @param {Object} webapp        - A webapp object for specific app
   * @param {String} relPathInApp  - Relative path of the html file in app
   *                                 For example: /contacts
   * @param {nsIFile[]} resURL     - URL to the resource
   * @param {String} loc           - Locale code
   * @param {Boolean} isBranding   - Is the file part of the branding
   * @returns {nsIFile[]} resFile  - L10n resource file object
   */
  function getResourceFile(webapp,
                           relPathInApp,
                           resURL,
                           loc,
                           isBranding) {
    function cleanPath(str) {
      // removes locales/ and {locale}
      // so transforms:
      // locales/foo.{locale}.res => foo.res
      // ./shared/locales/foo/bar.{locale}.res => ./shared/foo/bar.res
      // foo.properties
      str = str.replace(/locales\//, '');
      str = str.replace('{locale}.', '');
      return OS.Path.normalize(str);
    }

    var isShared = /^\.?\/?shared/.test(resURL);
    var paths = [];

    // this flag defines if for the given locale we will take resources
    // from the source directory or from LOCALE_BASEDIR directory
    var useSourceDir = false;

    // for GAIA_SOURCE_LOCALE use source directory
    if (loc === GAIA_SOURCE_LOCALE) {
      useSourceDir = true;
    }
    // if the file is a part of the branding and we are official
    // use source directory
    if (isBranding && self.official === '1') {
      useSourceDir = true;
      loc = GAIA_SOURCE_LOCALE;
    }

    if (useSourceDir) {
      if (isShared) {
        paths.push(self.gaiaDir);
      } else {
        paths.push(webapp.sourceDirectoryFile.path);
        paths.push(relPathInApp);
      }
      paths.push(resURL.replace('{locale}', loc));
    } else {
      paths.push(self.localeBasedir);
      paths.push(loc);
      if (!isShared) {
        paths.push('apps');
        paths.push(webapp.sourceDirectoryFile.leafName);
        paths.push(relPathInApp);
      }
      paths.push(cleanPath(resURL));
    }

    var resFile = utils.getFile.apply(null, paths);

    return resFile;
  }

  /**
   * Localize all manifest and copy properties files.
   *
   * @param {nsIFile[]} files        - all files in webapp source tree
   * @param {Object} webapp          - A webapp object for specific app
   */
  function localize(files, webapp) {
    // Localize webapp's manifest.webapp file.
    localizeManifest(webapp);

    // Clean all localization files from the build stage directory
    cleanLocaleFiles(webapp.buildDirectoryFile);

    // Copy resource files into build_stage directory
    files.filter(function(file) {
      return utils.getExtension(file.path) == 'html';
    }).forEach(function(htmlFile) {
      getL10nResources(htmlFile, webapp);
    });
  }

  /**
   * Localize manifest.webapp file.
   * Propagate locale codes into manifest's
   * `locales` key and `entry_points[].locales`
   *
   * @param {Object} webapp  - A webapp object for specific app
   */
  function localizeManifest(webapp) {
    var manifest = utils.getJSON(webapp.buildManifestFile);

    // If manifest.webapp does not have `locales` key, return early
    if (!manifest.locales) {
      return;
    }

    // Build locale properties based on GAIA_SOURCE_LOCALE data
    // from manifest.webapp
    var sourceLocaleProps = buildSourceLocaleProps(manifest, webapp);

    // Reset `locales` key
    manifest.locales = {};

    if (manifest.entry_points) {
      for (var name in manifest.entry_points) {
        manifest.entry_points[name].locales = {};
      }
    }

    for (var i = 0; i < self.locales.length; i++) {
      var locale = self.locales[i];
      var manifestProps;

      if (locale === GAIA_SOURCE_LOCALE) {
        manifestProps = sourceLocaleProps;
      } else {
        manifestProps = getManifestProperties(webapp, locale);
      }

      manifest.locales[locale] = localizeManifestEntry(
        manifestProps,
        sourceLocaleProps,
        'default'
      );

      if (manifest.entry_points) {
        for (var name in manifest.entry_points) {
          var ep = manifest.entry_points[name];
          ep.locales[locale] = localizeManifestEntry(
            manifestProps,
            sourceLocaleProps,
            'entry_points',
            name
          );
        }
      }
    }

    utils.writeContent(webapp.buildManifestFile,
                       JSON.stringify(manifest));
  }

  /**
   * Build an object with localization metadata, taken from the manifest file
   * for the GAIA_SOURCE_LOCALE locale
   *
   * It may look like this:
   * {
   *   default: {
   *     name: "App",
   *     description: "App's description"
   *   },
   *   entry_points: {
   *     dialer: {
   *       name: "App's Dialer",
   *       description: "App's Dialer's description"
   *     }
   *   }
   * }
   *
   * This data will be used as a reference point for localization of the
   * manifest data to other locales.
   *
   * @param {Object} manifest - Manifest.webapp's data object
   * @param {Object} webapp   - A webapp object for specific app
   */
  function buildSourceLocaleProps(manifest, webapp) {
    if (!manifest.locales[GAIA_SOURCE_LOCALE]) {
      utils.log(MODNAME,
        'In manifest file: ' + webapp.buildManifestFile + ', ' +
        'missing locales key for locale: ' + GAIA_SOURCE_LOCALE);
    }
    var sourceLocaleProps = {
      default: manifest.locales[GAIA_SOURCE_LOCALE],
      entry_points: {}
    };

    if (manifest.entry_points) {
      for (var name in manifest.entry_points) {
        sourceLocaleProps.entry_points[name] =
          manifest.entry_points[name].locales[GAIA_SOURCE_LOCALE];
      }
    }

    return sourceLocaleProps;
  }

  /**
   * Creates an l10n data object for a given locale based on the
   * keys from the source locale.
   *
   * If the localization object lacks any of the keys, they are taken
   * from the source locale as well.
   *
   * @param {Object} manifestProps - L10n strings for a locale
   * @param {Object} sourceProps   - L10n strings for a source locale
   * @returns {Object} val         - Result l10n strings for a locale
   */
  function localizeManifestEntry(manifestProps, sourceProps, type, name) {
    var val = {};

    var manifestRoot;
    var sourceRoot = sourceProps[type];
    if (manifestProps &&
        type in manifestProps) {
      manifestRoot = manifestProps[type];
    } else {
      manifestRoot = null;
    }

    if (type === 'entry_points') {
      sourceRoot = sourceRoot[name];
      if (manifestRoot &&
          name in manifestRoot) {
        manifestRoot = manifestRoot[name];
      } else {
        manifestRoot = null;
      }
    }

    for (var key in sourceRoot) {
      if (manifestRoot &&
          key in manifestRoot) {
        val[key] = manifestRoot[key];
      } else {
        val[key] = sourceRoot[key];
      }
    }

    return val;
  }

  /**
   * Creates an l10n data object for a given locale based on the
   * keys from the source locale.
   *
   * If the localization object lacks any of the keys, they are taken
   * from the source locale as well.
   *
   * @param {Object} webapp   - A webapp object for specific app
   * @param {String} locale   - Locale code
   * @returns {Object} res    - Manifest l10n resource
   */
  function getManifestProperties(webapp, locale) {
    var parent = webapp.sourceDirectoryFile.parent.leafName;
    var propFile = utils.getFile(self.localeBasedir, locale, parent,
      webapp.sourceDirectoryName, 'manifest.properties');
    if (!propFile.exists()) {
      return null;
    }

    var content = utils.getFileContent(propFile);
    return parseManifestProperties(content);
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
    });

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
