(function(window, undefined) {
  'use strict';

  /* jshint validthis:true */
  /* Buildtime optimizations logic
   *
   * Below are defined functions to perform buildtime optimizations in Gaia.
   * These include flattening all localization resources into a single JSON file
   * and embedding a subset of translations in HTML to reduce file IO.
   *
   */

  /* jshint -W104 */

  var DEBUG = false;

  var L10n = navigator.mozL10n._getInternalAPI();

  navigator.mozL10n.bootstrap = function(debug) {
    var ctx = navigator.mozL10n.ctx = new L10n.Context();

    if (debug) {
      DEBUG = true;
    }

    if (DEBUG) {
      ctx.addEventListener('error', addBuildMessage.bind(this, 'error'));
      ctx.addEventListener('warning', addBuildMessage.bind(this, 'warn'));
    }
    initResources.call(this);
  };

  function initResources() {
    /* jshint boss:true */
    var containsFetchableLocale = false;

    var nodes = document.head
                        .querySelectorAll('link[rel="localization"],' +
                                          'link[rel="manifest"],' +
                                          'meta[name="locales"],' +
                                          'meta[name="default_locale"]');

    for (var i = 0, node; node = nodes[i]; i++) {
      var type = node.getAttribute('rel') || node.nodeName.toLowerCase();
      switch (type) {
        case 'manifest':
          L10n.onManifestInjected.call(this, node.getAttribute('href'));
          break;
        case 'localization':
          if (!('noFetch' in node.dataset)) {
            containsFetchableLocale = true;
          }
          this.ctx.resLinks.push(node.getAttribute('href'));
          break;
        case 'meta':
          L10n.onMetaInjected.call(this, node);
          break;
      }
    }

    if (!containsFetchableLocale) {
      document.documentElement.dataset.noCompleteBug = true;
    }
  }


  /* API for webapp-optimize */

  L10n.Locale.prototype.addAST = function(ast) {
    if (!this.ast) {
      this.ast = Object.create(null);
    }

    var keys = Object.keys(ast);

    /* jshint -W084 */
    for (var i = 0, key; key = keys[i]; i++) {
      this.entries[key] = ast[key];
      this.ast[key] = ast[key];
    }
  };

  L10n.Context.prototype.getEntitySource = function(id) {
    /* jshint -W084 */

    if (!this.isReady) {
      throw new L10n.Error('Context not ready');
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

      if (locale.ast && id in locale.ast) {
        return locale.ast[id];
      }

      var e = new L10n.Error(id + ' not found in ' + loc, id, loc);
      this._emitter.emit('warning', e);
      cur++;
    }
    return '';
  };

  navigator.mozL10n.translateDocument = L10n.translateDocument;

  navigator.mozL10n.getDictionary = function getDictionary() {
    // don't do anything for pseudolocales
    if (this.ctx.supportedLocales[0] in this.qps) {
      return null;
    }

    var ast = {};

    // en-US is the de facto source locale of Gaia
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
  };


  /* Error logging */

  var buildMessages = {};

  function addBuildMessage(type, e) {
    if (!(type in buildMessages)) {
      buildMessages[type] = [];
    }
    if (e instanceof L10n.Error &&
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
