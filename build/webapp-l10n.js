
function debug(str) {
  //dump(' -*- webapp-l10n.js: ' + str + '\n');
}


/**
 * Expose a global `l10nTarget' object and load `l10n.js' in it --
 * note: the `?reload' trick ensures we don't load a cached `l10njs' library.
 */

var l10nTarget = { navigator: {} };
Services.scriptloader.loadSubScript('file:///' + GAIA_DIR +
    '/shared/js/l10n.js?reload=' + new Date().getTime(), l10nTarget);


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
 * Helpers
 */

function l10n_getFileContent(webapp, htmlFile, relativePath) {
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

function l10n_embedExternalResources(doc, dictionary) {
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

function l10n_serializeHTMLDocument(doc, file) {
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

function l10n_compile(webapp, file) {
  let mozL10n = l10nTarget.navigator.mozL10n;

  let processedLocales = 0;
  let dictionary = l10nDictionary;

  // catch console.[log|warn|info] calls and redirect them to `dump()'
  // XXX for some reason, this won't work if gDEBUG >= 2 in l10n.js
  function l10n_dump(str) {
    dump(file.path.replace(GAIA_DIR, '') + ': ' + str + '\n');
  }
  l10nTarget.console = { log: l10n_dump, warn: l10n_dump, info: l10n_dump };

  // catch the XHR in `loadResource' and use a local file reader instead
  l10nTarget.XMLHttpRequest = function() {
    debug('loadResource');

    function open(type, url, async) {
      this.readyState = 4;
      this.status = 200;
      this.responseText = l10n_getFileContent(webapp, file, url);
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
  l10nTarget.dispatchEvent = function() {
    processedLocales++;
    debug('fireL10nReadyEvent - ' +
        processedLocales + '/' + l10nLocales.length);

    let docElt = l10nTarget.document.documentElement;
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
      l10n_embedExternalResources(l10nTarget.document, dictionary);
      l10n_serializeHTMLDocument(l10nTarget.document, newFile);
    }
  };

  // load and parse the HTML document
  let DOMParser = CC('@mozilla.org/xmlextras/domparser;1', 'nsIDOMParser');
  l10nTarget.document = (new DOMParser()).
      parseFromString(getFileContent(file), 'text/html');

  // if this HTML document uses l10n.js, pre-localize it --
  // selecting a language triggers `XMLHttpRequest' and `dispatchEvent' above
  if (l10nTarget.document.querySelector('script[src$="l10n.js"]')) {
    debug('localizing: ' + file.path);
    mozL10n.language.code = l10nLocales[processedLocales];
  }
}


/**
 * Pre-translate all HTML files for the default locale
 */

debug('Begin');

if (GAIA_INLINE_LOCALES) {
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
      l10n_compile(webapp, file);
    }
  });
});

debug('End');

