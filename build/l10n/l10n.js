(function(window, undefined) {
  'use strict';

  /* Buildtime optimizations logic
   *
   * Below are defined functions to perform buildtime optimizations in Gaia.
   * These include flattening all localization resources into a single JSON
   * file and embedding a subset of translations in HTML to reduce file IO.
   *
   */

  /* jshint -W104,validthis:true */

  var DEBUG = false;

  var L10n = navigator.mozL10n._getInternalAPI();

  navigator.mozL10n.bootstrap = function(file, debug) {
    var ctx = navigator.mozL10n.ctx = new L10n.Context(file);

    if (debug) {
      DEBUG = true;
    }

    ctx.addEventListener('notfounderror', function(e) {
      if (e.loc === 'en-US') {
        throw e;
      }
    });

    var error = addBuildMessage.bind(this, 'error');
    var warn = addBuildMessage.bind(this, 'warn');

    if (DEBUG) {
      ctx.addEventListener('fetcherror', error);
      ctx.addEventListener('manifesterror', warn);
      ctx.addEventListener('parseerror', warn);
      ctx.addEventListener('resolveerror', warn);
      ctx.addEventListener('notfounderror', error);
    }

    initResources.call(this);
  };

  function initResources() {
    var containsFetchableLocale = false;

    var meta = {};
    var nodes = document.head
                        .querySelectorAll('link[rel="localization"],' +
                                          'meta[name="availableLanguages"],' +
                                          'meta[name="defaultLanguage"]');

    for (var i = 0, node; (node = nodes[i]); i++) {
      var type = node.getAttribute('rel') || node.nodeName.toLowerCase();
      switch (type) {
        case 'localization':
          if (!('noFetch' in node.dataset)) {
            containsFetchableLocale = true;
          }
          this.ctx.resLinks.push(node.getAttribute('href'));
          break;
        case 'meta':
          L10n.onMetaInjected.call(this, node, meta);
          break;
      }
    }

    if (!containsFetchableLocale) {
      document.documentElement.dataset.noCompleteBug = true;
    }

    var availableLangs = meta.availableLanguages ?
      Object.keys(meta.availableLanguages) : null;

    this.ctx.registerLocales(meta.defaultLanguage, availableLangs);
  }


  /* API for webapp-optimize */

  // on buildtime, all known pseudolocales need to run through the qps logic;
  // on runtime this is not the case because some of them might have been
  // already built on buildtime
  L10n.Locale.prototype.isPseudo = function() {
    return this.id in navigator.mozL10n.qps;
  };

  L10n.Locale.prototype.addAST = function(ast) {
    if (!this.astById) {
      this.astById = Object.create(null);
    }

    var isPseudo = this.isPseudo();

    for (var i = 0, node; (node = ast[i]); i++) {
      if (isPseudo) {
        node = L10n.walkContent(
          node, navigator.mozL10n.qps[this.id].translate);
      }
      this.entries[node.$i] = L10n.Resolver.createEntry(node, this.entries);
      this.astById[node.$i] = node;
    }
  };

  L10n.Context.prototype.getEntitySource = function(id) {

    if (!this.isReady) {
      throw new L10n.Error('Context not ready');
    }

    var sourceEntity = this.getLocale('en-US').astById[id];

    var cur = 0;
    var loc;
    var locale;
    while ((loc = this.supportedLocales[cur])) {
      locale = this.getLocale(loc);
      if (!locale.isReady) {
        // build without callback, synchronously
        locale.build(null);
      }

      if (locale.astById && id in locale.astById) {
        var entity = locale.astById[id];
        if (loc === 'en-US' || areEntityStructsEqual(sourceEntity, entity)) {
          return entity;
        } else {
          return sourceEntity;
        }
      }

      this._emitter.emit('notfounderror', new L10n.Error(
        '"' + id + '"' + ' not found in ' + loc + ' in' + this.id,
        id, loc));
      cur++;
    }
    return '';
  };

  navigator.mozL10n.translateDocument = L10n.translateDocument;

  navigator.mozL10n.getAST = function() {
    var ast = [];

    // en-US is the de facto source locale of Gaia
    var sourceLocale = this.ctx.getLocale('en-US');
    if (!sourceLocale.isReady) {
      sourceLocale.build(null);
    }
    // iterate over all strings in en-US
    for (var id in sourceLocale.astById) {
      ast.push(this.ctx.getEntitySource(id));
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

  function areEntityStructsEqual(entity1, entity2) {
    var keys1 = Object.keys(entity1);
    var keys2 = Object.keys(entity2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (var i = 0; i < keys1.length; i++) {
      if (keys2.indexOf(keys1[i]) === -1) {
        return false;
      }
    }

    return true;
  }

})(this);
