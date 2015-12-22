'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function L10nError(message, id, lang) {
  this.name = 'L10nError';
  this.message = message;
  this.id = id;
  this.lang = lang;
}
L10nError.prototype = Object.create(Error.prototype);
L10nError.prototype.constructor = L10nError;

function fetchResource(htmloptimizer, res, { code }) {
  // We need to decode URI because build system DOM reader
  // may replace `{locale}` with `%7Blocale%7D`. See bug 1098188
  const url = decodeURI(res).replace('{locale}', code);
  const { file, content } = htmloptimizer.getFileByRelativePath(url);
  if (!file) {
    return Promise.reject(new L10nError('Not found: ' + url));
  }

  const parsed = res.endsWith('.json') ? JSON.parse(content) : content;
  return Promise.resolve(parsed);
}

// Walk an entry node searching for content leaves
function walkEntry(entry, fn) {
  if (typeof entry === 'string') {
    return fn(entry);
  }

  const newEntry = Object.create(null);

  if (entry.value) {
    newEntry.value = walkValue$1(entry.value, fn);
  }

  if (entry.index) {
    newEntry.index = entry.index;
  }

  if (entry.attrs) {
    newEntry.attrs = Object.create(null);
    for (let key in entry.attrs) {
      newEntry.attrs[key] = walkEntry(entry.attrs[key], fn);
    }
  }

  return newEntry;
}

function walkValue$1(value, fn) {
  if (typeof value === 'string') {
    return fn(value);
  }

  // skip expressions in placeables
  if (value.type) {
    return value;
  }

  const newValue = Array.isArray(value) ? [] : Object.create(null);
  const keys = Object.keys(value);

  for (let i = 0, key; key = keys[i]; i++) {
    newValue[key] = walkValue$1(value[key], fn);
  }

  return newValue;
}

/* Pseudolocalizations
 *
 * pseudo is a dict of strategies to be used to modify the English
 * context in order to create pseudolocalizations.  These can be used by
 * developers to test the localizability of their code without having to
 * actually speak a foreign language.
 *
 * Currently, the following pseudolocales are supported:
 *
 *   fr-x-psaccent - Ȧȧƈƈḗḗƞŧḗḗḓ Ḗḗƞɠŀīīşħ
 *
 *     In Accented English all English letters are replaced by accented
 *     Unicode counterparts which don't impair the readability of the content.
 *     This allows developers to quickly test if any given string is being
 *     correctly displayed in its 'translated' form.  Additionally, simple
 *     heuristics are used to make certain words longer to better simulate the
 *     experience of international users.
 *
 *   ar-x-psbidi - ɥsıʅƃuƎ ıpıԐ
 *
 *     Bidi English is a fake RTL locale.  All words are surrounded by
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

function createGetter(id, name) {
  let _pseudo = null;

  return function getPseudo() {
    if (_pseudo) {
      return _pseudo;
    }

    const reAlphas = /[a-zA-Z]/g;
    const reVowels = /[aeiouAEIOU]/g;
    const reWords = /[^\W0-9_]+/g;
    // strftime tokens (%a, %Eb), template {vars}, HTML entities (&#x202a;)
    // and HTML tags.
    const reExcluded = /(%[EO]?\w|\{\s*.+?\s*\}|&[#\w]+;|<\s*.+?\s*>)/;

    const charMaps = {
      'fr-x-psaccent': 'ȦƁƇḒḖƑƓĦĪĴĶĿḾȠǾƤɊŘŞŦŬṼẆẊẎẐ[\\]^_`ȧƀƈḓḗƒɠħīĵķŀḿƞǿƥɋřşŧŭṽẇẋẏẑ',
      'ar-x-psbidi':
      // XXX Use pɟפ˥ʎ as replacements for ᗡℲ⅁⅂⅄. https://bugzil.la/1007340
      '∀ԐↃpƎɟפHIſӼ˥WNOԀÒᴚS⊥∩ɅＭXʎZ[\\]ᵥ_,ɐqɔpǝɟƃɥıɾʞʅɯuodbɹsʇnʌʍxʎz'
    };

    const mods = {
      'fr-x-psaccent': val => val.replace(reVowels, match => match + match.toLowerCase()),

      // Surround each word with Unicode formatting codes, RLO and PDF:
      //   U+202E:   RIGHT-TO-LEFT OVERRIDE (RLO)
      //   U+202C:   POP DIRECTIONAL FORMATTING (PDF)
      // See http://www.w3.org/International/questions/qa-bidi-controls
      'ar-x-psbidi': val => val.replace(reWords, match => '‮' + match + '‬')
    };

    // Replace each Latin letter with a Unicode character from map
    const replaceChars = (map, val) => val.replace(reAlphas, match => map.charAt(match.charCodeAt(0) - 65));

    const transform = val => replaceChars(charMaps[id], mods[id](val));

    // apply fn to translatable parts of val
    const apply = (fn, val) => {
      if (!val) {
        return val;
      }

      const parts = val.split(reExcluded);
      const modified = parts.map(function (part) {
        if (reExcluded.test(part)) {
          return part;
        }
        return fn(part);
      });
      return modified.join('');
    };

    return _pseudo = {
      name: transform(name),
      process: str => apply(transform, str)
    };
  };
}

const pseudo$1 = Object.defineProperties(Object.create(null), {
  'fr-x-psaccent': {
    enumerable: true,
    get: createGetter('fr-x-psaccent', 'Runtime Accented')
  },
  'ar-x-psbidi': {
    enumerable: true,
    get: createGetter('ar-x-psbidi', 'Runtime Bidi')
  }
});

const KNOWN_MACROS$1 = ['plural'];
const MAX_PLACEABLE_LENGTH$1 = 2500;

// Unicode bidi isolation characters
const FSI$1 = '⁨';
const PDI$1 = '⁩';

const resolutionChain$1 = new WeakSet();

function format$1(ctx, lang, args, entity) {
  if (typeof entity === 'string') {
    return [{}, entity];
  }

  if (resolutionChain$1.has(entity)) {
    throw new L10nError('Cyclic reference detected');
  }

  resolutionChain$1.add(entity);

  let rv;
  // if format fails, we want the exception to bubble up and stop the whole
  // resolving process;  however, we still need to remove the entity from the
  // resolution chain
  try {
    rv = resolveValue$1({}, ctx, lang, args, entity.value, entity.index);
  } finally {
    resolutionChain$1.delete(entity);
  }
  return rv;
}

function resolveIdentifier$1(ctx, lang, args, id) {
  if (KNOWN_MACROS$1.indexOf(id) > -1) {
    return [{}, ctx._getMacro(lang, id)];
  }

  if (args && args.hasOwnProperty(id)) {
    if (typeof args[id] === 'string' || typeof args[id] === 'number' && !isNaN(args[id])) {
      return [{}, args[id]];
    } else {
      throw new L10nError('Arg must be a string or a number: ' + id);
    }
  }

  // XXX: special case for Node.js where still:
  // '__proto__' in Object.create(null) => true
  if (id === '__proto__') {
    throw new L10nError('Illegal id: ' + id);
  }

  const entity = ctx._getEntity(lang, id);

  if (entity) {
    return format$1(ctx, lang, args, entity);
  }

  throw new L10nError('Unknown reference: ' + id);
}

function subPlaceable$1(locals, ctx, lang, args, id) {
  let newLocals, value;

  try {
    [newLocals, value] = resolveIdentifier$1(ctx, lang, args, id);
  } catch (err) {
    return [{ error: err }, FSI$1 + '{{ ' + id + ' }}' + PDI$1];
  }

  if (typeof value === 'number') {
    const formatter = ctx._getNumberFormatter(lang);
    return [newLocals, formatter.format(value)];
  }

  if (typeof value === 'string') {
    // prevent Billion Laughs attacks
    if (value.length >= MAX_PLACEABLE_LENGTH$1) {
      throw new L10nError('Too many characters in placeable (' + value.length + ', max allowed is ' + MAX_PLACEABLE_LENGTH$1 + ')');
    }
    return [newLocals, FSI$1 + value + PDI$1];
  }

  return [{}, FSI$1 + '{{ ' + id + ' }}' + PDI$1];
}

function interpolate$1(locals, ctx, lang, args, arr) {
  return arr.reduce(function ([localsSeq, valueSeq], cur) {
    if (typeof cur === 'string') {
      return [localsSeq, valueSeq + cur];
    } else {
      const [, value] = subPlaceable$1(locals, ctx, lang, args, cur.name);
      // wrap the substitution in bidi isolate characters
      return [localsSeq, valueSeq + value];
    }
  }, [locals, '']);
}

function resolveSelector$1(ctx, lang, args, expr, index) {
  //XXX: Dehardcode!!!
  let selectorName;
  if (index[0].type === 'call' && index[0].expr.type === 'prop' && index[0].expr.expr.name === 'cldr') {
    selectorName = 'plural';
  } else {
    selectorName = index[0].name;
  }
  const selector = resolveIdentifier$1(ctx, lang, args, selectorName)[1];

  if (typeof selector !== 'function') {
    // selector is a simple reference to an entity or args
    return selector;
  }

  const argValue = index[0].args ? resolveIdentifier$1(ctx, lang, args, index[0].args[0].name)[1] : undefined;

  if (selectorName === 'plural') {
    // special cases for zero, one, two if they are defined on the hash
    if (argValue === 0 && 'zero' in expr) {
      return 'zero';
    }
    if (argValue === 1 && 'one' in expr) {
      return 'one';
    }
    if (argValue === 2 && 'two' in expr) {
      return 'two';
    }
  }

  return selector(argValue);
}

function resolveValue$1(locals, ctx, lang, args, expr, index) {
  if (!expr) {
    return [locals, expr];
  }

  if (typeof expr === 'string' || typeof expr === 'boolean' || typeof expr === 'number') {
    return [locals, expr];
  }

  if (Array.isArray(expr)) {
    return interpolate$1(locals, ctx, lang, args, expr);
  }

  // otherwise, it's a dict
  if (index) {
    // try to use the index in order to select the right dict member
    const selector = resolveSelector$1(ctx, lang, args, expr, index);
    if (selector in expr) {
      return resolveValue$1(locals, ctx, lang, args, expr[selector]);
    }
  }

  // if there was no index or no selector was found, try the default
  // XXX 'other' is an artifact from Gaia
  const defaultKey = expr.__default || 'other';
  if (defaultKey in expr) {
    return resolveValue$1(locals, ctx, lang, args, expr[defaultKey]);
  }

  throw new L10nError('Unresolvable value');
}

const locales2rules = {
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
  return typeof n === typeof start && start <= n && n <= end;
}

// list of all plural rules methods:
// map an integer to the plural form name to use
const pluralRules = {
  '0': function () {
    return 'other';
  },
  '1': function (n) {
    if (isBetween(n % 100, 3, 10)) {
      return 'few';
    }
    if (n === 0) {
      return 'zero';
    }
    if (isBetween(n % 100, 11, 99)) {
      return 'many';
    }
    if (n === 2) {
      return 'two';
    }
    if (n === 1) {
      return 'one';
    }
    return 'other';
  },
  '2': function (n) {
    if (n !== 0 && n % 10 === 0) {
      return 'many';
    }
    if (n === 2) {
      return 'two';
    }
    if (n === 1) {
      return 'one';
    }
    return 'other';
  },
  '3': function (n) {
    if (n === 1) {
      return 'one';
    }
    return 'other';
  },
  '4': function (n) {
    if (isBetween(n, 0, 1)) {
      return 'one';
    }
    return 'other';
  },
  '5': function (n) {
    if (isBetween(n, 0, 2) && n !== 2) {
      return 'one';
    }
    return 'other';
  },
  '6': function (n) {
    if (n === 0) {
      return 'zero';
    }
    if (n % 10 === 1 && n % 100 !== 11) {
      return 'one';
    }
    return 'other';
  },
  '7': function (n) {
    if (n === 2) {
      return 'two';
    }
    if (n === 1) {
      return 'one';
    }
    return 'other';
  },
  '8': function (n) {
    if (isBetween(n, 3, 6)) {
      return 'few';
    }
    if (isBetween(n, 7, 10)) {
      return 'many';
    }
    if (n === 2) {
      return 'two';
    }
    if (n === 1) {
      return 'one';
    }
    return 'other';
  },
  '9': function (n) {
    if (n === 0 || n !== 1 && isBetween(n % 100, 1, 19)) {
      return 'few';
    }
    if (n === 1) {
      return 'one';
    }
    return 'other';
  },
  '10': function (n) {
    if (isBetween(n % 10, 2, 9) && !isBetween(n % 100, 11, 19)) {
      return 'few';
    }
    if (n % 10 === 1 && !isBetween(n % 100, 11, 19)) {
      return 'one';
    }
    return 'other';
  },
  '11': function (n) {
    if (isBetween(n % 10, 2, 4) && !isBetween(n % 100, 12, 14)) {
      return 'few';
    }
    if (n % 10 === 0 || isBetween(n % 10, 5, 9) || isBetween(n % 100, 11, 14)) {
      return 'many';
    }
    if (n % 10 === 1 && n % 100 !== 11) {
      return 'one';
    }
    return 'other';
  },
  '12': function (n) {
    if (isBetween(n, 2, 4)) {
      return 'few';
    }
    if (n === 1) {
      return 'one';
    }
    return 'other';
  },
  '13': function (n) {
    if (isBetween(n % 10, 2, 4) && !isBetween(n % 100, 12, 14)) {
      return 'few';
    }
    if (n !== 1 && isBetween(n % 10, 0, 1) || isBetween(n % 10, 5, 9) || isBetween(n % 100, 12, 14)) {
      return 'many';
    }
    if (n === 1) {
      return 'one';
    }
    return 'other';
  },
  '14': function (n) {
    if (isBetween(n % 100, 3, 4)) {
      return 'few';
    }
    if (n % 100 === 2) {
      return 'two';
    }
    if (n % 100 === 1) {
      return 'one';
    }
    return 'other';
  },
  '15': function (n) {
    if (n === 0 || isBetween(n % 100, 2, 10)) {
      return 'few';
    }
    if (isBetween(n % 100, 11, 19)) {
      return 'many';
    }
    if (n === 1) {
      return 'one';
    }
    return 'other';
  },
  '16': function (n) {
    if (n % 10 === 1 && n !== 11) {
      return 'one';
    }
    return 'other';
  },
  '17': function (n) {
    if (n === 3) {
      return 'few';
    }
    if (n === 0) {
      return 'zero';
    }
    if (n === 6) {
      return 'many';
    }
    if (n === 2) {
      return 'two';
    }
    if (n === 1) {
      return 'one';
    }
    return 'other';
  },
  '18': function (n) {
    if (n === 0) {
      return 'zero';
    }
    if (isBetween(n, 0, 2) && n !== 0 && n !== 2) {
      return 'one';
    }
    return 'other';
  },
  '19': function (n) {
    if (isBetween(n, 2, 10)) {
      return 'few';
    }
    if (isBetween(n, 0, 1)) {
      return 'one';
    }
    return 'other';
  },
  '20': function (n) {
    if ((isBetween(n % 10, 3, 4) || n % 10 === 9) && !(isBetween(n % 100, 10, 19) || isBetween(n % 100, 70, 79) || isBetween(n % 100, 90, 99))) {
      return 'few';
    }
    if (n % 1000000 === 0 && n !== 0) {
      return 'many';
    }
    if (n % 10 === 2 && !isIn(n % 100, [12, 72, 92])) {
      return 'two';
    }
    if (n % 10 === 1 && !isIn(n % 100, [11, 71, 91])) {
      return 'one';
    }
    return 'other';
  },
  '21': function (n) {
    if (n === 0) {
      return 'zero';
    }
    if (n === 1) {
      return 'one';
    }
    return 'other';
  },
  '22': function (n) {
    if (isBetween(n, 0, 1) || isBetween(n, 11, 99)) {
      return 'one';
    }
    return 'other';
  },
  '23': function (n) {
    if (isBetween(n % 10, 1, 2) || n % 20 === 0) {
      return 'one';
    }
    return 'other';
  },
  '24': function (n) {
    if (isBetween(n, 3, 10) || isBetween(n, 13, 19)) {
      return 'few';
    }
    if (isIn(n, [2, 12])) {
      return 'two';
    }
    if (isIn(n, [1, 11])) {
      return 'one';
    }
    return 'other';
  }
};

function getPluralRule(code) {
  // return a function that gives the plural form name for a given integer
  const index = locales2rules[code.replace(/-.*$/, '')];
  if (!(index in pluralRules)) {
    return function () {
      return 'other';
    };
  }
  return pluralRules[index];
}

// Safari 9 and iOS 9 does not support Intl
const L20nIntl = typeof Intl !== 'undefined' ? Intl : {
  NumberFormat: function () {
    return {
      format: function (v) {
        return v;
      }
    };
  }
};

let Context = (function () {
  function Context(env, langs, resIds) {
    _classCallCheck(this, Context);

    this.langs = langs;
    this.resIds = resIds;
    this.env = env;
    this.emit = (type, evt) => env.emit(type, evt, this);
  }

  _createClass(Context, [{
    key: '_formatTuple',
    value: function _formatTuple(lang, args, entity, id, key) {
      try {
        return format$1(this, lang, args, entity);
      } catch (err) {
        err.id = key ? id + '::' + key : id;
        err.lang = lang;
        this.emit('resolveerror', err);
        return [{ error: err }, err.id];
      }
    }
  }, {
    key: '_formatEntity',
    value: function _formatEntity(lang, args, entity, id) {
      const [, value] = this._formatTuple(lang, args, entity, id);

      const formatted = {
        value,
        attrs: null
      };

      if (entity.attrs) {
        formatted.attrs = Object.create(null);
        for (let key in entity.attrs) {
          /* jshint -W089 */
          const [, attrValue] = this._formatTuple(lang, args, entity.attrs[key], id, key);
          formatted.attrs[key] = attrValue;
        }
      }

      return formatted;
    }
  }, {
    key: '_formatValue',
    value: function _formatValue(lang, args, entity, id) {
      return this._formatTuple(lang, args, entity, id)[1];
    }
  }, {
    key: 'fetch',
    value: function fetch(langs = this.langs) {
      if (langs.length === 0) {
        return Promise.resolve(langs);
      }

      return Promise.all(this.resIds.map(resId => this.env._getResource(langs[0], resId))).then(() => langs);
    }
  }, {
    key: '_resolve',
    value: function _resolve(langs, keys, formatter, prevResolved) {
      const lang = langs[0];

      if (!lang) {
        return reportMissing.call(this, keys, formatter, prevResolved);
      }

      let hasUnresolved = false;

      const resolved = keys.map((key, i) => {
        if (prevResolved && prevResolved[i] !== undefined) {
          return prevResolved[i];
        }
        const [id, args] = Array.isArray(key) ? key : [key, undefined];
        const entity = this._getEntity(lang, id);

        if (entity) {
          return formatter.call(this, lang, args, entity, id);
        }

        this.emit('notfounderror', new L10nError('"' + id + '"' + ' not found in ' + lang.code, id, lang));
        hasUnresolved = true;
      });

      if (!hasUnresolved) {
        return resolved;
      }

      return this.fetch(langs.slice(1)).then(nextLangs => this._resolve(nextLangs, keys, formatter, resolved));
    }
  }, {
    key: 'formatEntities',
    value: function formatEntities(...keys) {
      return this.fetch().then(langs => this._resolve(langs, keys, this._formatEntity));
    }
  }, {
    key: 'formatValues',
    value: function formatValues(...keys) {
      return this.fetch().then(langs => this._resolve(langs, keys, this._formatValue));
    }
  }, {
    key: '_getEntity',
    value: function _getEntity(lang, id) {
      const cache = this.env.resCache;

      // Look for `id` in every resource in order.
      for (let i = 0, resId; resId = this.resIds[i]; i++) {
        const resource = cache.get(resId + lang.code + lang.src);
        if (resource instanceof L10nError) {
          continue;
        }
        if (id in resource) {
          return resource[id];
        }
      }
      return undefined;
    }
  }, {
    key: '_getNumberFormatter',
    value: function _getNumberFormatter(lang) {
      if (!this.env.numberFormatters) {
        this.env.numberFormatters = new Map();
      }
      if (!this.env.numberFormatters.has(lang)) {
        const formatter = L20nIntl.NumberFormat(lang);
        this.env.numberFormatters.set(lang, formatter);
        return formatter;
      }
      return this.env.numberFormatters.get(lang);
    }
  }, {
    key: '_getMacro',

    // XXX in the future macros will be stored in localization resources together
    // with regular entities and this method will not be needed anymore
    value: function _getMacro(lang, id) {
      switch (id) {
        case 'plural':
          return getPluralRule(lang.code);
        default:
          return undefined;
      }
    }
  }]);

  return Context;
})();

function reportMissing(keys, formatter, resolved) {
  const missingIds = new Set();

  keys.forEach((key, i) => {
    if (resolved && resolved[i] !== undefined) {
      return;
    }
    const id = Array.isArray(key) ? key[0] : key;
    missingIds.add(id);
    resolved[i] = formatter === this._formatValue ? id : { value: id, attrs: null };
  });

  this.emit('notfounderror', new L10nError('"' + Array.from(missingIds).join(', ') + '"' + ' not found in any language', missingIds));

  return resolved;
}

var MAX_PLACEABLES = 100;

var PropertiesParser = {
  patterns: null,
  entryIds: null,
  emit: null,

  init: function () {
    this.patterns = {
      comment: /^\s*#|^\s*$/,
      entity: /^([^=\s]+)\s*=\s*(.*)$/,
      multiline: /[^\\]\\$/,
      index: /\{\[\s*(\w+)(?:\(([^\)]*)\))?\s*\]\}/i,
      unicode: /\\u([0-9a-fA-F]{1,4})/g,
      entries: /[^\r\n]+/g,
      controlChars: /\\([\\\n\r\t\b\f\{\}\"\'])/g,
      placeables: /\{\{\s*([^\s]*?)\s*\}\}/
    };
  },

  parse: function (emit, source) {
    if (!this.patterns) {
      this.init();
    }
    this.emit = emit;

    var entries = {};

    var lines = source.match(this.patterns.entries);
    if (!lines) {
      return entries;
    }
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      if (this.patterns.comment.test(line)) {
        continue;
      }

      while (this.patterns.multiline.test(line) && i < lines.length) {
        line = line.slice(0, -1) + lines[++i].trim();
      }

      var entityMatch = line.match(this.patterns.entity);
      if (entityMatch) {
        try {
          this.parseEntity(entityMatch[1], entityMatch[2], entries);
        } catch (e) {
          if (!this.emit) {
            throw e;
          }
        }
      }
    }
    return entries;
  },

  parseEntity: function (id, value, entries) {
    var name, key;

    var pos = id.indexOf('[');
    if (pos !== -1) {
      name = id.substr(0, pos);
      key = id.substring(pos + 1, id.length - 1);
    } else {
      name = id;
      key = null;
    }

    var nameElements = name.split('.');

    if (nameElements.length > 2) {
      throw this.error('Error in ID: "' + name + '".' + ' Nested attributes are not supported.');
    }

    var attr;
    if (nameElements.length > 1) {
      name = nameElements[0];
      attr = nameElements[1];

      if (attr[0] === '$') {
        throw this.error('Attribute can\'t start with "$"');
      }
    } else {
      attr = null;
    }

    this.setEntityValue(name, attr, key, this.unescapeString(value), entries);
  },

  setEntityValue: function (id, attr, key, rawValue, entries) {
    var value = rawValue.indexOf('{{') > -1 ? this.parseString(rawValue) : rawValue;

    var isSimpleValue = typeof value === 'string';
    var root = entries;

    var isSimpleNode = typeof entries[id] === 'string';

    if (!entries[id] && (attr || key || !isSimpleValue)) {
      entries[id] = Object.create(null);
      isSimpleNode = false;
    }

    if (attr) {
      if (isSimpleNode) {
        const val = entries[id];
        entries[id] = Object.create(null);
        entries[id].value = val;
      }
      if (!entries[id].attrs) {
        entries[id].attrs = Object.create(null);
      }
      if (!entries[id].attrs && !isSimpleValue) {
        entries[id].attrs[attr] = Object.create(null);
      }
      root = entries[id].attrs;
      id = attr;
    }

    if (key) {
      isSimpleNode = false;
      if (typeof root[id] === 'string') {
        const val = root[id];
        root[id] = Object.create(null);
        root[id].index = this.parseIndex(val);
        root[id].value = Object.create(null);
      }
      root = root[id].value;
      id = key;
      isSimpleValue = true;
    }

    if (isSimpleValue) {
      if (id in root) {
        throw this.error('Duplicated id: ' + id);
      }
      root[id] = value;
    } else {
      if (!root[id]) {
        root[id] = Object.create(null);
      }
      root[id].value = value;
    }
  },

  parseString: function (str) {
    var chunks = str.split(this.patterns.placeables);
    var complexStr = [];

    var len = chunks.length;
    var placeablesCount = (len - 1) / 2;

    if (placeablesCount >= MAX_PLACEABLES) {
      throw this.error('Too many placeables (' + placeablesCount + ', max allowed is ' + MAX_PLACEABLES + ')');
    }

    for (var i = 0; i < chunks.length; i++) {
      if (chunks[i].length === 0) {
        continue;
      }
      if (i % 2 === 1) {
        complexStr.push({ type: 'idOrVar', name: chunks[i] });
      } else {
        complexStr.push(chunks[i]);
      }
    }
    return complexStr;
  },

  unescapeString: function (str) {
    if (str.lastIndexOf('\\') !== -1) {
      str = str.replace(this.patterns.controlChars, '$1');
    }
    return str.replace(this.patterns.unicode, function (match, token) {
      return String.fromCodePoint(parseInt(token, 16));
    });
  },

  parseIndex: function (str) {
    var match = str.match(this.patterns.index);
    if (!match) {
      throw new L10nError('Malformed index');
    }
    if (match[2]) {
      return [{
        type: 'call',
        expr: {
          type: 'prop',
          expr: {
            type: 'glob',
            name: 'cldr'
          },
          prop: 'plural',
          cmpt: false
        }, args: [{
          type: 'idOrVar',
          name: match[2]
        }]
      }];
    } else {
      return [{ type: 'idOrVar', name: match[1] }];
    }
  },

  error: function (msg, type = 'parsererror') {
    const err = new L10nError(msg);
    if (this.emit) {
      this.emit(type, err);
    }
    return err;
  }
};

const MAX_PLACEABLES$1 = 100;

var L20nParser = {
  parse: function (emit, string) {
    this._source = string;
    this._index = 0;
    this._length = string.length;
    this.entries = Object.create(null);
    this.emit = emit;

    return this.getResource();
  },

  getResource: function () {
    this.getWS();
    while (this._index < this._length) {
      try {
        this.getEntry();
      } catch (e) {
        if (e instanceof L10nError) {
          // we want to recover, but we don't need it in entries
          this.getJunkEntry();
          if (!this.emit) {
            throw e;
          }
        } else {
          throw e;
        }
      }

      if (this._index < this._length) {
        this.getWS();
      }
    }

    return this.entries;
  },

  getEntry: function () {
    if (this._source[this._index] === '<') {
      ++this._index;
      const id = this.getIdentifier();
      if (this._source[this._index] === '[') {
        ++this._index;
        return this.getEntity(id, this.getItemList(this.getExpression, ']'));
      }
      return this.getEntity(id);
    }

    if (this._source.startsWith('/*', this._index)) {
      return this.getComment();
    }

    throw this.error('Invalid entry');
  },

  getEntity: function (id, index) {
    if (!this.getRequiredWS()) {
      throw this.error('Expected white space');
    }

    const ch = this._source[this._index];
    const hasIndex = index !== undefined;
    const value = this.getValue(ch, hasIndex, hasIndex);
    let attrs;

    if (value === undefined) {
      if (ch === '>') {
        throw this.error('Expected ">"');
      }
      attrs = this.getAttributes();
    } else {
      const ws1 = this.getRequiredWS();
      if (this._source[this._index] !== '>') {
        if (!ws1) {
          throw this.error('Expected ">"');
        }
        attrs = this.getAttributes();
      }
    }

    // skip '>'
    ++this._index;

    if (id in this.entries) {
      throw this.error('Duplicate entry ID "' + id, 'duplicateerror');
    }
    if (!attrs && !index && typeof value === 'string') {
      this.entries[id] = value;
    } else {
      this.entries[id] = {
        value,
        attrs,
        index
      };
    }
  },

  getValue: function (ch = this._source[this._index], index = false, required = true) {
    switch (ch) {
      case '\'':
      case '"':
        return this.getString(ch, 1);
      case '{':
        return this.getHash(index);
    }

    if (required) {
      throw this.error('Unknown value type');
    }

    return;
  },

  getWS: function () {
    let cc = this._source.charCodeAt(this._index);
    // space, \n, \t, \r
    while (cc === 32 || cc === 10 || cc === 9 || cc === 13) {
      cc = this._source.charCodeAt(++this._index);
    }
  },

  getRequiredWS: function () {
    const pos = this._index;
    let cc = this._source.charCodeAt(pos);
    // space, \n, \t, \r
    while (cc === 32 || cc === 10 || cc === 9 || cc === 13) {
      cc = this._source.charCodeAt(++this._index);
    }
    return this._index !== pos;
  },

  getIdentifier: function () {
    const start = this._index;
    let cc = this._source.charCodeAt(this._index);

    if (cc >= 97 && cc <= 122 || cc >= 65 && cc <= 90 || // A-Z
    cc === 95) {
      // _
      cc = this._source.charCodeAt(++this._index);
    } else {
      throw this.error('Identifier has to start with [a-zA-Z_]');
    }

    while (cc >= 97 && cc <= 122 || cc >= 65 && cc <= 90 || cc >= 48 && cc <= 57 || // 0-9
    cc === 95) {
      // _
      cc = this._source.charCodeAt(++this._index);
    }

    return this._source.slice(start, this._index);
  },

  getUnicodeChar: function () {
    for (let i = 0; i < 4; i++) {
      let cc = this._source.charCodeAt(++this._index);
      if (cc > 96 && cc < 103 || cc > 64 && cc < 71 || cc > 47 && cc < 58) {
        // 0-9
        continue;
      }
      throw this.error('Illegal unicode escape sequence');
    }
    this._index++;
    return String.fromCharCode(parseInt(this._source.slice(this._index - 4, this._index), 16));
  },

  stringRe: /"|'|{{|\\/g,
  getString: function (opchar, opcharLen) {
    const body = [];
    let placeables = 0;

    this._index += opcharLen;
    const start = this._index;

    let bufStart = start;
    let buf = '';

    while (true) {
      this.stringRe.lastIndex = this._index;
      const match = this.stringRe.exec(this._source);

      if (!match) {
        throw this.error('Unclosed string literal');
      }

      if (match[0] === '"' || match[0] === '\'') {
        if (match[0] !== opchar) {
          this._index += opcharLen;
          continue;
        }
        this._index = match.index + opcharLen;
        break;
      }

      if (match[0] === '{{') {
        if (placeables > MAX_PLACEABLES$1 - 1) {
          throw this.error('Too many placeables, maximum allowed is ' + MAX_PLACEABLES$1);
        }
        placeables++;
        if (match.index > bufStart || buf.length > 0) {
          body.push(buf + this._source.slice(bufStart, match.index));
          buf = '';
        }
        this._index = match.index + 2;
        this.getWS();
        body.push(this.getExpression());
        this.getWS();
        this._index += 2;
        bufStart = this._index;
        continue;
      }

      if (match[0] === '\\') {
        this._index = match.index + 1;
        const ch2 = this._source[this._index];
        if (ch2 === 'u') {
          buf += this._source.slice(bufStart, match.index) + this.getUnicodeChar();
        } else if (ch2 === opchar || ch2 === '\\') {
          buf += this._source.slice(bufStart, match.index) + ch2;
          this._index++;
        } else if (this._source.startsWith('{{', this._index)) {
          buf += this._source.slice(bufStart, match.index) + '{{';
          this._index += 2;
        } else {
          throw this.error('Illegal escape sequence');
        }
        bufStart = this._index;
      }
    }

    if (body.length === 0) {
      return buf + this._source.slice(bufStart, this._index - opcharLen);
    }

    if (this._index - opcharLen > bufStart || buf.length > 0) {
      body.push(buf + this._source.slice(bufStart, this._index - opcharLen));
    }

    return body;
  },

  getAttributes: function () {
    const attrs = Object.create(null);

    while (true) {
      this.getAttribute(attrs);
      const ws1 = this.getRequiredWS();
      const ch = this._source.charAt(this._index);
      if (ch === '>') {
        break;
      } else if (!ws1) {
        throw this.error('Expected ">"');
      }
    }
    return attrs;
  },

  getAttribute: function (attrs) {
    const key = this.getIdentifier();
    let index;

    if (this._source[this._index] === '[') {
      ++this._index;
      this.getWS();
      index = this.getItemList(this.getExpression, ']');
    }
    this.getWS();
    if (this._source[this._index] !== ':') {
      throw this.error('Expected ":"');
    }
    ++this._index;
    this.getWS();
    const hasIndex = index !== undefined;
    const value = this.getValue(undefined, hasIndex);

    if (key in attrs) {
      throw this.error('Duplicate attribute "' + key, 'duplicateerror');
    }

    if (!index && typeof value === 'string') {
      attrs[key] = value;
    } else {
      attrs[key] = {
        value,
        index
      };
    }
  },

  getHash: function (index) {
    const items = Object.create(null);

    ++this._index;
    this.getWS();

    let defKey;

    while (true) {
      const [key, value, def] = this.getHashItem();
      items[key] = value;

      if (def) {
        if (defKey) {
          throw this.error('Default item redefinition forbidden');
        }
        defKey = key;
      }
      this.getWS();

      const comma = this._source[this._index] === ',';
      if (comma) {
        ++this._index;
        this.getWS();
      }
      if (this._source[this._index] === '}') {
        ++this._index;
        break;
      }
      if (!comma) {
        throw this.error('Expected "}"');
      }
    }

    if (defKey) {
      items.__default = defKey;
    } else if (!index) {
      throw this.error('Unresolvable Hash Value');
    }

    return items;
  },

  getHashItem: function () {
    let defItem = false;
    if (this._source[this._index] === '*') {
      ++this._index;
      defItem = true;
    }

    const key = this.getIdentifier();
    this.getWS();
    if (this._source[this._index] !== ':') {
      throw this.error('Expected ":"');
    }
    ++this._index;
    this.getWS();

    return [key, this.getValue(), defItem];
  },

  getComment: function () {
    this._index += 2;
    const start = this._index;
    const end = this._source.indexOf('*/', start);

    if (end === -1) {
      throw this.error('Comment without a closing tag');
    }

    this._index = end + 2;
  },

  getExpression: function () {
    let exp = this.getPrimaryExpression();

    while (true) {
      let ch = this._source[this._index];
      if (ch === '.' || ch === '[') {
        ++this._index;
        exp = this.getPropertyExpression(exp, ch === '[');
      } else if (ch === '(') {
        ++this._index;
        exp = this.getCallExpression(exp);
      } else {
        break;
      }
    }

    return exp;
  },

  getPropertyExpression: function (idref, computed) {
    let exp;

    if (computed) {
      this.getWS();
      exp = this.getExpression();
      this.getWS();
      if (this._source[this._index] !== ']') {
        throw this.error('Expected "]"');
      }
      ++this._index;
    } else {
      exp = this.getIdentifier();
    }

    return {
      type: 'prop',
      expr: idref,
      prop: exp,
      cmpt: computed
    };
  },

  getCallExpression: function (callee) {
    this.getWS();

    return {
      type: 'call',
      expr: callee,
      args: this.getItemList(this.getExpression, ')')
    };
  },

  getPrimaryExpression: function () {
    const ch = this._source[this._index];

    switch (ch) {
      case '$':
        ++this._index;
        return {
          type: 'var',
          name: this.getIdentifier()
        };
      case '@':
        ++this._index;
        return {
          type: 'glob',
          name: this.getIdentifier()
        };
      default:
        return {
          type: 'id',
          name: this.getIdentifier()
        };
    }
  },

  getItemList: function (callback, closeChar) {
    const items = [];
    let closed = false;

    this.getWS();

    if (this._source[this._index] === closeChar) {
      ++this._index;
      closed = true;
    }

    while (!closed) {
      items.push(callback.call(this));
      this.getWS();
      let ch = this._source.charAt(this._index);
      switch (ch) {
        case ',':
          ++this._index;
          this.getWS();
          break;
        case closeChar:
          ++this._index;
          closed = true;
          break;
        default:
          throw this.error('Expected "," or "' + closeChar + '"');
      }
    }

    return items;
  },

  getJunkEntry: function () {
    const pos = this._index;
    let nextEntity = this._source.indexOf('<', pos);
    let nextComment = this._source.indexOf('/*', pos);

    if (nextEntity === -1) {
      nextEntity = this._length;
    }
    if (nextComment === -1) {
      nextComment = this._length;
    }

    let nextEntry = Math.min(nextEntity, nextComment);

    this._index = nextEntry;
  },

  error: function (message, type = 'parsererror') {
    const pos = this._index;

    let start = this._source.lastIndexOf('<', pos - 1);
    const lastClose = this._source.lastIndexOf('>', pos - 1);
    start = lastClose > start ? lastClose + 1 : start;
    const context = this._source.slice(start, pos + 10);

    const msg = message + ' at pos ' + pos + ': `' + context + '`';
    const err = new L10nError(msg);
    if (this.emit) {
      this.emit(type, err);
    }
    return err;
  }
};

function emit(listeners, ...args) {
  const type = args.shift();

  if (listeners['*']) {
    listeners['*'].slice().forEach(listener => listener.apply(this, args));
  }

  if (listeners[type]) {
    listeners[type].slice().forEach(listener => listener.apply(this, args));
  }
}

function addEventListener(listeners, type, listener) {
  if (!(type in listeners)) {
    listeners[type] = [];
  }
  listeners[type].push(listener);
}

function removeEventListener(listeners, type, listener) {
  const typeListeners = listeners[type];
  const pos = typeListeners.indexOf(listener);
  if (pos === -1) {
    return;
  }

  typeListeners.splice(pos, 1);
}

let Env = (function () {
  function Env(fetchResource) {
    _classCallCheck(this, Env);

    this.fetchResource = fetchResource;

    this.resCache = new Map();
    this.resRefs = new Map();
    this.numberFormatters = null;
    this.parsers = {
      properties: PropertiesParser,
      l20n: L20nParser
    };

    const listeners = {};
    this.emit = emit.bind(this, listeners);
    this.addEventListener = addEventListener.bind(this, listeners);
    this.removeEventListener = removeEventListener.bind(this, listeners);
  }

  _createClass(Env, [{
    key: 'createContext',
    value: function createContext(langs, resIds) {
      const ctx = new Context(this, langs, resIds);
      resIds.forEach(resId => {
        const usedBy = this.resRefs.get(resId) || 0;
        this.resRefs.set(resId, usedBy + 1);
      });

      return ctx;
    }
  }, {
    key: 'destroyContext',
    value: function destroyContext(ctx) {
      ctx.resIds.forEach(resId => {
        const usedBy = this.resRefs.get(resId) || 0;

        if (usedBy > 1) {
          return this.resRefs.set(resId, usedBy - 1);
        }

        this.resRefs.delete(resId);
        this.resCache.forEach((val, key) => key.startsWith(resId) ? this.resCache.delete(key) : null);
      });
    }
  }, {
    key: '_parse',
    value: function _parse(syntax, lang, data) {
      const parser = this.parsers[syntax];
      if (!parser) {
        return data;
      }

      const emit = (type, err) => this.emit(type, amendError$1(lang, err));
      return parser.parse.call(parser, emit, data);
    }
  }, {
    key: '_create',
    value: function _create(lang, entries) {
      if (lang.src !== 'pseudo') {
        return entries;
      }

      const pseudoentries = Object.create(null);
      for (let key in entries) {
        pseudoentries[key] = walkEntry(entries[key], pseudo$1[lang.code].process);
      }
      return pseudoentries;
    }
  }, {
    key: '_getResource',
    value: function _getResource(lang, res) {
      const cache = this.resCache;
      const id = res + lang.code + lang.src;

      if (cache.has(id)) {
        return cache.get(id);
      }

      const syntax = res.substr(res.lastIndexOf('.') + 1);

      const saveEntries = data => {
        const entries = this._parse(syntax, lang, data);
        cache.set(id, this._create(lang, entries));
      };

      const recover = err => {
        err.lang = lang;
        this.emit('fetcherror', err);
        cache.set(id, err);
      };

      const langToFetch = lang.src === 'pseudo' ? { code: 'en-US', src: 'app', ver: lang.ver } : lang;

      const resource = this.fetchResource(res, langToFetch).then(saveEntries, recover);

      cache.set(id, resource);

      return resource;
    }
  }]);

  return Env;
})();

function amendError$1(lang, err) {
  err.lang = lang;
  return err;
}

const KNOWN_MACROS = ['plural'];
const MAX_PLACEABLE_LENGTH = 2500;

// Matches characters outside of the Latin-1 character set
const nonLatin1 = /[^\x01-\xFF]/;

// Unicode bidi isolation characters
const FSI = '⁨';
const PDI = '⁩';

const resolutionChain = new WeakSet();

function createEntry(node) {
  const keys = Object.keys(node);

  // the most common scenario: a simple string with no arguments
  if (typeof node.$v === 'string' && keys.length === 2) {
    return node.$v;
  }

  let attrs;

  for (let i = 0, key; key = keys[i]; i++) {
    // skip $i (id), $v (value), $x (index)
    if (key[0] === '$') {
      continue;
    }

    if (!attrs) {
      attrs = Object.create(null);
    }
    attrs[key] = createAttribute(node[key]);
  }

  return {
    value: node.$v !== undefined ? node.$v : null,
    index: node.$x || null,
    attrs: attrs || null
  };
}

function createAttribute(node) {
  if (typeof node === 'string') {
    return node;
  }

  return {
    value: node.$v || (node !== undefined ? node : null),
    index: node.$x || null
  };
}

function format(ctx, lang, args, entity) {
  if (typeof entity === 'string') {
    return [{}, entity];
  }

  if (resolutionChain.has(entity)) {
    throw new L10nError('Cyclic reference detected');
  }

  resolutionChain.add(entity);

  let rv;
  // if format fails, we want the exception to bubble up and stop the whole
  // resolving process;  however, we still need to remove the entity from the
  // resolution chain
  try {
    rv = resolveValue({}, ctx, lang, args, entity.value, entity.index);
  } finally {
    resolutionChain.delete(entity);
  }
  return rv;
}

function resolveIdentifier(ctx, lang, args, id) {
  if (KNOWN_MACROS.indexOf(id) > -1) {
    return [{}, ctx._getMacro(lang, id)];
  }

  if (args && args.hasOwnProperty(id)) {
    if (typeof args[id] === 'string' || typeof args[id] === 'number' && !isNaN(args[id])) {
      return [{}, args[id]];
    } else {
      throw new L10nError('Arg must be a string or a number: ' + id);
    }
  }

  // XXX: special case for Node.js where still:
  // '__proto__' in Object.create(null) => true
  if (id === '__proto__') {
    throw new L10nError('Illegal id: ' + id);
  }

  const entity = ctx._getEntity(lang, id);

  if (entity) {
    return format(ctx, lang, args, entity);
  }

  throw new L10nError('Unknown reference: ' + id);
}

function subPlaceable(locals, ctx, lang, args, id) {
  let res;

  try {
    res = resolveIdentifier(ctx, lang, args, id);
  } catch (err) {
    return [{ error: err }, '{{ ' + id + ' }}'];
  }

  const value = res[1];

  if (typeof value === 'number') {
    return res;
  }

  if (typeof value === 'string') {
    // prevent Billion Laughs attacks
    if (value.length >= MAX_PLACEABLE_LENGTH) {
      throw new L10nError('Too many characters in placeable (' + value.length + ', max allowed is ' + MAX_PLACEABLE_LENGTH + ')');
    }

    if (locals.contextIsNonLatin1 || value.match(nonLatin1)) {
      // When dealing with non-Latin-1 text
      // we wrap substitutions in bidi isolate characters
      // to avoid bidi issues.
      res[1] = FSI + value + PDI;
    }

    return res;
  }

  return [{}, '{{ ' + id + ' }}'];
}

function interpolate(locals, ctx, lang, args, arr) {
  return arr.reduce(function ([localsSeq, valueSeq], cur) {
    if (typeof cur === 'string') {
      return [localsSeq, valueSeq + cur];
    } else if (cur.t === 'idOrVar') {
      const [, value] = subPlaceable(locals, ctx, lang, args, cur.v);
      return [localsSeq, valueSeq + value];
    }
  }, [locals, '']);
}

function resolveSelector(ctx, lang, args, expr, index) {
  const selectorName = index[0].v;
  const selector = resolveIdentifier(ctx, lang, args, selectorName)[1];

  if (typeof selector !== 'function') {
    // selector is a simple reference to an entity or args
    return selector;
  }

  const argValue = index[1] ? resolveIdentifier(ctx, lang, args, index[1])[1] : undefined;

  if (selectorName === 'plural') {
    // special cases for zero, one, two if they are defined on the hash
    if (argValue === 0 && 'zero' in expr) {
      return 'zero';
    }
    if (argValue === 1 && 'one' in expr) {
      return 'one';
    }
    if (argValue === 2 && 'two' in expr) {
      return 'two';
    }
  }

  return selector(argValue);
}

function resolveValue(locals, ctx, lang, args, expr, index) {
  if (!expr) {
    return [locals, expr];
  }

  if (typeof expr === 'string' || typeof expr === 'boolean' || typeof expr === 'number') {
    return [locals, expr];
  }

  if (Array.isArray(expr)) {
    locals.contextIsNonLatin1 = expr.some(function ($_) {
      return typeof $_ === 'string' && $_.match(nonLatin1);
    });
    return interpolate(locals, ctx, lang, args, expr);
  }

  // otherwise, it's a dict
  if (index) {
    // try to use the index in order to select the right dict member
    const selector = resolveSelector(ctx, lang, args, expr, index);
    if (expr.hasOwnProperty(selector)) {
      return resolveValue(locals, ctx, lang, args, expr[selector]);
    }
  }

  // if there was no index or no selector was found, try 'other'
  if ('other' in expr) {
    return resolveValue(locals, ctx, lang, args, expr.other);
  }

  throw new L10nError('Unresolvable value');
}

function LegacyContext(env, langs, resIds) {
  Context.call(this, env, langs, resIds);
}

LegacyContext.prototype = Object.create(Context.prototype);

LegacyContext.prototype._formatTuple = function (lang, args, entity, id, key) {
  try {
    return format(this, lang, args, entity);
  } catch (err) {
    err.id = key ? id + '::' + key : id;
    err.lang = lang;
    this.env.emit('resolveerror', err, this);
    return [{ error: err }, err.id];
  }
};

var MAX_PLACEABLES$2 = 100;

var PropertiesParser$1 = {
  patterns: null,
  entryIds: null,

  init: function () {
    this.patterns = {
      comment: /^\s*#|^\s*$/,
      entity: /^([^=\s]+)\s*=\s*(.*)$/,
      multiline: /[^\\]\\$/,
      index: /\{\[\s*(\w+)(?:\(([^\)]*)\))?\s*\]\}/i,
      unicode: /\\u([0-9a-fA-F]{1,4})/g,
      entries: /[^\r\n]+/g,
      controlChars: /\\([\\\n\r\t\b\f\{\}\"\'])/g,
      placeables: /\{\{\s*([^\s]*?)\s*\}\}/
    };
  },

  parse: function (emit, source) {
    if (!this.patterns) {
      this.init();
    }

    var ast = [];
    this.entryIds = Object.create(null);

    var entries = source.match(this.patterns.entries);
    if (!entries) {
      return ast;
    }
    for (var i = 0; i < entries.length; i++) {
      var line = entries[i];

      if (this.patterns.comment.test(line)) {
        continue;
      }

      while (this.patterns.multiline.test(line) && i < entries.length) {
        line = line.slice(0, -1) + entries[++i].trim();
      }

      var entityMatch = line.match(this.patterns.entity);
      if (entityMatch) {
        try {
          this.parseEntity(entityMatch[1], entityMatch[2], ast);
        } catch (e) {
          if (emit) {
            emit('parseerror', e);
          } else {
            throw e;
          }
        }
      }
    }
    return ast;
  },

  parseEntity: function (id, value, ast) {
    var name, key;

    var pos = id.indexOf('[');
    if (pos !== -1) {
      name = id.substr(0, pos);
      key = id.substring(pos + 1, id.length - 1);
    } else {
      name = id;
      key = null;
    }

    var nameElements = name.split('.');

    if (nameElements.length > 2) {
      throw new L10nError('Error in ID: "' + name + '".' + ' Nested attributes are not supported.');
    }

    var attr;
    if (nameElements.length > 1) {
      name = nameElements[0];
      attr = nameElements[1];

      if (attr[0] === '$') {
        throw new L10nError('Attribute can\'t start with "$"', id);
      }
    } else {
      attr = null;
    }

    this.setEntityValue(name, attr, key, this.unescapeString(value), ast);
  },

  setEntityValue: function (id, attr, key, rawValue, ast) {
    var pos, v;

    var value = rawValue.indexOf('{{') > -1 ? this.parseString(rawValue) : rawValue;

    if (attr) {
      pos = this.entryIds[id];
      if (pos === undefined) {
        v = { $i: id };
        if (key) {
          v[attr] = { $v: {} };
          v[attr].$v[key] = value;
        } else {
          v[attr] = value;
        }
        ast.push(v);
        this.entryIds[id] = ast.length - 1;
        return;
      }
      if (key) {
        if (typeof ast[pos][attr] === 'string') {
          ast[pos][attr] = {
            $x: this.parseIndex(ast[pos][attr]),
            $v: {}
          };
        }
        ast[pos][attr].$v[key] = value;
        return;
      }
      ast[pos][attr] = value;
      return;
    }

    // Hash value
    if (key) {
      pos = this.entryIds[id];
      if (pos === undefined) {
        v = {};
        v[key] = value;
        ast.push({ $i: id, $v: v });
        this.entryIds[id] = ast.length - 1;
        return;
      }
      if (typeof ast[pos].$v === 'string') {
        ast[pos].$x = this.parseIndex(ast[pos].$v);
        ast[pos].$v = {};
      }
      ast[pos].$v[key] = value;
      return;
    }

    // simple value
    ast.push({ $i: id, $v: value });
    this.entryIds[id] = ast.length - 1;
  },

  parseString: function (str) {
    var chunks = str.split(this.patterns.placeables);
    var complexStr = [];

    var len = chunks.length;
    var placeablesCount = (len - 1) / 2;

    if (placeablesCount >= MAX_PLACEABLES$2) {
      throw new L10nError('Too many placeables (' + placeablesCount + ', max allowed is ' + MAX_PLACEABLES$2 + ')');
    }

    for (var i = 0; i < chunks.length; i++) {
      if (chunks[i].length === 0) {
        continue;
      }
      if (i % 2 === 1) {
        complexStr.push({ t: 'idOrVar', v: chunks[i] });
      } else {
        complexStr.push(chunks[i]);
      }
    }
    return complexStr;
  },

  unescapeString: function (str) {
    if (str.lastIndexOf('\\') !== -1) {
      str = str.replace(this.patterns.controlChars, '$1');
    }
    return str.replace(this.patterns.unicode, function (match, token) {
      return String.fromCodePoint(parseInt(token, 16));
    });
  },

  parseIndex: function (str) {
    var match = str.match(this.patterns.index);
    if (!match) {
      throw new L10nError('Malformed index');
    }
    if (match[2]) {
      return [{ t: 'idOrVar', v: match[1] }, match[2]];
    } else {
      return [{ t: 'idOrVar', v: match[1] }];
    }
  }
};

// Recursively walk an AST node searching for content leaves
function walkContent(node, fn) {
  if (typeof node === 'string') {
    return fn(node);
  }

  if (node.t === 'idOrVar') {
    return node;
  }

  const rv = Array.isArray(node) ? [] : {};
  const keys = Object.keys(node);

  for (let i = 0, key; key = keys[i]; i++) {
    // don't change identifier ($i) nor indices ($x)
    if (key === '$i' || key === '$x') {
      rv[key] = node[key];
    } else {
      rv[key] = walkContent(node[key], fn);
    }
  }
  return rv;
}

// XXX babel's inheritance code triggers JavaScript warnings about modifying
// the prototype object so we use regular prototypal inheritance here
function LegacyEnv(fetchResource) {
  Env.call(this, fetchResource);
  this.parsers = {
    properties: PropertiesParser$1
  };
}

LegacyEnv.prototype = Object.create(Env.prototype);

LegacyEnv.prototype.createContext = function (langs, resIds) {
  return new LegacyContext(this, langs, resIds);
};

LegacyEnv.prototype._create = function (lang, ast) {
  const entries = Object.create(null);
  const create = lang.src === 'pseudo' ? createPseudoEntry : createEntry;

  for (let i = 0, node; node = ast[i]; i++) {
    const id = node.$i;
    if (id in entries) {
      this.emit('duplicateerror', new L10nError('Duplicate string "' + id + '" found in ' + lang.code, id, lang));
    }
    entries[id] = create(node, lang);
  }

  return entries;
};

function createPseudoEntry(node, lang) {
  return createEntry(walkContent(node, pseudo$1[lang.code].process));
}

const observerConfig = {
  attributes: true,
  characterData: false,
  childList: true,
  subtree: true,
  attributeFilter: ['data-l10n-id', 'data-l10n-args']
};

const observers = new WeakMap();

function disconnect(view, root, allRoots) {
  const obs = observers.get(view);
  if (obs) {
    obs.observer.disconnect();
    if (allRoots) {
      return;
    }
    obs.roots.delete(root);
    obs.roots.forEach(other => obs.observer.observe(other, observerConfig));
  }
}

function reconnect(view) {
  const obs = observers.get(view);
  if (obs) {
    obs.roots.forEach(root => obs.observer.observe(root, observerConfig));
  }
}

// match the opening angle bracket (<) in HTML tags, and HTML entities like
// &amp;, &#0038;, &#x0026;.
const reOverlay = /<|&#?\w+;/;

const allowed = {
  elements: ['a', 'em', 'strong', 'small', 's', 'cite', 'q', 'dfn', 'abbr', 'data', 'time', 'code', 'var', 'samp', 'kbd', 'sub', 'sup', 'i', 'b', 'u', 'mark', 'ruby', 'rt', 'rp', 'bdi', 'bdo', 'span', 'br', 'wbr'],
  attributes: {
    global: ['title', 'aria-label', 'aria-valuetext', 'aria-moz-hint'],
    a: ['download'],
    area: ['download', 'alt'],
    // value is special-cased in isAttrAllowed
    input: ['alt', 'placeholder'],
    menuitem: ['label'],
    menu: ['label'],
    optgroup: ['label'],
    option: ['label'],
    track: ['label'],
    img: ['alt'],
    textarea: ['placeholder'],
    th: ['abbr']
  }
};

function overlayElement(element, translation) {
  const value = translation.value;

  if (typeof value === 'string') {
    if (!reOverlay.test(value)) {
      element.textContent = value;
    } else {
      // start with an inert template element and move its children into
      // `element` but such that `element`'s own children are not replaced
      const tmpl = element.ownerDocument.createElement('template');
      tmpl.innerHTML = value;
      // overlay the node with the DocumentFragment
      overlay(element, tmpl.content);
    }
  }

  for (let key in translation.attrs) {
    const attrName = camelCaseToDashed(key);
    if (isAttrAllowed({ name: attrName }, element)) {
      element.setAttribute(attrName, translation.attrs[key]);
    }
  }
}

// The goal of overlay is to move the children of `translationElement`
// into `sourceElement` such that `sourceElement`'s own children are not
// replaced, but onle have their text nodes and their attributes modified.
//
// We want to make it possible for localizers to apply text-level semantics to
// the translations and make use of HTML entities. At the same time, we
// don't trust translations so we need to filter unsafe elements and
// attribtues out and we don't want to break the Web by replacing elements to
// which third-party code might have created references (e.g. two-way
// bindings in MVC frameworks).
function overlay(sourceElement, translationElement) {
  const result = translationElement.ownerDocument.createDocumentFragment();
  let k, attr;

  // take one node from translationElement at a time and check it against
  // the allowed list or try to match it with a corresponding element
  // in the source
  let childElement;
  while (childElement = translationElement.childNodes[0]) {
    translationElement.removeChild(childElement);

    if (childElement.nodeType === childElement.TEXT_NODE) {
      result.appendChild(childElement);
      continue;
    }

    const index = getIndexOfType(childElement);
    const sourceChild = getNthElementOfType(sourceElement, childElement, index);
    if (sourceChild) {
      // there is a corresponding element in the source, let's use it
      overlay(sourceChild, childElement);
      result.appendChild(sourceChild);
      continue;
    }

    if (isElementAllowed(childElement)) {
      const sanitizedChild = childElement.ownerDocument.createElement(childElement.nodeName);
      overlay(sanitizedChild, childElement);
      result.appendChild(sanitizedChild);
      continue;
    }

    // otherwise just take this child's textContent
    result.appendChild(translationElement.ownerDocument.createTextNode(childElement.textContent));
  }

  // clear `sourceElement` and append `result` which by this time contains
  // `sourceElement`'s original children, overlayed with translation
  sourceElement.textContent = '';
  sourceElement.appendChild(result);

  // if we're overlaying a nested element, translate the allowed
  // attributes; top-level attributes are handled in `translateElement`
  // XXX attributes previously set here for another language should be
  // cleared if a new language doesn't use them; https://bugzil.la/922577
  if (translationElement.attributes) {
    for (k = 0, attr; attr = translationElement.attributes[k]; k++) {
      if (isAttrAllowed(attr, sourceElement)) {
        sourceElement.setAttribute(attr.name, attr.value);
      }
    }
  }
}

// XXX the allowed list should be amendable; https://bugzil.la/922573
function isElementAllowed(element) {
  return allowed.elements.indexOf(element.tagName.toLowerCase()) !== -1;
}

function isAttrAllowed(attr, element) {
  const attrName = attr.name.toLowerCase();
  const tagName = element.tagName.toLowerCase();
  // is it a globally safe attribute?
  if (allowed.attributes.global.indexOf(attrName) !== -1) {
    return true;
  }
  // are there no allowed attributes for this element?
  if (!allowed.attributes[tagName]) {
    return false;
  }
  // is it allowed on this element?
  // XXX the allowed list should be amendable; https://bugzil.la/922573
  if (allowed.attributes[tagName].indexOf(attrName) !== -1) {
    return true;
  }
  // special case for value on inputs with type button, reset, submit
  if (tagName === 'input' && attrName === 'value') {
    const type = element.type.toLowerCase();
    if (type === 'submit' || type === 'button' || type === 'reset') {
      return true;
    }
  }
  return false;
}

// Get n-th immediate child of context that is of the same type as element.
// XXX Use querySelector(':scope > ELEMENT:nth-of-type(index)'), when:
// 1) :scope is widely supported in more browsers and 2) it works with
// DocumentFragments.
function getNthElementOfType(context, element, index) {
  /* jshint boss:true */
  let nthOfType = 0;
  for (let i = 0, child; child = context.children[i]; i++) {
    if (child.nodeType === child.ELEMENT_NODE && child.tagName === element.tagName) {
      if (nthOfType === index) {
        return child;
      }
      nthOfType++;
    }
  }
  return null;
}

// Get the index of the element among siblings of the same type.
function getIndexOfType(element) {
  let index = 0;
  let child;
  while (child = element.previousElementSibling) {
    if (child.tagName === element.tagName) {
      index++;
    }
  }
  return index;
}

function camelCaseToDashed(string) {
  // XXX workaround for https://bugzil.la/1141934
  if (string === 'ariaValueText') {
    return 'aria-valuetext';
  }

  return string.replace(/[A-Z]/g, function (match) {
    return '-' + match.toLowerCase();
  }).replace(/^-/, '');
}

const reHtml = /[&<>]/g;
const htmlEntities = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;'
};

function getTranslatables(element) {
  const nodes = Array.from(element.querySelectorAll('[data-l10n-id]'));

  if (typeof element.hasAttribute === 'function' && element.hasAttribute('data-l10n-id')) {
    nodes.push(element);
  }

  return nodes;
}

function translateFragment(view, frag) {
  return translateElements(view, getTranslatables(frag));
}

function getElementsTranslation(view, elems) {
  const keys = elems.map(elem => {
    const id = elem.getAttribute('data-l10n-id');
    const args = elem.getAttribute('data-l10n-args');
    return args ? [id, JSON.parse(args.replace(reHtml, match => htmlEntities[match]))] : id;
  });

  return view.formatEntities(...keys);
}

function translateElements(view, elements) {
  return getElementsTranslation(view, elements).then(translations => applyTranslations(view, elements, translations));
}

function applyTranslations(view, elems, translations) {
  disconnect(view, null, true);
  for (let i = 0; i < elems.length; i++) {
    overlayElement(elems[i], translations[i]);
  }
  reconnect(view);
}

function getResourceLinks(head) {
  return Array.prototype.map.call(head.querySelectorAll('link[rel="localization"]'), el => el.getAttribute('href'));
}

function serializeContext(ctx) {
  const lang = ctx.langs[0];
  const cache = ctx.env.resCache;
  return ctx.resIds.reduceRight(([errorsSeq, entriesSeq], cur) => {
    const sourceRes = cache.get(cur + 'en-USapp');
    const langRes = cache.get(cur + lang.code + lang.src);
    const [errors, entries] = serializeEntries(lang, langRes instanceof L10nError ? {} : langRes, sourceRes instanceof L10nError ? {} : sourceRes);
    return [errorsSeq.concat(errors), Object.assign(entriesSeq, entries)];
  }, [[], Object.create(null)]);
}

function serializeEntries(lang, langEntries, sourceEntries) {
  const errors = [];
  const entries = Object.create(null);

  for (let id in sourceEntries) {
    const sourceEntry = sourceEntries[id];
    const langEntry = langEntries[id];

    if (!langEntry) {
      errors.push(new L10nError('"' + id + '"' + ' not found in ' + lang.code, id, lang));
      entries[id] = sourceEntry;
      continue;
    }

    if (!areEntityStructsEqual(sourceEntry, langEntry)) {
      errors.push(new L10nError('"' + id + '"' + ' is malformed in ' + lang.code, id, lang));
      entries[id] = sourceEntry;
      continue;
    }

    entries[id] = langEntry;
  }

  return [errors, entries];
}

function resolvesToString(entity) {
  return typeof entity === 'string' || // a simple string
  typeof entity.value === 'string' || // a simple string, entity with attrs
  Array.isArray(entity.value) || // a complex string
  typeof entity.value === 'object' && // a dict with an index
  entity.index !== null;
}

function areAttrsEqual(attrs1, attrs2) {
  const keys1 = Object.keys(attrs1 || Object.create(null));
  const keys2 = Object.keys(attrs2 || Object.create(null));

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (let i = 0; i < keys1.length; i++) {
    if (keys2.indexOf(keys1[i]) === -1) {
      return false;
    }
  }

  return true;
}

function areEntityStructsEqual(source, translation) {
  if (resolvesToString(source) && !resolvesToString(translation)) {
    return false;
  }

  if (source.attrs || translation.attrs) {
    return areAttrsEqual(source.attrs, translation.attrs);
  }

  return true;
}

function serializeLegacyContext(ctx) {
  const lang = ctx.langs[0];
  const cache = ctx.env.resCache;
  return ctx.resIds.reduce(([errorsSeq, entriesSeq], cur) => {
    const sourceRes = cache.get(cur + 'en-USapp');
    const langRes = cache.get(cur + lang.code + lang.src);
    const [errors, entries] = serializeEntries$1(lang, langRes instanceof L10nError ? {} : langRes, sourceRes instanceof L10nError ? {} : sourceRes);
    return [errorsSeq.concat(errors), entriesSeq.concat(entries)];
  }, [[], []]);
}

function serializeEntries$1(lang, langEntries, sourceEntries) {
  const errors = [];
  const entries = Object.keys(sourceEntries).map(id => {
    const sourceEntry = sourceEntries[id];
    const langEntry = langEntries[id];

    if (!langEntry) {
      errors.push(new L10nError('"' + id + '"' + ' not found in ' + lang.code, id, lang));
      return serializeEntry(sourceEntry, id);
    }

    if (!areEntityStructsEqual$1(sourceEntry, langEntry)) {
      errors.push(new L10nError('"' + id + '"' + ' is malformed in ' + lang.code, id, lang));
      return serializeEntry(sourceEntry, id);
    }

    return serializeEntry(langEntry, id);
  });

  return [errors, entries];
}

function serializeEntry(entry, id) {
  if (typeof entry === 'string') {
    return { $i: id, $v: entry };
  }

  const node = {
    $i: id
  };

  if (entry.value !== null) {
    node.$v = entry.value;
  }

  if (entry.index !== null) {
    node.$x = entry.index;
  }

  for (let key in entry.attrs) {
    node[key] = serializeAttribute(entry.attrs[key]);
  }

  return node;
}

function serializeAttribute(attr) {
  if (typeof attr === 'string') {
    return attr;
  }

  const node = {};

  if (attr.value !== null) {
    node.$v = attr.value;
  }

  if (attr.index !== null) {
    node.$x = attr.index;
  }

  return node;
}

function resolvesToString$1(entity) {
  return typeof entity === 'string' || // a simple string
  typeof entity.value === 'string' || // a simple string, entity with attrs
  Array.isArray(entity.value) || // a complex string
  typeof entity.value === 'object' && // a dict with an index
  entity.index !== null;
}

function areAttrsEqual$1(attrs1, attrs2) {
  const keys1 = Object.keys(attrs1 || Object.create(null));
  const keys2 = Object.keys(attrs2 || Object.create(null));

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (let i = 0; i < keys1.length; i++) {
    if (keys2.indexOf(keys1[i]) === -1) {
      return false;
    }
  }

  return true;
}

function areEntityStructsEqual$1(source, translation) {
  if (resolvesToString$1(source) && !resolvesToString$1(translation)) {
    return false;
  }

  if (source.attrs || translation.attrs) {
    return areAttrsEqual$1(source.attrs, translation.attrs);
  }

  return true;
}

let View = (function () {
  function View(htmloptimizer, fetchResource) {
    _classCallCheck(this, View);

    this.htmloptimizer = htmloptimizer;
    this.doc = htmloptimizer.document;
    this.resLinks = getResourceLinks(this.doc.head);

    this.isEnabled = this.doc.querySelector('link[rel="localization"]');
    // XXX we should check if the app uses l10n.js instead, but due to lazy
    // loading we can't rely on querySelector.
    this.isLegacy = !this.doc.querySelector('script[src*="l20n"]');

    const EnvClass = this.isLegacy ? LegacyEnv : Env;
    this.env = new EnvClass(fetchResource);
    this.sourceCtx = this.env.createContext([{ code: 'en-US', src: 'app' }], this.resLinks);

    // add the url of the currently processed webapp to all errors
    this.env.addEventListener('*', amendError.bind(this));

    this.stopBuildError = null;
    const log = logError.bind(this);
    const stop = stopBuild.bind(this);

    // stop the build if these errors happen for en-US
    // XXX tv_apps break the build https://bugzil.la/1179833
    // this.env.addEventListener('fetcherror', stop);
    this.env.addEventListener('parseerror', stop);
    this.env.addEventListener('duplicateerror', stop);
    this.env.addEventListener('notfounderror', stop);
    // XXX sms breaks the build https://bugzil.la/1178187
    // this.env.addEventListener('resolveerror', stop);

    this.env.addEventListener('deprecatewarning', log);

    // if LOCALE_BASEDIR is set alert about missing strings
    if (htmloptimizer.config.LOCALE_BASEDIR !== '') {
      this.env.addEventListener('fetcherror', log);
      this.env.addEventListener('parseerror', log);
      this.env.addEventListener('duplicateerror', log);
    }
  }

  _createClass(View, [{
    key: 'formatEntities',
    value: function formatEntities(...keys) {
      return this.ctx.formatEntities(...keys);
    }
  }, {
    key: 'translateDocument',
    value: function translateDocument(code) {
      const dir = getDirection(code);
      const langs = [{ code, src: 'app' }, { code: 'en-US', src: 'app' }];
      const setDocLang = () => {
        this.doc.documentElement.lang = code;
        this.doc.documentElement.dir = dir;
      };

      const ctx = this.env.createContext(langs, getResourceLinks(this.doc.head));
      return translateFragment(ctx, this.doc.documentElement).then(setDocLang);
    }
  }, {
    key: 'serializeResources',
    value: function serializeResources(code) {
      const langCtx = this.env.createContext([{ code, src: code in pseudo$1 ? 'pseudo' : 'app' }], this.resLinks);

      return Promise.all([this.sourceCtx, langCtx].map(ctx => ctx.fetch())).then(() => {
        const [errors, entries] = this.isLegacy ? serializeLegacyContext(langCtx) : serializeContext(langCtx);

        if (errors.length) {
          const notFoundErrors = errors.filter(err => err.message.indexOf('not found') > -1).map(err => err.id);
          const malformedErrors = errors.filter(err => err.message.indexOf('malformed') > -1).map(err => err.id);

          if (notFoundErrors.length) {
            this.htmloptimizer.dump('[l10n] [' + code + ']: ' + notFoundErrors.length + ' missing compared to en-US: ' + notFoundErrors.join(', '));
          }
          if (malformedErrors.length) {
            this.htmloptimizer.dump('[l10n] [' + code + ']: ' + malformedErrors.length + ' malformed compared to en-US: ' + malformedErrors.join(', '));
          }
        }

        return entries;
      });
    }
  }, {
    key: 'checkError',
    value: function checkError() {
      return {
        wait: false,
        error: this.stopBuildError
      };
    }
  }]);

  return View;
})();

function amendError(err) {
  err.message = err.message + ' (' + this.htmloptimizer.webapp.url + ')';
}

function logError(err) {
  this.htmloptimizer.dump('[l10n] ' + err);
}

function stopBuild(err) {
  if (err.lang && err.lang.code === 'en-US' && !this.stopBuildError) {
    this.stopBuildError = err;
  }
}

function getDirection(code) {
  const tag = code.split('-')[0];
  return ['ar', 'he', 'fa', 'ps', 'ur'].indexOf(tag) >= 0 ? 'rtl' : 'ltr';
}

function getView(htmloptimizer) {
  const htmlFetch = (...args) => fetchResource(htmloptimizer, ...args);
  return new View(htmloptimizer, htmlFetch);
}

exports.getView = getView;
exports.pseudo = pseudo$1;
exports.walkValue = walkValue$1;
// a-z
// a-z
// A-Z
// a-f
// A-F