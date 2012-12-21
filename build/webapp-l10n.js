
function debug(str) {
  //dump(' -*- webapp-l10n.js: ' + str + '\n');
}


/**
 * Expose a global `l10nTarget' object and load `l10n.js' in it
 */

var l10nTarget = { navigator: {} };
Services.scriptloader.
    loadSubScript('file:///' + GAIA_DIR + '/shared/js/l10n.js', l10nTarget);


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

function l10n_serializeHTMLDocument(file, doc) {
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
  let innerHTML = docElt.innerHTML.replace(/  \n\n\n<\/body>$/, '  </body>');
  htmlStr += '>\n  ' + innerHTML + '\n</html>\n';

  writeContent(file, doctypeStr + htmlStr);
}

function l10n_compile(webapp, file) {
  let mozL10n = l10nTarget.navigator.mozL10n;

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
    debug('fireL10nReadyEvent');
    let docElt = l10nTarget.document.documentElement;

    // set the lang/dir attributes of the current document
    docElt.dir = mozL10n.language.direction;
    docElt.lang = mozL10n.language.code;

    // save localized document
    let newPath = file.path + '.' + docElt.lang;
    let newFile = new FileUtils.File(newPath);
    l10n_serializeHTMLDocument(newFile, l10nTarget.document);
  };

  // load and parse the HTML document
  let DOMParser = CC('@mozilla.org/xmlextras/domparser;1', 'nsIDOMParser');
  l10nTarget.document = (new DOMParser()).
      parseFromString(getFileContent(file), 'text/html');

  // if this HTML document uses l10n.js, pre-localize it --
  // selecting a language triggers `XMLHttpRequest' and `dispatchEvent' above
  if (l10nTarget.document.querySelector('script[src$="l10n.js"]')) {
    debug('localizing: ' + file.path);
    mozL10n.language.code = GAIA_DEFAULT_LOCALE;
  }
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

  let files = ls(webapp.sourceDirectoryFile, true, /^(shared|tests?)$/);
  files.forEach(function(file) {
    if (/\.html$/.test(file.leafName)) {
      l10n_compile(webapp, file);
    }
  });
});

debug('End');

