(function(window, undefined) {
  'use strict';

  /* jshint validthis:true */
  /* jshint -W104 */

  var DEBUG = true;
  var requiresInlineLocale = false; // netError requires inline locale

  var L10n = navigator.mozL10n._getInternalAPI();

  navigator.mozL10n.bootstrap = function bootstrap(callback) {
    var ctx = navigator.mozL10n.ctx = new L10n.Context();
    ctx.ready(onReady.bind(this));
    requiresInlineLocale = false;

    if (DEBUG) {
      ctx.addEventListener('error', addBuildMessage.bind(this, 'error'));
      ctx.addEventListener('warning', addBuildMessage.bind(this, 'warn'));
    }
    initResources.call(this, callback);
  };

  function initResources(callback) {
    var resLinks = document.head
                           .querySelectorAll('link[type="application/l10n"]');
    var iniLinks = [];
    var containsFetchableLocale = false;
    var link;

    for (link of resLinks) {
      var url = link.getAttribute('href');
      var type = url.substr(url.lastIndexOf('.') + 1);
      if (type === 'ini') {
        if (!('noFetch' in link.dataset)) {
          containsFetchableLocale = true;
        }
        iniLinks.push(url);
      }
      this.ctx.resLinks.push(url);
    }

    var iniLoads = iniLinks.length;
    if (iniLoads === 0) {
      onIniLoaded();
      return;
    }

    function onIniLoaded() {
      if (--iniLoads <= 0) {
        if (!containsFetchableLocale) {
          requiresInlineLocale = true;
          document.documentElement.dataset.noCompleteBug = true;
        }
        callback();
      }
    }

    for (link of iniLinks) {
      L10n.loadINI.call(this, link, onIniLoaded);
    }
  }

  function onReady() {
    this.translate();
    L10n.fireLocalizedEvent.call(this);
  }


  /* API for webapp-optimize */

  L10n.Locale.prototype.addAST = function(ast) {
    if (!this.ast) {
      this.ast = {};
    }
    for (var id in ast) {
      if (ast.hasOwnProperty(id)) {
        this.ast[id] = ast[id];
        this.entries[id] = ast[id];
      }
    }
  };

  L10n.Context.prototype.getEntitySource = function(id) {
    /* jshint -W084 */

    if (!this.isReady) {
      throw new L10n.Context.Error('Context not ready');
    }

    var cur = 0;
    var loc;
    var locale;
    while (loc = this.supportedLocales[cur]) {
      locale = this.getLocale(loc);
      if (!locale.isReady) {
        // build without callback, synchronously
        locale.build(null);
      }

      if (locale.ast && locale.ast.hasOwnProperty(id)) {
        return locale.ast[id];
      }

      var e = new L10n.Context.Error(id + ' not found in ' + loc, id, loc);
      this._emitter.emit('warning', e);
      cur++;
    }
    return '';
  };

  // return an array of all {{placeables}} found in a string
  function getPlaceableNames(str) {
    var placeables = [];
    var match;
    while (match = L10n.rePlaceables.exec(str)) {
      placeables.push(match[1]);
    }
    return placeables;
  }

  // recursively walk an entity and put all dependencies required for string
  // interpolation in the AST
  function getPlaceables(ast, val) {
    if (typeof val === 'string') {
      var placeables = getPlaceableNames(val);
      for (var i = 0; i < placeables.length; i++) {
        var id = placeables[i];
        ast[id] = this.ctx.getEntitySource(id);
      }
    } else {
      for (var prop in val) {
        if (!val.hasOwnProperty(prop) || val === '_index') {
          continue;
        }
        getPlaceables.call(this, ast, val[prop]);
      }
    }
  }

  navigator.mozL10n.getDictionary = function getDictionary(fragment) {
    var ast = {};

    if (!fragment) {
      var sourceLocale = this.ctx.getLocale('en-US');
      if (!sourceLocale.isReady) {
        sourceLocale.build(null);
      }
      // iterate over all strings in en-US
      for (var id in sourceLocale.ast) {
        ast[id] = this.ctx.getEntitySource(id);
      }
      flushBuildMessages.call(this, 'compared to en-US');
      return ast;
    }

    // don't build inline JSON for default language
    if (!requiresInlineLocale && this.ctx.supportedLocales[0] === 'en-US') {
      return {};
    }

    var elements = L10n.getTranslatableChildren(fragment);

    for (var i = 0; i < elements.length; i++) {
      var attrs = L10n.getL10nAttributes(elements[i]);
      var val = this.ctx.getEntitySource(attrs.id);
      ast[attrs.id] = val;
      getPlaceables.call(this, ast, val);
    }
    flushBuildMessages.call(this, 'in the visible DOM');

    return ast;
  };


  /* Error logging */

  var buildMessages = {};

  function addBuildMessage(type, e) {
    if (!(type in buildMessages)) {
      buildMessages[type] = [];
    }
    if (e instanceof L10n.Context.Error &&
        e.loc === this.ctx.supportedLocales[0] &&
        buildMessages[type].indexOf(e.id) === -1) {
      buildMessages[type].push(e.id);
    }
  }

  function flushBuildMessages(variant) {
    for (var type in buildMessages) {
      let messages = buildMessages[type];
      if (messages.length) {
        console.log('[l10n] [' + this.ctx.supportedLocales[0] +
            ']: ' + messages.length + ' missing ' + variant + ': ' +
            messages.join(', '));
        buildMessages[type] = [];
      }
    }
  }

})(this);
