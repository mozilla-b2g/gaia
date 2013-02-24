
function debug(str) {
  //dump(' -*- webapp-optimize.js: ' + str + '\n');
}

/**
 * Expose a global `win' object and load `l10n.js' in it --
 * note: the `?reload' trick ensures we don't load a cached `l10njs' library.
 */

var win = { navigator: {} };
Services.scriptloader.loadSubScript('file:///' + GAIA_DIR +
    '/shared/js/l10n.js?reload=' + new Date().getTime(), win);


let scope = {};
Services.scriptloader.loadSubScript('file:///' + GAIA_DIR +
    '/build/jsmin.js?reload=' + new Date().getTime(), scope);
const { JSMin } = scope;

/**
 * Locale list -- by default, only the default one
 */

var l10nLocales = [GAIA_DEFAULT_LOCALE];
var l10nDictionary = {
  locales: {},
  default_locale: GAIA_DEFAULT_LOCALE
};
l10nDictionary.locales[GAIA_DEFAULT_LOCALE] = {};

/**
 * whitelist by app name for javascript asset aggregation.
 */
const JS_AGGREGATION_BLACKLIST = [
  // https://bugzilla.mozilla.org/show_bug.cgi?id=839574
  'system'
];

/**
 * Helpers
 */

function optimize_getFileContent(webapp, htmlFile, relativePath) {
  let paths = relativePath.split('/');
  let file;

  // get starting directory: webapp root, HTML file or /shared/
  if (/^\//.test(relativePath)) {
    paths.shift();
    file = webapp.sourceDirectoryFile.clone();
  } else {
    file = htmlFile.parent.clone();
  }
  if (paths[0] == 'shared') {
    file = getFile(GAIA_DIR);
  }

  paths.forEach(function appendPath(name) {
    file.append(name);
    if (isSubjectToBranding(file.path)) {
      file.append((OFFICIAL == 1) ? 'official' : 'unofficial');
    }
  });

  try {
    return getFileContent(file);
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
 *    $(Gaia.aggregatePrefix)defer_$(html_filename).js
 *
 * - normal scripts (<script src=...) :
 *    $(Gaia.aggregatePrefix)$(html_filename).js
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
    } catch(e) {
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

  // find the absolute root of the app's html file.
  let rootUrl = htmlFile.parent.path;
  rootUrl = rootUrl.replace(webapp.manifestFile.parent.path, '');
  // the above will yield something like: '', '/facebook/', '/contacts/', etc...

  function writeAggregatedScript(config) {
    // skip if we don't have any content to write.
    if (!config.content)
      return;

    // prefix the file we are about to write content to.
    let scriptBaseName =
      Gaia.aggregatePrefix + config.prefix + baseName + '.js';

    let target = rootDirectory.clone();
    target.append(scriptBaseName);

    debug('writing aggregated source file: ' + target.path);

    // write the contents of the aggregated script
    writeContent(target, config.content);

    let script = doc.createElement('script');
    let lastScript = config.lastNode;

    script.src = rootUrl + '/' + scriptBaseName;
    script.defer = lastScript.defer;
    // use the config's type if given (for text/javascript;version=x)
    script.type = config.type || lastScript.type;

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

function optimize_embedl10nResources(doc, dictionary) {
  // remove all external l10n resource nodes
  var resources = doc.querySelectorAll('link[type="application/l10n"]');
  for (let i = 0; i < resources.length; i++) {
    let res = resources[i].outerHTML;
    resources[i].outerHTML = '<!-- ' + res + ' -->';
  }

  // put the current dictionary in an inline JSON script
  let script = doc.createElement('script');
  script.type = 'application/l10n';
  script.innerHTML = '\n  ' + JSON.stringify(dictionary) + '\n';
  doc.documentElement.appendChild(script);
}

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

  writeContent(file, doctypeStr + htmlStr);
}

function optimize_compile(webapp, file) {
  let mozL10n = win.navigator.mozL10n;

  let processedLocales = 0;
  let dictionary = l10nDictionary;

  // catch console.[log|warn|info] calls and redirect them to `dump()'
  // XXX for some reason, this won't work if gDEBUG >= 2 in l10n.js
  function optimize_dump(str) {
    dump(file.path.replace(GAIA_DIR, '') + ': ' + str + '\n');
  }

  win.console = {
    log: optimize_dump,
    warn: optimize_dump,
    info: optimize_dump
  };

  // catch the XHR in `loadResource' and use a local file reader instead
  win.XMLHttpRequest = function() {
    debug('loadResource');

    function open(type, url, async) {
      this.readyState = 4;
      this.status = 200;
      this.responseText = optimize_getFileContent(webapp, file, url);
    }

    function send() {
      this.onreadystatechange();
    }

    return {
      open: open,
      send: send,
      onreadystatechange: null
    };
  };

  // catch the `localized' event dispatched by `fireL10nReadyEvent()'
  win.dispatchEvent = function() {
    processedLocales++;
    debug('fireL10nReadyEvent - ' +
        processedLocales + '/' + l10nLocales.length);

    let docElt = win.document.documentElement;
    dictionary.locales[mozL10n.language.code] = mozL10n.dictionary;

    if (processedLocales < l10nLocales.length) {
      // load next locale
      mozL10n.language.code = l10nLocales[processedLocales];
    } else {
      // we expect the last locale to be the default one:
      // set the lang/dir attributes of the current document
      docElt.dir = mozL10n.language.direction;
      docElt.lang = mozL10n.language.code;

      // save localized document
      let newPath = file.path + '.' + GAIA_DEFAULT_LOCALE;
      let newFile = new FileUtils.File(newPath);
      optimize_embedl10nResources(win.document, dictionary);

      if (GAIA_OPTIMIZE == 1 &&
          JS_AGGREGATION_BLACKLIST.indexOf(webapp.sourceDirectoryName) === -1) {
        optimize_aggregateJsResources(win.document, webapp, newFile);
        dump(
          '[optimize] aggregating javascript for : "' +
          webapp.sourceDirectoryName + '" \n'
        );
      }

      optimize_serializeHTMLDocument(win.document, newFile);
    }
  };

  // load and parse the HTML document
  let DOMParser = CC('@mozilla.org/xmlextras/domparser;1', 'nsIDOMParser');
  win.document = (new DOMParser()).
      parseFromString(getFileContent(file), 'text/html');

  // if this HTML document uses l10n.js, pre-localize it --
  // selecting a language triggers `XMLHttpRequest' and `dispatchEvent' above
  if (win.document.querySelector('script[src$="l10n.js"]')) {
    debug('localizing: ' + file.path);
    mozL10n.language.code = l10nLocales[processedLocales];
  }
}


/**
 * Pre-translate all HTML files for the default locale
 */

debug('Begin');

if (GAIA_INLINE_LOCALES === '1') {
  l10nLocales = [];
  l10nDictionary.locales = {};

  // LOCALES_FILE is a relative path by default: shared/resources/languages.json
  // -- but it can be an absolute path when doing a multilocale build.
  // LOCALES_FILE is using unix separator, ensure working fine on win32
  let abs_path_chunks = [GAIA_DIR].concat(LOCALES_FILE.split('/'));
  let file = getFile.apply(null, abs_path_chunks);
  if (!file.exists()) {
    file = getFile(LOCALES_FILE);
  }
  let locales = JSON.parse(getFileContent(file));

  // we keep the default locale order for `l10nDictionary.locales',
  // but we ensure the default locale comes last in `l10nLocales'.
  for (let lang in locales) {
    if (lang != GAIA_DEFAULT_LOCALE) {
      l10nLocales.push(lang);
    }
    l10nDictionary.locales[lang] = {};
  }
  l10nLocales.push(GAIA_DEFAULT_LOCALE);
}

Gaia.webapps.forEach(function(webapp) {
  // if BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (BUILD_APP_NAME != '*' && webapp.sourceDirectoryName != BUILD_APP_NAME)
    return;

  debug(webapp.sourceDirectoryName);

  let files = ls(webapp.sourceDirectoryFile, true, /^(shared|tests?)$/);
  files.forEach(function(file) {
    if (/\.html$/.test(file.leafName)) {
      optimize_compile(webapp, file);
    }
  });
});

debug('End');
