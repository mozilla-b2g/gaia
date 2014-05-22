/*global exports, require*/
'use strict';
/**
 * webpp-optimize will do below things.
 * 1. Inline embeded html from <link rel="import" href="test.html" name="name">
 *    into html and commented (<!--CONTENT-->).
 * 2. Embed l10n resource in script tag to html.
 * 3. Concat l10n resource to json files and put them as link and attach to 
 *    html.
 * 4. Aggregate and uglify all JS/CSS files used in html to one JS file.
 * 5. Optimize inline JS/CSS content.
 */

var utils = require('./utils');
var jsmin = require('./jsmin');
var cssmin = require('./cssmin');

/**
 * HTMLOptimizer will optimize all the resources of HTML, including javascripts,
 * 
 */
var HTMLOptimizer = function(options) {
  this.htmlFile = options.htmlFile;
  this.webapp = options.webapp;
  this.config = options.config;
  this.win = options.win;
  this.locales = options.locales;
  this.optimizeConfig = options.optimizeConfig;

  // When file has done optimized, we call done.
  this.done = options.callback;
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
  this.subDict = utils.cloneJSON(this.webapp.dictionary);
  this.fullDict = utils.cloneJSON(this.webapp.dictionary);
  this.getDictionary = null;

  // Store all optimized files in this list for further handling, like remove.
  this.files = [];
};

HTMLOptimizer.prototype.process = function() {
  var mozL10n = this.win.navigator.mozL10n;
  this.mockWinObj();

  // configure mozL10n.getDictionary to skip the default locale when populating
  // subDicts
  this.getDictionary =
    mozL10n.getDictionary.bind(mozL10n, this.config.GAIA_DEFAULT_LOCALE);

  var ignore = this.optimizeConfig.L10N_OPTIMIZATION_BLACKLIST;
  // If this HTML document uses l10n.js, pre-localize it --
  //   note: a document can use l10n.js by including either l10n.js or
  //   application/l10n resource link elements (see /shared/js/lazy_l10n.js).
  if ((!this.win.document.querySelector('script[src$="l10n.js"]') &&
       !this.win.document.querySelector('link[type$="application/l10n"]')) ||
      ignore[this.webapp.sourceDirectoryName]) {
    this.done(this.files);
    return;
  }

  // Since l10n.js was read before the document was created, we need to
  // explicitly initialize it again via mozL10n.bootstrap, which looks for
  // *.ini links in the HTML and sets up the localization context.
  mozL10n.bootstrap(this._optimize.bind(this),
    // if LOCALE_BASEDIR is set, we're going to show missing strings at
    // buildtime.
    this.config.LOCALE_BASEDIR !== '');
};

HTMLOptimizer.prototype._optimize = function() {
  this._proceedLocales();
  this.embed10nResources();
  this.concatL10nResources();

  this.embedHtmlImports();
  this.aggregateJsResources();
  this.embededGlobals();
  this.inlineJsResources();
  // Below feature will be able to do CSS aggregation. However, we still get
  // problems when trying to aggregate all CSS resources.
  // open bug ###### for it.
  // this.aggregateCSSResources();
  this.inlineCSSResources();

  this.serializeNewHTMLDocumentOutput();

  this.done(this.files);
};

// create JSON dicts for the current language; one for the <script> tag
// embedded in HTML and one for locales-obj/
HTMLOptimizer.prototype._proceedLocales = function() {
  var docElt = this.win.document.documentElement;
  var mozL10n = this.win.navigator.mozL10n;
  var processedLocales = 0;
  while (processedLocales < this.locales.length) {
    // change the language of the localization context
    mozL10n.ctx.requestLocales(this.locales[processedLocales]);

    // create JSON dicts for the current language; one for the <script> tag
    // embedded in HTML and one for locales-obj/
    this.subDict[mozL10n.language.code] = this.getDictionary(docElt);
    this.fullDict[mozL10n.language.code] = this.getDictionary();
    processedLocales++;
  }
  // we expect the last locale to be the default one:
  // set the lang/dir attributes of the current document
  docElt.dir = mozL10n.language.direction;
  docElt.lang = mozL10n.language.code;

  for (var lang in this.fullDict)  {
    for (var id in this.fullDict[lang]) {
      this.webapp.dictionary[lang][id] = this.fullDict[lang][id];
    }
  }
};

/**
 * Part of our polyfill for web components.
 * Inserts components into the DOM as comment nodes.
 * For example,
 * ---- before -----
 * *** test.html ***
 * <element name="test"><template>SOMETHING</template></element>
 *
 * *** index.html ***
 * <link rel="import" href="test.html">
 * <section is="test"></section>
 * 
 * ---- after -----
 * *** index.html *** 
 * <section><!--SOMETHING--></section>
 *
 * Note: one link can have multiple elements, but one lement can only have one
 *       template.
 */
HTMLOptimizer.prototype.embedHtmlImports = function() {
  var doc = this.win.document;
  var imports = doc.querySelectorAll('link[rel="import"]');
  if (!imports.length) {
    return;
  }
  // Mapping of all custom element templates
  var elementTemplates = {};

  Array.prototype.forEach.call(imports, function handleImport(eachImport) {
    var content = this.getFileByRelativePath(eachImport.href).content;
    content = '<div>' + content + '</div>';
    var elementRoot = utils.getDocument(content);
    var elements = elementRoot.querySelectorAll('element');

    // Remove import node from doc
    eachImport.parentNode.removeChild(eachImport);

    // Scan all template in the each element
    Array.prototype.forEach.call(elements, function(element) {
      var template = element.querySelector('template');
      elementTemplates[element.getAttribute('name')] = template.innerHTML;
    });
  }.bind(this));

  var replaceableElements = doc.querySelectorAll('*[is]');
  Array.prototype.forEach.call(replaceableElements, function eachEl(el) {
    el.innerHTML = '<!--' + elementTemplates[el.getAttribute('is')] + '-->';
    el.removeAttribute('is');
  });
};

/**
 * XXXX Bug 101264: this function should not belong to webapp-optimize.
 * Append values to the global object on the page
 */
HTMLOptimizer.prototype.embededGlobals = function() {
  var include = this.optimizeConfig.INLINE_WHITELIST;
  if (!include[this.webapp.sourceDirectoryName] ||
       include[this.webapp.sourceDirectoryName]
         .indexOf(this.htmlFile.leafName) === -1){
    return;
  }
  var doc = this.win.document;
  var script = doc.createElement('script');

  // add the system manifest url to our global object for net_error
  // see: https://bugzilla.mozilla.org/show_bug.cgi?id=959800#c8
  var globals = {
    SYSTEM_MANIFEST: 'app://system.' + this.config.GAIA_DOMAIN +
                     '/manifest.webapp'
  };
  var content = '';
  for (var key in globals) {
    content += 'window.' + key + '="' + globals[key] + '";';
  }
  script.innerHTML = content;
  doc.documentElement.appendChild(script);
};

/**
 * Creates a dictionary for all l10n entities that are required by the HTML
 * document, and include it as an inline JSON.
 */
HTMLOptimizer.prototype.embed10nResources = function() {
  if (this.config.GAIA_INLINE_LOCALES !== '1') {
    return;
  }
  var doc = this.win.document;
  var dictionary = this.subDict;
  // split the l10n dictionary on a per-locale basis,
  // and embed it in the HTML document by enclosing it in <script> nodes.
  for (var lang in dictionary) {
    // skip to the next language if the dictionary is null
    if (!dictionary[lang]) {
      continue;
    }
    var script = doc.createElement('script');
    script.type = 'application/l10n';
    script.lang = lang;
    script.innerHTML = '\n  ' + JSON.stringify(dictionary[lang]) + '\n';
    doc.documentElement.appendChild(script);
  }
};


/**
 * Replaces all external l10n resource nodes by a single link:
 * <link type="application/l10n" href="/locales-obj/{{locale}}.json" />,
 * and merge the document dictionary into the webapp dictionary.
 */
HTMLOptimizer.prototype.concatL10nResources = function() {
  if (this.config.GAIA_CONCAT_LOCALES !== '1') {
    return;
  }

  var doc = this.win.document;
  var resources = doc.querySelectorAll('link[type="application/l10n"]');
  if (!resources.length) {
    return;
  }

  var parentNode = resources[0].parentNode;
  var fetch = false;
  for (var i = 0; i < resources.length; i++) {
    var link = resources[i];
    link.parentNode.removeChild(link);
    // if any l10n link does no have the no-fetch
    // attribute we will embed the locales json link
    if (!link.hasAttribute('data-no-fetch')) {
      fetch = true;
    }
  }
  if (fetch) {
    var jsonLink = doc.createElement('link');
    jsonLink.href = '/locales-obj/{{locale}}.json';
    jsonLink.type = 'application/l10n';
    jsonLink.rel = 'prefetch';
    parentNode.appendChild(jsonLink);
  }
};

/**
 * Aggregates CSS files by type to reduce the IO overhead.
 */
HTMLOptimizer.prototype.aggregateCSSResources = function() {
  var ignore = this.optimizeConfig.CSS_AGGREGATION_BLACKLIST;
  if (this.config.GAIA_OPTIMIZE !== '1' ||
      (ignore[this.webapp.sourceDirectoryName] &&
       ignore[this.webapp.sourceDirectoryName]
         .indexOf(this.htmlFile.leafName) !== -1)){
    return;
  }
  var doc = this.win.document;
  var styles = Array.prototype.slice.call(
    doc.querySelectorAll('link[type="text/css"]'));
  if (!styles.length) {
    return;
  }
  var gaia = utils.gaia.getInstance(this.config);
  var baseName = this.htmlFile.leafName.split('.')[0];
  var styleConfig = {
    fileType: 'link',
    content: '',
    name: gaia.aggregatePrefix + baseName + '.css',
    lastNode: null,
    specs: {
      href: './' + gaia.aggregatePrefix + baseName + '.css',
      rel: 'stylesheet',
      type: 'text/css'
    }
  };
  styles.forEach(function(style, idx) {
    // per-script out see comment in function header.
    if ('skipOptimize' in style.dataset) {
      style.splice(idx, 1);
      return;
    }
    var html = style.outerHTML;
    // we inject the whole outerHTML into the comment for debugging so
    // if there is something valuable in the html that effects the script
    // that broke the app it should be fairly easy to tell what happened.
    var content = '; /* "' + html + ' "*/\n\n';
    // fetch the whole file append it to the comment.
    content += this.getFileByRelativePath(style.href).content;
    try {
      content = cssmin(content);
    } catch (e) {
      utils.log('Failed to minify content: ' + e);
    }

    styleConfig.content += content;
    styleConfig.lastNode = style;
    // some apps (email) use version in the script types
    //  (text/javascript;version=x).
    //

  }, this);
  this.writeAggregatedContent(styleConfig);
  styles.forEach(function commentScript(style) {
    style.outerHTML = '<!-- ' + style.outerHTML + ' -->';
  });
};

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
 * Also it is possible to skip aggregation on a per script basis:
 *
 *    <script src="..." data-skip-optimize defer></script>
 *
 *
 * This function is somewhat conservative about what it will aggregate and will
 * only group scripts found the documents <head> section.
 *
 */
HTMLOptimizer.prototype.aggregateJsResources = function() {
  var ignore = this.optimizeConfig.JS_AGGREGATION_BLACKLIST;
  if (this.config.GAIA_OPTIMIZE !== '1' ||
      (ignore[this.webapp.sourceDirectoryName] &&
        (ignore[this.webapp.sourceDirectoryName]
          .indexOf(this.htmlFile.leafName) !== -1) ||
         ignore[this.webapp.sourceDirectoryName] === '*')){
    return;
  }

  var gaia = utils.gaia.getInstance(this.config);
  var baseName = this.htmlFile.leafName.split('.')[0];
  var deferred = {
    fileType: 'script',
    content: '',
    lastNode: null,
    name: gaia.aggregatePrefix + 'defer_' + baseName + '.js',
    specs: {
      src: './' + gaia.aggregatePrefix + 'defer_' + baseName + '.js'
    }
  };
  var normal = {
    fileType: 'script',
    content: '',
    lastNode: null,
    name: gaia.aggregatePrefix + baseName + '.js',
    specs: {
      src: './' + gaia.aggregatePrefix + baseName + '.js'
    }
  };

  // Everyone should be putting their scripts in head with defer.
  // The best case is that only l10n.js is put into a normal.
  var doc = this.win.document;
  var scripts = Array.prototype.slice.call(
    doc.head.querySelectorAll('script[src]'));
  scripts.forEach(function(script, idx) {
    // per-script out see comment in function header.
    if ('skipOptimize' in script.dataset) {
      scripts.splice(idx, 1);
      return;
    }
    var html = script.outerHTML;
    // we inject the whole outerHTML into the comment for debugging so
    // if there is something valuable in the html that effects the script
    // that broke the app it should be fairly easy to tell what happened.
    var content = '; /* "' + html + ' "*/\n\n';
    // fetch the whole file append it to the comment.
    var scriptFile = this.getFileByRelativePath(script.src);
    content += scriptFile.content;
    try {
      content = jsmin(content).code;
      this.files.push(scriptFile.file);
    } catch (e) {
      utils.log('Failed to minify content: ' + e);
    }

    var scriptConfig = normal;
    if (script.defer) {
      scriptConfig = deferred;
    }
    scriptConfig.content += content;
    scriptConfig.lastNode = script;
    // some apps (email) use version in the script types
    //  (text/javascript;version=x).
    //
    // If we don't have the same version in the aggregate the
    //  app will not load correctly.
    if (script.type.indexOf('version') !== -1) {
      scriptConfig.specs.type = script.type;
    }
  }, this);

  deferred.specs.defer = true;
  this.writeAggregatedContent(deferred);
  this.writeAggregatedContent(normal);

  scripts.forEach(function commentScript(script) {
    script.outerHTML = '<!-- ' + script.outerHTML + ' -->';
  });
};

/**
 * Write aggregated content into one js and mark original script tag of html.
 */
HTMLOptimizer.prototype.writeAggregatedContent = function(conf) {
  if (!conf.content) {
    return;
  }
  var doc = this.win.document;
  // root name like index or oncall, etc...
  //var baseName = this.htmlFile.leafName.split('.')[0];
  // used as basis for aggregated scripts...
  var rootDirectory = this.htmlFile.parent;

  //var gaia = utils.gaia.getInstance(this.config);
  //var scriptBaseName = gaia.aggregatePrefix + conf.prefix + baseName + '.js';
  var target = rootDirectory.clone();
  target.append(conf.name);
  //target.append(scriptBaseName);

  // write the contents of the aggregated script
  utils.writeContent(target, conf.content);
  //var script = doc.createElement('script');
  var file = doc.createElement(conf.fileType);
  var lastScript = conf.lastNode;

  for (var spe in conf.specs) {
    file[spe] = conf.specs[spe];
  }

  //script.src = './' + scriptBaseName;
  //script.defer = lastScript.defer;
  // use the conf's type if given (for text/javascript;version=x)
  //script.type = conf.type || lastScript.type;

  // insert after the last script node of this type...
  var parent = lastScript.parentNode;
  parent.insertBefore(file, lastScript.nextSibling);
};

/**
 * Inline and minify all css/script resources on the page based on
 * INLINE_WHITELIST.
 */
HTMLOptimizer.prototype.inlineJsResources = function() {
  var include = this.optimizeConfig.INLINE_WHITELIST;
  if (!include[this.webapp.sourceDirectoryName] ||
       include[this.webapp.sourceDirectoryName]
         .indexOf(this.htmlFile.leafName) === -1){
    return;
  }
  var doc = this.win.document;
  var scripts = Array.prototype.slice.call(doc.querySelectorAll('script[src]'));
  scripts.forEach(function(oldScript) {
    var newScript = doc.createElement('script');
    var content =
      this.getFileByRelativePath(oldScript.src).content;
    try {
      content = jsmin(content).code;
    } catch (e) {
      utils.log('Error minifying content: ' + this.htmlFile.path);
    }
    newScript.innerHTML = content;
    if (oldScript.hasAttribute('defer')) {
      doc.documentElement.appendChild(newScript);
    } else {
      oldScript.parentNode.insertBefore(newScript, oldScript);
    }
    oldScript.parentNode.removeChild(oldScript);
  }, this);
};

/**
 * Inline and minify all css/script resources on the page based on
 * INLINE_WHITELIST.
 */
HTMLOptimizer.prototype.inlineCSSResources = function() {
  var include = this.optimizeConfig.INLINE_WHITELIST;
  if (!include[this.webapp.sourceDirectoryName] ||
       (include[this.webapp.sourceDirectoryName]
         .indexOf(this.htmlFile.leafName) === -1 &&
        include[this.webapp.sourceDirectoryName] !== '*')) {
    return;
  }
  var doc = this.win.document;
  // inline stylesheets
  var styles = Array.prototype.slice.call(
    doc.querySelectorAll('link[rel="stylesheet"]'));
  styles.forEach(function(oldStyle) {
    var newStyle = doc.createElement('style');
    newStyle.rel = 'stylesheet';
    newStyle.type = 'text/css';
    var css = this.getFileByRelativePath(oldStyle.href);
    // inline css image url references
    var content = css.content.replace(/url\(([^)]+?)\)/g,
      function(match, url) {
        return match.replace(url, utils.getFileAsDataURI(css.file));
      }.bind(this));
    try {
      newStyle.innerHTML = cssmin(content);
    } catch (e) {
      dump(oldStyle.href + ' can not be minified.');
      newStyle.innerHTML = content;
    }
    oldStyle.parentNode.insertBefore(newStyle, oldStyle);
    oldStyle.parentNode.removeChild(oldStyle);
  }, this);
};

/**
 * Write the optimized result into html file.
 */
HTMLOptimizer.prototype.serializeNewHTMLDocumentOutput = function() {
  var doc = this.win.document;
  // the doctype string should always be '<!DOCTYPE html>' but just in case...
  var doctypeStr = '';
  var dt = doc.doctype;
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
  var htmlStr = '<html';
  var docElt = doc.documentElement;
  var attrs = docElt.attributes;
  for (var i = 0; i < attrs.length; i++) {
    htmlStr += ' ' + attrs[i].nodeName.toLowerCase() +
               '="' + attrs[i].nodeValue + '"';
  }
  var innerHTML = docElt.innerHTML.replace(/  \n*<\/body>\n*/, '  </body>\n');
  htmlStr += '>\n  ' + innerHTML + '\n</html>\n';

  utils.writeContent(this.htmlFile, doctypeStr + htmlStr);
};

HTMLOptimizer.prototype.getFileByRelativePath = function(relativePath) {
  var paths = relativePath.split(/[\/\\]/);
  var file;
  if (/^\//.test(relativePath)) {
    paths.shift();
    file = this.webapp.buildDirectoryFile.clone();
  } else {
    file = this.htmlFile.parent.clone();
  }

  paths.forEach(function appendPath(name) {
    if (name === '..') {
      file = file.parent;
      return;
    }
    file.append(name);
    if (utils.isSubjectToBranding(file.path)) {
      file.append((this.config.OFFICIAL === '1') ? 'official' : 'unofficial');
    }
  }, this);

  try {
    return {
      file: file,
      content: utils.getFileContent(file)
    };
  } catch (e) {
    return {
      file: null,
      content: ''
    };
  }
};

// mockWinObj is to mock window object for l10n.js script.
// We hope to remove it once l10n.js has defined well api which is independent
// from window.navigator.
HTMLOptimizer.prototype.mockWinObj = function() {
  var self = this;

  function dump_message(str) {
    utils.log(self.htmlFile.path.replace(self.config.GAIA_DIR, '') +
      ': ' + str + '\n');
  }

  this.win.console = {
    log: dump_message,
    warn: dump_message,
    info: dump_message
  };

  this.win.XMLHttpRequest = function() {
    function open(type, url, async) {
      this.status = 200;
      this.responseText = self.getFileByRelativePath(url).content;
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

  // Load and parse the HTML document, so that we can use access dom element
  // easily.
  this.win.document = utils.getDocument(utils.getFileContent(this.htmlFile));
};

var WebappOptimize = function() {
  this.config = null;
  this.webapp = null;
  this.win = null;
  this.locales = null;
  this.numOfFiles = 0;
};

WebappOptimize.prototype.RE_HTML = /\.html$/;

WebappOptimize.prototype.setOptions = function(options) {
  this.config = options.config;
  this.webapp = options.webapp;
  this.win = options.win;
  this.locales = options.locales;
  this.optimizeConfig = options.optimizeConfig;
};

WebappOptimize.prototype.processFile = function(file) {
  var htmlOptimizer = new HTMLOptimizer({
    htmlFile: file,
    webapp: this.webapp,
    config: this.config,
    win: this.win,
    locales: this.locales,
    optimizeConfig: this.optimizeConfig,
    callback: this.HTMLProcessed.bind(this)
  });
  htmlOptimizer.process();
};

// After all files are processed, we'll remove all merged files. And try to
// minify other unmerged script.
WebappOptimize.prototype.HTMLProcessed = function(files) {
  this.numOfFiles--;
  if (this.numOfFiles !== 0) {
    return;
  }
  files.forEach(function(file) {
    if (file && file.exists()) {
      file.remove(true);
    }
  });
  this.writeDictionaries();
  this.optimizeFiles();
};

WebappOptimize.prototype.optimizeFiles = function() {
  if (this.config.GAIA_OPTIMIZE !== '1') {
    return;
  }
  var re = new RegExp('^' + utils.gaia.getInstance(this.config)
    .aggregatePrefix + '.+.js');
  utils.ls(this.webapp.buildDirectoryFile, true, re)
    .filter(function(file) {
      return /\.js$/.test(file.leafName);
    }, this)
    .forEach(this._optimizeFile, this);
};

WebappOptimize.prototype._optimizeFile = function(file) {
  var fileType = file.leafName.split('.').pop();
  var content = utils.getFileContent(file);
  switch(fileType) {
    // We only optimize js now.
    case 'js':
      try {
        content = jsmin(content).code;
        utils.writeContent(file, content);
      } catch (e) {
      }
      break;
  }
};

// all HTML documents in the webapp have been optimized:
// create one concatenated l10n file per locale for all HTML documents
WebappOptimize.prototype.writeDictionaries = function() {
  if (this.config.GAIA_CONCAT_LOCALES !== '1') {
    return;
  }
  var localeObjDir = this.webapp.buildDirectoryFile.clone();
  var reserved = {};
  localeObjDir.append('locales-obj');
  utils.ensureFolderExists(localeObjDir);

  // create all JSON dictionaries in /locales-obj
  for (var lang in this.webapp.dictionary) {
    var file = localeObjDir.clone();
    file.append(lang + '.json');
    utils.writeContent(file, JSON.stringify(this.webapp.dictionary[lang]));
    reserved[file.leafName] = true;
  }

  utils.ls(localeObjDir, true).forEach(function(file) {
    var fname = file.leafName;
    if (utils.getExtension(fname) === 'json' && !reserved[fname]) {
      file.remove(false);
    }
  });

  var localeDir = this.webapp.buildDirectoryFile.clone();
  localeDir.append('locales');
  // FIXME 999903: locales directory won't be removed if DEBUG=1 because we
  // need l10n properties file in build_stage to get l10n string in DEBUG
  // mode.
  if (localeDir.exists() && this.config.DEBUG !== 1) {
    localeDir.remove(true);
  }
  var sharedLocaleDir = this.webapp.buildDirectoryFile.clone();
  sharedLocaleDir.append('shared');
  sharedLocaleDir.append('locales');
  // FIXME 999903: locales directory won't be removed if DEBUG=1 because we
  // need l10n properties file in build_stage to get l10n string in DEBUG
  // mode.
  if (sharedLocaleDir.exists() && this.config.DEBUG !== 1) {
    sharedLocaleDir.remove(true);
  }

};

WebappOptimize.prototype.execute = function(config) {
  this.setOptions(config);
  // if BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (this.config.BUILD_APP_NAME !== '*' &&
    this.webapp.sourceDirectoryName !== this.config.BUILD_APP_NAME) {
    return;
  }

  var dictionary = {};
  this.locales.forEach(function(lang) {
    dictionary[lang] = {};
  });
  // We store all locale lang to webapp object and pass it to all HTMLOptimizer
  // in order to store the content of each html, and then execute
  // writingDictionaries after all html are processed.
  this.webapp.dictionary = dictionary;

  // remove excluded condition /^(shared|tests?)$/)
  var files = utils.ls(this.webapp.buildDirectoryFile, true, /^shared/)
    .filter(function(file) {
      return this.RE_HTML.test(file.leafName);
    }, this);
  this.numOfFiles = files.length;
  files.forEach(this.processFile, this);
};

function execute(config) {
  var gaia = utils.gaia.getInstance(config);
  var locales;
  if (config.GAIA_INLINE_LOCALES === '1' ||
      config.GAIA_CONCAT_LOCALES === '1') {
    locales = getLocales(config);
  } else {
    locales = [config.GAIA_DEFAULT_LOCALE];
  }
  var win = {
    navigator: {},
    Node: {
      TEXT_NODE: 3,
    },
    CustomEvent: function() {},
    dispatchEvent: function() {},
    console: {}
  };

  // Load window object from build/l10n.js and shared/js/l10n.js into win;
  win = loadL10nScript(config, win);

  var optimizeConfig = loadOptimizeConfig(config);

  gaia.webapps.forEach(function(webapp) {
    (new WebappOptimize()).execute({
      config: config,
      webapp: webapp,
      locales: locales,
      win: win,
      optimizeConfig: optimizeConfig
    });
  });
}

function loadOptimizeConfig(config) {
  var file = utils.getFile(config.GAIA_DIR, 'build', 'config',
    'optimize_config.json');
  if (file.exists()) {
    return utils.getJSON(file) || {};
  } else {
    return {};
  }
}

// We should replace below with require('l10n.js') once they're refactored.
// We throw a window mock for l10n.js, since they use a lot methods and objects
// from window.navigator.
function loadL10nScript(config, obj) {
  utils.scriptLoader.load('file:///' + config.GAIA_DIR +
    '/shared/js/l10n.js?reload=' + new Date().getTime(), obj);
  utils.scriptLoader.load('file:///' + config.GAIA_DIR +
    '/build/l10n.js?reload=' + new Date().getTime(), obj);
  return obj;
}

function getLocales(config) {
  // LOCALES_FILE is a relative path by default:
  // shared/resources/languages.json
  // -- but it can be an absolute path when doing a multilocale build.
  var file = utils.resolve(config.LOCALES_FILE, config.GAIA_DIR);
  var result = [];
  Object.keys(JSON.parse(utils.getFileContent(file))).forEach(function(locale) {
    if (locale !== config.GAIA_DEFAULT_LOCALE) {
      result.push(locale);
    }
  });
  result.push(config.GAIA_DEFAULT_LOCALE);
  return result;
}

exports.execute = execute;
exports.WebappOptimize = WebappOptimize;
exports.HTMLOptimizer = HTMLOptimizer;
