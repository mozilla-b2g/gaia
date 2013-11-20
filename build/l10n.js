/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function (window, undefined) {

function define(name, payload) {
  define.modules[name] = payload;
}

// un-instantiated modules
define.modules = {};
// instantiated modules
define.exports = {};

function normalize(path) {
  var parts = path.split('/');
  var normalized = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] == '.') {
      // don't add it to `normalized`
      continue;
    } else if (parts[i] == '..') {
      normalized.pop();
    } else {
      normalized.push(parts[i]);
    }
  }
  return normalized.join('/');
}

function join(a, b) {
  return a ? a.trim().replace(/\/{0,}$/, '/') + b.trim() : b.trim();
}

function dirname(path) {
  return path ? path.split('/').slice(0, -1).join('/') : null;
}

function req(leaf, name) {
  name = normalize(join(dirname(leaf), name));
  if (name in define.exports) {
    return define.exports[name];
  }
  if (!(name in define.modules)) {
    throw new Error('Module not defined: ' + name);
  }

  var module = define.modules[name];
  if (typeof module == 'function') {
    var exports = {};
    var reply = module(req.bind(null, name), exports, { id: name, uri: '' });
    module = (reply !== undefined) ? reply : exports;
  }
  return define.exports[name] = module;
}

// for the top-level required modules, leaf is null
var require = req.bind(null, null);



define('l20n/buildtime', function(require, exports, module) {
  'use strict';


  var L20n = require('../l20n');

  var ctx;
  var isBootstrapped = false;
  var isPretranslated = false;


  Object.defineProperty(navigator, 'mozL10n', {
    get: function() {
      isBootstrapped = false;
      ctx = L20n.getContext();
      ctx.addEventListener('error', addBuildMessage.bind(null, 'error'));
      ctx.addEventListener('warning', addBuildMessage.bind(null, 'warn'));
      return createPublicAPI(ctx);
    },
    enumerable: true
  });

  function bootstrap(forcedLocale) {
    isBootstrapped = true;

    var availableLocales = [];

    var head = document.head;
    var iniLinks = head.querySelectorAll('link[type="application/l10n"]' + 
                                         '[href$=".ini"]');
    var jsonLinks = head.querySelectorAll('link[type="application/l10n"]' + 
                                          '[href$=".json"]');

    for (var i = 0; i < jsonLinks.length; i++) {
      var uri = jsonLinks[i].getAttribute('href');
      ctx.linkResource(uri.replace.bind(uri, /\{\{\s*locale\s*\}\}/));
    }

    ctx.ready(function() {
      // XXX instead of using a flag, we could store the list of 
      // yet-to-localize nodes that we get from the inline context, and 
      // localize them here.
      if (!isPretranslated) {
        translateFragment(ctx);
      }
      isPretranslated = false;
      fireLocalizedEvent(ctx);
    });

    // listen to language change events
    if ('mozSettings' in navigator && navigator.mozSettings) {
      navigator.mozSettings.addObserver('language.current', function(event) {
        ctx.requestLocales(event.settingValue);
      });
    }

    var iniToLoad = iniLinks.length;
    if (iniToLoad === 0) {
      ctx.registerLocales('en-US', getAvailable());
      ctx.requestLocales(forcedLocale || navigator.language);
      return;
    }

    var io = require('./platform/io');
    for (i = 0; i < iniLinks.length; i++) {
      var url = iniLinks[i].getAttribute('href');
      io.load(url, iniLoaded.bind(null, url));
    }

    function iniLoaded(url, err, text) {
      if (err) {
        throw err;
      }

      var ini = parseINI(text, url);
      availableLocales.push.apply(availableLocales, ini.locales);
      for (var i = 0; i < ini.resources.length; i++) {
        var uri = ini.resources[i].replace('en-US', '{{locale}}');
        ctx.linkResource(uri.replace.bind(uri, '{{locale}}'));
      }
      iniToLoad--;
      if (iniToLoad === 0) {
        ctx.registerLocales('en-US', availableLocales);
        ctx.requestLocales(forcedLocale || navigator.language);
      }
    }

  }

  function getAvailable() {
    var metaLocs = document.head.querySelector('meta[name="locales"]');
    if (metaLocs) {
      return metaLocs.getAttribute('content').split(',').map(String.trim);
    } else {
      return [];
    }
  }

  var patterns = {
    section: /^\s*\[(.*)\]\s*$/,
    import: /^\s*@import\s+url\((.*)\)\s*$/i,
    entry: /[\r\n]+/
  };

  function parseINI(source, iniPath) {
    var entries = source.split(patterns['entry']);
    var locales = ['en-US'];
    var genericSection = true;
    var uris = [];

    for (var i = 0; i < entries.length; i++) {
      var line = entries[i];
      // we only care about en-US resources
      if (genericSection && patterns['import'].test(line)) {
        var match = patterns['import'].exec(line);
        var uri = relativePath(iniPath, match[1]);
        uris.push(uri);
        continue;
      }

      // but we need the list of all locales in the ini, too
      if (patterns['section'].test(line)) {
        genericSection = false;
        var match = patterns['section'].exec(line);
        locales.push(match[1]);
      }
    }
    return {
      locales: locales,
      resources: uris
    };
  }

  function relativePath(baseUrl, url) {
    if (url[0] == '/') {
      return url;
    }

    var dirs = baseUrl.split('/')
      .slice(0, -1)
      .concat(url.split('/'))
      .filter(function(path) {
        return path !== '.';
      });

    return dirs.join('/');
  }

  function createPublicAPI(ctx) {
    var rtlLocales = ['ar', 'fa', 'he', 'ps', 'ur'];
    return {
      get: function l10n_get(id, data) {
        var entity = ctx.getEntity(id, data);
        // entity.locale is null if the entity could not be displayed in any of
        // the locales in the current fallback chain
        if (!entity.locale) {
          return '';
        }
        return entity.value;
      },
      localize: localizeNode.bind(null, ctx),
      translate: translateFragment.bind(null, ctx),
      language: {
        get code() {
          return ctx.supportedLocales[0];
        },
        set code(lang) {
          if (!isBootstrapped) {
            // build-time optimization uses this
            bootstrap(lang);
          } else {
            ctx.requestLocales(lang);
          }
        },
        get direction() {
          if (rtlLocales.indexOf(ctx.supportedLocales[0]) >= 0) {
            return 'rtl';
          } else {
            return 'ltr';
          }
        }
      },
      ready: ctx.ready.bind(ctx),
      getDictionary: getSubDictionary,
      get readyState() {
        return ctx.isReady ? 'complete' : 'loading';
      }
    };
  }

  var buildMessages = {};
  function addBuildMessage(type, e) {
    if (!(type in buildMessages)) {
      buildMessages[type] = [];
    }
    if (e instanceof L20n.Context.TranslationError &&
        e.locale === ctx.supportedLocales[0] &&
        buildMessages[type].indexOf(e.entity) === -1) {
      buildMessages[type].push(e.entity);
    }
  }

  function flushBuildMessages(variant) {
    for (var type in buildMessages) {
      if (buildMessages[type].length) {
        console.log('[l10n] [' + ctx.supportedLocales[0] + ']: ' +
            buildMessages[type].length + ' missing ' + variant + ': ' +
            buildMessages[type].join(', '));
        buildMessages[type] = [];
      }
    }
  }

  // return a sub-dictionary sufficient to translate a given fragment
  function getSubDictionary(fragment) {
    var ast = {
      type: 'WebL10n',
      body: {}
    };

    if (!fragment) {
      ast.body = ctx.getSources();
      flushBuildMessages('compared to en-US');
      return ast;
    }

    var elements = getTranslatableChildren(fragment);

    for (var i = 0, l = elements.length; i < l; i++) {
      var attrs = getL10nAttributes(elements[i]);
      var source = ctx.getSource(attrs.id);
      if (!source) {
        continue;
      }
      ast.body[attrs.id] = source;

      // check for any dependencies
      var entity = ctx.getEntity(attrs.id, attrs.args);
      for (var id in entity.identifiers) {
        if (!entity.identifiers.hasOwnProperty(id)) {
          continue;
        }
        var depSource = ctx.getSource(id);
        if (depSource) {
          ast.body[id] = depSource;
        }
      }
    }
    flushBuildMessages('in the visible DOM');
    return ast;
  }

  function getTranslatableChildren(element) {
    return element ? element.querySelectorAll('*[data-l10n-id]') : [];
  }


  function getL10nAttributes(element) {
    if (!element) {
      return {};
    }

    var l10nId = element.getAttribute('data-l10n-id');
    var l10nArgs = element.getAttribute('data-l10n-args');
    var args = {};
    if (l10nArgs) {
      try {
        args = JSON.parse(l10nArgs);
      } catch (e) {
        console.warn('could not parse arguments for ' + l10nId);
      }
    }
    return { id: l10nId, args: args };
  }

  function setTextContent(element, text) {
    // standard case: no element children
    if (!element.firstElementChild) {
      element.textContent = text;
      return;
    }

    // this element has element children: replace the content of the first
    // (non-blank) child textNode and clear other child textNodes
    var found = false;
    var reNotBlank = /\S/;
    for (var child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 3 && reNotBlank.test(child.nodeValue)) {
        if (found) {
          child.nodeValue = '';
        } else {
          child.nodeValue = text;
          found = true;
        }
      }
    }
    // if no (non-empty) textNode is found, insert a textNode before the
    // element's first child.
    if (!found) {
      element.insertBefore(document.createTextNode(text), element.firstChild);
    }
  }

  function translateNode(ctx, node) {
    var attrs = getL10nAttributes(node);
    if (!attrs.id) {
      return true;
    }

    var entity = ctx.getEntity(attrs.id, attrs.args);
    if (!entity.locale) {
      return false;
    }

    if (entity.value) {
      setTextContent(node, entity.value);
    }

    for (var key in entity.attributes) {
      if (entity.attributes.hasOwnProperty(key)) {
        var attr = entity.attributes[key];
        var pos = key.indexOf('.');
        if (pos !== -1) {
          node[key.substr(0, pos)][key.substr(pos + 1)] = attr;
        } else {
          node[key] = attr;
        }
      }
    }
    return true;
  }
  
  // localize an node as soon as ctx is ready
  function localizeNode(ctx, element, id, args) {
    if (!element) {
      return;
    }

    if (!id) {
      element.removeAttribute('data-l10n-id');
      element.removeAttribute('data-l10n-args');
      setTextContent(element, '');
      return;
    }

    // set the data-l10n-[id|args] attributes
    element.setAttribute('data-l10n-id', id);
    if (args && typeof args === 'object') {
      element.setAttribute('data-l10n-args', JSON.stringify(args));
    } else {
      element.removeAttribute('data-l10n-args');
    }

    // if ctx is ready, translate now;
    // if not, the element will be translated along with the document anyway.
    if (ctx.isReady) {
      translateNode(ctx, element);
    }
  }
  
  // translate an array of HTML nodes
  // -- returns an array of nodes that could not be translated
  function translateNodes(ctx, elements) {
    var untranslated = [];
    for (var i = 0, l = elements.length; i < l; i++) {
      if (!translateNode(ctx, elements[i])) {
        untranslated.push(elements[i]);
      }
    }
    return untranslated;
  }

  // translate an HTML subtree
  // -- returns an array of elements that could not be translated
  function translateFragment(ctx, element) {
    element = element || document.documentElement;
    var untranslated = translateNodes(ctx, getTranslatableChildren(element));
    if (!translateNode(ctx, element)) {
      untranslated.push(element);
    }
    return untranslated;
  }

  function fireLocalizedEvent(ctx) {
    var event = document.createEvent('Event');
    event.initEvent('localized', false, false);
    event.language = ctx.supportedLocales[0];
    window.dispatchEvent(event);
  }

  return L20n;
});



define('l20n', function(require, exports, module) {
  'use strict';

  var Context = require('./l20n/context').Context;

  exports.Context = Context;
  exports.getContext = function L20n_getContext(id) {
      return new Context(id);
  };

});



define('l20n/context', function(require, exports, module) {
  'use strict';

  var EventEmitter = require('./events').EventEmitter;
  var Parser = require('./parser').Parser;
  var Compiler = require('./compiler').Compiler;
  var io = require('./platform/io');
  var getPluralRule = require('./plurals').getPluralRule;

  function Resource(id, parser) {
    this.id = id;
    this.parser = parser;

    this.resources = [];
    this.source = null;
    this.ast = null;
  }

  Resource.prototype.build = function R_build(callback, sync) {
    if (this.source) {
      this.parse(callback);
    } else if (this.ast) {
      callback();
    } else {
      io.load(this.id, this.parse.bind(this, callback), sync);
    }
  };

  Resource.prototype.parse = function R_parse(callback, err, text) {
    if (err) {
      this.ast = {
        type: 'WebL10n',
        body: {}
      };
      return callback(err);
    } else if (text === undefined) {
      this.ast = this.parser.parse(this.source);
    } else {
      if (/\.json/.test(this.id)) {
        // JSON is guaranteed to be an AST
        this.ast = JSON.parse(text);
      } else {
        this.source = text;
        this.ast = this.parser.parse(this.source);
      }
    }
    callback();
  };

  function Locale(id, parser, compiler, emitter) {
    this.id = id;
    this.parser = parser;
    this.compiler = compiler;
    this.emitter = emitter;

    this.resources = [];
    this.entries = null;
    this.ast = {
      type: 'WebL10n',
      body: {}
    };
    this.isReady = false;
  }

  Locale.prototype.build = function L_build(callback) {
    if (!callback) {
      var sync = true;
    }

    var resourcesToBuild = this.resources.length;
    if (resourcesToBuild === 0) {
      throw new ContextError('Locale has no resources');
    }

    var self = this;
    var resourcesWithErrors = 0;
    this.resources.forEach(function(res) {
      res.build(resourceBuilt, sync);
    });

    function resourceBuilt(err) {
      if (err) {
        resourcesWithErrors++;
        self.emitter.emit(err instanceof ContextError ? 'error' : 'warning', 
                          err);
      }
      resourcesToBuild--;
      if (resourcesToBuild == 0) {
        if (resourcesWithErrors == self.resources.length) {
          // XXX Bug 908780 - Decide what to do when all resources in
          // a locale are missing or broken
          // https://bugzilla.mozilla.org/show_bug.cgi?id=908780
          self.emitter.emit('error',
            new ContextError('Locale has no valid resources'));
        }
        self.flatten.call(self, callback);
      }
    }
  };

  Locale.prototype.flatten = function L_flatten(callback) {
    this.ast.body = this.resources.reduce(function(prev, curr) {
      if (!curr.ast) {
        return prev;
      }
      for (var key in curr.ast.body) {
        if (curr.ast.body.hasOwnProperty(key)) {
          prev[key] = curr.ast.body[key];
        }
      }
      return prev;
    }, this.ast.body);

    this.entries = this.compiler.compile(this.ast);
    this.isReady = true;
    if (callback) {
      callback();
    }
  };

  Locale.prototype.clean = function L_clean() {
    this.ast = null;
    this.resources = null;
    this.parser = null;
    this.compiler = null;
  };

  Locale.prototype.getEntry = function L_getEntry(id) {
    if (this.entries.hasOwnProperty(id)) {
      return this.entries[id];
    }
    return undefined;
  };

  Locale.prototype.hasResource = function L_gasResource(uri) {
    return this.resources.some(function(res) {
      return res.id === uri;
    });
  };

  function Context(id) {

    this.id = id;

    this.registerLocales = registerLocales;
    this.requestLocales = requestLocales;
    this.addDictionary = addDictionary;
    this.addResource = addResource;
    this.linkResource = linkResource;

    this.get = get;
    this.getEntity = getEntity;
    this.getSource = getSource;
    this.getSources = getSources;
    this.ready = ready;
    this.once = once;
    this.cleanBuiltLocales = cleanBuiltLocales;

    this.addEventListener = addEventListener;
    this.removeEventListener = removeEventListener;

    Object.defineProperty(this, 'supportedLocales', {
      get: function() { return _fallbackChain.slice(); },
      enumerable: true
    });

    // registered and available languages
    var _default = 'i-default';
    var _registered = [_default];
    var _requested = [];
    var _fallbackChain = [];
    // Locale objects corresponding to the registered languages
    var _locales = {};

    // URLs or text of resources (with information about the type) added via
    // linkResource
    var _reslinks = [];

    var _isReady = false;
    var _isFrozen = false;

    Object.defineProperty(this, 'isReady', {
      get: function() { return _isReady; },
      enumerable: true
    });

    var _emitter = new EventEmitter();
    var _parser = new Parser();
    var _compiler = new Compiler();

    _parser.addEventListener('error', error);
    _compiler.addEventListener('error', warn);

    var self = this;

    function get(id, data) {
      if (!_isReady) {
        throw new ContextError('Context not ready');
      }
      return getFromLocale.call(self, 0, id, data).value;
    }

    function getEntity(id, data) {
      if (!_isReady) {
        throw new ContextError('Context not ready');
      }
      return getFromLocale.call(self, 0, id, data);
    }

    function getSource(id) {
      if (!_isReady) {
        throw new ContextError('Context not ready');
      }

      var current = 0;
      var locale = getLocale(_fallbackChain[current]);
      // if the requested id doesn't exist in the first locale, fall back
      while (!locale.getEntry(id)) {
        warn(new TranslationError('Not found', id, _fallbackChain, locale));
        var nextLocale = _fallbackChain[++current];
        if (!nextLocale) {
          return null;
        }

        locale = getLocale(nextLocale);
        if (!locale.isReady) {
          locale.build();
        }
      }
      return locale.ast.body[id];
    }

    function getSources() {
      if (!_isReady) {
        throw new ContextError('Context not ready');
      }
      var defLoc = getLocale(_default);
      if (!defLoc.isReady) {
        defLoc.build();
      }
      var body = {};
      for (var id in defLoc.entries) {
        if (!defLoc.entries.hasOwnProperty(id)) {
          continue;
        }
        // if it's an Entity, add it
        if (defLoc.entries[id].get) {
          var source = getSource(id);
          if (source) {
            body[id] = source;
          }
        }
      }
      return body;
    }

    function ready(callback) {
      if (_isReady) {
        setTimeout(callback);
      }
      addEventListener('ready', callback);
    }

    function once(callback) {
      if (_isReady) {
        setTimeout(callback);
      }
      var callAndRemove = function callAndRemove() {
        removeEventListener('ready', callAndRemove);
        callback();
      };
      addEventListener('ready', callAndRemove);
    }

    function getFromLocale(cur, id, data, prevSource) {
      var loc = _fallbackChain[cur];
      if (!loc) {
        error(new RuntimeError('Unable to get translation', id,
                               _fallbackChain));
        // imitate the return value of Compiler.Entity.get
        return {
          value: prevSource ? prevSource.source : id,
          attributes: {},
          globals: {},
          locale: prevSource ? prevSource.loc : null
        };
      }

      var locale = getLocale(loc);
      if (!locale.isReady) {
        // build without a callback, synchronously
        locale.build(null);
      }

      var entry = locale.getEntry(id);

      // if the entry is missing, just go to the next locale immediately
      if (entry === undefined) {
        warn(new TranslationError('Not found', id, _fallbackChain, locale));
        return getFromLocale.call(this, cur + 1, id, data, prevSource);
      }

      // otherwise, try to get the value of the entry
      try {
        var value = entry.get(data);
      } catch (e) {
        if (e instanceof Compiler.RuntimeError) {
          error(new TranslationError(e.message, id, _fallbackChain, locale));
          if (e instanceof Compiler.ValueError) {
            // salvage the source string which the compiler wasn't able to
            // evaluate completely;  this is still better than returning the
            // identifer;  prefer a source string from locales earlier in the
            // fallback chain, if available
            var source = prevSource || { source: e.source, loc: locale.id };
            return getFromLocale.call(this, cur + 1, id, data, source);
          }
          return getFromLocale.call(this, cur + 1, id, data, prevSource);
        } else {
          throw error(e);
        }
      }
      value.locale = locale.id;
      return value;
    }

    function add(text, locale) {
      var res = new Resource(null, _parser);
      res.source = text;
      locale.resources.push(res);
    }

    function addResource(text) {
      if (_isFrozen) {
        throw new ContextError('Context is frozen');
      }
      _reslinks.push(['text', text]);
    }

    function addDictionary(scriptNode, loc) {
      if (_isFrozen) {
        throw new ContextError('Context is frozen');
      }
      _reslinks.push(['dict', scriptNode, loc]);
    }

    function addJSON(scriptNode, locale) {
      var res = new Resource(null);
      res.ast = JSON.parse(scriptNode.innerHTML);
      locale.resources.push(res);
    }

    function linkResource(uri) {
      if (_isFrozen) {
        throw new ContextError('Context is frozen');
      }
      _reslinks.push([typeof uri === 'function' ? 'template' : 'uri', uri]);
    }

    function link(uri, locale) {
      if (!locale.hasResource(uri)) {
        var res = new Resource(uri, _parser);
        locale.resources.push(res);
      }
    }

    function registerLocales(defaultLocale, availableLocales) {
      if (_isFrozen) {
        throw new ContextError('Context is frozen');
      }

      if (defaultLocale === undefined) {
        return;
      }

      _default = defaultLocale;
      _registered = [];

      if (!availableLocales) {
        availableLocales = [];
      }
      availableLocales.push(defaultLocale);

      // uniquify `available` into `_registered`
      availableLocales.forEach(function l10n_ctx_addlocale(locale) {
        if (typeof locale !== 'string') {
          throw new ContextError('Language codes must be strings');
        }
        if (_registered.indexOf(locale) === -1) {
          _registered.push(locale);
        }
      });
    }

    function negotiate(available, requested, defaultLocale) {
      if (available.indexOf(requested[0]) === -1 ||
          requested[0] === defaultLocale) {
        return [defaultLocale];
      } else {
        return [requested[0], defaultLocale];
      }
    }

    function cleanBuiltLocales() {
      for (var loc in _locales) {
        if (_locales.hasOwnProperty(loc) && _locales[loc].isReady) {
          _locales[loc].clean();
        }
      }
    }

    function getLocale(code) {
      if (_locales[code]) {
        return _locales[code];
      }

      var locale = new Locale(code, _parser, _compiler, _emitter);
      _locales[code] = locale;
      // populate the locale with resources
      for (var j = 0; j < _reslinks.length; j++) {
        var res = _reslinks[j];
        if (res[0] === 'text') {
          // a resource added via addResource(String)
          add(res[1], locale);
        } else if (res[0] === 'dict') {
          // a JSON resource added via addDictionary(HTMLScriptElement)
          // only add if no locale was specified or if the locale specified
          // matches the locale being created here
          if (res[2] === undefined || res[2] === locale.id) {
            addJSON(res[1], locale);
          }
        } else if (res[0] === 'uri') {
          // a resource added via linkResource(String)
          link(res[1], locale);
        } else {
          // a resource added via linkResource(Function);  the function
          // passed is a URL template and it takes the current locale's code
          // as an argument
          link(res[1](locale.id), locale);
        }
      }
      locale.ast.body['plural'] = {
        type: 'Macro',
        args: [{
          type: 'Identifier',
          name: 'n'
        }],
        expression: getPluralRule(code)
      };
      return locale;
    }

    function requestLocales() {
      if (_isFrozen && !_isReady) {
        throw new ContextError('Context not ready');
      }

      if (_reslinks.length == 0) {
        warn(new ContextError('Context has no resources; not freezing'));
        return;
      }

      _isFrozen = true;
      _requested = Array.prototype.slice.call(arguments);

      if (_requested.length) {
        _requested.forEach(function l10n_throwError(locale) {
          if (typeof locale !== 'string') {
            throw new ContextError('Language codes must be strings');
          }
        });
      }

      var fallbackChain = negotiate(_registered, _requested, _default);
      // if the negotiator returned something, freeze synchronously
      if (fallbackChain) {
        freeze(fallbackChain);
      }
    }

    function freeze(fallbackChain) {
      _fallbackChain = fallbackChain;
      var locale = getLocale(_fallbackChain[0]);
      if (locale.isReady) {
        setReady();
      } else {
        locale.build(setReady);
      }
    }

    function setReady() {
      _isReady = true;
      _emitter.emit('ready');
    }

    function addEventListener(type, listener) {
      _emitter.addEventListener(type, listener);
    }

    function removeEventListener(type, listener) {
      _emitter.removeEventListener(type, listener);
    }

    function warn(e) {
      _emitter.emit('warning', e);
      return e;
    }

    function error(e) {
      _emitter.emit('error', e);
      return e;
    }
  }

  Context.Error = ContextError;
  Context.RuntimeError = RuntimeError;
  Context.TranslationError = TranslationError;

  function ContextError(message) {
    this.name = 'ContextError';
    this.message = message;
  }
  ContextError.prototype = Object.create(Error.prototype);
  ContextError.prototype.constructor = ContextError;

  function RuntimeError(message, id, supported) {
    ContextError.call(this, message);
    this.name = 'RuntimeError';
    this.entity = id;
    this.supportedLocales = supported.slice();
    this.message = id + ': ' + message + '; tried ' + supported.join(', ');
  }
  RuntimeError.prototype = Object.create(ContextError.prototype);
  RuntimeError.prototype.constructor = RuntimeError;

  function TranslationError(message, id, supported, locale) {
    RuntimeError.call(this, message, id, supported);
    this.name = 'TranslationError';
    this.locale = locale.id;
    this.message = '[' + this.locale + '] ' + id + ': ' + message;
  }
  TranslationError.prototype = Object.create(RuntimeError.prototype);
  TranslationError.prototype.constructor = TranslationError;

  exports.Context = Context;
  exports.Locale = Locale;
  exports.Resource = Resource;

});



define('l20n/events', function(require, exports, module) {
  'use strict';

  function EventEmitter() {
    this._listeners = {};
  }

  EventEmitter.prototype.emit = function ee_emit() {
    var args = Array.prototype.slice.call(arguments);
    var type = args.shift();
    if (!this._listeners[type]) {
      return false;
    }

    var typeListeners = this._listeners[type].slice();
    for (var i = 0; i < typeListeners.length; i++) {
      typeListeners[i].apply(this, args);
    }
    return true;
  };

  EventEmitter.prototype.addEventListener = function ee_add(type, listener) {
    if (!(type in this._listeners)) {
      this._listeners[type] = [];
    }
    this._listeners[type].push(listener);
  };

  EventEmitter.prototype.removeEventListener = function ee_rm(type, listener) {
    var typeListeners = this._listeners[type];
    var pos = typeListeners.indexOf(listener);
    if (pos === -1) {
      return;
    }

    typeListeners.splice(pos, 1);
  };

  exports.EventEmitter = EventEmitter;

});



define('l20n/parser', function(require, exports, module) {
  'use strict';

  var EventEmitter = require('./events').EventEmitter;

  var nestedProps = ['style', 'dataset'];

  function Parser() {

    /* Public */

    this.parse = parse;
    this.addEventListener = addEventListener;
    this.removeEventListener = removeEventListener;


    var MAX_PLACEABLES = 100;

    var _emitter = new EventEmitter();

    var patterns = {
      comment: /^\s*#|^\s*$/,
      entity: /^([^=\s]+)\s*=\s*(.+)$/,
      multiline: /[^\\]\\$/,
      macro: /\{\[\s*(\w+)\(([^\)]*)\)\s*\]\}/i,
      unicode: /\\u([0-9a-fA-F]{1,4})/g,
      entries: /[\r\n]+/
    };

    function parse(source) {
      var ast = {};

      var entries = source.split(patterns['entries']);
      for (var i = 0; i < entries.length; i++) {
        var line = entries[i];

        if (patterns['comment'].test(line)) {
          continue;
        }

        while (patterns['multiline'].test(line) && i < entries.length) {
          line = line.slice(0, line.length - 1) + entries[++i].trim();
        }

        var entityMatch = line.match(patterns['entity']);
        if (entityMatch && entityMatch.length == 3) {
          try {
            parseEntity(entityMatch, ast);
          } catch (e) {
            if (e instanceof ParserError) {
              _emitter.emit('error', e);
              continue;
            }
          }
        }
      }
      return {
        type: 'WebL10n',
        body: ast
      };
    }

    function setEntityValue(id, attr, key, value, ast) {
      var entry = ast[id];
      var item;

      if (!entry) {
        entry = {};
        ast[id] = entry;
      }

      if (attr) {
        if (!('attrs' in entry)) {
          entry.attrs = {};
        }
        if (!(attr in entry.attrs)) {
          entry.attrs[attr] = {};
        }
        item = entry.attrs[attr];
      } else {
        item = entry;
      }

      if (!key) {
        item.value = value;
      } else {
        if (item.value.type !== 'Hash') {
          var match = item.value.content.match(patterns['macro']);
          if (!match) {
            throw new ParserError('Expected macro call');
          }
          var args = [];
          if (match[2]) {
            args.push({
              type: 'Identifier',
              name: match[2].trim()
            });
          }
          item.index = [
          {
            type: 'CallExpression',
              callee: {
                type: 'Identifier',
                name: match[1]
              },
              arguments: args
          }
          ];
          item.value = {
            type: 'Hash',
            content: []
          };
        }
        item.value.content.push({
          type: 'HashItem',
          key: key,
          value: value
        });
        if (key === 'other') {
          item.value.content[item.value.content.length - 1].default = true;
        }
      }
    }

    function parseEntity(match, ast) {
      var name, key, attr, pos;
      var value = parseValue(match[2]);

      pos = match[1].indexOf('[');
      if (pos !== -1) {
        name = match[1].substr(0, pos);
        key = match[1].substring(pos + 1, match[1].length - 1);
      } else {
        name = match[1];
        key = null;
      }

      var nameElements = name.split('.');

      if (nameElements.length > 1) {
        var attrElements = [];
        attrElements.push(nameElements.pop());
        if (nameElements.length > 1) {
          // special quirk to comply with webl10n's behavior
          if (nestedProps.indexOf(
                nameElements[nameElements.length - 1]) !== -1) {
            attrElements.push(nameElements.pop());
          }
        } else if (attrElements[0] === 'ariaLabel') {
          // special quirk to comply with webl10n's behavior
          attrElements[0] = 'aria-label';
        }
        name = nameElements.join('.');
        attr = attrElements.reverse().join('.');
      } else {
        attr = null;
      }

      setEntityValue(name, attr, key, value, ast);
    }

    function unescapeControlCharacters(str) {
      return str.replace(/\\\\/g, '\\')
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r')
                .replace(/\\t/g, '\t')
                .replace(/\\b/g, '\b')
                .replace(/\\f/g, '\f')
                .replace(/\\{/g, '{')
                .replace(/\\}/g, '}')
                .replace(/\\"/g, '"')
                .replace(/\\'/g, "'");
    }

    function unescapeUnicode(str) {
      return str.replace(patterns.unicode, function(match, token) {
        return unescape('%u' + '0000'.slice(token.length) + token);
      });
    }

    function unescapeString(str) {
      if (str.lastIndexOf('\\') !== -1) {
        str = unescapeControlCharacters(str);
      }
      return unescapeUnicode(str);
    }

    function parseValue(str) {

      var placeables = 0;

      if (str.indexOf('{{') === -1) {
        return {
          content: unescapeString(str)
        };
      }
      var chunks = str.split('{{');
      var body = [];

      chunks.forEach(function (chunk, num) {
        if (num === 0) {
          if (chunk.length > 0) {
            body.push({
              content: unescapeString(chunk)
            });
          }
          return;
        }
        var parts = chunk.split('}}');
        if (parts.length < 2) {
          throw new ParserError('Expected "}}"');
        }
        body.push({
          type: 'Identifier',
          name: parts[0].trim()
        });
        placeables++;
        if (placeables > MAX_PLACEABLES) {
          throw new ParserError('Too many placeables, maximum allowed is ' +
            MAX_PLACEABLES);
        }
        if (parts[1].length > 0) {
          body.push({
            content: unescapeString(parts[1])
          });
        }
      });
      return {
        type: 'ComplexString',
        content: body,
        source: str
      };
    }

    function addEventListener(type, listener) {
      return _emitter.addEventListener(type, listener);
    }

    function removeEventListener(type, listener) {
      return _emitter.removeEventListener(type, listener);
    }
  }

  /* ParserError class */

  Parser.Error = ParserError;

  function ParserError(message) {
    this.name = 'ParserError';
    this.message = message;
  }
  ParserError.prototype = Object.create(Error.prototype);
  ParserError.prototype.constructor = ParserError;

  exports.Parser = Parser;

});



define('l20n/compiler', function(require, exports, module) {
  'use strict';

  var EventEmitter = require('./events').EventEmitter;

  function Compiler() {

    // Public

    this.compile = compile;
    this.addEventListener = addEventListener;
    this.removeEventListener = removeEventListener;

    // Private

    var MAX_PLACEABLE_LENGTH = 2500;

    var _emitter = new EventEmitter();
    var _references = {
      identifiers: {}
    };

    var _entryTypes = {
      Entity: Entity,
      Macro: Macro
    };

    // Public API functions

    function compile(ast, env) {
      if (!env) {
        env = {};
      }

      for (var id in ast.body) {
        if (!ast.body.hasOwnProperty(id)) {
          continue;
        }
        var entry = ast.body[id];
        var constructor = _entryTypes[entry.type || 'Entity'];
        try {
          env[id] = new constructor(id, entry, env);
        } catch (e) {
          requireCompilerError(e);
        }
      }
      return env;
    }

    function addEventListener(type, listener) {
      return _emitter.addEventListener(type, listener);
    }

    function removeEventListener(type, listener) {
      return _emitter.removeEventListener(type, listener);
    }

    // utils

    function emitError(ctor, message, entry, source) {
      var e = new ctor(message, entry, source);
      _emitter.emit('error', e);
      return e;
    }

    // The Entity object.
    function Entity(id, node, env) {
      this.id = id;
      this.env = env;
      this.index = null;
      this.attributes = null;
      if (node.index) {
        this.index = [];
        for (var i = 0; i < node.index.length; i++) {
          this.index.push(IndexExpression(node.index[i], this));
        }
      }
      if (node.attrs) {
        this.attributes = [];
        for (var key in node.attrs) {
          if (node.attrs.hasOwnProperty(key)) {
            this.attributes[key] = new Attribute(key, node.attrs[key], this);
          }
        }
      }
      // Bug 817610 - Optimize a fast path for String entities in the Compiler
      if (node.value && !node.value.type) {
        this.value = node.value.content;
      } else {
        this.value = LazyExpression(node.value, this, this.index);
      }
    }

    Entity.prototype.getString = function E_getString(ctxdata) {
      try {
        var locals = {
          __this__: this,
          __env__: this.env
        };
        return _resolve(this.value, locals, ctxdata);
      } catch (e) {
        requireCompilerError(e);
        // `ValueErrors` are not emitted in `StringLiteral` where they are 
        // created, because if the string in question is being evaluated in an 
        // index, we'll emit an `IndexError` instead.  To avoid duplication, 
        // `ValueErrors` are only be emitted if they actually make it to 
        // here.  See `IndexExpression` for an example of why they wouldn't.
        if (e instanceof ValueError) {
          _emitter.emit('error', e);
        }
        throw e;
      }
    };

    Entity.prototype.get = function E_get(ctxdata) {
      // reset `_references` to an empty state
      _references.identifiers = {};
      var entity = {
        value: this.getString(ctxdata),
        attributes: {}
      };
      for (var key in this.attributes) {
        if (this.attributes.hasOwnProperty(key)) {
          entity.attributes[key] = this.attributes[key].getString(ctxdata);
        }
      }
      entity.identifiers = _references.identifiers;
      return entity;
    };


    function Attribute(key, node, entity) {
      this.key = key;
      this.entity = entity;
      this.index = null;
      if (node.index) {
        this.index = [];
        for (var i = 0; i < node.index.length; i++) {
          this.index.push(IndexExpression(node.index[i], this));
        }
      }
      // Bug 817610 - Optimize a fast path for String entities in the Compiler
      if (node.value && !node.value.type) {
        this.value = node.value.content;
      } else {
        this.value = LazyExpression(node.value, entity, this.index);
      }
    }

    Attribute.prototype.getString = function A_getString(ctxdata) {
      try {
        var locals = {
          __this__: this.entity,
          __env__: this.entity.env
        };
        return _resolve(this.value, locals, ctxdata);
      } catch (e) {
        requireCompilerError(e);
        if (e instanceof ValueError) {
          _emitter.emit('error', e);
        }
        throw e;
      }
    };

    function Macro(id, node, env) {
      this.id = id;
      this.env = env;
      this.local = node.local || false;
      this.expression = node.expression;
      this.args = node.args;
    }
    Macro.prototype._call = function M_call(arg) {
      return [null, this.expression.call(null, arg)];
    };


    var EXPRESSION_TYPES = {
      'Identifier': Identifier,
      'String': StringLiteral,
      'Hash': HashLiteral,
      'HashItem': Expression,
      'ComplexString': ComplexString,
      'CallExpression': CallExpression
    };

    function Expression(node, entry, index) {
      // An entity can have no value.  It will be resolved to `null`.
      if (!node) {
        return null;
      }
      // assume String type by default
      var type = node.type || 'String';
      if (!EXPRESSION_TYPES[type]) {
        throw emitError('CompilationError', 'Unknown expression type' + type);
      }
      if (index) {
        index = index.slice();
      }
      return EXPRESSION_TYPES[type](node, entry, index);
    }

    function LazyExpression(node, entry, index) {
      // An entity can have no value.  It will be resolved to `null`.
      if (!node) {
        return null;
      }
      var expr;
      return function(locals, ctxdata, prop) {
        if (expr) {
          return expr(locals, ctxdata, prop);
        }
        expr = Expression(node, entry, index);
        node = null;
        return expr(locals, ctxdata, prop);
      };
    }

    function _resolve(expr, locals, ctxdata) {
      // Bail out early if it's a primitive value or `null`.  This is exactly 
      // what we want.
      if (typeof expr === 'string' || 
          typeof expr === 'boolean' || 
          typeof expr === 'number' ||
          !expr) {
        return expr;
      }

      // Check if `expr` is an Entity or an Attribute
      if (expr.value !== undefined) {
        return _resolve(expr.value, locals, ctxdata);
      }

      // Check if `expr` is an expression
      if (typeof expr === 'function') {
        var current = expr(locals, ctxdata);
        locals = current[0], current = current[1];
        return _resolve(current, locals, ctxdata);
      }

      // Throw if `expr` is a macro
      if (expr.expression) {
        throw new RuntimeError('Uncalled macro: ' + expr.id);
      }

      // Throw if `expr` is a non-primitive from ctxdata
      throw new RuntimeError('Cannot resolve ctxdata of type ' + typeof expr);

    }

    function Identifier(node, entry) {
      var name = node.name;
      node = null;
      return function identifier(locals, ctxdata) {
        if (ctxdata && ctxdata.hasOwnProperty(name)) {
          return  [locals, ctxdata[name]];
        }
        if (!locals.__env__.hasOwnProperty(name)) {
          throw new RuntimeError('Reference to an unknown entry: ' + name);
        }
        _references.identifiers[name] = true;
        locals = {
          __this__: locals.__env__[name],
          __env__: locals.__env__
        };
        return [locals, locals.__this__];
      };
    }

    function StringLiteral(node) {
      var content = node.content;
      node = null;
      return function stringLiteral(locals, ctxdata) {
        return [locals, content];
      };
    }

    function ComplexString(node, entry) {
      var content = [];
      for (var i = 0; i < node.content.length; i++) {
        content.push(Expression(node.content[i], entry));
      }
      var source = node.source;
      node = null;

      // Every complexString needs to have its own `dirty` flag whose state 
      // persists across multiple calls to the given complexString.  On the 
      // other hand, `dirty` must not be shared by all complexStrings.  Hence 
      // the need to define `dirty` as a variable available in the closure.  
      // Note that the anonymous function is a self-invoked one and it returns 
      // the closure immediately.
      return function() {
        var dirty = false;
        return function complexString(locals, ctxdata) {
          if (dirty) {
            throw new RuntimeError('Cyclic reference detected');
          }
          dirty = true;
          var parts = [];
          try {
            for (var i = 0; i < content.length; i++) {
              var part = _resolve(content[i], locals, ctxdata);
              if (typeof part !== 'string' && typeof part !== 'number') {
                throw new RuntimeError('Placeables must be strings or ' +
                                       'numbers');
              }
              if (part.length > MAX_PLACEABLE_LENGTH) {
                throw new RuntimeError('Placeable has too many characters, ' +
                                       'maximum allowed is ' +
                                       MAX_PLACEABLE_LENGTH);
              }
              parts.push(part);
            }
          } catch (e) {
            requireCompilerError(e);
            // only throw, don't emit yet.  If the `ValueError` makes it to 
            // `getString()` it will be emitted there.  It might, however, be 
            // cought by `IndexExpression` and changed into a `IndexError`.  
            // See `IndexExpression` for more explanation.
            throw new ValueError(e.message, entry, source);
          } finally {
            dirty = false;
          }
          return [locals, parts.join('')];
        }
      }();
    }

    function IndexExpression(node, entry) {
      var expression = Expression(node, entry);
      node = null;

      // This is analogous to `ComplexString` in that an individual index can 
      // only be visited once during the resolution of an Entity.  `dirty` is 
      // set in a closure context of the returned function.
      return function() {
        var dirty = false;
        return function indexExpression(locals, ctxdata) {
          if (dirty) {
            throw new RuntimeError('Cyclic reference detected');
          }
          dirty = true;
          try {
            // We need to resolve `expression` here so that we catch errors 
            // thrown deep within.  Without `_resolve` we might end up with an 
            // unresolved Entity object, and no "Cyclic reference detected" 
            // error would be thown.
            var retval = _resolve(expression, locals, ctxdata);
          } catch (e) {
            // If it's an `IndexError` thrown deeper within `expression`, it 
            // has already been emitted by its `indexExpression`.  We can 
            // safely re-throw it here.
            if (e instanceof IndexError) {
              throw e;
            }

            // Otherwise, make sure it's a `RuntimeError` or a `ValueError` and 
            // throw and emit an `IndexError`.
            requireCompilerError(e);
            throw emitError(IndexError, e.message, entry);
          } finally {
            dirty = false;
          }
          return [locals, retval];
        }
      }();
    }

    function HashLiteral(node, entry, index) {
      var content = {};
      var defaultKey;
      var defaultIndex = index ? index.shift() : undefined;
      for (var i = 0; i < node.content.length; i++) {
        var elem = node.content[i];
        // use `elem.value` to skip `HashItem` and create the value right away
        content[elem.key] = Expression(elem.value, entry, index);
        if (elem.default) {
          defaultKey = elem.key;
        }
      }
      node = null;
      return function hashLiteral(locals, ctxdata) {
        var keysToTry = [defaultIndex, defaultKey];
        var keysTried = [];
        locals.__overrides__ = {
          zero: 'zero' in content,
          one: 'one' in content,
          two: 'two' in content
        };
        for (var i = 0; i < keysToTry.length; i++) {
          var key = _resolve(keysToTry[i], locals, ctxdata);
          if (key === undefined) {
            continue;
          }
          keysTried.push(key);
          if (content.hasOwnProperty(key)) {
            return [locals, content[key]];
          }
        }
        var message = 'Hash key lookup failed ' +
                      '(tried "' + keysTried.join('", "') + '").';
        throw emitError(IndexError, message, entry);
      };
    }

    function CallExpression(node, entry) {
      var callee = Expression(node.callee, entry);
      // support only one argument per callExpr for now
      var arg = Expression(node.arguments[0], entry);
      node = null;
      return function callExpression(locals, ctxdata) {
        // when arg is called, it returns a [locals, value] tuple; store the 
        // value in evaluated_args
        var argValue = arg(locals, ctxdata)[1];

        argValue = parseFloat(argValue);
        if (isNaN(argValue)) {
          throw new RuntimeError('Macro arguments must be numbers');
        }

        // special cases for zero, one, two if they are defined on the hash
        if (argValue === 0 && locals.__overrides__.zero) {
          return [null, 'zero'];
        }
        if (argValue === 1 && locals.__overrides__.one) {
          return [null, 'one'];
        }
        if (argValue === 2 && locals.__overrides__.two) {
          return [null, 'two'];
        }

        // callee is an expression pointing to a macro, e.g. an identifier
        var macro = callee(locals, ctxdata);
        locals = macro[0], macro = macro[1];
        if (!macro.expression) {
          throw new RuntimeError('Expected a macro, got a non-callable.');
        }
        // Rely entirely on the platform implementation to detect recursion.
        return macro._call(argValue);
      };
    }

  }

  Compiler.Error = CompilerError;
  Compiler.CompilationError = CompilationError;
  Compiler.RuntimeError = RuntimeError;
  Compiler.ValueError = ValueError;
  Compiler.IndexError = IndexError;


  // `CompilerError` is a general class of errors emitted by the Compiler.
  function CompilerError(message) {
    this.name = 'CompilerError';
    this.message = message;
  }
  CompilerError.prototype = Object.create(Error.prototype);
  CompilerError.prototype.constructor = CompilerError;

  // `CompilationError` extends `CompilerError`.  It's a class of errors 
  // which happen during compilation of the AST.
  function CompilationError(message, entry) {
    CompilerError.call(this, message);
    this.name = 'CompilationError';
    this.entry = entry.id;
  }
  CompilationError.prototype = Object.create(CompilerError.prototype);
  CompilationError.prototype.constructor = CompilationError;

  // `RuntimeError` extends `CompilerError`.  It's a class of errors which 
  // happen during the evaluation of entries, i.e. when you call 
  // `entity.toString()`.
  function RuntimeError(message) {
    CompilerError.call(this, message);
    this.name = 'RuntimeError';
  };
  RuntimeError.prototype = Object.create(CompilerError.prototype);
  RuntimeError.prototype.constructor = RuntimeError;

  // `ValueError` extends `RuntimeError`.  It's a class of errors which 
  // happen during the composition of a ComplexString value.  It's easier to 
  // recover from than an `IndexError` because at least we know that we're 
  // showing the correct member of the hash.
  function ValueError(message, entry, source) {
    RuntimeError.call(this, message);
    this.name = 'ValueError';
    this.entry = entry.id;
    this.source = source;
  }
  ValueError.prototype = Object.create(RuntimeError.prototype);
  ValueError.prototype.constructor = ValueError;

  // `IndexError` extends `RuntimeError`.  It's a class of errors which 
  // happen during the lookup of a hash member.  It's harder to recover 
  // from than `ValueError` because we en dup not knowing which variant of the 
  // entity value to show and in case the meanings are divergent, the 
  // consequences for the user can be serious.
  function IndexError(message, entry) {
    RuntimeError.call(this, message);
    this.name = 'IndexError';
    this.entry = entry.id;
  };
  IndexError.prototype = Object.create(RuntimeError.prototype);
  IndexError.prototype.constructor = IndexError;

  function requireCompilerError(e) {
    if (!(e instanceof CompilerError)) {
      throw e;
    }
  }

  exports.Compiler = Compiler;

});



define('l20n/platform/io', function(require, exports, module) {
  'use strict';

  exports.load = function load(url, callback, sync) {
    var xhr = new XMLHttpRequest();

    if (xhr.overrideMimeType) {
      xhr.overrideMimeType('text/plain');
    }

    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status == 200 || xhr.status == 0) {
          callback(null, xhr.responseText);
        } else {
          var ex = new IOError('Not found: ' + url);
          callback(ex);
        }
      }
    };

    xhr.open('GET', url, !sync);
    xhr.send('');
  };

  function IOError(message) {
    this.name = 'IOError';
    this.message = message;
  }
  IOError.prototype = Object.create(Error.prototype);
  IOError.prototype.constructor = IOError;

  exports.Error = IOError;

});



define('l20n/plurals', function(require, exports, module) {
  'use strict';

  var kPluralForms = ['zero', 'one', 'two', 'few', 'many', 'other'];

  function getPluralRule(lang) {
    var locales2rules = {
      'af': 3,
      'ak': 4,
      'am': 4,
      'ar': 1,
      'asa': 3,
      'az': 0,
      'be': 11,
      'bem': 3,
      'bez': 3,
      'bg': 3,
      'bh': 4,
      'bm': 0,
      'bn': 3,
      'bo': 0,
      'br': 20,
      'brx': 3,
      'bs': 11,
      'ca': 3,
      'cgg': 3,
      'chr': 3,
      'cs': 12,
      'cy': 17,
      'da': 3,
      'de': 3,
      'dv': 3,
      'dz': 0,
      'ee': 3,
      'el': 3,
      'en': 3,
      'eo': 3,
      'es': 3,
      'et': 3,
      'eu': 3,
      'fa': 0,
      'ff': 5,
      'fi': 3,
      'fil': 4,
      'fo': 3,
      'fr': 5,
      'fur': 3,
      'fy': 3,
      'ga': 8,
      'gd': 24,
      'gl': 3,
      'gsw': 3,
      'gu': 3,
      'guw': 4,
      'gv': 23,
      'ha': 3,
      'haw': 3,
      'he': 2,
      'hi': 4,
      'hr': 11,
      'hu': 0,
      'id': 0,
      'ig': 0,
      'ii': 0,
      'is': 3,
      'it': 3,
      'iu': 7,
      'ja': 0,
      'jmc': 3,
      'jv': 0,
      'ka': 0,
      'kab': 5,
      'kaj': 3,
      'kcg': 3,
      'kde': 0,
      'kea': 0,
      'kk': 3,
      'kl': 3,
      'km': 0,
      'kn': 0,
      'ko': 0,
      'ksb': 3,
      'ksh': 21,
      'ku': 3,
      'kw': 7,
      'lag': 18,
      'lb': 3,
      'lg': 3,
      'ln': 4,
      'lo': 0,
      'lt': 10,
      'lv': 6,
      'mas': 3,
      'mg': 4,
      'mk': 16,
      'ml': 3,
      'mn': 3,
      'mo': 9,
      'mr': 3,
      'ms': 0,
      'mt': 15,
      'my': 0,
      'nah': 3,
      'naq': 7,
      'nb': 3,
      'nd': 3,
      'ne': 3,
      'nl': 3,
      'nn': 3,
      'no': 3,
      'nr': 3,
      'nso': 4,
      'ny': 3,
      'nyn': 3,
      'om': 3,
      'or': 3,
      'pa': 3,
      'pap': 3,
      'pl': 13,
      'ps': 3,
      'pt': 3,
      'rm': 3,
      'ro': 9,
      'rof': 3,
      'ru': 11,
      'rwk': 3,
      'sah': 0,
      'saq': 3,
      'se': 7,
      'seh': 3,
      'ses': 0,
      'sg': 0,
      'sh': 11,
      'shi': 19,
      'sk': 12,
      'sl': 14,
      'sma': 7,
      'smi': 7,
      'smj': 7,
      'smn': 7,
      'sms': 7,
      'sn': 3,
      'so': 3,
      'sq': 3,
      'sr': 11,
      'ss': 3,
      'ssy': 3,
      'st': 3,
      'sv': 3,
      'sw': 3,
      'syr': 3,
      'ta': 3,
      'te': 3,
      'teo': 3,
      'th': 0,
      'ti': 4,
      'tig': 3,
      'tk': 3,
      'tl': 4,
      'tn': 3,
      'to': 0,
      'tr': 0,
      'ts': 3,
      'tzm': 22,
      'uk': 11,
      'ur': 3,
      've': 3,
      'vi': 0,
      'vun': 3,
      'wa': 4,
      'wae': 3,
      'wo': 0,
      'xh': 3,
      'xog': 3,
      'yo': 0,
      'zh': 0,
      'zu': 3
    };

    // utility functions for plural rules methods
    function isIn(n, list) {
      return list.indexOf(n) !== -1;
    }
    function isBetween(n, start, end) {
      return start <= n && n <= end;
    }

    // list of all plural rules methods:
    // map an integer to the plural form name to use
    var pluralRules = {
      '0': function(n) {
        return 'other';
      },
      '1': function(n) {
        if ((isBetween((n % 100), 3, 10)))
          return 'few';
        if (n === 0)
          return 'zero';
        if ((isBetween((n % 100), 11, 99)))
          return 'many';
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '2': function(n) {
        if (n !== 0 && (n % 10) === 0)
          return 'many';
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '3': function(n) {
        if (n == 1)
          return 'one';
        return 'other';
      },
      '4': function(n) {
        if ((isBetween(n, 0, 1)))
          return 'one';
        return 'other';
      },
      '5': function(n) {
        if ((isBetween(n, 0, 2)) && n != 2)
          return 'one';
        return 'other';
      },
      '6': function(n) {
        if (n === 0)
          return 'zero';
        if ((n % 10) == 1 && (n % 100) != 11)
          return 'one';
        return 'other';
      },
      '7': function(n) {
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '8': function(n) {
        if ((isBetween(n, 3, 6)))
          return 'few';
        if ((isBetween(n, 7, 10)))
          return 'many';
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '9': function(n) {
        if (n === 0 || n != 1 && (isBetween((n % 100), 1, 19)))
          return 'few';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '10': function(n) {
        if ((isBetween((n % 10), 2, 9)) && !(isBetween((n % 100), 11, 19)))
          return 'few';
        if ((n % 10) == 1 && !(isBetween((n % 100), 11, 19)))
          return 'one';
        return 'other';
      },
      '11': function(n) {
        if ((isBetween((n % 10), 2, 4)) && !(isBetween((n % 100), 12, 14)))
          return 'few';
        if ((n % 10) === 0 ||
            (isBetween((n % 10), 5, 9)) ||
            (isBetween((n % 100), 11, 14)))
          return 'many';
        if ((n % 10) == 1 && (n % 100) != 11)
          return 'one';
        return 'other';
      },
      '12': function(n) {
        if ((isBetween(n, 2, 4)))
          return 'few';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '13': function(n) {
        if ((isBetween((n % 10), 2, 4)) && !(isBetween((n % 100), 12, 14)))
          return 'few';
        if (n != 1 && (isBetween((n % 10), 0, 1)) ||
            (isBetween((n % 10), 5, 9)) ||
            (isBetween((n % 100), 12, 14)))
          return 'many';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '14': function(n) {
        if ((isBetween((n % 100), 3, 4)))
          return 'few';
        if ((n % 100) == 2)
          return 'two';
        if ((n % 100) == 1)
          return 'one';
        return 'other';
      },
      '15': function(n) {
        if (n === 0 || (isBetween((n % 100), 2, 10)))
          return 'few';
        if ((isBetween((n % 100), 11, 19)))
          return 'many';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '16': function(n) {
        if ((n % 10) == 1 && n != 11)
          return 'one';
        return 'other';
      },
      '17': function(n) {
        if (n == 3)
          return 'few';
        if (n === 0)
          return 'zero';
        if (n == 6)
          return 'many';
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '18': function(n) {
        if (n === 0)
          return 'zero';
        if ((isBetween(n, 0, 2)) && n !== 0 && n != 2)
          return 'one';
        return 'other';
      },
      '19': function(n) {
        if ((isBetween(n, 2, 10)))
          return 'few';
        if ((isBetween(n, 0, 1)))
          return 'one';
        return 'other';
      },
      '20': function(n) {
        if ((isBetween((n % 10), 3, 4) || ((n % 10) == 9)) && !(
            isBetween((n % 100), 10, 19) ||
            isBetween((n % 100), 70, 79) ||
            isBetween((n % 100), 90, 99)
            ))
          return 'few';
        if ((n % 1000000) === 0 && n !== 0)
          return 'many';
        if ((n % 10) == 2 && !isIn((n % 100), [12, 72, 92]))
          return 'two';
        if ((n % 10) == 1 && !isIn((n % 100), [11, 71, 91]))
          return 'one';
        return 'other';
      },
      '21': function(n) {
        if (n === 0)
          return 'zero';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '22': function(n) {
        if ((isBetween(n, 0, 1)) || (isBetween(n, 11, 99)))
          return 'one';
        return 'other';
      },
      '23': function(n) {
        if ((isBetween((n % 10), 1, 2)) || (n % 20) === 0)
          return 'one';
        return 'other';
      },
      '24': function(n) {
        if ((isBetween(n, 3, 10) || isBetween(n, 13, 19)))
          return 'few';
        if (isIn(n, [2, 12]))
          return 'two';
        if (isIn(n, [1, 11]))
          return 'one';
        return 'other';
      }
    };

    // return a function that gives the plural form name for a given integer
    var index = locales2rules[lang.replace(/-.*$/, '')];
    if (!(index in pluralRules)) {
      return function() { return 'other'; };
    }
    return pluralRules[index];
  }

  exports.getPluralRule = getPluralRule;

});



// hook up the HTML bindings
require('l20n/buildtime');

})(this);
