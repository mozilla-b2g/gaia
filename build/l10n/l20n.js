'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function L10nError(message, id, lang) {
  this.name = 'L10nError';
  this.message = message;
  this.id = id;
  this.lang = lang;
}
L10nError.prototype = Object.create(Error.prototype);
L10nError.prototype.constructor = L10nError;

function fetchResource(htmloptimizer, res, lang) {
  var url = decodeURI(res).replace('{locale}', lang.code);

  var _htmloptimizer$getFileByRelativePath = htmloptimizer.getFileByRelativePath(url);

  var file = _htmloptimizer$getFileByRelativePath.file;
  var content = _htmloptimizer$getFileByRelativePath.content;

  if (!file) {
    return Promise.reject(new L10nError('Not found: ' + url));
  }

  var parsed = res.endsWith('.json') ? JSON.parse(content) : content;
  return Promise.resolve(parsed);
}

function walkEntry(entry, fn) {
  if (typeof entry === 'string') {
    return fn(entry);
  }

  var newEntry = Object.create(null);

  if (entry.value) {
    newEntry.value = walkValue$1(entry.value, fn);
  }

  if (entry.index) {
    newEntry.index = entry.index;
  }

  if (entry.attrs) {
    newEntry.attrs = Object.create(null);
    for (var key in entry.attrs) {
      newEntry.attrs[key] = walkEntry(entry.attrs[key], fn);
    }
  }

  return newEntry;
}

function walkValue$1(value, fn) {
  if (typeof value === 'string') {
    return fn(value);
  }

  if (value.type) {
    return value;
  }

  var newValue = Array.isArray(value) ? [] : Object.create(null);
  var keys = Object.keys(value);

  for (var i = 0, key = undefined; key = keys[i]; i++) {
    newValue[key] = walkValue$1(value[key], fn);
  }

  return newValue;
}

function createGetter(id, name) {
  var _pseudo = null;

  return function getPseudo() {
    if (_pseudo) {
      return _pseudo;
    }

    var reAlphas = /[a-zA-Z]/g;
    var reVowels = /[aeiouAEIOU]/g;
    var reWords = /[^\W0-9_]+/g;

    var reExcluded = /(%[EO]?\w|\{\s*.+?\s*\}|&[#\w]+;|<\s*.+?\s*>)/;

    var charMaps = {
      'fr-x-psaccent': 'ȦƁƇḒḖƑƓĦĪĴĶĿḾȠǾƤɊŘŞŦŬṼẆẊẎẐ[\\]^_`ȧƀƈḓḗƒɠħīĵķŀḿƞǿƥɋřşŧŭṽẇẋẏẑ',
      'ar-x-psbidi': '∀ԐↃpƎɟפHIſӼ˥WNOԀÒᴚS⊥∩ɅＭXʎZ[\\]ᵥ_,ɐqɔpǝɟƃɥıɾʞʅɯuodbɹsʇnʌʍxʎz'
    };

    var mods = {
      'fr-x-psaccent': function (val) {
        return val.replace(reVowels, function (match) {
          return match + match.toLowerCase();
        });
      },

      'ar-x-psbidi': function (val) {
        return val.replace(reWords, function (match) {
          return '‮' + match + '‬';
        });
      }
    };

    var replaceChars = function (map, val) {
      return val.replace(reAlphas, function (match) {
        return map.charAt(match.charCodeAt(0) - 65);
      });
    };

    var transform = function (val) {
      return replaceChars(charMaps[id], mods[id](val));
    };

    var apply = function (fn, val) {
      if (!val) {
        return val;
      }

      var parts = val.split(reExcluded);
      var modified = parts.map(function (part) {
        if (reExcluded.test(part)) {
          return part;
        }
        return fn(part);
      });
      return modified.join('');
    };

    return _pseudo = {
      name: transform(name),
      process: function (str) {
        return apply(transform, str);
      }
    };
  };
}

var pseudo$1 = Object.defineProperties(Object.create(null), {
  'fr-x-psaccent': {
    enumerable: true,
    get: createGetter('fr-x-psaccent', 'Runtime Accented')
  },
  'ar-x-psbidi': {
    enumerable: true,
    get: createGetter('ar-x-psbidi', 'Runtime Bidi')
  }
});

var MAX_PLACEABLES$1 = 100;

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
      var id = this.getIdentifier();
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

    var ch = this._source[this._index];
    var value = this.getValue(ch, index === undefined);
    var attrs = undefined;

    if (value === undefined) {
      if (ch === '>') {
        throw this.error('Expected ">"');
      }
      attrs = this.getAttributes();
    } else {
      var ws1 = this.getRequiredWS();
      if (this._source[this._index] !== '>') {
        if (!ws1) {
          throw this.error('Expected ">"');
        }
        attrs = this.getAttributes();
      }
    }

    ++this._index;

    if (id in this.entries) {
      throw this.error('Duplicate entry ID "' + id, 'duplicateerror');
    }
    if (!attrs && !index && typeof value === 'string') {
      this.entries[id] = value;
    } else {
      this.entries[id] = {
        value: value,
        attrs: attrs,
        index: index
      };
    }
  },

  getValue: function () {
    var ch = arguments.length <= 0 || arguments[0] === undefined ? this._source[this._index] : arguments[0];
    var optional = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

    switch (ch) {
      case '\'':
      case '"':
        return this.getString(ch, 1);
      case '{':
        return this.getHash();
    }

    if (!optional) {
      throw this.error('Unknown value type');
    }

    return;
  },

  getWS: function () {
    var cc = this._source.charCodeAt(this._index);

    while (cc === 32 || cc === 10 || cc === 9 || cc === 13) {
      cc = this._source.charCodeAt(++this._index);
    }
  },

  getRequiredWS: function () {
    var pos = this._index;
    var cc = this._source.charCodeAt(pos);

    while (cc === 32 || cc === 10 || cc === 9 || cc === 13) {
      cc = this._source.charCodeAt(++this._index);
    }
    return this._index !== pos;
  },

  getIdentifier: function () {
    var start = this._index;
    var cc = this._source.charCodeAt(this._index);

    if (cc >= 97 && cc <= 122 || cc >= 65 && cc <= 90 || cc === 95) {
      cc = this._source.charCodeAt(++this._index);
    } else {
      throw this.error('Identifier has to start with [a-zA-Z_]');
    }

    while (cc >= 97 && cc <= 122 || cc >= 65 && cc <= 90 || cc >= 48 && cc <= 57 || cc === 95) {
      cc = this._source.charCodeAt(++this._index);
    }

    return this._source.slice(start, this._index);
  },

  getUnicodeChar: function () {
    for (var i = 0; i < 4; i++) {
      var cc = this._source.charCodeAt(++this._index);
      if (cc > 96 && cc < 103 || cc > 64 && cc < 71 || cc > 47 && cc < 58) {
        continue;
      }
      throw this.error('Illegal unicode escape sequence');
    }
    this._index++;
    return String.fromCharCode(parseInt(this._source.slice(this._index - 4, this._index), 16));
  },

  stringRe: /"|'|{{|\\/g,
  getString: function (opchar, opcharLen) {
    var body = [];
    var placeables = 0;

    this._index += opcharLen;
    var start = this._index;

    var bufStart = start;
    var buf = '';

    while (true) {
      this.stringRe.lastIndex = this._index;
      var match = this.stringRe.exec(this._source);

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
        var ch2 = this._source[this._index];
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
    var attrs = Object.create(null);

    while (true) {
      this.getAttribute(attrs);
      var ws1 = this.getRequiredWS();
      var ch = this._source.charAt(this._index);
      if (ch === '>') {
        break;
      } else if (!ws1) {
        throw this.error('Expected ">"');
      }
    }
    return attrs;
  },

  getAttribute: function (attrs) {
    var key = this.getIdentifier();
    var index = undefined;

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
    var value = this.getValue();

    if (key in attrs) {
      throw this.error('Duplicate attribute "' + key, 'duplicateerror');
    }

    if (!index && typeof value === 'string') {
      attrs[key] = value;
    } else {
      attrs[key] = {
        value: value,
        index: index
      };
    }
  },

  getHash: function () {
    var items = Object.create(null);

    ++this._index;
    this.getWS();

    var defKey = undefined;

    while (true) {
      var _getHashItem = this.getHashItem();

      var key = _getHashItem[0];
      var value = _getHashItem[1];
      var def = _getHashItem[2];

      items[key] = value;

      if (def) {
        if (defKey) {
          throw this.error('Default item redefinition forbidden');
        }
        defKey = key;
      }
      this.getWS();

      var comma = this._source[this._index] === ',';
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
    }

    return items;
  },

  getHashItem: function () {
    var defItem = false;
    if (this._source[this._index] === '*') {
      ++this._index;
      defItem = true;
    }

    var key = this.getIdentifier();
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
    var start = this._index;
    var end = this._source.indexOf('*/', start);

    if (end === -1) {
      throw this.error('Comment without a closing tag');
    }

    this._index = end + 2;
  },

  getExpression: function () {
    var exp = this.getPrimaryExpression();

    while (true) {
      var ch = this._source[this._index];
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
    var exp = undefined;

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
    var ch = this._source[this._index];

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
    var items = [];
    var closed = false;

    this.getWS();

    if (this._source[this._index] === closeChar) {
      ++this._index;
      closed = true;
    }

    while (!closed) {
      items.push(callback.call(this));
      this.getWS();
      var ch = this._source.charAt(this._index);
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
    var pos = this._index;
    var nextEntity = this._source.indexOf('<', pos);
    var nextComment = this._source.indexOf('/*', pos);

    if (nextEntity === -1) {
      nextEntity = this._length;
    }
    if (nextComment === -1) {
      nextComment = this._length;
    }

    var nextEntry = Math.min(nextEntity, nextComment);

    this._index = nextEntry;
  },

  error: function (message) {
    var type = arguments.length <= 1 || arguments[1] === undefined ? 'parsererror' : arguments[1];

    var pos = this._index;

    var start = this._source.lastIndexOf('<', pos - 1);
    var lastClose = this._source.lastIndexOf('>', pos - 1);
    start = lastClose > start ? lastClose + 1 : start;
    var context = this._source.slice(start, pos + 10);

    var msg = message + ' at pos ' + pos + ': `' + context + '`';
    var err = new L10nError(msg);
    if (this.emit) {
      this.emit(type, err);
    }
    return err;
  }
};

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
        var val = entries[id];
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
        var val = root[id];
        root[id] = Object.create(null);
        root[id].index = this.parseIndex(val);
        root[id].value = Object.create(null);
      }
      root = root[id].value;
      id = key;
      isSimpleValue = true;
    }

    if (isSimpleValue && (!entries[id] || isSimpleNode)) {
      if (id in root) {
        throw this.error();
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

  error: function (msg) {
    var type = arguments.length <= 1 || arguments[1] === undefined ? 'parsererror' : arguments[1];

    var err = new L10nError(msg);
    if (this.emit) {
      this.emit(type, err);
    }
    return err;
  }
};

var KNOWN_MACROS$1 = ['plural'];
var MAX_PLACEABLE_LENGTH$1 = 2500;

var FSI$1 = '⁨';
var PDI$1 = '⁩';

var resolutionChain$1 = new WeakSet();

function format$1(ctx, lang, args, entity) {
  if (typeof entity === 'string') {
    return [{}, entity];
  }

  if (resolutionChain$1.has(entity)) {
    throw new L10nError('Cyclic reference detected');
  }

  resolutionChain$1.add(entity);

  var rv = undefined;

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

  if (id === '__proto__') {
    throw new L10nError('Illegal id: ' + id);
  }

  var entity = ctx._getEntity(lang, id);

  if (entity) {
    return format$1(ctx, lang, args, entity);
  }

  throw new L10nError('Unknown reference: ' + id);
}

function subPlaceable$1(locals, ctx, lang, args, id) {
  var newLocals = undefined,
      value = undefined;

  try {
    var _resolveIdentifier$1 = resolveIdentifier$1(ctx, lang, args, id);

    newLocals = _resolveIdentifier$1[0];
    value = _resolveIdentifier$1[1];
  } catch (err) {
    return [{ error: err }, FSI$1 + '{{ ' + id + ' }}' + PDI$1];
  }

  if (typeof value === 'number') {
    var formatter = ctx._getNumberFormatter(lang);
    return [newLocals, formatter.format(value)];
  }

  if (typeof value === 'string') {
    if (value.length >= MAX_PLACEABLE_LENGTH$1) {
      throw new L10nError('Too many characters in placeable (' + value.length + ', max allowed is ' + MAX_PLACEABLE_LENGTH$1 + ')');
    }
    return [newLocals, FSI$1 + value + PDI$1];
  }

  return [{}, FSI$1 + '{{ ' + id + ' }}' + PDI$1];
}

function interpolate$1(locals, ctx, lang, args, arr) {
  return arr.reduce(function (_ref, cur) {
    var localsSeq = _ref[0];
    var valueSeq = _ref[1];

    if (typeof cur === 'string') {
      return [localsSeq, valueSeq + cur];
    } else {
      var _subPlaceable$1 = subPlaceable$1(locals, ctx, lang, args, cur.name);

      var value = _subPlaceable$1[1];

      return [localsSeq, valueSeq + value];
    }
  }, [locals, '']);
}

function resolveSelector$1(ctx, lang, args, expr, index) {
  var selectorName = undefined;
  if (index[0].type === 'call' && index[0].expr.type === 'prop' && index[0].expr.expr.name === 'cldr') {
    selectorName = 'plural';
  } else {
    selectorName = index[0].name;
  }
  var selector = resolveIdentifier$1(ctx, lang, args, selectorName)[1];

  if (typeof selector !== 'function') {
    return selector;
  }

  var argValue = index[0].args ? resolveIdentifier$1(ctx, lang, args, index[0].args[0].name)[1] : undefined;

  if (selectorName === 'plural') {
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

  if (index) {
    var selector = resolveSelector$1(ctx, lang, args, expr, index);
    if (selector in expr) {
      return resolveValue$1(locals, ctx, lang, args, expr[selector]);
    }
  }

  var defaultKey = expr.__default || 'other';
  if (defaultKey in expr) {
    return resolveValue$1(locals, ctx, lang, args, expr[defaultKey]);
  }

  throw new L10nError('Unresolvable value');
}

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

function isIn(n, list) {
  return list.indexOf(n) !== -1;
}
function isBetween(n, start, end) {
  return typeof n === typeof start && start <= n && n <= end;
}

var pluralRules = {
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
  var index = locales2rules[code.replace(/-.*$/, '')];
  if (!(index in pluralRules)) {
    return function () {
      return 'other';
    };
  }
  return pluralRules[index];
}

var Context = (function () {
  function Context(env) {
    _classCallCheck(this, Context);

    this._env = env;
    this._numberFormatters = null;
  }

  Context.prototype._formatTuple = function _formatTuple(lang, args, entity, id, key) {
    try {
      return format$1(this, lang, args, entity);
    } catch (err) {
      err.id = key ? id + '::' + key : id;
      err.lang = lang;
      this._env.emit('resolveerror', err, this);
      return [{ error: err }, err.id];
    }
  };

  Context.prototype._formatEntity = function _formatEntity(lang, args, entity, id) {
    var _formatTuple2 = this._formatTuple(lang, args, entity, id);

    var value = _formatTuple2[1];

    var formatted = {
      value: value,
      attrs: null
    };

    if (entity.attrs) {
      formatted.attrs = Object.create(null);
      for (var key in entity.attrs) {
        var _formatTuple3 = this._formatTuple(lang, args, entity.attrs[key], id, key);

        var attrValue = _formatTuple3[1];

        formatted.attrs[key] = attrValue;
      }
    }

    return formatted;
  };

  Context.prototype._formatValue = function _formatValue(lang, args, entity, id) {
    return this._formatTuple(lang, args, entity, id)[1];
  };

  Context.prototype.fetch = function fetch(langs) {
    if (langs.length === 0) {
      return Promise.resolve(langs);
    }

    var resIds = Array.from(this._env._resLists.get(this));

    return Promise.all(resIds.map(this._env._getResource.bind(this._env, langs[0]))).then(function () {
      return langs;
    });
  };

  Context.prototype._resolve = function _resolve(langs, keys, formatter, prevResolved) {
    var _this = this;

    var lang = langs[0];

    if (!lang) {
      return reportMissing.call(this, keys, formatter, prevResolved);
    }

    var hasUnresolved = false;

    var resolved = keys.map(function (key, i) {
      if (prevResolved && prevResolved[i] !== undefined) {
        return prevResolved[i];
      }

      var _ref2 = Array.isArray(key) ? key : [key, undefined];

      var id = _ref2[0];
      var args = _ref2[1];

      var entity = _this._getEntity(lang, id);

      if (entity) {
        return formatter.call(_this, lang, args, entity, id);
      }

      _this._env.emit('notfounderror', new L10nError('"' + id + '"' + ' not found in ' + lang.code, id, lang), _this);
      hasUnresolved = true;
    });

    if (!hasUnresolved) {
      return resolved;
    }

    return this.fetch(langs.slice(1)).then(function (nextLangs) {
      return _this._resolve(nextLangs, keys, formatter, resolved);
    });
  };

  Context.prototype.resolveEntities = function resolveEntities(langs, keys) {
    var _this2 = this;

    return this.fetch(langs).then(function (langs) {
      return _this2._resolve(langs, keys, _this2._formatEntity);
    });
  };

  Context.prototype.resolveValues = function resolveValues(langs, keys) {
    var _this3 = this;

    return this.fetch(langs).then(function (langs) {
      return _this3._resolve(langs, keys, _this3._formatValue);
    });
  };

  Context.prototype._getEntity = function _getEntity(lang, id) {
    var cache = this._env._resCache;
    var resIds = Array.from(this._env._resLists.get(this));

    for (var i = 0, resId = undefined; resId = resIds[i]; i++) {
      var resource = cache.get(resId + lang.code + lang.src);
      if (resource instanceof L10nError) {
        continue;
      }
      if (id in resource) {
        return resource[id];
      }
    }
    return undefined;
  };

  Context.prototype._getNumberFormatter = function _getNumberFormatter(lang) {
    if (!this._numberFormatters) {
      this._numberFormatters = new Map();
    }
    if (!this._numberFormatters.has(lang)) {
      var formatter = Intl.NumberFormat(lang, {
        useGrouping: false
      });
      this._numberFormatters.set(lang, formatter);
      return formatter;
    }
    return this._numberFormatters.get(lang);
  };

  Context.prototype._getMacro = function _getMacro(lang, id) {
    switch (id) {
      case 'plural':
        return getPluralRule(lang.code);
      default:
        return undefined;
    }
  };

  return Context;
})();

function reportMissing(keys, formatter, resolved) {
  var _this4 = this;

  var missingIds = new Set();

  keys.forEach(function (key, i) {
    if (resolved && resolved[i] !== undefined) {
      return;
    }
    var id = Array.isArray(key) ? key[0] : key;
    missingIds.add(id);
    resolved[i] = formatter === _this4._formatValue ? id : { value: id, attrs: null };
  });

  this._env.emit('notfounderror', new L10nError('"' + Array.from(missingIds).join(', ') + '"' + ' not found in any language', missingIds), this);

  return resolved;
}

function emit(listeners) {
  var _this5 = this;

  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  var type = args.shift();

  if (listeners['*']) {
    listeners['*'].slice().forEach(function (listener) {
      return listener.apply(_this5, args);
    });
  }

  if (listeners[type]) {
    listeners[type].slice().forEach(function (listener) {
      return listener.apply(_this5, args);
    });
  }
}

function addEventListener(listeners, type, listener) {
  if (!(type in listeners)) {
    listeners[type] = [];
  }
  listeners[type].push(listener);
}

function removeEventListener(listeners, type, listener) {
  var typeListeners = listeners[type];
  var pos = typeListeners.indexOf(listener);
  if (pos === -1) {
    return;
  }

  typeListeners.splice(pos, 1);
}

var parsers = {
  properties: PropertiesParser,
  l20n: L20nParser
};

var Env = (function () {
  function Env(defaultLang, fetchResource) {
    _classCallCheck(this, Env);

    this.defaultLang = defaultLang;
    this.fetchResource = fetchResource;

    this._resLists = new Map();
    this._resCache = new Map();

    var listeners = {};
    this.emit = emit.bind(this, listeners);
    this.addEventListener = addEventListener.bind(this, listeners);
    this.removeEventListener = removeEventListener.bind(this, listeners);
  }

  Env.prototype.createContext = function createContext(resIds) {
    var ctx = new Context(this);
    this._resLists.set(ctx, new Set(resIds));
    return ctx;
  };

  Env.prototype.destroyContext = function destroyContext(ctx) {
    var _this6 = this;

    var lists = this._resLists;
    var resList = lists.get(ctx);

    lists.delete(ctx);
    resList.forEach(function (resId) {
      return deleteIfOrphan(_this6._resCache, lists, resId);
    });
  };

  Env.prototype._parse = function _parse(syntax, lang, data) {
    var _this7 = this;

    var parser = parsers[syntax];
    if (!parser) {
      return data;
    }

    var emit = function (type, err) {
      return _this7.emit(type, amendError$1(lang, err));
    };
    return parser.parse.call(parser, emit, data);
  };

  Env.prototype._create = function _create(lang, entries) {
    if (lang.src !== 'pseudo') {
      return entries;
    }

    var pseudoentries = Object.create(null);
    for (var key in entries) {
      pseudoentries[key] = walkEntry(entries[key], pseudo$1[lang.code].process);
    }
    return pseudoentries;
  };

  Env.prototype._getResource = function _getResource(lang, res) {
    var _this8 = this;

    var cache = this._resCache;
    var id = res + lang.code + lang.src;

    if (cache.has(id)) {
      return cache.get(id);
    }

    var syntax = res.substr(res.lastIndexOf('.') + 1);

    var saveEntries = function (data) {
      var entries = _this8._parse(syntax, lang, data);
      cache.set(id, _this8._create(lang, entries));
    };

    var recover = function (err) {
      err.lang = lang;
      _this8.emit('fetcherror', err);
      cache.set(id, err);
    };

    var langToFetch = lang.src === 'pseudo' ? { code: this.defaultLang, src: 'app' } : lang;

    var resource = this.fetchResource(res, langToFetch).then(saveEntries, recover);

    cache.set(id, resource);

    return resource;
  };

  return Env;
})();

function deleteIfOrphan(cache, lists, resId) {
  var isNeeded = Array.from(lists).some(function (_ref3) {
    var ctx = _ref3[0];
    var resIds = _ref3[1];
    return resIds.has(resId);
  });

  if (!isNeeded) {
    cache.forEach(function (val, key) {
      return key.startsWith(resId) ? cache.delete(key) : null;
    });
  }
}

function amendError$1(lang, err) {
  err.lang = lang;
  return err;
}

var KNOWN_MACROS = ['plural'];
var MAX_PLACEABLE_LENGTH = 2500;

var nonLatin1 = /[^\x01-\xFF]/;

var FSI = '⁨';
var PDI = '⁩';

var resolutionChain = new WeakSet();

function createEntry(node) {
  var keys = Object.keys(node);

  if (typeof node.$v === 'string' && keys.length === 2) {
    return node.$v;
  }

  var attrs = undefined;

  for (var i = 0, key = undefined; key = keys[i]; i++) {
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

  var rv = undefined;

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

  if (id === '__proto__') {
    throw new L10nError('Illegal id: ' + id);
  }

  var entity = ctx._getEntity(lang, id);

  if (entity) {
    return format(ctx, lang, args, entity);
  }

  throw new L10nError('Unknown reference: ' + id);
}

function subPlaceable(locals, ctx, lang, args, id) {
  var res = undefined;

  try {
    res = resolveIdentifier(ctx, lang, args, id);
  } catch (err) {
    return [{ error: err }, '{{ ' + id + ' }}'];
  }

  var value = res[1];

  if (typeof value === 'number') {
    return res;
  }

  if (typeof value === 'string') {
    if (value.length >= MAX_PLACEABLE_LENGTH) {
      throw new L10nError('Too many characters in placeable (' + value.length + ', max allowed is ' + MAX_PLACEABLE_LENGTH + ')');
    }

    if (locals.contextIsNonLatin1 || value.match(nonLatin1)) {
      res[1] = FSI + value + PDI;
    }

    return res;
  }

  return [{}, '{{ ' + id + ' }}'];
}

function interpolate(locals, ctx, lang, args, arr) {
  return arr.reduce(function (_ref4, cur) {
    var localsSeq = _ref4[0];
    var valueSeq = _ref4[1];

    if (typeof cur === 'string') {
      return [localsSeq, valueSeq + cur];
    } else if (cur.t === 'idOrVar') {
      var _subPlaceable = subPlaceable(locals, ctx, lang, args, cur.v);

      var value = _subPlaceable[1];

      return [localsSeq, valueSeq + value];
    }
  }, [locals, '']);
}

function resolveSelector(ctx, lang, args, expr, index) {
  var selectorName = index[0].v;
  var selector = resolveIdentifier(ctx, lang, args, selectorName)[1];

  if (typeof selector !== 'function') {
    return selector;
  }

  var argValue = index[1] ? resolveIdentifier(ctx, lang, args, index[1])[1] : undefined;

  if (selectorName === 'plural') {
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

  if (index) {
    var selector = resolveSelector(ctx, lang, args, expr, index);
    if (expr.hasOwnProperty(selector)) {
      return resolveValue(locals, ctx, lang, args, expr[selector]);
    }
  }

  if ('other' in expr) {
    return resolveValue(locals, ctx, lang, args, expr.other);
  }

  throw new L10nError('Unresolvable value');
}

function LegacyContext(env) {
  Context.call(this, env);
}

LegacyContext.prototype = Object.create(Context.prototype);

LegacyContext.prototype._formatTuple = function (lang, args, entity, id, key) {
  try {
    return format(this, lang, args, entity);
  } catch (err) {
    err.id = key ? id + '::' + key : id;
    err.lang = lang;
    this._env.emit('resolveerror', err, this);
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

function walkContent(node, fn) {
  if (typeof node === 'string') {
    return fn(node);
  }

  if (node.t === 'idOrVar') {
    return node;
  }

  var rv = Array.isArray(node) ? [] : {};
  var keys = Object.keys(node);

  for (var i = 0, key = undefined; key = keys[i]; i++) {
    if (key === '$i' || key === '$x') {
      rv[key] = node[key];
    } else {
      rv[key] = walkContent(node[key], fn);
    }
  }
  return rv;
}

function LegacyEnv(defaultLang, fetchResource) {
  Env.call(this, defaultLang, fetchResource);
}

LegacyEnv.prototype = Object.create(Env.prototype);

LegacyEnv.prototype.createContext = function (resIds) {
  var ctx = new LegacyContext(this);
  this._resLists.set(ctx, new Set(resIds));
  return ctx;
};

LegacyEnv.prototype._parse = function (syntax, lang, data) {
  var _this9 = this;

  var emit = function (type, err) {
    return _this9.emit(type, amendError$1(lang, err));
  };
  return PropertiesParser$1.parse.call(PropertiesParser$1, emit, data);
};

LegacyEnv.prototype._create = function (lang, ast) {
  var entries = Object.create(null);
  var create = lang.src === 'pseudo' ? createPseudoEntry : createEntry;

  for (var i = 0, node = undefined; node = ast[i]; i++) {
    var id = node.$i;
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

var reOverlay = /<|&#?\w+;/;

var allowed = {
  elements: ['a', 'em', 'strong', 'small', 's', 'cite', 'q', 'dfn', 'abbr', 'data', 'time', 'code', 'var', 'samp', 'kbd', 'sub', 'sup', 'i', 'b', 'u', 'mark', 'ruby', 'rt', 'rp', 'bdi', 'bdo', 'span', 'br', 'wbr'],
  attributes: {
    global: ['title', 'aria-label', 'aria-valuetext', 'aria-moz-hint'],
    a: ['download'],
    area: ['download', 'alt'],

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
  var value = translation.value;

  if (typeof value === 'string') {
    if (!reOverlay.test(value)) {
      element.textContent = value;
    } else {
      var tmpl = element.ownerDocument.createElement('template');
      tmpl.innerHTML = value;

      overlay(element, tmpl.content);
    }
  }

  for (var key in translation.attrs) {
    var attrName = camelCaseToDashed(key);
    if (isAttrAllowed({ name: attrName }, element)) {
      element.setAttribute(attrName, translation.attrs[key]);
    }
  }
}

function overlay(sourceElement, translationElement) {
  var result = translationElement.ownerDocument.createDocumentFragment();
  var k = undefined,
      attr = undefined;

  var childElement = undefined;
  while (childElement = translationElement.childNodes[0]) {
    translationElement.removeChild(childElement);

    if (childElement.nodeType === childElement.TEXT_NODE) {
      result.appendChild(childElement);
      continue;
    }

    var index = getIndexOfType(childElement);
    var sourceChild = getNthElementOfType(sourceElement, childElement, index);
    if (sourceChild) {
      overlay(sourceChild, childElement);
      result.appendChild(sourceChild);
      continue;
    }

    if (isElementAllowed(childElement)) {
      var sanitizedChild = childElement.ownerDocument.createElement(childElement.nodeName);
      overlay(sanitizedChild, childElement);
      result.appendChild(sanitizedChild);
      continue;
    }

    result.appendChild(translationElement.ownerDocument.createTextNode(childElement.textContent));
  }

  sourceElement.textContent = '';
  sourceElement.appendChild(result);

  if (translationElement.attributes) {
    for (k = 0, attr; attr = translationElement.attributes[k]; k++) {
      if (isAttrAllowed(attr, sourceElement)) {
        sourceElement.setAttribute(attr.name, attr.value);
      }
    }
  }
}

function isElementAllowed(element) {
  return allowed.elements.indexOf(element.tagName.toLowerCase()) !== -1;
}

function isAttrAllowed(attr, element) {
  var attrName = attr.name.toLowerCase();
  var tagName = element.tagName.toLowerCase();

  if (allowed.attributes.global.indexOf(attrName) !== -1) {
    return true;
  }

  if (!allowed.attributes[tagName]) {
    return false;
  }

  if (allowed.attributes[tagName].indexOf(attrName) !== -1) {
    return true;
  }

  if (tagName === 'input' && attrName === 'value') {
    var type = element.type.toLowerCase();
    if (type === 'submit' || type === 'button' || type === 'reset') {
      return true;
    }
  }
  return false;
}

function getNthElementOfType(context, element, index) {
  var nthOfType = 0;
  for (var i = 0, child = undefined; child = context.children[i]; i++) {
    if (child.nodeType === child.ELEMENT_NODE && child.tagName === element.tagName) {
      if (nthOfType === index) {
        return child;
      }
      nthOfType++;
    }
  }
  return null;
}

function getIndexOfType(element) {
  var index = 0;
  var child = undefined;
  while (child = element.previousElementSibling) {
    if (child.tagName === element.tagName) {
      index++;
    }
  }
  return index;
}

function camelCaseToDashed(string) {
  if (string === 'ariaValueText') {
    return 'aria-valuetext';
  }

  return string.replace(/[A-Z]/g, function (match) {
    return '-' + match.toLowerCase();
  }).replace(/^-/, '');
}

var reHtml = /[&<>]/g;
var htmlEntities = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;'
};

function getResourceLinks(head) {
  return Array.prototype.map.call(head.querySelectorAll('link[rel="localization"]'), function (el) {
    return el.getAttribute('href');
  });
}

function getTranslatables(element) {
  var nodes = Array.from(element.querySelectorAll('[data-l10n-id]'));

  if (typeof element.hasAttribute === 'function' && element.hasAttribute('data-l10n-id')) {
    nodes.push(element);
  }

  return nodes;
}

function translateFragment(view, langs, frag) {
  return translateElements(view, langs, getTranslatables(frag));
}

function getElementsTranslation(view, langs, elems) {
  var keys = elems.map(function (elem) {
    var id = elem.getAttribute('data-l10n-id');
    var args = elem.getAttribute('data-l10n-args');
    return args ? [id, JSON.parse(args.replace(reHtml, function (match) {
      return htmlEntities[match];
    }))] : id;
  });

  return view._resolveEntities(langs, keys);
}

function translateElements(view, langs, elements) {
  return getElementsTranslation(view, langs, elements).then(function (translations) {
    return applyTranslations(view, elements, translations);
  });
}

function applyTranslations(view, elems, translations) {
  view._disconnect();
  for (var i = 0; i < elems.length; i++) {
    overlayElement(elems[i], translations[i]);
  }
  view._observe();
}

if (typeof NodeList === 'function' && !NodeList.prototype[Symbol.iterator]) {
  NodeList.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
}

function getDirection(code) {
  var tag = code.split('-')[0];
  return ['ar', 'he', 'fa', 'ps', 'ur'].indexOf(tag) >= 0 ? 'rtl' : 'ltr';
}

function serializeContext(ctx, lang) {
  var cache = ctx._env._resCache;
  var resIds = Array.from(ctx._env._resLists.get(ctx));
  return resIds.reduceRight(function (_ref5, cur) {
    var errorsSeq = _ref5[0];
    var entriesSeq = _ref5[1];

    var sourceRes = cache.get(cur + 'en-USapp');
    var langRes = cache.get(cur + lang.code + lang.src);

    var _serializeEntries = serializeEntries(lang, langRes instanceof L10nError ? {} : langRes, sourceRes instanceof L10nError ? {} : sourceRes);

    var errors = _serializeEntries[0];
    var entries = _serializeEntries[1];

    return [errorsSeq.concat(errors), Object.assign(entriesSeq, entries)];
  }, [[], Object.create(null)]);
}

function serializeEntries(lang, langEntries, sourceEntries) {
  var errors = [];
  var entries = Object.create(null);

  for (var id in sourceEntries) {
    var sourceEntry = sourceEntries[id];
    var langEntry = langEntries[id];

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
  return typeof entity === 'string' || typeof entity.value === 'string' || Array.isArray(entity.value) || typeof entity.value === 'object' && entity.index !== null;
}

function areAttrsEqual(attrs1, attrs2) {
  var keys1 = Object.keys(attrs1 || Object.create(null));
  var keys2 = Object.keys(attrs2 || Object.create(null));

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

function areEntityStructsEqual(source, translation) {
  if (resolvesToString(source) && !resolvesToString(translation)) {
    return false;
  }

  if (source.attrs || translation.attrs) {
    return areAttrsEqual(source.attrs, translation.attrs);
  }

  return true;
}

function serializeLegacyContext(ctx, lang) {
  var cache = ctx._env._resCache;
  var resIds = Array.from(ctx._env._resLists.get(ctx));
  return resIds.reduce(function (_ref6, cur) {
    var errorsSeq = _ref6[0];
    var entriesSeq = _ref6[1];

    var sourceRes = cache.get(cur + 'en-USapp');
    var langRes = cache.get(cur + lang.code + lang.src);

    var _serializeEntries$1 = serializeEntries$1(lang, langRes instanceof L10nError ? {} : langRes, sourceRes instanceof L10nError ? {} : sourceRes);

    var errors = _serializeEntries$1[0];
    var entries = _serializeEntries$1[1];

    return [errorsSeq.concat(errors), entriesSeq.concat(entries)];
  }, [[], []]);
}

function serializeEntries$1(lang, langEntries, sourceEntries) {
  var errors = [];
  var entries = Object.keys(sourceEntries).map(function (id) {
    var sourceEntry = sourceEntries[id];
    var langEntry = langEntries[id];

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

  var node = {
    $i: id
  };

  if (entry.value !== null) {
    node.$v = entry.value;
  }

  if (entry.index !== null) {
    node.$x = entry.index;
  }

  for (var key in entry.attrs) {
    node[key] = serializeAttribute(entry.attrs[key]);
  }

  return node;
}

function serializeAttribute(attr) {
  if (typeof attr === 'string') {
    return attr;
  }

  var node = {};

  if (attr.value !== null) {
    node.$v = attr.value;
  }

  if (attr.index !== null) {
    node.$x = attr.index;
  }

  return node;
}

function resolvesToString$1(entity) {
  return typeof entity === 'string' || typeof entity.value === 'string' || Array.isArray(entity.value) || typeof entity.value === 'object' && entity.index !== null;
}

function areAttrsEqual$1(attrs1, attrs2) {
  var keys1 = Object.keys(attrs1 || Object.create(null));
  var keys2 = Object.keys(attrs2 || Object.create(null));

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

function areEntityStructsEqual$1(source, translation) {
  if (resolvesToString$1(source) && !resolvesToString$1(translation)) {
    return false;
  }

  if (source.attrs || translation.attrs) {
    return areAttrsEqual$1(source.attrs, translation.attrs);
  }

  return true;
}

var View = (function () {
  function View(htmloptimizer, fetchResource) {
    _classCallCheck(this, View);

    this.htmloptimizer = htmloptimizer;
    this.doc = htmloptimizer.document;

    this.isEnabled = this.doc.querySelector('link[rel="localization"]');

    this.isLegacy = !this.doc.querySelector('script[src*="l20n"]');

    var EnvClass = this.isLegacy ? LegacyEnv : Env;
    this.env = new EnvClass(htmloptimizer.config.GAIA_DEFAULT_LOCALE, fetchResource);
    this.ctx = this.env.createContext(getResourceLinks(this.doc.head));

    this.env.addEventListener('*', amendError.bind(this));

    this.stopBuildError = null;
    var log = logError.bind(this);
    var stop = stopBuild.bind(this);

    this.env.addEventListener('parseerror', stop);
    this.env.addEventListener('duplicateerror', stop);
    this.env.addEventListener('notfounderror', stop);

    this.env.addEventListener('deprecatewarning', log);

    if (htmloptimizer.config.LOCALE_BASEDIR !== '') {
      this.env.addEventListener('fetcherror', log);
      this.env.addEventListener('parseerror', log);
      this.env.addEventListener('duplicateerror', log);
    }
  }

  View.prototype._observe = function _observe() {};

  View.prototype._disconnect = function _disconnect() {};

  View.prototype._resolveEntities = function _resolveEntities(langs, keys) {
    return this.ctx.resolveEntities(langs, keys);
  };

  View.prototype.translateDocument = function translateDocument(code) {
    var _this10 = this;

    var dir = getDirection(code);
    var langs = [{ code: code, src: 'app' }];
    var setDocLang = function () {
      _this10.doc.documentElement.lang = code;
      _this10.doc.documentElement.dir = dir;
    };
    return this.ctx.fetch(langs).then(function (langs) {
      return translateFragment(_this10, langs, _this10.doc.documentElement);
    }).then(setDocLang);
  };

  View.prototype.serializeResources = function serializeResources(code) {
    var _this11 = this;

    var lang = {
      code: code,
      src: code in pseudo$1 ? 'pseudo' : 'app'
    };
    return fetchContext(this.ctx, lang).then(function () {
      var _ref7 = _this11.isLegacy ? serializeLegacyContext(_this11.ctx, lang) : serializeContext(_this11.ctx, lang);

      var errors = _ref7[0];
      var entries = _ref7[1];

      if (errors.length) {
        var notFoundErrors = errors.filter(function (err) {
          return err.message.indexOf('not found') > -1;
        }).map(function (err) {
          return err.id;
        });
        var malformedErrors = errors.filter(function (err) {
          return err.message.indexOf('malformed') > -1;
        }).map(function (err) {
          return err.id;
        });

        if (notFoundErrors.length) {
          _this11.htmloptimizer.dump('[l10n] [' + lang.code + ']: ' + notFoundErrors.length + ' missing compared to en-US: ' + notFoundErrors.join(', '));
        }
        if (malformedErrors.length) {
          _this11.htmloptimizer.dump('[l10n] [' + lang.code + ']: ' + malformedErrors.length + ' malformed compared to en-US: ' + malformedErrors.join(', '));
        }
      }

      return entries;
    });
  };

  View.prototype.checkError = function checkError() {
    return {
      wait: false,
      error: this.stopBuildError
    };
  };

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

function fetchContext(ctx, lang) {
  var sourceLang = { code: 'en-US', src: 'app' };
  return Promise.all([sourceLang, lang].map(function (lang) {
    return ctx.fetch([lang]);
  }));
}

function getView(htmloptimizer) {
  var htmlFetch = function () {
    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    return fetchResource.apply(undefined, [htmloptimizer].concat(args));
  };
  return new View(htmloptimizer, htmlFetch);
}

exports.getView = getView;
exports.pseudo = pseudo$1;
exports.walkValue = walkValue$1;