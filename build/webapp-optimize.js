'use strict';

/**
 * webpp-optimize will do below things.
 * 1. Inline embeded html from <link rel="import" href="test.html" name="name">
 *    into html and commented (<!--CONTENT-->).
 * 2. Concat l10n resource to json files and put them as link and attach to
 *    html.
 * 3. Aggregate and uglify all JS files used in html to one JS file.
 * 4. Optimize inline JS/CSS content.
 */

var utils = require('./utils');
var jsmin = require('./jsmin');

// We need to be able to run in node 0.10, 0.12 and in XPC
var CrossCompatPromise = typeof Promise === 'undefined' ?
  require('es6-promise').Promise : Promise;
var l20n = require('./l10n/l20n');

/**
 * HTMLOptimizer will optimize all the resources of HTML, including javascripts,
 *
 */
var HTMLOptimizer = function(options) {
  this.htmlFile = options.htmlFile;
  this.webapp = options.webapp;
  /**
   * Optimization helpers -- these environment variables are used:
   *   - config.GAIA_PRETRANSLATE    - pretranslate html into default locale
   *   - config.GAIA_CONCAT_LOCALES  - aggregates l10n files
   *   - config.GAIA_OPTIMIZE        - aggregates JS files
   */
  this.config = options.config;
  this.document = utils.getDocument(utils.getFileContent(this.htmlFile));
  this.locales = options.locales;
  this.optimizeConfig = options.optimizeConfig;

  this.l10n = l20n.getView(this);

  /**
   * We collect localization resources entries and cache them as JSON files
   * in /locales-obj folder. This allows us to avoid parsing localization
   * resources at app startup.
   */
  this.entries = {};
};

HTMLOptimizer.prototype.dump = function(str) {
  var fileName = this.htmlFile.path.replace(this.config.GAIA_DIR, '');
  utils.log(fileName, str);
};

HTMLOptimizer.prototype.process = function() {
  var queue = CrossCompatPromise.resolve();

  // only optimize files which are l10n-enabled
  if (!this.l10n.isEnabled) {
    return queue;
  }

  this.embedHtmlImports();
  this.optimizeDeviceTypeCSS();

  var appName = this.webapp.sourceDirectoryName;
  var fileName = this.htmlFile.leafName;

  var jsAggregationBlacklist = this.optimizeConfig.JS_AGGREGATION_BLACKLIST;
  if (this.config.GAIA_OPTIMIZE === '1' &&
      (!jsAggregationBlacklist[appName] ||
        (jsAggregationBlacklist[appName]
          .indexOf(fileName) === -1) &&
         jsAggregationBlacklist[appName] !== '*')) {
    this.aggregateJsResources();
  }

  var globalVarWhiltelist = this.optimizeConfig.INLINE_GLOBAL_VAR_WHITELIST;
  if (globalVarWhiltelist[appName] &&
       globalVarWhiltelist[appName]
         .indexOf(fileName) !== -1) {
    this.embededGlobals();
  }

  var inlineWhitelist = this.optimizeConfig.INLINE_OPTIMIZE_WHITELIST;
  if (inlineWhitelist[appName] &&
      (inlineWhitelist[appName]
        .indexOf(fileName) !== -1 ||
        inlineWhitelist[appName] === '*')) {
    this.inlineJsResources();
    this.inlineCSSResources();
  }

  var concatBlacklist = this.optimizeConfig.CONCAT_LOCALES_BLACKLIST;
  if (this.config.GAIA_CONCAT_LOCALES === '1' &&
      (!concatBlacklist[appName] ||
       (concatBlacklist[appName].indexOf('*') === -1 &&
        concatBlacklist[appName].indexOf(fileName) === -1))) {
    queue = queue.then(
      this.serializeL10nResources.bind(this)).then(
      this.concatL10nResources.bind(this));
  }

  var pretranslationBlacklist = this.optimizeConfig.PRETRANSLATION_BLACKLIST;
  if (this.config.GAIA_PRETRANSLATE === '1' &&
      (!pretranslationBlacklist[appName] ||
       (pretranslationBlacklist[appName].indexOf('*') === -1 &&
        pretranslationBlacklist[appName].indexOf(fileName) === -1))) {
    queue = queue.then(this.pretranslateHTML.bind(this));
  }

  queue = queue.then(this.serializeNewHTMLDocumentOutput.bind(this));

  return queue.catch(dumpError.bind(this));
};

function dumpError(err) {
  /* jshint -W040 */
  this.dump(err);
  this.dump(err.stack);
  throw err;
}

function serializeResources(view, lang) {
  /* jshint -W040 */
  return view.serializeResources(lang).then(function(entries) {
    this.entries[lang] = entries;
  }.bind(this));
}

/**
 * Create JSON dicts for the current language; one for the <script> tag
 * embedded in HTML and one for locales-obj/
 */
HTMLOptimizer.prototype.serializeL10nResources = function() {
  return CrossCompatPromise.all(
    this.locales.map(serializeResources.bind(this, this.l10n)));
};

/**
 * Pretranslate the document and set its lang/dir attributes
 */
HTMLOptimizer.prototype.pretranslateHTML = function() {
  return this.l10n.translateDocument(this.config.GAIA_DEFAULT_LOCALE);
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
  var doc = this.document;
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
 * XXXX Bug 1012464: this function should not belong to webapp-optimize.
 * Append values to the global object on the page
 */
HTMLOptimizer.prototype.embededGlobals = function() {
  var doc = this.document;
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
 * Replaces all external l10n resource nodes by a single link:
 * <link rel="localization" href="/locales-obj/*.{locale}.json" />,
 * and merge the document entries into the webapp entries.
 */
HTMLOptimizer.prototype.concatL10nResources = function() {
  var doc = this.document;
  var links = doc.querySelectorAll('link[rel="localization"]');
  if (!links.length) {
    return;
  }

  var parentNode = links[0].parentNode;
  var fetch = false;
  var embed = false;

  for (var i = 0; i < links.length; i++) {
    var link = links[i];
    var rel = link.getAttribute('rel');

    switch (rel) {
      case 'localization':
        // if any l10n link does have a no-fetch
        // attribute, we will embed the whole l10n AST
        if (link.hasAttribute('data-no-fetch')) {
          embed = true;
        }

        // if any l10n link does no have the no-fetch
        // attribute we will embed the locales json link
        if (!link.hasAttribute('data-no-fetch')) {
          fetch = true;
        }
        break;
    }
  }

  if (fetch) {
    var jsonName = getL10nJSONFileName(
      this.htmlFile, this.webapp.buildDirectoryFilePath);
    var jsonLink = doc.createElement('link');
    jsonLink.href = '/locales-obj/' + jsonName;
    jsonLink.rel = 'localization';
    parentNode.insertBefore(jsonLink, links[0]);

    this.writeAST();
  }

  for (i = 0; i < links.length; i++) {
    parentNode.removeChild(links[i]);
  }

  if (embed) {
    embedL10nResources(this.document.head, this.entries);
  }
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
  var gaia = utils.gaia;
  var baseName = this.htmlFile.leafName.split('.')[0];
  var deferred = {
    fileType: 'script',
    content: '',
    lastNode: null,
    name: gaia.aggregatePrefix + 'defer_' + baseName + '.js',
    specs: {
      type: 'text/javascript',
      defer: true,
      src: './' + gaia.aggregatePrefix + 'defer_' + baseName + '.js'
    }
  };
  var normal = {
    fileType: 'script',
    content: '',
    lastNode: null,
    name: gaia.aggregatePrefix + baseName + '.js',
    specs: {
      type: 'text/javascript',
      src: './' + gaia.aggregatePrefix + baseName + '.js'
    }
  };

  // Everyone should be putting their scripts in head with defer.
  // The best case is that only l10n.js is put into a normal.
  var doc = this.document;
  var scripts = Array.prototype.slice.call(
    doc.head.querySelectorAll('script[src]'));
  scripts = scripts.filter(function(script, idx) {
    if ('skipOptimize' in script.dataset || script.hasAttribute('async')) {
      return false;
    }

    var html = script.outerHTML;
    // we inject the whole outerHTML into the comment for debugging so
    // if there is something valuable in the html that effects the script
    // that broke the app it should be fairly easy to tell what happened.
    var content = '; /* "' + html + ' "*/\n\n';
    // fetch the whole file append it to the comment.
    var scriptFile = this.getFileByRelativePath(script.src);
    content += scriptFile.content;

    // We store the unminified content for comparing.
    var originalContent = content;
    try {
      content = jsmin(content).code;
    } catch (e) {
      utils.log('Failed to minify content: ' + e);
    }

    // When BUILD_DEBUG is true, we'll do AST comparing in build time.
    if (this.config.BUILD_DEBUG &&
        !utils.jsComparator(originalContent, content)) {
      throw 'minified ' + script.src + ' has different AST with' +
            ' unminified script.';
    }

    var scriptConfig = normal;
    if (script.defer) {
      scriptConfig = deferred;
    }

    if (scriptFile.file && scriptFile.file.exists()) {
      utils.writeContent(scriptFile.file, content);
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

    return true;
  }, this);

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
  var doc = this.document;
  var rootDirectory = this.htmlFile.parent;

  var target = rootDirectory.clone();
  target.append(conf.name);

  // write the contents of the aggregated script
  utils.writeContent(target, conf.content);

  var file = doc.createElement(conf.fileType);
  var lastScript = conf.lastNode;

  for (var spe in conf.specs) {
    file[spe] = conf.specs[spe];
  }

  // insert after the last script node of this type...
  var parent = lastScript.parentNode;
  parent.insertBefore(file, lastScript.nextSibling);
};

/**
 * Inline and minify all script resources on the page based on
 * INLINE_WHITELIST.
 */
HTMLOptimizer.prototype.inlineJsResources = function() {
  var doc = this.document;
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
 * Inline and minify all css resources on the page based on
 * INLINE_WHITELIST.
 */
HTMLOptimizer.prototype.inlineCSSResources = function() {
  var doc = this.document;
  // inline stylesheets
  var styles = Array.prototype.slice.call(
    doc.querySelectorAll('link[rel="stylesheet"]'));
  styles.forEach(function(oldStyle) {
    var cssPath = oldStyle.href.split('/').slice(0, -1).join('/');
    var newStyle = doc.createElement('style');
    newStyle.rel = 'stylesheet';
    newStyle.type = 'text/css';
    var css = this.getFileByRelativePath(oldStyle.href);
    // inline css image url references
    var content = css.content.replace(/url\(([^)]+?)\)/g,
      function(match, url) {
        var file = utils.getFile(
          this.webapp.buildDirectoryFilePath, cssPath, url);
        return match.replace(url, utils.getFileAsDataURI(file));
      }.bind(this));
    newStyle.innerHTML = content;

    oldStyle.parentNode.insertBefore(newStyle, oldStyle);
    oldStyle.parentNode.removeChild(oldStyle);
  }, this);
};

/**
 * Removes stylesheets that are not relevant for the current device
 */
HTMLOptimizer.prototype.optimizeDeviceTypeCSS = function() {
  var doc = this.document;
  let links = doc.querySelectorAll('link[data-device-type]');
  Array.prototype.forEach.call(links, function(el) {
    if (el.dataset.deviceType !== this.config.GAIA_DEVICE_TYPE) {
      el.parentNode.removeChild(el);
    }
  }.bind(this));
};

/**
 * Write the optimized result into html file.
 */
HTMLOptimizer.prototype.serializeNewHTMLDocumentOutput = function() {
  var doc = this.document;

  var str = utils.serializeDocument(doc);
  utils.writeContent(this.htmlFile, str);
};

HTMLOptimizer.prototype.getFileByRelativePath = function(relativePath) {
  var paths = relativePath.split(/[\/\\]/);
  var file;
  if (/^\//.test(relativePath)) {
    paths.shift();
    file = utils.getFile(this.webapp.buildDirectoryFilePath);
  } else {
    file = this.htmlFile.parent.clone();
  }

  paths.forEach(function appendPath(name) {
    if (name === '..') {
      file = file.parent;
      return;
    }
    file.append(name);
  }, this);

  var dirName = file.parent.path;
  var fileName = file.leafName;
  if (utils.isSubjectToBranding(dirName)) {
    file = file.parent;
    file.append((this.config.OFFICIAL === '1') ? 'official' : 'unofficial');
    file.append(fileName);
  }
  if (utils.isSubjectToDeviceType(file.path)) {
    file = file.parent;
    file.append(this.config.GAIA_DEVICE_TYPE);
    file.append(fileName);
  }

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

HTMLOptimizer.prototype.writeAST = function() {
  var localeObjDir =
    utils.getFile(this.webapp.buildDirectoryFilePath, 'locales-obj');
  utils.ensureFolderExists(localeObjDir);

  // create all JSON entries in /locales-obj
  for (var lang in this.entries) {
    var fileName = getL10nJSONFileName(
      this.htmlFile, this.webapp.buildDirectoryFilePath);
    var file =
      utils.getFile(localeObjDir.path, fileName.replace('{locale}', lang));
    utils.writeContent(file, JSON.stringify(this.entries[lang]));
  }
};

var WebappOptimize = function() {
  this.config = null;
  this.webapp = null;
  this.locales = null;
  this.numOfFiles = 0;
};

WebappOptimize.prototype.RE_HTML = /\.html$/;

WebappOptimize.prototype.setOptions = function(options) {
  this.config = options.config;
  this.webapp = options.webapp;
  this.locales = options.locales;
  this.optimizeConfig = options.optimizeConfig;
};

WebappOptimize.prototype.processFile = function(file) {
  var htmlOptimizer = new HTMLOptimizer({
    htmlFile: file,
    webapp: this.webapp,
    config: this.config,
    locales: this.locales,
    optimizeConfig: this.optimizeConfig
  });
  htmlOptimizer.process();

  // Don't quit xpcshell before all asynchronous code is done
  utils.processEvents(
    htmlOptimizer.l10n.checkError.bind(htmlOptimizer.l10n));
};

WebappOptimize.prototype.execute = function(config) {
  this.setOptions(config);
  // if BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (this.config.BUILD_APP_NAME !== '*' &&
    this.webapp.sourceDirectoryName !== this.config.BUILD_APP_NAME) {
    return;
  }

  // remove excluded condition /^(shared|tests?)$/)
  var buildDirectoryFile = utils.getFile(this.webapp.buildDirectoryFilePath);
  var buildDirectoryPath = buildDirectoryFile.path.replace(/\\/g, '/');
  var excluded = new RegExp(buildDirectoryPath + '.*\/(shared|tests?)');
  var files = utils.ls(buildDirectoryFile, true).filter(function(file) {
    return !(excluded.test(file.path.replace(/\\/g, '/')));
  });

  // We need to optimize shared pages as well
  var sharedPagesDir = buildDirectoryFile;
  sharedPagesDir.append('shared');
  sharedPagesDir.append('pages');
  var filesSharedPages = utils.ls(sharedPagesDir, true);
  files = files.concat(filesSharedPages)
    .filter(function(file) {
      return this.RE_HTML.test(file.leafName);
    }, this);

  this.numOfFiles = files.length;
  files.forEach(this.processFile, this);
};

function execute(options) {
  var webapp = utils.getWebapp(options.APP_DIR, options);
  var locales;
  if (options.GAIA_CONCAT_LOCALES === '1') {
    locales = getLocales(options);
  } else {
    locales = [options.GAIA_DEFAULT_LOCALE];
  }

  var optimizeConfig = loadOptimizeConfig(options);

  (new WebappOptimize()).execute({
    config: options,
    webapp: webapp,
    locales: locales,
    optimizeConfig: optimizeConfig
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

/**
 * Embeds a JSON AST of l10n resources in a document.
 */
function embedL10nResources(node, entries) {
  // split the l10n entries on a per-locale basis,
  // and embed it in the HTML document by enclosing it in <script> nodes.
  for (var lang in entries) {
    // skip to the next language if the AST is null
    if (!entries[lang]) {
      continue;
    }
    var script = node.ownerDocument.createElement('script');
    script.type = 'application/l10n';
    script.lang = lang;
    script.innerHTML = '\n  ' + JSON.stringify(entries[lang]) + '\n';
    node.appendChild(script);
  }
}

function getL10nJSONFileName(htmlFile, buildDirectoryFilePath) {
  var relativePath = utils.relativePath(buildDirectoryFilePath, htmlFile.path);
  var base = relativePath.replace('.html', '').replace(/\//g, '.');
  return base + '.{locale}.json';
}

exports.execute = execute;
exports.WebappOptimize = WebappOptimize;
exports.HTMLOptimizer = HTMLOptimizer;
