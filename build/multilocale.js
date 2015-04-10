'use strict';

const utils = require('./utils');
const qps = require('./l10n/qps');
const RE_PROPERTY_LINE = /(.*)\s*[:=]\s*(.*)/;
const MODNAME = 'multilocale';

// This is the source locale. We will use it as a reference locale for others
// and use it for locales that lack localization data
const GAIA_SOURCE_LOCALE = 'en-US';

function L10nManager(gaiaDir,
                     localesFilePath,
                     localeBasedir,
                     subject) {
  if (arguments.length < 3 || arguments.length > 4) {
    throw new TypeError('Illegal constructor');
  }

  // subject is for optional arguments and can be omitted
  subject = subject || {};

  var self = this;
  var localesFile = utils.resolve(localesFilePath, gaiaDir);
  var baseDir = null;
  if (localeBasedir) {
    baseDir = utils.resolve(localeBasedir, gaiaDir);
  }

  [utils.getFile(gaiaDir), localesFile, baseDir]
  .forEach(function(file) {
    if (file && !file.exists()) {
      throw new Error('file not found: ' + file.path);
    }
  });

  this.locales = Object.keys(utils.getJSON(localesFile));
  this.localeBasedir = baseDir ? baseDir.path : null;
  this.gaiaDir = gaiaDir;
  this.official = subject.official;
  this.deviceType = subject.deviceType;
  this.defaultLocale = subject.defaultLocale;

  /**
   * Copy l10n resources required by the .html file to build stage directory
   *
   * The resources will be copied either from app's source directory or
   * from l10n repository.
   *
   * @param {nsIFile[]} file - HTML file
   * @param {Object} webapp  - A webapp object for specific app
   * @param {nsIDocument} doc - document object
   */
  function getL10nResources(file, webapp, doc) {
    var isOfficialBranding;

    // get all <link rel="localization">
    var links = doc.querySelectorAll('link[rel="localization"]');
    Array.prototype.forEach.call(links, function(link) {
      var resURL = link.getAttribute('href');
      var realURL = resURL;

      // if the resource URL is a subject to branding, then
      // add official/unofficial to the path
      if (utils.isSubjectToBranding(utils.dirname(resURL))) {
        realURL = utils.joinPath(utils.dirname(resURL),
                                 self.official === '1' ?
                                   'official' : 'unofficial',
                                 utils.basename(resURL));
        isOfficialBranding = true;
      } else {
        isOfficialBranding = false;
      }

      // XXX: We should use @formFactor for device specific L10N support,
      // isSubjectToDeviceType should be removed after bug 936532 landed.
      if (utils.isSubjectToDeviceType(resURL)) {
        realURL = utils.joinPath(utils.dirname(resURL),
                                 self.deviceType,
                                 utils.basename(resURL));
      }

      for (var key in self.locales) {
        var loc = self.locales[key];
        var relPathInApp =
          utils.dirname(file.path).substr(webapp.buildDirectoryFilePath.length);
        var resFile =
          getResourceFile(webapp, relPathInApp,
                          realURL, loc, isOfficialBranding);
        var isShared = /\.?\/?shared\//.test(realURL);

        var destFile;
        if (isShared) {
          destFile = utils.getFile(webapp.buildDirectoryFilePath,
                                   realURL.replace('{locale}', loc));
        } else {
          destFile = utils.getFile(webapp.buildDirectoryFilePath,
                                   relPathInApp,
                                   realURL.replace('{locale}', loc));
        }
        if (!resFile.exists()) {
          if (self.localeBasedir !== null) {
            utils.log(MODNAME, 'Resource file not found: ' + resFile.path);
          }
          continue;
        }
        var parentOfDestFile = utils.getFile(destFile.path, '..');
        utils.ensureFolderExists(parentOfDestFile);
        utils.copyFileTo(resFile, parentOfDestFile.path,
          destFile.leafName);
      }
    });
  }

  /**
   * Get l10n resource file for a given locale.
   *
   * @param {Object} webapp                - A webapp object for specific app
   * @param {String} relPathInApp          - Relative path of the html file
   *                                         For example: /contacts
   * @param {nsIFile[]} resURL             - URL to the resource
   * @param {String} loc                   - Locale code
   * @param {Boolean} isOfficialBranding   - Is the file part of the branding
   * @returns {nsIFile[]} resFile          - L10n resource file object
   */
  function getResourceFile(webapp,
                           relPathInApp,
                           resURL,
                           loc,
                           isOfficialBranding) {
    function cleanPath(str) {
      // removes locales/ and {locale}
      // so transforms:
      // locales/foo.{locale}.res => foo.res
      // ./shared/locales/foo/bar.{locale}.res => ./shared/foo/bar.res
      // foo.properties
      str = str.replace(/locales\//, '');
      str = str.replace('{locale}.', '');
      return utils.normalizePath(str);
    }

    var isShared = /^\.?\/?shared\//.test(resURL);
    var paths = [];

    // this flag defines if for the given locale we will take resources
    // from the source directory or from LOCALE_BASEDIR directory
    var useSourceDir = false;
    if (self.localeBasedir === null) {
      useSourceDir = true;
    }

    // for GAIA_SOURCE_LOCALE use source directory
    if (loc === GAIA_SOURCE_LOCALE) {
      useSourceDir = true;
    }
    // if the file is a part of the branding and we are official
    // use source directory
    if (isOfficialBranding) {
      useSourceDir = true;
      loc = GAIA_SOURCE_LOCALE;
    }

    if (useSourceDir) {
      if (isShared) {
        paths.push(self.gaiaDir);
      } else {
        paths.push(webapp.sourceDirectoryFilePath);
        paths.push(relPathInApp);
      }
      paths.push(resURL.replace('{locale}', loc));
    } else {
      paths.push(self.localeBasedir);
      paths.push(loc);
      if (!isShared) {
        var sourceDirectoryFile = utils.getFile(webapp.sourceDirectoryFilePath);
        var parentOfSourceDirFile =
          utils.getFile(webapp.sourceDirectoryFilePath, '..');
        paths.push(parentOfSourceDirFile.leafName);
        paths.push(sourceDirectoryFile.leafName);
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
   * @param {nsIFile[]} htmlFiles    - all files in webapp source tree
   * @param {Object} webapp          - A webapp object for specific app
   */
  function localize(htmlFiles, webapp) {
    // Localize webapp's manifest.webapp file.
    localizeManifest(webapp);

    htmlFiles.forEach(function(htmlFile) {
      var content = utils.getFileContent(htmlFile);

      // if there is no localization word in the file, don't even parse it
      // exit early
      if (content.indexOf('localization') === -1) {
        return;
      }

      var doc = utils.getDocument(content);

      buildL10nMeta(htmlFile, doc);

      if (self.localeBasedir) {
        // Copy resource files into build_stage directory
        getL10nResources(htmlFile, webapp, doc);
      }
    });
  }

  function getTimestamp(date) {
    var chunks = [
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes()
    ];

    return chunks.map(function(c) {
      return c < 10 ? ('0' + c) : c.toString();
    }).join('');
  }

  function createMeta(doc, name) {
    var meta = doc.createElement('meta');
    meta.setAttribute('name', name);
    var head = doc.querySelector('head');
    return head.appendChild(meta);
  }

  function buildL10nMeta(file, doc) {
    var metas = {
      availableLanguages: doc.querySelector('meta[name="availableLanguages"]'),
      defaultLanguage: doc.querySelector('meta[name="defaultLanguage"]'),
      appVersion: doc.querySelector('meta[name="appVersion"]')
    };

    if ((!metas.availableLanguages || !metas.defaultLanguage) &&
        doc.querySelector('link[rel="manifest"]')) {
      // So, the app is using obsolete l10n meta model with a link to the
      // manifest.
      // Let's warn the user.
      utils.log(MODNAME,
        'WARNING: \n  In HTML file: ' + file.path + ', ' +
        'obsolete link to w3c manifest is used for l10n meta. '+
        'Please, replace with:\n' +
        ' <meta name="availableLanguages" content="en-US">\n' +
        ' <meta name="defaultLanguage" content="en-US">\n' +
        ' Read more at: http://bugzil.la/1115807');
    }

    // ... and save him... for now.
    if (!metas.availableLanguages) {
      metas.availableLanguages = createMeta(doc, 'availableLanguages');
    }
    if (!metas.defaultLanguage) {
      metas.defaultLanguage = createMeta(doc, 'defaultLanguage');
    }

    if (!metas.appVersion) {
      metas.appVersion = createMeta(doc, 'appVersion');
    }

    metas.defaultLanguage.setAttribute('content', self.defaultLocale);

    var timestamp = getTimestamp(new Date());
    metas.availableLanguages.setAttribute('content',
      self.locales.map(function(loc) {
        return loc + ':' + timestamp;
      }).join(', '));

    var settingsFile = utils.getFile(self.gaiaDir, 'build', 'config',
        'common-settings.json');
    var settings = utils.getJSON(settingsFile);

    metas.appVersion.setAttribute('content', settings['moz.b2g.version']);

    var str = utils.serializeDocument(doc);
    utils.writeContent(file, str);
  }

  /**
   * Localize manifest.webapp file.
   * Propagate locale codes into manifest's
   * `locales` key and `entry_points[].locales`
   *
   * @param {Object} webapp  - A webapp object for specific app
   */
  function localizeManifest(webapp) {
    var buildManifestFile = utils.getFile(webapp.buildManifestFilePath);
    var manifest = utils.getJSON(buildManifestFile);

    if (manifest.default_locale) {
      manifest.default_locale = self.defaultLocale;
    }
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

    self.locales.forEach(function(locale) {
      var manifestProps;

      if (locale === GAIA_SOURCE_LOCALE) {
        manifestProps = sourceLocaleProps;
      } else if (locale in qps.PSEUDO) {
        manifestProps = qps.walkContent(
          sourceLocaleProps, qps.PSEUDO[locale].translate);
      } else {
        manifestProps = getManifestProperties(webapp, locale);
      }

      manifest.locales[locale] = buildLocalizedManifestEntry(
        manifestProps,
        sourceLocaleProps,
        'default'
      );

      if (manifest.entry_points) {
        for (var name in manifest.entry_points) {
          var ep = manifest.entry_points[name];
          ep.locales[locale] = buildLocalizedManifestEntry(
            manifestProps,
            sourceLocaleProps,
            'entry_points',
            name
          );
        }
      }
    });
    utils.writeContent(buildManifestFile, JSON.stringify(manifest));
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
    manifest = utils.cloneJSON(manifest);
    if (!manifest.locales[GAIA_SOURCE_LOCALE]) {
      utils.log(MODNAME,
        'In manifest file: ' + webapp.buildManifestFilePath + ', ' +
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
   * @param {String} type          - `default` or `entry_points`
   * @param {String} name          - in `entry_points` case, name of the
   *                                 entry point
   * @returns {Object} val         - Result l10n strings for a locale
   */
  function buildLocalizedManifestEntry(manifestProps,
                                       sourceProps,
                                       type,
                                       name) {
    function traverseObject(node, key) {
      if (node &&
          key in node) {
        return node[key];
      } else {
        return null;
      }
    }
    var val = {};

    var sourceRoot = sourceProps[type];
    var manifestRoot = traverseObject(manifestProps, type);

    if (type === 'entry_points') {
      sourceRoot = sourceRoot[name];
      manifestRoot = traverseObject(manifestRoot, name);
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
    var parent = utils.getFile(webapp.sourceDirectoryFilePath, '..');
    var propFile = utils.getFile(self.localeBasedir, locale, parent.leafName,
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
      if (!matched || line.trim().indexOf('#') === 0) {
        return;
      }
      var value = matched[2].trim();
      var parts = matched[1].split('.');
      var entryPoint, key;
      // if we got a key with "." such as dialer.name, create an new
      // entry_point for it.
      if (parts.length === 2) {
        entryPoint = parts[0];
        key = parts[1];
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
  var webapp = options.webapp;
  var localeBasedir = null;

  if (options.LOCALE_BASEDIR) {
    // Bug 952901: remove getLocaleBasedir() if bug 952900 fixed.
    localeBasedir = utils.getLocaleBasedir(options.LOCALE_BASEDIR);
  }

  var l10nManager = new L10nManager(
    options.GAIA_DIR,
    options.LOCALES_FILE,
    localeBasedir,
    {
      official: options.OFFICIAL,
      defaultLocale: options.GAIA_DEFAULT_LOCALE,
      deviceType: options.GAIA_DEVICE_TYPE,
    });

  if (utils.isExternalApp(webapp)) {
    return;
  }
  var buildDirectoryFile = utils.getFile(webapp.buildDirectoryFilePath);
  var excluded = new RegExp(webapp.buildDirectoryFilePath + '.*\/tests?');
  var files = utils.ls(buildDirectoryFile, true).filter(function(file) {
    return !(excluded.test(file.path));
  });

  l10nManager.localize(files.filter(function(file) {
    return /\.html$/.test(file.path);
  }), webapp);
}

exports.execute = execute;
exports.L10nManager = L10nManager;
