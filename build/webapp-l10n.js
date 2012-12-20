
function debug(str) {
  //dump(' -*- webapp-l10n.js: ' + str + '\n');
}


/**
 * Helpers
 */

var webL10n = {
  navigator: {
    language: GAIA_DEFAULT_LOCALE
  }
};

function l10n_getFileContent(appName, relativePath) {
  let paths = relativePath.replace(/^\//, '').split('/');
  let firstDir = paths.shift();
  let file = (firstDir == 'shared') ? getFile(GAIA_DIR, firstDir) :
    getFile(GAIA_DIR, 'apps', appName, firstDir);

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

function l10n_serializeHTMLDocument(file, document) {
  debug('saving: ' + file.path);

  // the doctype string should always be '<!DOCTYPE html>' but just in case...
  let doctypeStr = '';
  let dt = document.doctype;
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
  let docElt = document.documentElement;
  let attrs = docElt.attributes;
  for (let i = 0; i < attrs.length; i++) {
    htmlStr += ' ' + attrs[i].nodeName.toLowerCase() +
               '="' + attrs[i].nodeValue + '"';
  }
  var innerHTML = docElt.innerHTML.replace(/  \n\n\n<\/body>$/, '  </body>');
  htmlStr += '>\n  ' + innerHTML + '\n</html>\n';

  writeContent(file, doctypeStr + htmlStr);
}

function l10n_compile(webapp, file) {
  debug('localizing: ' + file.path);

  // catch console.[log|warn|info] calls and redirect them to `dump()'
  // XXX for some reason, this won't work if gDEBUG >= 2 in l10n.js
  function l10n_dump(str) {
    dump('apps/' + webapp.sourceDirectoryName + ': ' + str + '\n');
  }
  webL10n.console = { log: l10n_dump, warn: l10n_dump, info: l10n_dump };

  // catch the XHR in `loadResource' and use a local file reader instead
  webL10n.XMLHttpRequest = function() {
    debug('loadResource');

    function open(type, url, async) {
      this.readyState = 4;
      this.status = 200;
      this.responseText = l10n_getFileContent(webapp.sourceDirectoryName, url);
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
  webL10n.dispatchEvent = function() {
    debug('fireL10nReadyEvent');

    var mozL10n = webL10n.navigator.mozL10n;

    // set the lang/dir attributes of the current document
    let docElt = webL10n.document.documentElement;
    docElt.dir = mozL10n.language.direction;
    docElt.lang = mozL10n.language.code;

    // save localized document
    let newPath = file.path + '.' + docElt.lang;
    let newFile = new FileUtils.File(newPath);
    l10n_serializeHTMLDocument(newFile, webL10n.document);
  };

  // load HTML file
  let DOMParser = CC('@mozilla.org/xmlextras/domparser;1', 'nsIDOMParser');
  webL10n.document = (new DOMParser()).parseFromString(getFileContent(file),
      'text/html');

  // l10n.js only translates immediatly when the document looks ready --
  // but as `readyState' is not configurable, we have to use `defineProperty'.
  Object.defineProperty(webL10n.document, 'readyState', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: 'complete'
  });

  // load and evaluate the l10n.js library that will process the document
  // and call dispatchEvent on completion
  Services.scriptloader.loadSubScript('file:///' +
    GAIA_DIR + '/shared/js/l10n.js', webL10n);
}


/**
 * Pre-translate all HTML files for the default locale
 */

debug('Begin');

Gaia.webapps.forEach(function(webapp) {
  // if BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (BUILD_APP_NAME != '*' && webapp.sourceDirectoryName != BUILD_APP_NAME)
    return;

  debug(webapp.sourceDirectoryName);

  let files = ls(webapp.sourceDirectoryFile, true);
  files.forEach(function(file) {
    if (/\.html$/.test(file.leafName)) {
      l10n_compile(webapp, file);
    }
  });
});

debug('End');

