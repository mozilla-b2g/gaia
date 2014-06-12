  var utils = require('./utils');
var config;
const { Cc, Ci, Cr, Cu, CC } = require('chrome');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');

function debug(str) {
  //dump(' -*- webapp-optimize.js: ' + str + '\n');
}

/**
 * Expose a global `win' object and load `l10n.js' in it --
 * note: the `?reload' trick ensures we don't load a cached `l10njs' library.
 */

var win = {
  navigator: {},
  Node: {
    TEXT_NODE: 3
  },
  CustomEvent: function() {},
  dispatchEvent: function() {},
};
let scope = {};
let JSMin;

/**
 * Locale list -- by default, only the default one
 * (the default locale is always the last element in this array)
 */

var l10nLocales;
function newDictionary() {
  let dictionary = {};
  l10nLocales.forEach(function(lang) {
    dictionary[lang] = {};
  });
  return dictionary;
}

/**
 * whitelist by app name for javascript asset aggregation.
 */
const JS_AGGREGATION_BLACKLIST = [
  // https://bugzilla.mozilla.org/show_bug.cgi?id=839574
  'system'
];

/**
 * whitelist files by app for resource inlining
 */
const INLINE_WHITELIST = {
  'system': [ 'net_error.html' ]
};

/**
 * whitelist by app name for l10n optimization.
 */
const L10N_OPTIMIZATION_BLACKLIST = [
  // https://bugzilla.mozilla.org/show_bug.cgi?id=898408
  'pdfjs'
];

const RE_PROPS = /^[\/\\]?(.+?)[\/\\].+\.([\w-]+)\.properties$/;
const RE_INI = /locales[\/\\].+\.ini$/;

/**
 * Optimization helpers -- these environment variables are used:
 *   - config.GAIA_INLINE_LOCALES  - embed the minimum l10n data in HTML files
 *   - config.GAIA_CONCAT_LOCALES  - aggregates l10n files
 *   - config.GAIA_OPTIMIZE        - aggregates JS files
 */

/**
 * Reads the content of a file in a webapp, using relative paths.
 *
 * @param {Object} webapp details of current web app.
 * @param {NSFile} htmlFile filename/path of the document.
 * @param {String} relativePath file path, using the htmlFile as base URL.
 * @returns {String} file content.
 */
function optimize_getFileContent(webapp, htmlFile, relativePath) {
  let paths = relativePath.split(/[\/\\]/);
  let file;
  let gaia = utils.gaia.getInstance(config);

  // get starting directory: webapp root, HTML file or /shared/
  if (/^\//.test(relativePath)) {
    paths.shift();
    file = webapp.buildDirectoryFile.clone();
  } else {
    file = htmlFile.parent.clone();
  }

  paths.forEach(function appendPath(name) {
    if (name === '..') {
      file = file.parent;
      return;
    }
    file.append(name);
    if (utils.isSubjectToBranding(file.path)) {
      file.append((config.OFFICIAL == 1) ? 'official' : 'unofficial');
    }
  });

  try {
    return utils.getFileContent(file);
  } catch (e) {
    dump(file.path + ' could not be found.\n');
    return '';
  }
}

/**
 * Aggregates javascript files by type to reduce the IO overhead.
 * Depending on the script tags there are two files made:
 *
 * - defered scripts (<script defer src= ...) :
 *    $(utils.Gaia.aggregatePrefix)defer_$(html_filename).js
 *
 * - normal scripts (<script src=...) :
 *    $(utils.Gaia.aggregatePrefix)$(html_filename).js
 *
 *
 * Also it is possible to skip aggregation on a per script basis:
 *
 *    <script src="..." data-skip-optimize defer></script>
 *
 *
 * This function is somewhat conservative about what it will aggregate and will
 * only group scripts found the documents <head> section.
 *
 * @param {HTMLDocument} doc DOM document of the file.
 * @param {Object} webapp details of current web app.
 * @param {NSFile} htmlFile filename/path of the document.
 */
function optimize_aggregateJsResources(doc, webapp, htmlFile) {
  if (config.GAIA_OPTIMIZE !== '1' ||
      JS_AGGREGATION_BLACKLIST.indexOf(webapp.sourceDirectoryName) >= 0)
    return;

  dump(
    '[optimize] aggregating javascript for : "' +
    webapp.sourceDirectoryName + '" \n'
  );

  // Everyone should be putting their scripts in head with defer.
  // The best case is that only l10n.js is put into a normal.
  let scripts = Array.slice(
    doc.head.querySelectorAll('script[src]')
  );

  let deferred = {
    prefix: 'defer_',
    content: '',
    lastNode: null
  };

  let normal = {
    prefix: '',
    content: '',
    lastNode: null
  };

  scripts.forEach(function(script, idx) {
    let html = script.outerHTML;

    // per-script out see comment in function header.
    if ('skipOptimize' in script.dataset) {
      // remove from scripts so it will not be commented out...
      debug(
        '[optimize ' + webapp.sourceDirectoryName + '] ' +
        'skipping script "' + html + '"'
      );
      scripts.splice(idx, 1);
      return;
    }

    // we inject the whole outerHTML into the comment for debugging so
    // if there is something valuable in the html that effects the script
    // that broke the app it should be fairly easy to tell what happened.
    let content = '; /* "' + html + ' "*/\n\n';

    // fetch the whole file append it to the comment.
    content += optimize_getFileContent(webapp, htmlFile, script.src);

    // Let's minify the scripts file in order to save some spaces
    // and to make parser's life better.
    try {
      content = JSMin(content).code;
    } catch (e) {
      debug('Failed to minify content: ' + e);
    }

    let config = normal;

    if (script.defer)
      config = deferred;

    config.content += content;
    config.lastNode = script;

    // some apps (email) use version in the script types
    //  (text/javascript;version=x).
    //
    // If we don't have the same version in the aggregate the
    //  app will not load correctly.
    if (script.type.indexOf('version') !== -1) {
      config.type = script.type;
    }
  });

  // root name like index or oncall, etc...
  let baseName = htmlFile.path.split('/').pop().split('.')[0];

  // used as basis for aggregated scripts...
  let rootDirectory = htmlFile.parent;

  // the above will yield something like: '', '/facebook/', '/contacts/', etc...

  function writeAggregatedScript(conf) {
    // skip if we don't have any content to write.
    if (!conf.content)
      return;

    var gaia = utils.gaia.getInstance(config);
    // prefix the file we are about to write content to.
    let scriptBaseName = gaia.aggregatePrefix + conf.prefix + baseName + '.js';

    let target = rootDirectory.clone();
    target.append(scriptBaseName);

    debug('writing aggregated source file: ' + target.path);

    // write the contents of the aggregated script
    utils.writeContent(target, conf.content);

    let script = doc.createElement('script');
    let lastScript = conf.lastNode;

    script.src = './' + scriptBaseName;
    script.defer = lastScript.defer;
    // use the conf's type if given (for text/javascript;version=x)
    script.type = conf.type || lastScript.type;

    debug('writing to path="' + target.path + '" src="' + script.src + '"');

    // insert after the last script node of this type...
    let parent = lastScript.parentNode;
    parent.insertBefore(script, lastScript.nextSibling);
  }

  writeAggregatedScript(deferred);
  writeAggregatedScript(normal);

  function commentScript(script) {
    script.outerHTML = '<!-- ' + script.outerHTML + ' -->';
  }

  // comment out all scripts
  scripts.forEach(commentScript);
}

/**
 * Append values to the global object on the page
 *
 * @param {HTMLDocument} doc DOM document of the file.
 * @param {Object} globals dictionary containing the appended globals.
 */
function optimize_embedGlobals(doc, globals) {
  var script = doc.createElement('script');
  var content = '';
  for (var key in globals) {
    content += 'window.' + key + '="' + globals[key] + '";';
  }
  script.innerHTML = content;
  doc.documentElement.appendChild(script);
}

/**
 * Inline and minify all css/script resources on the page
 *
 * @param {HTMLDocument} doc DOM document of the file.
 * @param {Object} webapp details of current web app.
 * @param {String} path of the file to inline (verify whitelist)
 * @param {NSFile} htmlFile filename/path of the document.
 */
function optimize_inlineResources(doc, webapp, filePath, htmlFile) {
  var appName = webapp.sourceDirectoryName;
  var fileName = filePath.split('/').pop();
  if (!INLINE_WHITELIST[appName] ||
      INLINE_WHITELIST[appName].indexOf(fileName) === -1) {
    return;
  }

  dump(
    'inlining resources for : "' +
    appName + '/' + fileName + '" \n'
  );

  // inline javascript
  let scripts = Array.slice(doc.querySelectorAll('script[src]'));
  scripts.forEach(function(oldScript) {
    let newScript = doc.createElement('script');
    let content = optimize_getFileContent(webapp, htmlFile, oldScript.src);
    try {
      content = JSMin(content).code;
    } catch (e) {
      dump('Error minifying content: ' + htmlFile.path);
    }
    newScript.innerHTML = content;
    if (oldScript.hasAttribute('defer')) {
      doc.documentElement.appendChild(newScript);
    } else {
      oldScript.parentNode.insertBefore(newScript, oldScript);
    }
    oldScript.parentNode.removeChild(oldScript);
  });

  // add the system manifest url to our global object for net_error
  // see: https://bugzilla.mozilla.org/show_bug.cgi?id=959800#c8
  optimize_embedGlobals(doc, {
    SYSTEM_MANIFEST: 'app://system.' + config.GAIA_DOMAIN + '/manifest.webapp'
  });

  // inline stylesheets
  let styles = Array.slice(doc.querySelectorAll('link[rel="stylesheet"]'));
  styles.forEach(function(oldStyle) {
    let cssPath = oldStyle.href.split('/').slice(0, -1).join('/');
    let newStyle = doc.createElement('style');
    newStyle.rel = 'stylesheet';
    newStyle.type = 'text/css';
    let content = optimize_getFileContent(webapp, htmlFile,
                                                 oldStyle.href);
    // inline css image url references
    newStyle.innerHTML = content.replace(/url\(([^)]+?)\)/g, function(match, url) {
      let file = utils.getFile(webapp.buildDirectoryFile.path, cssPath, url);
      return match.replace(url, utils.getFileAsDataURI(file));
    });
    oldStyle.parentNode.insertBefore(newStyle, oldStyle);
    oldStyle.parentNode.removeChild(oldStyle);
  });
}

/**
 * Part of our polyfill for web components
 * Inserts components into the DOM as comment nodes
 * @param {HTMLDocument} doc DOM document of the file.
 * @param {Object} webapp details of current web app.
 */
function optimize_embedHtmlImports(doc, webapp, htmlFile) {
  let imports = doc.querySelectorAll('link[rel="import"]');
  if (!imports.length) {
    return;
  }

  // Mapping of all custom element templates
  var elementTemplates = {};

  Array.prototype.forEach.call(imports, function eachImport(eachImport) {
    let content = optimize_getFileContent(webapp, htmlFile, eachImport.href);
    content = '<div>' + content + '</div>';
    let elementRoot = utils.getDocument(content);
    let elements = elementRoot.querySelectorAll('element');

    // Remove import node from doc
    eachImport.parentNode.removeChild(eachImport);

    for (let i = 0, iLen = elements.length; i < iLen; i++) {
      var element = elements[i];
      var template = element.querySelector('template');
      elementTemplates[element.getAttribute('name')] = template.innerHTML;
    }
  });

  // Insert comment node
  var replaceableElements = doc.querySelectorAll('*[is]');
  Array.prototype.forEach.call(replaceableElements, function eachEl(el) {
    el.innerHTML = '<!--' + elementTemplates[el.getAttribute('is')] + '-->';
    el.removeAttribute('is');
  });
}

/**
 * Creates a dictionary for all l10n entities that are required by the HTML
 * document, and include it as an inline JSON.
 *
 * @param {HTMLDocument} doc DOM document of the file.
 * @param {Object} dictionary minimal set of strings required to translate all
 *                            elements in the HTML document that use
 *                            data-l10n-id attributes.
 */
function optimize_embedL10nResources(doc, dictionary) {
  if (config.GAIA_INLINE_LOCALES !== '1')
    return;

  // split the l10n dictionary on a per-locale basis,
  // and embed it in the HTML document by enclosing it in <script> nodes.
  for (let lang in dictionary) {
    // skip to the next language if the dictionary is null
    if (!dictionary[lang]) {
      continue;
    }

    let script = doc.createElement('script');
    script.type = 'application/l10n';
    script.lang = lang;
    script.innerHTML = '\n  ' + JSON.stringify(dictionary[lang]) + '\n';
    doc.documentElement.appendChild(script);
  }
}

/**
 * Replaces all external l10n resource nodes by a single link:
 * <link type="application/l10n" href="/locales-obj/{{locale}}.json" />,
 * and merge the document dictionary into the webapp dictionary.
 *
 * @param {HTMLDocument} doc DOM document of the file.
 * @param {Object} webapp details of current web app.
 * @param {Object} dictionary full, multi-locale dictionary containing all
 *                            strings that are loaded by the HTML document.
 */
function optimize_concatL10nResources(doc, webapp, dictionary) {
  if (config.GAIA_CONCAT_LOCALES !== '1')
    return;

  var resources = doc.querySelectorAll('link[type="application/l10n"]');
  if (resources.length) {
    let parentNode = resources[0].parentNode;
    let fetch = false;
    for (let i = 0; i < resources.length; i++) {
      let link = resources[i];
      link.parentNode.removeChild(link);
      // if any l10n link does no have the no-fetch
      // attribute we will embed the locales json link
      if (!link.hasAttribute('data-no-fetch')) {
        fetch = true;
      }
    }
    if (fetch) {
      let jsonLink = doc.createElement('link');
      jsonLink.href = '/locales-obj/{{locale}}.json';
      jsonLink.type = 'application/l10n';
      jsonLink.rel = 'prefetch';
      parentNode.appendChild(jsonLink);
    }
  }

  // merge the l10n dictionary into webapp.dictionary
  for (let lang in dictionary) {
    for (let id in dictionary[lang]) {
      webapp.dictionary[lang][id] = dictionary[lang][id];
    }
  }
}

/**
 * Writes an HTML document to disk.
 *
 * @param {HTMLDocument} doc DOM document of the file.
 * @param {NSFile} file filename/path of the document.
 */
function optimize_serializeHTMLDocument(doc, file) {
  debug('saving: ' + file.path);

  // the doctype string should always be '<!DOCTYPE html>' but just in case...
  let doctypeStr = '';
  let dt = doc.doctype;
  if (dt && dt.name) {
    doctypeStr = '<!DOCTYPE ' + dt.name;
    if (dt.publicId) {
      doctypeStr += ' PUBLIC ' + dt.publicId;
    }
    if (dt.systemId) {
      doctypeStr += ' ' + dt.systemId;
    }
    doctypeStr += '>\n';
  }

  // outerHTML breaks the formating, so let's use innerHTML instead
  let htmlStr = '<html';
  let docElt = doc.documentElement;
  let attrs = docElt.attributes;
  for (let i = 0; i < attrs.length; i++) {
    htmlStr += ' ' + attrs[i].nodeName.toLowerCase() +
               '="' + attrs[i].nodeValue + '"';
  }
  let innerHTML = docElt.innerHTML.replace(/  \n*<\/body>\n*/, '  </body>\n');
  htmlStr += '>\n  ' + innerHTML + '\n</html>\n';

  utils.writeContent(file, doctypeStr + htmlStr);
}

/**
 * Optimizes the JS and l10n resources for an HTML document in a webapp.
 *
 * @param {Object} webapp details of current web app.
 * @param {NSFile} file filename/path of the HTML document.
 * @param {Function} callback function to trigger when all optimizations are
 *                            done for this HTML document.
 */
function optimize_compile(webapp, file, callback) {
  let mozL10n = win.navigator.mozL10n;
  let processedLocales = 0;

  /**
   * For each HTML file, we retrieve two multi-locale dictionaries:
   *
   *  - subDict (used with config.GAIA_INLINE_LOCALES)
   *    = minimal set of strings required to translate all HTML elements that
   *    use data-l10n-id attributes; it gets embedded in the HTML document.
   *
   *  - fullDict (used with config.GAIA_CONCAT_LOCALES)
   *    = full set of all l10n strings that are loaded by the HTML document,
   *    including subDict and all strings that are used dynamically from JS;
   *    it gets merged into webapp.dictionary.
   */
  let subDict = newDictionary();
  let fullDict = newDictionary();

  // configure mozL10n.getDictionary to skip the default locale when populating
  // subDicts
  let getDictionary = mozL10n.getDictionary.bind(mozL10n,
                                                 config.GAIA_DEFAULT_LOCALE);

  // catch console.[log|warn|info] calls and redirect them to `dump()'
  // XXX for some reason, this won't work if gDEBUG >= 2 in l10n.js
  function optimize_dump(str) {
    dump(file.path.replace(config.GAIA_DIR, '') + ': ' + str + '\n');
  }

  win.console = {
    log: optimize_dump,
    warn: optimize_dump,
    info: optimize_dump
  };

  // catch the XHR in `loadResource' and use a local file reader instead
  win.XMLHttpRequest = function() {

    function open(type, url, async) {
      debug('loadResource: ' + url);
      this.status = 200;
      this.responseText = optimize_getFileContent(webapp, file, url);
    }

    function addEventListener(type, cb) {
      if (type === 'load') {
        this.onload = cb;
      }
    }

    function send() {
      this.onload({
        'target': {
          'status': this.status,
          'responseText': this.responseText,
        }
      });
    }

    return {
      open: open,
      send: send,
      addEventListener: addEventListener,
      onload: null,
    };
  };

  // load and parse the HTML document
  win.document = utils.getDocument(utils.getFileContent(file));

  // If this HTML document uses l10n.js, pre-localize it --
  //   note: a document can use l10n.js by including either l10n.js or
  //   application/l10n resource link elements (see /shared/js/lazy_l10n.js).
  if ((win.document.querySelector('script[src$="l10n.js"]') ||
      win.document.querySelector('link[type$="application/l10n"]')) &&
      L10N_OPTIMIZATION_BLACKLIST.indexOf(webapp.sourceDirectoryName) < 0) {
    // selecting a language triggers `XMLHttpRequest' and `dispatchEvent' above
    debug('localizing: ' + file.path);

    // if LOCALE_BASEDIR is set, we're going to show missing strings at
    // buildtime.
    var debugL10n = config.LOCALE_BASEDIR != "";

    // since l10n.js was read before the document was created, we need to
    // explicitly initialize it again via mozL10n.bootstrap, which looks for
    // *.ini links in the HTML and sets up the localization context
    mozL10n.bootstrap(function() {
      let docElt = win.document.documentElement;

      while (processedLocales < l10nLocales.length) {
        debug('fireL10nReadyEvent - ' +
              processedLocales + '/' + l10nLocales.length);

        // change the language of the localization context
        mozL10n.ctx.requestLocales(l10nLocales[processedLocales]);

        // create JSON dicts for the current language; one for the <script> tag
        // embedded in HTML and one for locales-obj/
        subDict[mozL10n.language.code] = getDictionary(docElt);
        fullDict[mozL10n.language.code] = getDictionary();

        processedLocales++;
      }

      // we expect the last locale to be the default one:
      // pretranslate the document and set its lang/dir attributes
      mozL10n.translate();

      // save localized / optimized document
      let newFile = new FileUtils.File(file.path + '.' +
                                       config.GAIA_DEFAULT_LOCALE);
      optimize_embedHtmlImports(win.document, webapp, newFile);
      optimize_embedL10nResources(win.document, subDict);
      optimize_concatL10nResources(win.document, webapp, fullDict);
      optimize_aggregateJsResources(win.document, webapp, newFile);
      optimize_inlineResources(win.document, webapp, file.path, newFile);
      optimize_serializeHTMLDocument(win.document, newFile);

      // notify the world that this HTML document has been optimized
      callback();
    }, debugL10n);
  } else {
    callback();
  }
}


function execute(options) {
  /**
   * Pre-translate all HTML files for the default locale
   */

  debug('Begin');
  config = options;

  Services.scriptloader.loadSubScript('file:///' + config.GAIA_DIR +
      '/shared/js/l10n.js?reload=' + new Date().getTime(), win);
  Services.scriptloader.loadSubScript('file:///' + config.GAIA_DIR +
      '/build/l10n.js?reload=' + new Date().getTime(), win);
  Services.scriptloader.loadSubScript('file:///' + config.GAIA_DIR +
      '/build/jsmin.js?reload=' + new Date().getTime(), scope);
  JSMin = scope.JSMin;
  l10nLocales = [config.GAIA_DEFAULT_LOCALE];

  if (config.GAIA_INLINE_LOCALES === '1' ||
      config.GAIA_CONCAT_LOCALES === '1') {
    l10nLocales = [];

    // LOCALES_FILE is a relative path by default:
    // shared/resources/languages.json
    // -- but it can be an absolute path when doing a multilocale build.
    let file = utils.resolve(config.LOCALES_FILE,
      config.GAIA_DIR);
    let locales = JSON.parse(utils.getFileContent(file));

    // ensure the default locale comes last in `l10nLocales'.
    for (let lang in locales) {
      if (lang != config.GAIA_DEFAULT_LOCALE) {
        l10nLocales.push(lang);
      }
    }
    l10nLocales.push(config.GAIA_DEFAULT_LOCALE);
  }

  utils.gaia.getInstance(config).webapps.forEach(function(webapp) {
    // if BUILD_APP_NAME isn't `*`, we only accept one webapp
    if (config.BUILD_APP_NAME != '*' &&
      webapp.sourceDirectoryName != config.BUILD_APP_NAME)
      return;

    debug(webapp.sourceDirectoryName);

    let filesToProcess = [];
    webapp.dictionary = newDictionary();

    function writeDictionaries() {
      if (filesToProcess.length || config.GAIA_CONCAT_LOCALES !== '1')
        return;

      // all HTML documents in the webapp have been optimized:
      // create one concatenated l10n file per locale for all HTML documents

      // create the /locales-obj directory if necessary
      let localeObjDir = webapp.buildDirectoryFile.clone();
      let reserved = {};
      localeObjDir.append('locales-obj');
      utils.ensureFolderExists(localeObjDir);

      // create all JSON dictionaries in /locales-obj
      for (let lang in webapp.dictionary) {
        let file = localeObjDir.clone();
        file.append(lang + '.json');
        utils.writeContent(file, JSON.stringify(webapp.dictionary[lang]));
        reserved[file.leafName] = true;
      }

      utils.ls(localeObjDir, true).forEach(function(file) {
        var fname = file.leafName
        if (utils.getExtension(fname) === 'json' && !reserved[fname]) {
          file.remove(false);
        }
      });

      let localeDir = webapp.buildDirectoryFile.clone();
      localeDir.append('locales');
      // FIXME 999903: locales directory won't be removed if DEBUG=1 because we
      // need l10n properties file in build_stage to get l10n string in DEBUG
      // mode.
      if (localeDir.exists() && options.DEBUG !== 1) {
        localeDir.remove(true);
      }
      let sharedLocaleDir = webapp.buildDirectoryFile.clone();
      sharedLocaleDir.append('shared');
      sharedLocaleDir.append('locales');
      // FIXME 999903: locales directory won't be removed if DEBUG=1 because we
      // need l10n properties file in build_stage to get l10n string in DEBUG
      // mode.
      if (sharedLocaleDir.exists() && options.DEBUG !== 1) {
        sharedLocaleDir.remove(true);
      }
    }

    // optimize all HTML documents in the webapp
    let files = utils.ls(webapp.buildDirectoryFile, true, /^(shared|tests?)$/);

    // We need to optimize shared pages as well
    let sharedPagesDir = webapp.buildDirectoryFile.clone();
    sharedPagesDir.append('shared');
    sharedPagesDir.append('pages');
    let filesSharedPages = utils.ls(sharedPagesDir, true);
    files = files.concat(filesSharedPages);
    files.forEach(function(file) {
      if (/\.html$/.test(file.leafName)) {
        filesToProcess.push(file);
      }
    });
    while (filesToProcess.length) {
      optimize_compile(webapp, filesToProcess.pop(), writeDictionaries);
    }
  });

  debug('End');
}

exports.execute = execute;
