(function(window, undefined) {
  'use strict';

  /* jshint validthis:true */

  /* Utility functions */

  // Recursively walk an AST node searching for content leaves
  function walkContent(node, fn) {
    if (typeof node === 'string') {
      return fn(node);
    }

    var rv = {};
    for (var key in node) {
      if (key !== '_index' && node.hasOwnProperty(key)) {
        rv[key] = walkContent(node[key], fn);
      }
    }
    return rv;
  }


  /* Pseudolocalizations
   *
   * PSEUDO_STRATEGIES is a dict of strategies to be used to modify the English
   * context in order to create pseudolocalizations.  These can be used by
   * developers to test the localizability of their code without having to
   * actually speak a foreign language.
   *
   * Currently, the following pseudolocales are supported:
   *
   *   qps-ploc - Ȧȧƈƈḗḗƞŧḗḗḓ Ḗḗƞɠŀīīşħ
   *
   *     In Accented English all English letters are replaced by accented
   *     Unicode counterparts which don't impair the readability of the content.
   *     This allows developers to quickly test if any given string is being
   *     correctly displayed in its 'translated' form.  Additionally, simple
   *     heuristics are used to make certain words longer to better simulate the
   *     experience of international users.
   *
   *   qps-plocm - ɥsıʅƃuƎ pǝɹoɹɹıW
   *
   *     Mirrored English is a fake RTL locale.  All words are surrounded by
   *     Unicode formatting marks forcing the RTL directionality of characters.
   *     In addition, to make the reversed text easier to read, individual
   *     letters are flipped.
   *
   *     Note: The name above is hardcoded to be RTL in case code editors have
   *     trouble with the RLO and PDF Unicode marks.  In reality, it should be
   *     surrounded by those marks as well.
   *
   * See https://bugzil.la/900182 for more information.
   *
   */

  var reAlphas = /[a-zA-Z]/g;
  var reVowels = /[aeiouAEIOU]/g;

  // ȦƁƇḒḖƑƓĦĪĴĶĿḾȠǾƤɊŘŞŦŬṼẆẊẎẐ + [\\]^_` + ȧƀƈḓḗƒɠħīĵķŀḿƞǿƥɋřşŧŭṽẇẋẏẑ
  var ACCENTED_MAP = '\u0226\u0181\u0187\u1E12\u1E16\u0191\u0193\u0126\u012A' +
                     '\u0134\u0136\u013F\u1E3E\u0220\u01FE\u01A4\u024A\u0158' +
                     '\u015E\u0166\u016C\u1E7C\u1E86\u1E8A\u1E8E\u1E90' +
                     '[\\]^_`' +
                     '\u0227\u0180\u0188\u1E13\u1E17\u0192\u0260\u0127\u012B' +
                     '\u0135\u0137\u0140\u1E3F\u019E\u01FF\u01A5\u024B\u0159' +
                     '\u015F\u0167\u016D\u1E7D\u1E87\u1E8B\u1E8F\u1E91';

  // XXX Until https://bugzil.la/1007340 is fixed, ᗡℲ⅁⅂⅄ don't render correctly
  // on the devices.  For now, use the following replacements: pɟפ˥ʎ
  // ∀ԐↃpƎɟפHIſӼ˥WNOԀÒᴚS⊥∩ɅＭXʎZ + [\\]ᵥ_, + ɐqɔpǝɟƃɥıɾʞʅɯuodbɹsʇnʌʍxʎz
  var FLIPPED_MAP = '\u2200\u0510\u2183p\u018E\u025F\u05E4HI\u017F' +
                    '\u04FC\u02E5WNO\u0500\xD2\u1D1AS\u22A5\u2229\u0245' +
                    '\uFF2DX\u028EZ' +
                    '[\\]\u1D65_,' +
                    '\u0250q\u0254p\u01DD\u025F\u0183\u0265\u0131\u027E' +
                    '\u029E\u0285\u026Fuodb\u0279s\u0287n\u028C\u028Dx\u028Ez';

  function makeLonger(val) {
    return val.replace(reVowels, function(match) {
      return match + match.toLowerCase();
    });
  }

  function makeAccented(map, val) {
    // Replace each Latin letter with a Unicode character from map
    return val.replace(reAlphas, function(match) {
      return map.charAt(match.charCodeAt(0) - 65);
    });
  }

  var reWords = /[^\W0-9_]+/g;

  function makeRTL(val) {
    // Surround each word with Unicode formatting codes, RLO and PDF:
    //   U+202E:   RIGHT-TO-LEFT OVERRIDE (RLO)
    //   U+202C:   POP DIRECTIONAL FORMATTING (PDF)
    // See http://www.w3.org/International/questions/qa-bidi-controls
    return val.replace(reWords, function(match) {
      return '\u202e' + match + '\u202c';
    });
  }

  // strftime tokens (%a, %Eb), {{ placeables }} and template {vars}
  var reExcluded = /(%[EO]?\w|\{\{?\s*.+?\s*\}?\})/;

  function mapContent(fn, val) {
    if (!val) {
      return val;
    }
    var parts = val.split(reExcluded);
    var modified = parts.map(function(part) {
      if (reExcluded.test(part)) {
        return part;
      }
      return fn(part);
    });
    return modified.join('');
  }

  var PSEUDO_STRATEGIES = {
    'qps-ploc': mapContent.bind(null, function(val) {
      return makeAccented(ACCENTED_MAP, makeLonger(val));
    }),
    'qps-plocm': mapContent.bind(null, function(val) {
      return makeAccented(FLIPPED_MAP, makeRTL(val));
    })
  };


  /* Buildtime optimizations logic
   *
   * Below are defined functions to perform buildtime optimizations in Gaia.
   * These include flattening all localization resources into a single JSON file
   * and embedding a subset of translations in HTML to reduce file IO.
   *
   */

  /* jshint -W104 */

  var DEBUG = false;
  var requiresInlineLocale = false; // netError requires inline locale

  var L10n = navigator.mozL10n._getInternalAPI();

  navigator.mozL10n._getInternalAPI = function() {
    L10n.walkContent = walkContent;
    L10n.PSEUDO_STRATEGIES = PSEUDO_STRATEGIES;
    return L10n;
  };

  navigator.mozL10n.bootstrap = function(callback, debug) {
    var ctx = navigator.mozL10n.ctx = new L10n.Context();
    requiresInlineLocale = false;

    if (debug) {
      DEBUG = true;
    }

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
    var i;

    for (i = 0; i < resLinks.length; i++) {
      var link = resLinks[i];
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

    for (i = 0; i < iniLinks.length; i++) {
      L10n.loadINI.call(this, iniLinks[i], onIniLoaded);
    }
  }


  /* API for webapp-optimize */

  L10n.Entity.prototype.toString = function(ctxdata) {
    var value;
    try {
      value = this.resolve(ctxdata);
    } catch (e) {
      return undefined;
    }
    var currentLoc = navigator.mozL10n.language.code;
    if (PSEUDO_STRATEGIES.hasOwnProperty(currentLoc)) {
      return PSEUDO_STRATEGIES[currentLoc](value);
    } else {
      return value;
    }
  };

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

      if (locale.ast && locale.ast.hasOwnProperty(id)) {
        if (PSEUDO_STRATEGIES.hasOwnProperty(this.supportedLocales[0])) {
          return walkContent(locale.ast[id],
                             PSEUDO_STRATEGIES[this.supportedLocales[0]]);
        } else {
          return locale.ast[id];
        }
      }

      var e = new L10n.Error(id + ' not found in ' + loc, id, loc);
      this._emitter.emit('warning', e);
      cur++;
    }
    return '';
  };

  // return an array of all {{placeables}} found in a string
  function getPlaceableNames(str) {
    /* jshint boss:true */
    var placeables = [];
    var match;
    while (match = L10n.rePlaceables.exec(str)) {
      placeables.push(match[1]);
    }
    return placeables;
  }

  // put all dependencies required for string interpolation in the AST
  // XXX only first-level deps are supported for now to avoid having to check
  // for cyclic and recursive references
  function getPlaceables(ast, val) {
    var placeables = getPlaceableNames(val);
    for (var i = 0; i < placeables.length; i++) {
      var id = placeables[i];
      ast[id] = this.ctx.getEntitySource(id);
    }
  }

  navigator.mozL10n.getDictionary = function getDictionary(defLoc, fragment) {
    var ast = {};

    if (!fragment) {
      // en-US is the de facto source locale of Gaia;  defLoc can be something
      // else, as configured in GAIA_DEFAULT_LOCALE
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
    if (!requiresInlineLocale && this.ctx.supportedLocales[0] === defLoc) {
      return null;
    }

    var elements = L10n.getTranslatableChildren(fragment);

    for (var i = 0; i < elements.length; i++) {
      var attrs = L10n.getL10nAttributes(elements[i]);
      var val = this.ctx.getEntitySource(attrs.id);
      ast[attrs.id] = val;
      walkContent(val, getPlaceables.bind(this, ast));
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
