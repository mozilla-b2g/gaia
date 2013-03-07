
/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function (root, factory) {
  if (typeof exports === 'object')
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('wbxml',factory);
  else
    root.WBXML = factory();
}(this, function() {
  'use strict';

  var exports = {};

  var Tokens = {
    SWITCH_PAGE: 0x00,
    END:         0x01,
    ENTITY:      0x02,
    STR_I:       0x03,
    LITERAL:     0x04,
    EXT_I_0:     0x40,
    EXT_I_1:     0x41,
    EXT_I_2:     0x42,
    PI:          0x43,
    LITERAL_C:   0x44,
    EXT_T_0:     0x80,
    EXT_T_1:     0x81,
    EXT_T_2:     0x82,
    STR_T:       0x83,
    LITERAL_A:   0x84,
    EXT_0:       0xC0,
    EXT_1:       0xC1,
    EXT_2:       0xC2,
    OPAQUE:      0xC3,
    LITERAL_AC:  0xC4,
  };

  /**
   * Create a constructor for a custom error type that works like a built-in
   * Error.
   *
   * @param name the string name of the error
   * @param parent (optional) a parent class for the error, defaults to Error
   * @param extraArgs an array of extra arguments that can be passed to the
   *        constructor of this error type
   * @return the constructor for this error
   */
  function makeError(name, parent, extraArgs) {
    function CustomError() {
      // Try to let users call this as CustomError(...) without the "new". This
      // is imperfect, and if you call this function directly and give it a
      // |this| that's a CustomError, things will break. Don't do it!
      var self = this instanceof CustomError ?
                 this : Object.create(CustomError.prototype);
      var tmp = Error();
      var offset = 1;

      self.stack = tmp.stack.substring(tmp.stack.indexOf('\n') + 1);
      self.message = arguments[0] || tmp.message;
      if (extraArgs) {
        offset += extraArgs.length;
        for (var i = 0; i < extraArgs.length; i++)
          self[extraArgs[i]] = arguments[i+1];
      }

      var m = /@(.+):(.+)/.exec(self.stack);
      self.fileName = arguments[offset] || (m && m[1]) || "";
      self.lineNumber = arguments[offset + 1] || (m && m[2]) || 0;

      return self;
    }
    CustomError.prototype = Object.create((parent || Error).prototype);
    CustomError.prototype.name = name;
    CustomError.prototype.constructor = CustomError;

    return CustomError;
  }

  var ParseError = makeError('WBXML.ParseError');
  exports.ParseError = ParseError;

  function StringTable(data, decoder) {
    this.strings = [];
    this.offsets = {};

    var start = 0;
    for (var i = 0; i < data.length; i++) {
      if (data[i] === 0) {
        this.offsets[start] = this.strings.length;
        this.strings.push(decoder.decode( data.subarray(start, i) ));
        start = i + 1;
      }
    }
  }

  StringTable.prototype = {
    get: function(offset) {
      if (offset in this.offsets)
        return this.strings[this.offsets[offset]];
      else {
        if (offset < 0)
          throw new ParseError('offset must be >= 0');

        var curr = 0;
        for (var i = 0; i < this.strings.length; i++) {
          // Add 1 to the current string's length here because we stripped a
          // null-terminator earlier.
          if (offset < curr + this.strings[i].length + 1)
            return this.strings[i].slice(offset - curr);
          curr += this.strings[i].length + 1;
        }
      }
      throw new ParseError('invalid offset');
    },
  };

  function CompileCodepages(codepages) {
    codepages.__nsnames__ = {};
    codepages.__tagnames__ = {};
    codepages.__attrdata__ = {};

    for (var iter in Iterator(codepages)) {
      var name = iter[0], page = iter[1];
      if (name.match(/^__/))
        continue;

      if (page.Tags) {
        var v = Iterator(page.Tags).next();
        codepages.__nsnames__[v[1] >> 8] = name;

        for (var iter2 in Iterator(page.Tags)) {
          var tag = iter2[0], value = iter2[1];
          codepages.__tagnames__[value] = tag;
        }
      }

      if (page.Attrs) {
        for (var iter3 in Iterator(page.Attrs)) {
          var attr = iter3[0], data = iter3[1];
          if (!('name' in data))
            data.name = attr;
          codepages.__attrdata__[data.value] = data;
          page.Attrs[attr] = data.value;
        }
      }
    }
  }
  exports.CompileCodepages = CompileCodepages;

  var mib2str = {
      3: 'US-ASCII',
      4: 'ISO-8859-1',
      5: 'ISO-8859-2',
      6: 'ISO-8859-3',
      7: 'ISO-8859-4',
      8: 'ISO-8859-5',
      9: 'ISO-8859-6',
     10: 'ISO-8859-7',
     11: 'ISO-8859-8',
     12: 'ISO-8859-9',
     13: 'ISO-8859-10',
    106: 'UTF-8',
  };

  // TODO: Really, we should build our own map here with synonyms for the
  // various encodings, but this is a step in the right direction.
  var str2mib = {};
  for (var iter in Iterator(mib2str)) {
    str2mib[iter[1]] = iter[0];
  }

  function Element(ownerDocument, type, tag) {
    this.ownerDocument = ownerDocument;
    this.type = type;
    this._attrs = {};

    if (typeof tag === 'string') {
      var pieces = tag.split(':');
      if (pieces.length === 1) {
        this.localTagName = pieces[0];
      } else {
        this.namespaceName = pieces[0];
        this.localTagName = pieces[1];
      }
    }
    else {
      this.tag = tag;
      Object.defineProperties(this, {
        'namespace':     { get: function() { return this.tag >> 8; } },
        'localTag':      { get: function() { return this.tag & 0xff; } },
        'namespaceName': { get: function() {
          return this.ownerDocument._codepages.__nsnames__[this.namespace];
        } },
        'localTagName':  { get: function() {
          return this.ownerDocument._codepages.__tagnames__[this.tag];
        } },
      });
    }
  }
  exports.Element = Element;
  Element.prototype = {
    get tagName() {
      var ns = this.namespaceName;
      ns = ns ? ns + ':' : '';
      return ns + this.localTagName;
    },

    getAttributes: function() {
      var attributes = [];
      for (var iter in Iterator(this._attrs)) {
        var name = iter[0], pieces = iter[1];
        var data = name.split(':');
        attributes.push({ name: name, namespace: data[0], localName: data[1],
                          value: this._getAttribute(pieces) });
      }
      return attributes;
    },

    getAttribute: function(attr) {
      if (typeof attr === 'number')
        attr = this.ownerDocument._codepages.__attrdata__[attr].name;
      else if (!(attr in this._attrs) && this.namespace !== null &&
               attr.indexOf(':') === -1)
        attr = this.namespaceName + ':' + attr;
      return this._getAttribute(this._attrs[attr]);
    },

    _getAttribute: function(pieces) {
      var strValue = '';
      var array = [];

      for (var iter in Iterator(pieces)) {
        var hunk = iter[1];
        if (hunk instanceof Extension) {
          if (strValue) {
            array.push(strValue);
            strValue = '';
          }
          array.push(hunk);
        }
        else if (typeof hunk === 'number') {
          strValue += this.ownerDocument._codepages.__attrdata__[hunk].data ||
                      '';
        }
        else {
          strValue += hunk;
        }
      }
      if (strValue)
        array.push(strValue);

      return array.length === 1 ? array[0] : array;
    },

    _addAttribute: function(attr) {
      if (typeof attr === 'string') {
        if (attr in this._attrs)
          throw new ParseError('attribute '+attr+' is repeated');
        return this._attrs[attr] = [];
      }
      else {
        var namespace = attr >> 8;
        var localAttr = attr & 0xff;

        var localName = this.ownerDocument._codepages.__attrdata__[localAttr]
                            .name;
        var nsName = this.ownerDocument._codepages.__nsnames__[namespace];
        var name = nsName + ':' + localName;

        if (name in this._attrs)
          throw new ParseError('attribute '+name+' is repeated');
        return this._attrs[name] = [attr];
      }
    },
  };

  function EndTag(ownerDocument) {
    this.ownerDocument = ownerDocument;
  }
  exports.EndTag = EndTag;
  EndTag.prototype = {
    get type() { return 'ETAG'; },
  };

  function Text(ownerDocument, textContent) {
    this.ownerDocument = ownerDocument;
    this.textContent = textContent;
  }
  exports.Text = Text;
  Text.prototype = {
    get type() { return 'TEXT'; },
  };

  function Extension(ownerDocument, subtype, index, value) {
    this.ownerDocument = ownerDocument;
    this.subtype = subtype;
    this.index = index;
    this.value = value;
  }
  exports.Extension = Extension;
  Extension.prototype = {
    get type() { return 'EXT'; },
  };

  function ProcessingInstruction(ownerDocument) {
    this.ownerDocument = ownerDocument;
  }
  exports.ProcessingInstruction = ProcessingInstruction;
  ProcessingInstruction.prototype = {
    get type() { return 'PI'; },

    get target() {
      if (typeof this.targetID === 'string')
        return this.targetID;
      else
        return this.ownerDocument._codepages.__attrdata__[this.targetID].name;
    },

    _setTarget: function(target) {
      this.targetID = target;
      if (typeof target === 'string')
        return this._data = [];
      else
        return this._data = [target];
    },

    // XXX: this seems impolite...
    _getAttribute: Element.prototype._getAttribute,

    get data() { return this._getAttribute(this._data); },
  };

  function Opaque(ownerDocument, data) {
    this.ownerDocument = ownerDocument;
    this.data = data;
  }
  exports.Opaque = Opaque;
  Opaque.prototype = {
    get type() { return 'OPAQUE'; },
  };

  function Reader(data, codepages) {
    this._data = data instanceof Writer ? data.bytes : data;
    this._codepages = codepages;
    this.rewind();
  }
  exports.Reader = Reader;
  Reader.prototype = {
    _get_uint8: function() {
      if (this._index === this._data.length)
        throw StopIteration;
      return this._data[this._index++];
    },

    _get_mb_uint32: function() {
      var b;
      var result = 0;
      do {
        b = this._get_uint8();
        result = result*128 + (b & 0x7f);
      } while(b & 0x80);
      return result;
    },

    _get_slice: function(length) {
      var start = this._index;
      this._index += length;
      return this._data.subarray(start, this._index);
    },

    _get_c_string: function() {
      var start = this._index;
      while (this._get_uint8());
      return this._data.subarray(start, this._index - 1);
    },

    rewind: function() {
      // Although in theory we could cache this.document since we no longer use
      // iterators, there is clearly some kind of rep exposure that goes awry
      // for us, so I'm having us re-do our work.  This does not matter in the
      // normal use-case, just for debugging and just for our test server, which
      // both rely on rewind().

      this._index = 0;

      var v = this._get_uint8();
      this.version = ((v & 0xf0) + 1).toString() + '.' + (v & 0x0f).toString();
      this.pid = this._get_mb_uint32();
      this.charset = mib2str[this._get_mb_uint32()] || 'unknown';
      this._decoder = TextDecoder(this.charset);

      var tbl_len = this._get_mb_uint32();
      this.strings = new StringTable(this._get_slice(tbl_len), this._decoder);

      this.document = this._getDocument();
    },

    // start        = version publicid charset strtbl body
    // strtbl       = length *byte
    // body         = *pi element *pi
    // element      = stag [ 1*attribute END ] [ *content END ]
    //
    // content      = element | string | extension | entity | pi | opaque
    //
    // stag         = TAG | ( LITERAL index )
    // attribute    = attrStart *attrValue
    // attrStart    = ATTRSTART | ( LITERAL index )
    // attrValue    = ATTRVALUE | string | extension | entity
    //
    // extension    = ( EXT_I termstr ) | ( EXT_T index ) | EXT
    //
    // string       = inline | tableref
    // inline       = STR_I termstr
    // tableref     = STR_T index
    //
    // entity       = ENTITY entcode
    // entcode      = mb_u_int32            // UCS-4 character code
    //
    // pi           = PI attrStart *attrValue END
    //
    // opaque       = OPAQUE length *byte
    //
    // version      = u_int8 containing WBXML version number
    // publicid     = mb_u_int32 | ( zero index )
    // charset      = mb_u_int32
    // termstr      = charset-dependent string with termination
    // index        = mb_u_int32            // integer index into string table.
    // length       = mb_u_int32            // integer length.
    // zero         = u_int8                // containing the value zero (0).
    _getDocument: function() {
      // Parser states
      var States = {
        BODY: 0,
        ATTRIBUTES: 1,
        ATTRIBUTE_PI: 2,
      };

      var state = States.BODY;
      var currentNode;
      var currentAttr;
      var codepage = 0;
      var depth = 0;
      var foundRoot = false;
      var doc = [];

      var appendString = (function(s) {
        if (state === States.BODY) {
          if (!currentNode)
            currentNode = new Text(this, s);
          else
            currentNode.textContent += s;
        }
        else { // if (state === States.ATTRIBUTES || state === States.ATTRIBUTE_PI)
          currentAttr.push(s);
        }
        // We can assume that we're in a valid state, so don't bother checking
        // here.
      }).bind(this);

      try { while (true) {
        var tok = this._get_uint8();

        if (tok === Tokens.SWITCH_PAGE) {
          codepage = this._get_uint8();
          if (!(codepage in this._codepages.__nsnames__))
            throw new ParseError('unknown codepage '+codepage);
        }
        else if (tok === Tokens.END) {
          if (state === States.BODY && depth-- > 0) {
            if (currentNode) {
              doc.push(currentNode);
              currentNode = null;
            }
            doc.push(new EndTag(this));
          }
          else if (state === States.ATTRIBUTES || state === States.ATTRIBUTE_PI) {
            state = States.BODY;

            doc.push(currentNode);
            currentNode = null;
            currentAttr = null;
          }
          else {
            throw new ParseError('unexpected END token');
          }
        }
        else if (tok === Tokens.ENTITY) {
          if (state === States.BODY && depth === 0)
            throw new ParseError('unexpected ENTITY token');
          var e = this._get_mb_uint32();
          appendString('&#'+e+';');
        }
        else if (tok === Tokens.STR_I) {
          if (state === States.BODY && depth === 0)
            throw new ParseError('unexpected STR_I token');
          appendString(this._decoder.decode(this._get_c_string()));
        }
        else if (tok === Tokens.PI) {
          if (state !== States.BODY)
            throw new ParseError('unexpected PI token');
          state = States.ATTRIBUTE_PI;

          if (currentNode)
            doc.push(currentNode);
          currentNode = new ProcessingInstruction(this);
        }
        else if (tok === Tokens.STR_T) {
          if (state === States.BODY && depth === 0)
            throw new ParseError('unexpected STR_T token');
          var r = this._get_mb_uint32();
          appendString(this.strings.get(r));
        }
        else if (tok === Tokens.OPAQUE) {
          if (state !== States.BODY)
            throw new ParseError('unexpected OPAQUE token');
          var len = this._get_mb_uint32();
          var data = this._get_slice(len);

          if (currentNode) {
            doc.push(currentNode);
            currentNode = null;
          }
          doc.push(new Opaque(this, data));
        }
        else if (((tok & 0x40) || (tok & 0x80)) && (tok & 0x3f) < 3) {
          var hi = tok & 0xc0;
          var lo = tok & 0x3f;
          var subtype;
          var value;

          if (hi === Tokens.EXT_I_0) {
            subtype = 'string';
            value = this._decoder.decode(this._get_c_string());
          }
          else if (hi === Tokens.EXT_T_0) {
            subtype = 'integer';
            value = this._get_mb_uint32();
          }
          else { // if (hi === Tokens.EXT_0)
            subtype = 'byte';
            value = null;
          }

          var ext = new Extension(this, subtype, lo, value);
          if (state === States.BODY) {
            if (currentNode) {
              doc.push(currentNode);
              currentNode = null;
            }
            doc.push(ext);
          }
          else { // if (state === States.ATTRIBUTES || state === States.ATTRIBUTE_PI)
            currentAttr.push(ext);
          }
        }
        else if (state === States.BODY) {
          if (depth === 0) {
            if (foundRoot)
              throw new ParseError('multiple root nodes found');
            foundRoot = true;
          }

          var tag = (codepage << 8) + (tok & 0x3f);
          if ((tok & 0x3f) === Tokens.LITERAL) {
            var r = this._get_mb_uint32();
            tag = this.strings.get(r);
          }

          if (currentNode)
            doc.push(currentNode);
          currentNode = new Element(this, (tok & 0x40) ? 'STAG' : 'TAG', tag);
          if (tok & 0x40)
            depth++;

          if (tok & 0x80) {
            state = States.ATTRIBUTES;
          }
          else {
            state = States.BODY;

            doc.push(currentNode);
            currentNode = null;
          }
        }
        else { // if (state === States.ATTRIBUTES || state === States.ATTRIBUTE_PI)
          var attr = (codepage << 8) + tok;
          if (!(tok & 0x80)) {
            if (tok === Tokens.LITERAL) {
              var r = this._get_mb_uint32();
              attr = this.strings.get(r);
            }
            if (state === States.ATTRIBUTE_PI) {
              if (currentAttr)
                throw new ParseError('unexpected attribute in PI');
              currentAttr = currentNode._setTarget(attr);
            }
            else {
              currentAttr = currentNode._addAttribute(attr);
            }
          }
          else {
            currentAttr.push(attr);
          }
        }
      } } catch (e) {
        if (!(e instanceof StopIteration))
          throw e;
      }
      return doc;
    },

    dump: function(indentation, header) {
      var result = '';

      if (indentation === undefined)
        indentation = 2;
      var indent = function(level) {
        return new Array(level*indentation + 1).join(' ');
      };
      var tagstack = [];

      if (header) {
        result += 'Version: ' + this.version + '\n';
        result += 'Public ID: ' + this.pid + '\n';
        result += 'Charset: ' + this.charset + '\n';
        result += 'String table:\n  "' +
                  this.strings.strings.join('"\n  "') + '"\n\n';
      }

      var newline = false;
      var doc = this.document;
      var doclen = doc.length;
      for (var iNode = 0; iNode < doclen; iNode++) {
        var node = doc[iNode];
        if (node.type === 'TAG' || node.type === 'STAG') {
          result += indent(tagstack.length) + '<' + node.tagName;

          var attributes = node.getAttributes();
          for (var i = 0; i < attributes.length; i++) {
            var attr = attributes[i];
            result += ' ' + attr.name + '="' + attr.value + '"';
          }

          if (node.type === 'STAG') {
            tagstack.push(node.tagName);
            result += '>\n';
          }
          else
            result += '/>\n';
        }
        else if (node.type === 'ETAG') {
          var tag = tagstack.pop();
          result += indent(tagstack.length) + '</' + tag + '>\n';
        }
        else if (node.type === 'TEXT') {
          result += indent(tagstack.length) + node.textContent + '\n';
        }
        else if (node.type === 'PI') {
          result += indent(tagstack.length) + '<?' + node.target;
          if (node.data)
            result += ' ' + node.data;
          result += '?>\n';
        }
        else if (node.type === 'OPAQUE') {
          result += indent(tagstack.length) + '<![CDATA[' + node.data + ']]>\n';
        }
        else {
          throw new Error('Unknown node type "' + node.type + '"');
        }
      }

      return result;
    },
  };

  function Writer(version, pid, charset, strings) {
    this._rawbuf = new ArrayBuffer(1024);
    this._buffer = new Uint8Array(this._rawbuf);
    this._pos = 0;
    this._codepage = 0;
    this._tagStack = [];

    var infos = version.split('.').map(function(x) {
      return parseInt(x);
    });
    var major = infos[0], minor = infos[1];
    var v = ((major - 1) << 4) + minor;

    var charsetNum = charset;
    if (typeof charset === 'string') {
      charsetNum = str2mib[charset];
      if (charsetNum === undefined)
        throw new Error('unknown charset '+charset);
    }
    var encoder = this._encoder = TextEncoder(charset);

    this._write(v);
    this._write(pid);
    this._write(charsetNum);
    if (strings) {
      var bytes = strings.map(function(s) { return encoder.encode(s); });
      var len = bytes.reduce(function(x, y) { return x + y.length + 1; }, 0);
      this._write_mb_uint32(len);
      for (var iter in Iterator(bytes)) {
        var b = iter[1];
        this._write_bytes(b);
        this._write(0x00);
      }
    }
    else {
      this._write(0x00);
    }
  }
  exports.Writer = Writer;

  Writer.Attribute = function(name, value) {
    this.isValue = typeof name === 'number' && (name & 0x80);
    if (this.isValue && value !== undefined)
      throw new Error("Can't specify a value for attribute value constants");
    this.name = name;
    this.value = value;
  };

  Writer.StringTableRef = function(index) {
    this.index = index;
  };

  Writer.Entity = function(code) {
    this.code = code;
  };

  Writer.Extension = function(subtype, index, data) {
    var validTypes = {
      'string':  { value:     Tokens.EXT_I_0,
                   validator: function(data) {
                     return typeof data === 'string';
                   } },
      'integer': { value:     Tokens.EXT_T_0,
                   validator: function(data) {
                     return typeof data === 'number';
                   } },
      'byte':    { value:     Tokens.EXT_0,
                   validator: function(data) {
                     return data === null || data === undefined;
                   } },
    };

    var info = validTypes[subtype];
    if (!info)
      throw new Error('Invalid WBXML Extension type');
    if (!info.validator(data))
      throw new Error('Data for WBXML Extension does not match type');
    if (index !== 0 && index !== 1 && index !== 2)
      throw new Error('Invalid WBXML Extension index');

    this.subtype = info.value;
    this.index = index;
    this.data = data;
  };

  Writer.a = function(name, val) { return new Writer.Attribute(name, val); };
  Writer.str_t = function(index) { return new Writer.StringTableRef(index); };
  Writer.ent = function(code) { return new Writer.Entity(code) };
  Writer.ext = function(subtype, index, data) { return new Writer.Extension(
    subtype, index, data); };

  Writer.prototype = {
    _write: function(tok) {
      // Expand the buffer by a factor of two if we ran out of space.
      if (this._pos === this._buffer.length - 1) {
        this._rawbuf = new ArrayBuffer(this._rawbuf.byteLength * 2);
        var buffer = new Uint8Array(this._rawbuf);

        for (var i = 0; i < this._buffer.length; i++)
          buffer[i] = this._buffer[i];

        this._buffer = buffer;
      }

      this._buffer[this._pos++] = tok;
    },

    _write_mb_uint32: function(value) {
      var bytes = [];
      bytes.push(value % 0x80);
      while (value >= 0x80) {
        value >>= 7;
        bytes.push(0x80 + (value % 0x80));
      }

      for (var i = bytes.length - 1; i >= 0; i--)
        this._write(bytes[i]);
    },

    _write_bytes: function(bytes) {
      for (var i = 0; i < bytes.length; i++)
        this._write(bytes[i]);
    },

    _write_str: function(str) {
      this._write_bytes(this._encoder.encode(str));
    },

    _setCodepage: function(codepage) {
      if (this._codepage !== codepage) {
        this._write(Tokens.SWITCH_PAGE);
        this._write(codepage);
        this._codepage = codepage;
      }
    },

    _writeTag: function(tag, stag, attrs) {
      if (tag === undefined)
        throw new Error('unknown tag');

      var flags = 0x00;
      if (stag)
        flags += 0x40;
      if (attrs.length)
        flags += 0x80;

      if (tag instanceof Writer.StringTableRef) {
        this._write(Tokens.LITERAL + flags);
        this._write_mb_uint32(tag.index);
      }
      else {
        this._setCodepage(tag >> 8);
        this._write((tag & 0xff) + flags);
      }

      if (attrs.length) {
        for (var iter in Iterator(attrs)) {
          var attr = iter[1];
          this._writeAttr(attr);
        }
        this._write(Tokens.END);
      }
    },

    _writeAttr: function(attr) {
      if (!(attr instanceof Writer.Attribute))
        throw new Error('Expected an Attribute object');
      if (attr.isValue)
        throw new Error("Can't use attribute value constants here");

      if (attr.name instanceof Writer.StringTableRef) {
        this._write(Tokens.LITERAL);
        this._write(attr.name.index);
      }
      else {
        this._setCodepage(attr.name >> 8);
        this._write(attr.name & 0xff);
      }
      this._writeText(attr.value, true);
    },

    _writeText: function(value, inAttr) {
      if (Array.isArray(value)) {
        for (var iter in Iterator(value)) {
          var piece = iter[1];
          this._writeText(piece, inAttr);
        }
      }
      else if (value instanceof Writer.StringTableRef) {
        this._write(Tokens.STR_T);
        this._write_mb_uint32(value.index);
      }
      else if (value instanceof Writer.Entity) {
        this._write(Tokens.ENTITY);
        this._write_mb_uint32(value.code);
      }
      else if (value instanceof Writer.Extension) {
        this._write(value.subtype + value.index);
        if (value.subtype === Tokens.EXT_I_0) {
          this._write_str(value.data);
          this._write(0x00);
        }
        else if (value.subtype === Tokens.EXT_T_0) {
          this._write_mb_uint32(value.data);
        }
      }
      else if (value instanceof Writer.Attribute) {
        if (!value.isValue)
          throw new Error('Unexpected Attribute object');
        if (!inAttr)
          throw new Error("Can't use attribute value constants outside of " +
                          "attributes");
        this._setCodepage(value.name >> 8);
        this._write(value.name & 0xff);
      }
      else if (value !== null && value !== undefined) {
        this._write(Tokens.STR_I);
        this._write_str(value.toString());
        this._write(0x00);
      }
    },

    tag: function(tag) {
      var tail = arguments.length > 1 ? arguments[arguments.length - 1] : null;
      if (tail === null || tail instanceof Writer.Attribute) {
        var rest = Array.prototype.slice.call(arguments, 1);
        this._writeTag(tag, false, rest);
        return this;
      }
      else {
        var head = Array.prototype.slice.call(arguments, 0, -1);
        return this.stag.apply(this, head)
                     .text(tail)
                   .etag();
      }
    },

    stag: function(tag) {
      var rest = Array.prototype.slice.call(arguments, 1);
      this._writeTag(tag, true, rest);
      this._tagStack.push(tag);
      return this;
    },

    etag: function(tag) {
      if (this._tagStack.length === 0)
        throw new Error('Spurious etag() call!');
      var expectedTag = this._tagStack.pop();
      if (tag !== undefined && tag !== expectedTag)
        throw new Error('Closed the wrong tag');

      this._write(Tokens.END);
      return this;
    },

    text: function(value) {
      this._writeText(value);
      return this;
    },

    pi: function(target, data) {
      this._write(Tokens.PI);
      this._writeAttr(Writer.a(target, data));
      this._write(Tokens.END);
      return this;
    },

    ext: function(subtype, index, data) {
      return this.text(Writer.ext(subtype, index, data));
    },

    opaque: function(data) {
      this._write(Tokens.OPAQUE);
      this._write_mb_uint32(data.length);
      if (typeof data === 'string') {
        this._write_str(data);
      }
      else {
        for (var i = 0; i < data.length; i++)
          this._write(data[i]);
      }
      return this;
    },

    get buffer() { return this._rawbuf.slice(0, this._pos); },
    get bytes() { return new Uint8Array(this._rawbuf, 0, this._pos); },
  };

  function EventParser() {
    this.listeners = [];
    this.onerror = function(e) { throw e; };
  }
  exports.EventParser = EventParser;
  EventParser.prototype = {
    addEventListener: function(path, callback) {
      this.listeners.push({path: path, callback: callback});
    },

    _pathMatches: function(a, b) {
      return a.length === b.length && a.every(function(val, i) {
        if (b[i] === '*')
          return true;
        else if (Array.isArray(b[i])) {
          return b[i].indexOf(val) !== -1;
        }
        else
          return val === b[i];
      });
    },

    run: function(reader) {
      var fullPath = [];
      var recPath = [];
      var recording = 0;

      var doc = reader.document;
      var doclen = doc.length;
      for (var iNode = 0; iNode < doclen; iNode++) {
        var node = doc[iNode];
        if (node.type === 'TAG') {
          fullPath.push(node.tag);
          for (var iter in Iterator(this.listeners)) {
            var listener = iter[1];
            if (this._pathMatches(fullPath, listener.path)) {
              node.children = [];
              try {
                listener.callback(node);
              }
              catch (e) {
                if (this.onerror)
                  this.onerror(e);
              }
            }
          }

          fullPath.pop();
        }
        else if (node.type === 'STAG') {
          fullPath.push(node.tag);

          for (var iter in Iterator(this.listeners)) {
            var listener = iter[1];
            if (this._pathMatches(fullPath, listener.path)) {
              recording++;
            }
          }
        }
        else if (node.type === 'ETAG') {
          for (var iter in Iterator(this.listeners)) {
            var listener = iter[1];
            if (this._pathMatches(fullPath, listener.path)) {
              recording--;
              try {
                listener.callback(recPath[recPath.length-1]);
              }
              catch (e) {
                if (this.onerror)
                  this.onerror(e);
              }
            }
          }

          fullPath.pop();
        }

        if (recording) {
          if (node.type === 'STAG') {
            node.type = 'TAG';
            node.children = [];
            if (recPath.length)
              recPath[recPath.length-1].children.push(node);
            recPath.push(node);
          }
          else if (node.type === 'ETAG') {
            recPath.pop();
          }
          else {
            node.children = [];
            recPath[recPath.length-1].children.push(node);
          }
        }
      }
    },
  };

  return exports;
}));

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function (root, factory) {
  if (typeof exports === 'object')
    module.exports = factory(require('wbxml'));
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages',['wbxml'], factory);
  else
    root.ActiveSyncCodepages = factory(WBXML);
}(this, function(WBXML) {
  'use strict';

  var codepages = {
    Common: {
      Enums: {
        Status: {
          InvalidContent:                                  '101',
          InvalidWBXML:                                    '102',
          InvalidXML:                                      '103',
          InvalidDateTime:                                 '104',
          InvalidCombinationOfIDs:                         '105',
          InvalidIDs:                                      '106',
          InvalidMIME:                                     '107',
          DeviceIdMissingOrInvalid:                        '108',
          DeviceTypeMissingOrInvalid:                      '109',
          ServerError:                                     '110',
          ServerErrorRetryLater:                           '111',
          ActiveDirectoryAccessDenied:                     '112',
          MailboxQuotaExceeded:                            '113',
          MailboxServerOffline:                            '114',
          SendQuotaExceeded:                               '115',
          MessageRecipientUnresolved:                      '116',
          MessageReplyNotAllowed:                          '117',
          MessagePreviouslySent:                           '118',
          MessageHasNoRecipient:                           '119',
          MailSubmissionFailed:                            '120',
          MessageReplyFailed:                              '121',
          AttachmentIsTooLarge:                            '122',
          UserHasNoMailbox:                                '123',
          UserCannotBeAnonymous:                           '124',
          UserPrincipalCouldNotBeFound:                    '125',
          UserDisabledForSync:                             '126',
          UserOnNewMailboxCannotSync:                      '127',
          UserOnLegacyMailboxCannotSync:                   '128',
          DeviceIsBlockedForThisUser:                      '129',
          AccessDenied:                                    '130',
          AccountDisabled:                                 '131',
          SyncStateNotFound:                               '132',
          SyncStateLocked:                                 '133',
          SyncStateCorrupt:                                '134',
          SyncStateAlreadyExists:                          '135',
          SyncStateVersionInvalid:                         '136',
          CommandNotSupported:                             '137',
          VersionNotSupported:                             '138',
          DeviceNotFullyProvisionable:                     '139',
          RemoteWipeRequested:                             '140',
          LegacyDeviceOnStrictPolicy:                      '141',
          DeviceNotProvisioned:                            '142',
          PolicyRefresh:                                   '143',
          InvalidPolicyKey:                                '144',
          ExternallyManagedDevicesNotAllowed:              '145',
          NoRecurrenceInCalendar:                          '146',
          UnexpectedItemClass:                             '147',
          RemoteServerHasNoSSL:                            '148',
          InvalidStoredRequest:                            '149',
          ItemNotFound:                                    '150',
          TooManyFolders:                                  '151',
          NoFoldersFounds:                                 '152',
          ItemsLostAfterMove:                              '153',
          FailureInMoveOperation:                          '154',
          MoveCommandDisallowedForNonPersistentMoveAction: '155',
          MoveCommandInvalidDestinationFolder:             '156',
          AvailabilityTooManyRecipients:                   '160',
          AvailabilityDLLimitReached:                      '161',
          AvailabilityTransientFailure:                    '162',
          AvailabilityFailure:                             '163',
          BodyPartPreferenceTypeNotSupported:              '164',
          DeviceInformationRequired:                       '165',
          InvalidAccountId:                                '166',
          AccountSendDisabled:                             '167',
          IRM_FeatureDisabled:                             '168',
          IRM_TransientError:                              '169',
          IRM_PermanentError:                              '170',
          IRM_InvalidTemplateID:                           '171',
          IRM_OperationNotPermitted:                       '172',
          NoPicture:                                       '173',
          PictureTooLarge:                                 '174',
          PictureLimitReached:                             '175',
          BodyPart_ConversationTooLarge:                   '176',
          MaximumDevicesReached:                           '177',
        },
      },
    },

    AirSync: {
      Tags: {
        Sync:              0x0005,
        Responses:         0x0006,
        Add:               0x0007,
        Change:            0x0008,
        Delete:            0x0009,
        Fetch:             0x000A,
        SyncKey:           0x000B,
        ClientId:          0x000C,
        ServerId:          0x000D,
        Status:            0x000E,
        Collection:        0x000F,
        Class:             0x0010,
        Version:           0x0011,
        CollectionId:      0x0012,
        GetChanges:        0x0013,
        MoreAvailable:     0x0014,
        WindowSize:        0x0015,
        Commands:          0x0016,
        Options:           0x0017,
        FilterType:        0x0018,
        Truncation:        0x0019,
        RtfTruncation:     0x001A,
        Conflict:          0x001B,
        Collections:       0x001C,
        ApplicationData:   0x001D,
        DeletesAsMoves:    0x001E,
        NotifyGUID:        0x001F,
        Supported:         0x0020,
        SoftDelete:        0x0021,
        MIMESupport:       0x0022,
        MIMETruncation:    0x0023,
        Wait:              0x0024,
        Limit:             0x0025,
        Partial:           0x0026,
        ConversationMode:  0x0027,
        MaxItems:          0x0028,
        HeartbeatInterval: 0x0029,
      },

      Enums: {
        Status: {
          Success:            '1',
          InvalidSyncKey:     '3',
          ProtocolError:      '4',
          ServerError:        '5',
          ConversionError:    '6',
          MatchingConflict:   '7',
          ObjectNotFound:     '8',
          OutOfSpace:         '9',
          HierarchyChanged:  '12',
          IncompleteRequest: '13',
          InvalidInterval:   '14',
          InvalidRequest:    '15',
          Retry:             '16',
        },
        FilterType: {
          NoFilter:        '0',
          OneDayBack:      '1',
          ThreeDaysBack:   '2',
          OneWeekBack:     '3',
          TwoWeeksBack:    '4',
          OneMonthBack:    '5',
          ThreeMonthsBack: '6',
          SixMonthsBack:   '7',
          IncompleteTasks: '8',
        },
        Conflict: {
          ClientReplacesServer: '0',
          ServerReplacesClient: '1',
        },
        MIMESupport: {
          Never:     '0',
          SMIMEOnly: '1',
          Always:    '2',
        },
        MIMETruncation: {
          TruncateAll:  '0',
          Truncate4K:   '1',
          Truncate5K:   '2',
          Truncate7K:   '3',
          Truncate10K:  '4',
          Truncate20K:  '5',
          Truncate50K:  '6',
          Truncate100K: '7',
          NoTruncate:   '8',
        },
      },
    },

    Contacts: {
      Tags: {
        Anniversary:               0x0105,
        AssistantName:             0x0106,
        AssistantPhoneNumber:      0x0107,
        Birthday:                  0x0108,
        Body:                      0x0109,
        BodySize:                  0x010A,
        BodyTruncated:             0x010B,
        Business2PhoneNumber:      0x010C,
        BusinessAddressCity:       0x010D,
        BusinessAddressCountry:    0x010E,
        BusinessAddressPostalCode: 0x010F,
        BusinessAddressState:      0x0110,
        BusinessAddressStreet:     0x0111,
        BusinessFaxNumber:         0x0112,
        BusinessPhoneNumber:       0x0113,
        CarPhoneNumber:            0x0114,
        Categories:                0x0115,
        Category:                  0x0116,
        Children:                  0x0117,
        Child:                     0x0118,
        CompanyName:               0x0119,
        Department:                0x011A,
        Email1Address:             0x011B,
        Email2Address:             0x011C,
        Email3Address:             0x011D,
        FileAs:                    0x011E,
        FirstName:                 0x011F,
        Home2PhoneNumber:          0x0120,
        HomeAddressCity:           0x0121,
        HomeAddressCountry:        0x0122,
        HomeAddressPostalCode:     0x0123,
        HomeAddressState:          0x0124,
        HomeAddressStreet:         0x0125,
        HomeFaxNumber:             0x0126,
        HomePhoneNumber:           0x0127,
        JobTitle:                  0x0128,
        LastName:                  0x0129,
        MiddleName:                0x012A,
        MobilePhoneNumber:         0x012B,
        OfficeLocation:            0x012C,
        OtherAddressCity:          0x012D,
        OtherAddressCountry:       0x012E,
        OtherAddressPostalCode:    0x012F,
        OtherAddressState:         0x0130,
        OtherAddressStreet:        0x0131,
        PagerNumber:               0x0132,
        RadioPhoneNumber:          0x0133,
        Spouse:                    0x0134,
        Suffix:                    0x0135,
        Title:                     0x0136,
        WebPage:                   0x0137,
        YomiCompanyName:           0x0138,
        YomiFirstName:             0x0139,
        YomiLastName:              0x013A,
        CompressedRTF:             0x013B,
        Picture:                   0x013C,
        Alias:                     0x013D,
        WeightedRank:              0x013E,
      },
    },

    Email: {
      Tags: {
        Attachment:              0x0205,
        Attachments:             0x0206,
        AttName:                 0x0207,
        AttSize:                 0x0208,
        Att0Id:                  0x0209,
        AttMethod:               0x020A,
        AttRemoved:              0x020B,
        Body:                    0x020C,
        BodySize:                0x020D,
        BodyTruncated:           0x020E,
        DateReceived:            0x020F,
        DisplayName:             0x0210,
        DisplayTo:               0x0211,
        Importance:              0x0212,
        MessageClass:            0x0213,
        Subject:                 0x0214,
        Read:                    0x0215,
        To:                      0x0216,
        Cc:                      0x0217,
        From:                    0x0218,
        ReplyTo:                 0x0219,
        AllDayEvent:             0x021A,
        Categories:              0x021B,
        Category:                0x021C,
        DTStamp:                 0x021D,
        EndTime:                 0x021E,
        InstanceType:            0x021F,
        BusyStatus:              0x0220,
        Location:                0x0221,
        MeetingRequest:          0x0222,
        Organizer:               0x0223,
        RecurrenceId:            0x0224,
        Reminder:                0x0225,
        ResponseRequested:       0x0226,
        Recurrences:             0x0227,
        Recurrence:              0x0228,
        Recurrence_Type:         0x0229,
        Recurrence_Until:        0x022A,
        Recurrence_Occurrences:  0x022B,
        Recurrence_Interval:     0x022C,
        Recurrence_DayOfWeek:    0x022D,
        Recurrence_DayOfMonth:   0x022E,
        Recurrence_WeekOfMonth:  0x022F,
        Recurrence_MonthOfYear:  0x0230,
        StartTime:               0x0231,
        Sensitivity:             0x0232,
        TimeZone:                0x0233,
        GlobalObjId:             0x0234,
        ThreadTopic:             0x0235,
        MIMEData:                0x0236,
        MIMETruncated:           0x0237,
        MIMESize:                0x0238,
        InternetCPID:            0x0239,
        Flag:                    0x023A,
        Status:                  0x023B,
        ContentClass:            0x023C,
        FlagType:                0x023D,
        CompleteTime:            0x023E,
        DisallowNewTimeProposal: 0x023F,
      },
      Enums: {
        Importance: {
          Low:    '0',
          Normal: '1',
          High:   '2',
        },
        InstanceType: {
          Single:             '0',
          RecurringMaster:    '1',
          RecurringInstance:  '2',
          RecurringException: '3',
        },
        BusyStatus: {
          Free:      '0',
          Tentative: '1',
          Busy:      '2',
          Oof:       '3',
        },
        Recurrence_Type: {
          Daily:             '0',
          Weekly:             '1',
          MonthlyNthDay:      '2',
          Monthly:            '3',
          YearlyNthDay:       '5',
          YearlyNthDayOfWeek: '6',
        },
        /* XXX: missing Recurrence_DayOfWeek */
        Sensitivity: {
          Normal:       '0',
          Personal:     '1',
          Private:      '2',
          Confidential: '3',
        },
        Status: {
          Cleared:  '0',
          Complete: '1',
          Active:   '2',
        },
      },
    },

    Calendar: {
      Tags: {
        TimeZone:                  0x0405,
        AllDayEvent:               0x0406,
        Attendees:                 0x0407,
        Attendee:                  0x0408,
        Email:                     0x0409,
        Name:                      0x040A,
        Body:                      0x040B,
        BodyTruncated:             0x040C,
        BusyStatus:                0x040D,
        Categories:                0x040E,
        Category:                  0x040F,
        CompressedRTF:             0x0410,
        DtStamp:                   0x0411,
        EndTime:                   0x0412,
        Exception:                 0x0413,
        Exceptions:                0x0414,
        Deleted:                   0x0415,
        ExceptionStartTime:        0x0416,
        Location:                  0x0417,
        MeetingStatus:             0x0418,
        OrganizerEmail:            0x0419,
        OrganizerName:             0x041A,
        Recurrence:                0x041B,
        Type:                      0x041C,
        Until:                     0x041D,
        Occurrences:               0x041E,
        Interval:                  0x041F,
        DayOfWeek:                 0x0420,
        DayOfMonth:                0x0421,
        WeekOfMonth:               0x0422,
        MonthOfYear:               0x0423,
        Reminder:                  0x0424,
        Sensitivity:               0x0425,
        Subject:                   0x0426,
        StartTime:                 0x0427,
        UID:                       0x0428,
        AttendeeStatus:            0x0429,
        AttendeeType:              0x042A,
        Attachment:                0x042B,
        Attachments:               0x042C,
        AttName:                   0x042D,
        AttSize:                   0x042E,
        AttOid:                    0x042F,
        AttMethod:                 0x0430,
        AttRemoved:                0x0431,
        DisplayName:               0x0432,
        DisallowNewTimeProposal:   0x0433,
        ResponseRequested:         0x0434,
        AppointmentReplyTime:      0x0435,
        ResponseType:              0x0436,
        CalendarType:              0x0437,
        IsLeapMonth:               0x0438,
        FirstDayOfWeek:            0x0439,
        OnlineMeetingConfLink:     0x043A,
        OnlineMeetingExternalLink: 0x043B,
      },
    },

    Move: {
      Tags: {
        MoveItems: 0x0505,
        Move:      0x0506,
        SrcMsgId:  0x0507,
        SrcFldId:  0x0508,
        DstFldId:  0x0509,
        Response:  0x050A,
        Status:    0x050B,
        DstMsgId:  0x050C,
      },
      Enums: {
        Status: {
          InvalidSourceID: '1',
          InvalidDestID:   '2',
          Success:         '3',
          SourceIsDest:    '4',
          MoveFailure:     '5',
          ItemLocked:      '7',
        },
      },
    },

    ItemEstimate: {
      Tags: {
        GetItemEstimate: 0x0605,
        Version:         0x0606,
        Collections:     0x0607,
        Collection:      0x0608,
        Class:           0x0609,
        CollectionId:    0x060A,
        DateTime:        0x060B,
        Estimate:        0x060C,
        Response:        0x060D,
        Status:          0x060E,
      },
      Enums: {
        Status: {
          Success:           '1',
          InvalidCollection: '2',
          NoSyncState:       '3',
          InvalidSyncKey:    '4',
        },
      },
    },

    FolderHierarchy: {
      Tags: {
        Folders:      0x0705,
        Folder:       0x0706,
        DisplayName:  0x0707,
        ServerId:     0x0708,
        ParentId:     0x0709,
        Type:         0x070A,
        Response:     0x070B,
        Status:       0x070C,
        ContentClass: 0x070D,
        Changes:      0x070E,
        Add:          0x070F,
        Delete:       0x0710,
        Update:       0x0711,
        SyncKey:      0x0712,
        FolderCreate: 0x0713,
        FolderDelete: 0x0714,
        FolderUpdate: 0x0715,
        FolderSync:   0x0716,
        Count:        0x0717,
      },
      Enums: {
        Type: {
          Generic:         '1',
          DefaultInbox:    '2',
          DefaultDrafts:   '3',
          DefaultDeleted:  '4',
          DefaultSent:     '5',
          DefaultOutbox:   '6',
          DefaultTasks:    '7',
          DefaultCalendar: '8',
          DefaultContacts: '9',
          DefaultNotes:   '10',
          DefaultJournal: '11',
          Mail:           '12',
          Calendar:       '13',
          Contacts:       '14',
          Tasks:          '15',
          Journal:        '16',
          Notes:          '17',
          Unknown:        '18',
          RecipientCache: '19',
        },
        Status: {
          Success:              '1',
          FolderExists:         '2',
          SystemFolder:         '3',
          FolderNotFound:       '4',
          ParentFolderNotFound: '5',
          ServerError:          '6',
          InvalidSyncKey:       '9',
          MalformedRequest:    '10',
          UnknownError:        '11',
          CodeUnknown:         '12',
        },
      },
    },

    MeetingResponse: {
      Tags: {
        CalendarId:      0x0805,
        CollectionId:    0x0806,
        MeetingResponse: 0x0807,
        RequestId:       0x0808,
        Request:         0x0809,
        Result:          0x080A,
        Status:          0x080B,
        UserResponse:    0x080C,
        InstanceId:      0x080E,
      },
      Enums: {
        Status: {
          Success:        '1',
          InvalidRequest: '2',
          MailboxError:   '3',
          ServerError:    '4',
        },
        UserResponse: {
          Accepted:  '1',
          Tentative: '2',
          Declined:  '3',
        },
      },
    },

    Tasks: {
      Tags: {
        Body:                   0x0905,
        BodySize:               0x0906,
        BodyTruncated:          0x0907,
        Categories:             0x0908,
        Category:               0x0909,
        Complete:               0x090A,
        DateCompleted:          0x090B,
        DueDate:                0x090C,
        UtcDueDate:             0x090D,
        Importance:             0x090E,
        Recurrence:             0x090F,
        Recurrence_Type:        0x0910,
        Recurrence_Start:       0x0911,
        Recurrence_Until:       0x0912,
        Recurrence_Occurrences: 0x0913,
        Recurrence_Interval:    0x0914,
        Recurrence_DayOfMonth:  0x0915,
        Recurrence_DayOfWeek:   0x0916,
        Recurrence_WeekOfMonth: 0x0917,
        Recurrence_MonthOfYear: 0x0918,
        Recurrence_Regenerate:  0x0919,
        Recurrence_DeadOccur:   0x091A,
        ReminderSet:            0x091B,
        ReminderTime:           0x091C,
        Sensitivity:            0x091D,
        StartDate:              0x091E,
        UtcStartDate:           0x091F,
        Subject:                0x0920,
        CompressedRTF:          0x0921,
        OrdinalDate:            0x0922,
        SubOrdinalDate:         0x0923,
        CalendarType:           0x0924,
        IsLeapMonth:            0x0925,
        FirstDayOfWeek:         0x0926,
      },
    },

    ResolveRecipients: {
      Tags: {
        ResolveRecipients:      0x0A05,
        Response:               0x0A06,
        Status:                 0x0A07,
        Type:                   0x0A08,
        Recipient:              0x0A09,
        DisplayName:            0x0A0A,
        EmailAddress:           0x0A0B,
        Certificates:           0x0A0C,
        Certificate:            0x0A0D,
        MiniCertificate:        0x0A0E,
        Options:                0x0A0F,
        To:                     0x0A10,
        CertificateRetrieval:   0x0A11,
        RecipientCount:         0x0A12,
        MaxCertificates:        0x0A13,
        MaxAmbiguousRecipients: 0x0A14,
        CertificateCount:       0x0A15,
        Availability:           0x0A16,
        StartTime:              0x0A17,
        EndTime:                0x0A18,
        MergedFreeBusy:         0x0A19,
        Picture:                0x0A1A,
        MaxSize:                0x0A1B,
        Data:                   0x0A1C,
        MaxPictures:            0x0A1D,
      },
      Enums: {
        Status: {
          Success:                   '1',
          AmbiguousRecipientFull:    '2',
          AmbiguousRecipientPartial: '3',
          RecipientNotFound:         '4',
          ProtocolError:             '5',
          ServerError:               '6',
          InvalidSMIMECert:          '7',
          CertLimitReached:          '8',
        },
        CertificateRetrieval: {
          None: '1',
          Full: '2',
          Mini: '3',
        },
        MergedFreeBusy: {
          Free:      '0',
          Tentative: '1',
          Busy:      '2',
          Oof:       '3',
          NoData:    '4',
        },
      },
    },

    ValidateCert: {
      Tags: {
        ValidateCert:     0x0B05,
        Certificates:     0x0B06,
        Certificate:      0x0B07,
        CertificateChain: 0x0B08,
        CheckCRL:         0x0B09,
        Status:           0x0B0A,
      },
      Enums: {
        Status: {
          Success:               '1',
          ProtocolError:         '2',
          InvalidSignature:      '3',
          UntrustedSource:       '4',
          InvalidChain:          '5',
          NotForEmail:           '6',
          Expired:               '7',
          InconsistentTimes:     '8',
          IdMisused:             '9',
          MissingInformation:   '10',
          CAEndMismatch:        '11',
          EmailAddressMismatch: '12',
          Revoked:              '13',
          ServerOffline:        '14',
          ChainRevoked:         '15',
          RevocationUnknown:    '16',
          UnknownError:         '17',
        },
      },
    },

    Contacts2: {
      Tags: {
        CustomerId:       0x0C05,
        GovernmentId:     0x0C06,
        IMAddress:        0x0C07,
        IMAddress2:       0x0C08,
        IMAddress3:       0x0C09,
        ManagerName:      0x0C0A,
        CompanyMainPhone: 0x0C0B,
        AccountName:      0x0C0C,
        NickName:         0x0C0D,
        MMS:              0x0C0E,
      },
    },

    Ping: {
      Tags: {
        Ping:              0x0D05,
        AutdState:         0x0D06,
        Status:            0x0D07,
        HeartbeatInterval: 0x0D08,
        Folders:           0x0D09,
        Folder:            0x0D0A,
        Id:                0x0D0B,
        Class:             0x0D0C,
        MaxFolders:        0x0D0D,
      },
      Enums: {
        Status: {
          Expired:           '1',
          Changed:           '2',
          MissingParameters: '3',
          SyntaxError:       '4',
          InvalidInterval:   '5',
          TooManyFolders:    '6',
          SyncFolders:       '7',
          ServerError:       '8',
        },
      },
    },

    Provision: {
      Tags: {
        Provision:                                0x0E05,
        Policies:                                 0x0E06,
        Policy:                                   0x0E07,
        PolicyType:                               0x0E08,
        PolicyKey:                                0x0E09,
        Data:                                     0x0E0A,
        Status:                                   0x0E0B,
        RemoteWipe:                               0x0E0C,
        EASProvisionDoc:                          0x0E0D,
        DevicePasswordEnabled:                    0x0E0E,
        AlphanumericDevicePasswordRequired:       0x0E0F,
        DeviceEncryptionEnabled:                  0x0E10,
        RequireStorageCardEncryption:             0x0E10,
        PasswordRecoveryEnabled:                  0x0E11,
        AttachmentsEnabled:                       0x0E13,
        MinDevicePasswordLength:                  0x0E14,
        MaxInactivityTimeDeviceLock:              0x0E15,
        MaxDevicePasswordFailedAttempts:          0x0E16,
        MaxAttachmentSize:                        0x0E17,
        AllowSimpleDevicePassword:                0x0E18,
        DevicePasswordExpiration:                 0x0E19,
        DevicePasswordHistory:                    0x0E1A,
        AllowStorageCard:                         0x0E1B,
        AllowCamera:                              0x0E1C,
        RequireDeviceEncryption:                  0x0E1D,
        AllowUnsignedApplications:                0x0E1E,
        AllowUnsignedInstallationPackages:        0x0E1F,
        MinDevicePasswordComplexCharacters:       0x0E20,
        AllowWiFi:                                0x0E21,
        AllowTextMessaging:                       0x0E22,
        AllowPOPIMAPEmail:                        0x0E23,
        AllowBluetooth:                           0x0E24,
        AllowIrDA:                                0x0E25,
        RequireManualSyncWhenRoaming:             0x0E26,
        AllowDesktopSync:                         0x0E27,
        MaxCalendarAgeFilter:                     0x0E28,
        AllowHTMLEmail:                           0x0E29,
        MaxEmailAgeFilter:                        0x0E2A,
        MaxEmailBodyTruncationSize:               0x0E2B,
        MaxEmailHTMLBodyTruncationSize:           0x0E2C,
        RequireSignedSMIMEMessages:               0x0E2D,
        RequireEncryptedSMIMEMessages:            0x0E2E,
        RequireSignedSMIMEAlgorithm:              0x0E2F,
        RequireEncryptionSMIMEAlgorithm:          0x0E30,
        AllowSMIMEEncryptionAlgorithmNegotiation: 0x0E31,
        AllowSMIMESoftCerts:                      0x0E32,
        AllowBrowser:                             0x0E33,
        AllowConsumerEmail:                       0x0E34,
        AllowRemoteDesktop:                       0x0E35,
        AllowInternetSharing:                     0x0E36,
        UnapprovedInROMApplicationList:           0x0E37,
        ApplicationName:                          0x0E38,
        ApprovedApplicationList:                  0x0E39,
        Hash:                                     0x0E3A,
      },
    },

    Search: {
      Tags: {
        Search:         0x0F05,
        Stores:         0x0F06,
        Store:          0x0F07,
        Name:           0x0F08,
        Query:          0x0F09,
        Options:        0x0F0A,
        Range:          0x0F0B,
        Status:         0x0F0C,
        Response:       0x0F0D,
        Result:         0x0F0E,
        Properties:     0x0F0F,
        Total:          0x0F10,
        EqualTo:        0x0F11,
        Value:          0x0F12,
        And:            0x0F13,
        Or:             0x0F14,
        FreeText:       0x0F15,
        DeepTraversal:  0x0F17,
        LongId:         0x0F18,
        RebuildResults: 0x0F19,
        LessThan:       0x0F1A,
        GreaterThan:    0x0F1B,
        Schema:         0x0F1C,
        Supported:      0x0F1D,
        UserName:       0x0F1E,
        Password:       0x0F1F,
        ConversationId: 0x0F20,
        Picture:        0x0F21,
        MaxSize:        0x0F22,
        MaxPictures:    0x0F23,
      },
      Enums: {
        Status: {
          Success:              '1',
          InvalidRequest:       '2',
          ServerError:          '3',
          BadLink:              '4',
          AccessDenied:         '5',
          NotFound:             '6',
          ConnectionFailure:    '7',
          TooComplex:           '8',
          Timeout:             '10',
          SyncFolders:         '11',
          EndOfRange:          '12',
          AccessBlocked:       '13',
          CredentialsRequired: '14',
        },
      },
    },

    GAL: {
      Tags: {
        DisplayName:  0x1005,
        Phone:        0x1006,
        Office:       0x1007,
        Title:        0x1008,
        Company:      0x1009,
        Alias:        0x100A,
        FirstName:    0x100B,
        LastName:     0x100C,
        HomePhone:    0x100D,
        MobilePhone:  0x100E,
        EmailAddress: 0x100F,
        Picture:      0x1010,
        Status:       0x1011,
        Data:         0x1012,
      },
    },

    AirSyncBase: {
      Tags: {
        BodyPreference:     0x1105,
        Type:               0x1106,
        TruncationSize:     0x1107,
        AllOrNone:          0x1108,
        Reserved:           0x1109,
        Body:               0x110A,
        Data:               0x110B,
        EstimatedDataSize:  0x110C,
        Truncated:          0x110D,
        Attachments:        0x110E,
        Attachment:         0x110F,
        DisplayName:        0x1110,
        FileReference:      0x1111,
        Method:             0x1112,
        ContentId:          0x1113,
        ContentLocation:    0x1114,
        IsInline:           0x1115,
        NativeBodyType:     0x1116,
        ContentType:        0x1117,
        Preview:            0x1118,
        BodyPartPreference: 0x1119,
        BodyPart:           0x111A,
        Status:             0x111B,
      },
      Enums: {
        Type: {
          PlainText: '1',
          HTML:      '2',
          RTF:       '3',
          MIME:      '4',
        },
        Method: {
          Normal:          '1',
          EmbeddedMessage: '5',
          AttachOLE:       '6',
        },
        NativeBodyType: {
          PlainText: '1',
          HTML:      '2',
          RTF:       '3',
        },
        Status: {
          Success: '1',
        },
      },
    },

    Settings: {
      Tags: {
        Settings:                    0x1205,
        Status:                      0x1206,
        Get:                         0x1207,
        Set:                         0x1208,
        Oof:                         0x1209,
        OofState:                    0x120A,
        StartTime:                   0x120B,
        EndTime:                     0x120C,
        OofMessage:                  0x120D,
        AppliesToInternal:           0x120E,
        AppliesToExternalKnown:      0x120F,
        AppliesToExternalUnknown:    0x1210,
        Enabled:                     0x1211,
        ReplyMessage:                0x1212,
        BodyType:                    0x1213,
        DevicePassword:              0x1214,
        Password:                    0x1215,
        DeviceInformation:           0x1216,
        Model:                       0x1217,
        IMEI:                        0x1218,
        FriendlyName:                0x1219,
        OS:                          0x121A,
        OSLanguage:                  0x121B,
        PhoneNumber:                 0x121C,
        UserInformation:             0x121D,
        EmailAddresses:              0x121E,
        SmtpAddress:                 0x121F,
        UserAgent:                   0x1220,
        EnableOutboundSMS:           0x1221,
        MobileOperator:              0x1222,
        PrimarySmtpAddress:          0x1223,
        Accounts:                    0x1224,
        Account:                     0x1225,
        AccountId:                   0x1226,
        AccountName:                 0x1227,
        UserDisplayName:             0x1228,
        SendDisabled:                0x1229,
        /* Missing tag value 0x122A */
        RightsManagementInformation: 0x122B,
      },
      Enums: {
        Status: {
          Success:              '1',
          ProtocolError:        '2',
          AccessDenied:         '3',
          ServerError:          '4',
          InvalidArguments:     '5',
          ConflictingArguments: '6',
          DeniedByPolicy:       '7',
        },
        OofState: {
          Disabled:  '0',
          Global:    '1',
          TimeBased: '2',
        },
      },
    },

    DocumentLibrary: {
      Tags: {
        LinkId:           0x1305,
        DisplayName:      0x1306,
        IsFolder:         0x1307,
        CreationDate:     0x1308,
        LastModifiedDate: 0x1309,
        IsHidden:         0x130A,
        ContentLength:    0x130B,
        ContentType:      0x130C,
      },
    },

    ItemOperations: {
      Tags: {
        ItemOperations:      0x1405,
        Fetch:               0x1406,
        Store:               0x1407,
        Options:             0x1408,
        Range:               0x1409,
        Total:               0x140A,
        Properties:          0x140B,
        Data:                0x140C,
        Status:              0x140D,
        Response:            0x140E,
        Version:             0x140F,
        Schema:              0x1410,
        Part:                0x1411,
        EmptyFolderContents: 0x1412,
        DeleteSubFolders:    0x1413,
        UserName:            0x1414,
        Password:            0x1415,
        Move:                0x1416,
        DstFldId:            0x1417,
        ConversationId:      0x1418,
        MoveAlways:          0x1419,
      },
      Enums: {
        Status: {
          Success:               '1',
          ProtocolError:         '2',
          ServerError:           '3',
          BadURI:                '4',
          AccessDenied:          '5',
          ObjectNotFound:        '6',
          ConnectionFailure:     '7',
          InvalidByteRange:      '8',
          UnknownStore:          '9',
          EmptyFile:            '10',
          DataTooLarge:         '11',
          IOFailure:            '12',
          ConversionFailure:    '14',
          InvalidAttachment:    '15',
          ResourceAccessDenied: '16',
        },
      },
    },

    ComposeMail: {
      Tags: {
        SendMail:        0x1505,
        SmartForward:    0x1506,
        SmartReply:      0x1507,
        SaveInSentItems: 0x1508,
        ReplaceMime:     0x1509,
        /* Missing tag value 0x150A */
        Source:          0x150B,
        FolderId:        0x150C,
        ItemId:          0x150D,
        LongId:          0x150E,
        InstanceId:      0x150F,
        Mime:            0x1510,
        ClientId:        0x1511,
        Status:          0x1512,
        AccountId:       0x1513,
      },
    },

    Email2: {
      Tags: {
        UmCallerID:            0x1605,
        UmUserNotes:           0x1606,
        UmAttDuration:         0x1607,
        UmAttOrder:            0x1608,
        ConversationId:        0x1609,
        ConversationIndex:     0x160A,
        LastVerbExecuted:      0x160B,
        LastVerbExecutionTime: 0x160C,
        ReceivedAsBcc:         0x160D,
        Sender:                0x160E,
        CalendarType:          0x160F,
        IsLeapMonth:           0x1610,
        AccountId:             0x1611,
        FirstDayOfWeek:        0x1612,
        MeetingMessageType:    0x1613,
      },
      Enums: {
        LastVerbExecuted: {
          Unknown:       '0',
          ReplyToSender: '1',
          ReplyToAll:    '2',
          Forward:       '3',
        },
        CalendarType: {
          Default:                     '0',
          Gregorian:                   '1',
          GregorianUS:                 '2',
          Japan:                       '3',
          Taiwan:                      '4',
          Korea:                       '5',
          Hijri:                       '6',
          Thai:                        '7',
          Hebrew:                      '8',
          GregorianMeFrench:           '9',
          GregorianArabic:            '10',
          GregorianTranslatedEnglish: '11',
          GregorianTranslatedFrench:  '12',
          JapaneseLunar:              '14',
          ChineseLunar:               '15',
          KoreanLunar:                '20',
        },
        FirstDayOfWeek: {
          Sunday:    '0',
          Monday:    '1',
          Tuesday:   '2',
          Wednesday: '3',
          Thursday:  '4',
          Friday:    '5',
          Saturday:  '6',
        },
        MeetingMessageType: {
          Unspecified:         '0',
          InitialRequest:      '1',
          FullUpdate:          '2',
          InformationalUpdate: '3',
          Outdated:            '4',
          DelegatorsCopy:      '5',
          Delegated:           '6',
        },
      },
    },

    Notes: {
      Tags: {
        Subject:          0x1705,
        MessageClass:     0x1706,
        LastModifiedDate: 0x1707,
        Categories:       0x1708,
        Category:         0x1709,
      },
    },

    RightsManagement: {
      Tags: {
        RightsManagementSupport:            0x1805,
        RightsManagementTemplates:          0x1806,
        RightsManagementTemplate:           0x1807,
        RightsManagementLicense:            0x1808,
        EditAllowed:                        0x1809,
        ReplyAllowed:                       0x180A,
        ReplyAllAllowed:                    0x180B,
        ForwardAllowed:                     0x180C,
        ModifyRecipientsAllowed:            0x180D,
        ExtractAllowed:                     0x180E,
        PrintAllowed:                       0x180F,
        ExportAllowed:                      0x1810,
        ProgrammaticAccessAllowed:          0x1811,
        Owner:                              0x1812,
        ContentExpiryDate:                  0x1813,
        TemplateID:                         0x1814,
        TemplateName:                       0x1815,
        TemplateDescription:                0x1816,
        ContentOwner:                       0x1817,
        RemoveRightsManagementDistribution: 0x1818,
      },
    },
  };

  WBXML.CompileCodepages(codepages);

  return codepages;
}));
/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function (root, factory) {
  if (typeof exports === 'object')
    module.exports = factory(require('wbxml'), require('activesync/codepages'));
  else if (typeof define === 'function' && define.amd)
    define('activesync/protocol',['wbxml', 'activesync/codepages'], factory);
  else
    root.ActiveSyncProtocol = factory(WBXML, ActiveSyncCodepages);
}(this, function(WBXML, ASCP) {
  'use strict';

  var exports = {};

  function nullCallback() {}

  /**
   * Create a constructor for a custom error type that works like a built-in
   * Error.
   *
   * @param name the string name of the error
   * @param parent (optional) a parent class for the error, defaults to Error
   * @param extraArgs an array of extra arguments that can be passed to the
   *        constructor of this error type
   * @return the constructor for this error
   */
  function makeError(name, parent, extraArgs) {
    function CustomError() {
      // Try to let users call this as CustomError(...) without the "new". This
      // is imperfect, and if you call this function directly and give it a
      // |this| that's a CustomError, things will break. Don't do it!
      var self = this instanceof CustomError ?
                 this : Object.create(CustomError.prototype);
      var tmp = Error();
      var offset = 1;

      self.stack = tmp.stack.substring(tmp.stack.indexOf('\n') + 1);
      self.message = arguments[0] || tmp.message;
      if (extraArgs) {
        offset += extraArgs.length;
        for (var i = 0; i < extraArgs.length; i++)
          self[extraArgs[i]] = arguments[i+1];
      }

      var m = /@(.+):(.+)/.exec(self.stack);
      self.fileName = arguments[offset] || (m && m[1]) || "";
      self.lineNumber = arguments[offset + 1] || (m && m[2]) || 0;

      return self;
    }
    CustomError.prototype = Object.create((parent || Error).prototype);
    CustomError.prototype.name = name;
    CustomError.prototype.constructor = CustomError;

    return CustomError;
  }

  var AutodiscoverError = makeError('ActiveSync.AutodiscoverError');
  exports.AutodiscoverError = AutodiscoverError;

  var AutodiscoverDomainError = makeError('ActiveSync.AutodiscoverDomainError',
                                          AutodiscoverError);
  exports.AutodiscoverDomainError = AutodiscoverDomainError;

  var HttpError = makeError('ActiveSync.HttpError', null, ['status']);
  exports.HttpError = HttpError;

  function nsResolver(prefix) {
    var baseUrl = 'http://schemas.microsoft.com/exchange/autodiscover/';
    var ns = {
      rq: baseUrl + 'mobilesync/requestschema/2006',
      ad: baseUrl + 'responseschema/2006',
      ms: baseUrl + 'mobilesync/responseschema/2006',
    };
    return ns[prefix] || null;
  }

  function Version(str) {
    var details = str.split('.').map(function(x) {
      return parseInt(x);
    });
    this.major = details[0], this.minor = details[1];
  }
  exports.Version = Version;
  Version.prototype = {
    eq: function(other) {
      if (!(other instanceof Version))
        other = new Version(other);
      return this.major === other.major && this.minor === other.minor;
    },
    ne: function(other) {
      return !this.eq(other);
    },
    gt: function(other) {
      if (!(other instanceof Version))
        other = new Version(other);
      return this.major > other.major ||
             (this.major === other.major && this.minor > other.minor);
    },
    gte: function(other) {
      if (!(other instanceof Version))
        other = new Version(other);
      return this.major >= other.major ||
             (this.major === other.major && this.minor >= other.minor);
    },
    lt: function(other) {
      return !this.gte(other);
    },
    lte: function(other) {
      return !this.gt(other);
    },
    toString: function() {
      return this.major + '.' + this.minor;
    },
  };

  /**
   * Set the Authorization header on an XMLHttpRequest.
   *
   * @param xhr the XMLHttpRequest
   * @param username the username
   * @param password the user's password
   */
  function setAuthHeader(xhr, username, password) {
    var authorization = 'Basic ' + btoa(username + ':' + password);
    xhr.setRequestHeader('Authorization', authorization);
  }

  /**
   * Perform autodiscovery for the server associated with this account.
   *
   * @param aEmailAddress the user's email address
   * @param aPassword the user's password
   * @param aTimeout a timeout (in milliseconds) for the request
   * @param aCallback a callback taking an error status (if any) and the
   *        server's configuration
   * @param aNoRedirect true if autodiscovery should *not* follow any
   *        specified redirects (typically used when autodiscover has already
   *        told us about a redirect)
   */
  function autodiscover(aEmailAddress, aPassword, aTimeout, aCallback,
                        aNoRedirect) {
    if (!aCallback) aCallback = nullCallback;
    var domain = aEmailAddress.substring(aEmailAddress.indexOf('@') + 1);

    // The first time we try autodiscovery, we should try to recover from
    // AutodiscoverDomainErrors and HttpErrors. The second time, *all* errors
    // should be reported to the callback.
    do_autodiscover(domain, aEmailAddress, aPassword, aTimeout, aNoRedirect,
                    function(aError, aConfig) {
      if (aError instanceof AutodiscoverDomainError ||
          aError instanceof HttpError)
        do_autodiscover('autodiscover.' + domain, aEmailAddress, aPassword,
                        aTimeout, aNoRedirect, aCallback);
      else
        aCallback(aError, aConfig);
    });
  }
  exports.autodiscover = autodiscover;

  /**
   * Perform the actual autodiscovery process for a given URL.
   *
   * @param aHost the host name to attempt autodiscovery for
   * @param aEmailAddress the user's email address
   * @param aPassword the user's password
   * @param aTimeout a timeout (in milliseconds) for the request
   * @param aNoRedirect true if autodiscovery should *not* follow any
   *        specified redirects (typically used when autodiscover has already
   *        told us about a redirect)
   * @param aCallback a callback taking an error status (if any) and the
   *        server's configuration
   */
  function do_autodiscover(aHost, aEmailAddress, aPassword, aTimeout,
                           aNoRedirect, aCallback) {
    var xhr = new XMLHttpRequest({mozSystem: true, mozAnon: true});
    xhr.open('POST', 'https://' + aHost + '/autodiscover/autodiscover.xml',
             true);
    setAuthHeader(xhr, aEmailAddress, aPassword);
    xhr.setRequestHeader('Content-Type', 'text/xml');
    xhr.timeout = aTimeout;

    xhr.upload.onprogress = xhr.upload.onload = function() {
      xhr.timeout = 0;
    };

    xhr.onload = function() {
      if (xhr.status < 200 || xhr.status >= 300)
        return aCallback(new HttpError(xhr.statusText, xhr.status));

      var doc = new DOMParser().parseFromString(xhr.responseText, 'text/xml');

      function getNode(xpath, rel) {
        return doc.evaluate(xpath, rel, nsResolver,
                            XPathResult.FIRST_ORDERED_NODE_TYPE, null)
                  .singleNodeValue;
      }
      function getNodes(xpath, rel) {
        return doc.evaluate(xpath, rel, nsResolver,
                            XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
      }
      function getString(xpath, rel) {
        return doc.evaluate(xpath, rel, nsResolver, XPathResult.STRING_TYPE,
                            null).stringValue;
      }

      if (doc.documentElement.tagName === 'parsererror')
        return aCallback(new AutodiscoverDomainError(
          'Error parsing autodiscover response'));

      var responseNode = getNode('/ad:Autodiscover/ms:Response', doc);
      if (!responseNode)
        return aCallback(new AutodiscoverDomainError(
          'Missing Autodiscover Response node'));

      var error = getNode('ms:Error', responseNode) ||
                  getNode('ms:Action/ms:Error', responseNode);
      if (error)
        return aCallback(new AutodiscoverError(
          getString('ms:Message/text()', error)));

      var redirect = getNode('ms:Action/ms:Redirect', responseNode);
      if (redirect) {
        if (aNoRedirect)
          return aCallback(new AutodiscoverError(
            'Multiple redirects occurred during autodiscovery'));

        var redirectedEmail = getString('text()', redirect);
        return autodiscover(redirectedEmail, aPassword, aTimeout, aCallback,
                            true);
      }

      var user = getNode('ms:User', responseNode);
      var config = {
        culture: getString('ms:Culture/text()', responseNode),
        user: {
          name:  getString('ms:DisplayName/text()',  user),
          email: getString('ms:EMailAddress/text()', user),
        },
        servers: [],
      };

      var servers = getNodes('ms:Action/ms:Settings/ms:Server', responseNode);
      var server;
      while ((server = servers.iterateNext())) {
        config.servers.push({
          type:       getString('ms:Type/text()',       server),
          url:        getString('ms:Url/text()',        server),
          name:       getString('ms:Name/text()',       server),
          serverData: getString('ms:ServerData/text()', server),
        });
      }

      // Try to find a MobileSync server from Autodiscovery.
      for (var iter in Iterator(config.servers)) {
        var server = iter[1];
        if (server.type === 'MobileSync') {
          config.mobileSyncServer = server;
          break;
        }
      }
      if (!config.mobileSyncServer) {
        return aCallback(new AutodiscoverError('No MobileSync server found'),
                         config);
      }

      aCallback(null, config);
    };

    xhr.ontimeout = xhr.onerror = function() {
      aCallback(new Error('Error getting Autodiscover URL'));
    };

    // TODO: use something like
    // http://ejohn.org/blog/javascript-micro-templating/ here?
    var postdata =
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<Autodiscover xmlns="' + nsResolver('rq') + '">\n' +
    '  <Request>\n' +
    '    <EMailAddress>' + aEmailAddress + '</EMailAddress>\n' +
    '    <AcceptableResponseSchema>' + nsResolver('ms') +
         '</AcceptableResponseSchema>\n' +
    '  </Request>\n' +
    '</Autodiscover>';

    xhr.send(postdata);
  }

  /**
   * Create a new ActiveSync connection.
   *
   * ActiveSync connections use XMLHttpRequests to communicate with the
   * server. These XHRs are created with mozSystem: true and mozAnon: true to,
   * respectively, help with CORS, and to ignore the authentication cache. The
   * latter is important because 1) it prevents the HTTP auth dialog from
   * appearing if the user's credentials are wrong and 2) it allows us to
   * connect to the same server as multiple users.
   *
   * @param aDeviceId (optional) a string identifying this device
   * @param aDeviceType (optional) a string identifying the type of this device
   */
  function Connection(aDeviceId, aDeviceType) {
    this._deviceId = aDeviceId || 'v140Device';
    this._deviceType = aDeviceType || 'SmartPhone';
    this.timeout = 0;

    this._connected = false;
    this._waitingForConnection = false;
    this._connectionError = null;
    this._connectionCallbacks = [];

    this.baseUrl = null;
    this._username = null;
    this._password = null;

    this.versions = [];
    this.supportedCommands = [];
    this.currentVersion = null;
  }
  exports.Connection = Connection;
  Connection.prototype = {
    /**
     * Perform any callbacks added during the connection process.
     *
     * @param aError the error status (if any)
     */
    _notifyConnected: function(aError) {
      if (aError)
        this.disconnect();

      for (var iter in Iterator(this._connectionCallbacks)) {
        var callback = iter[1];
        callback.apply(callback, arguments);
      }
      this._connectionCallbacks = [];
    },

    /**
     * Get the connection status.
     *
     * @return true iff we are fully connected to the server
     */
    get connected() {
      return this._connected;
    },

    /*
     * Initialize the connection with a server and account credentials.
     *
     * @param aServer the ActiveSync server to connect to
     * @param aUsername the account's username
     * @param aPassword the account's password
     */
    open: function(aServer, aUsername, aPassword) {
      this.baseUrl = aServer + '/Microsoft-Server-ActiveSync';
      this._username = aUsername;
      this._password = aPassword;
    },

    /**
     * Connect to the server with this account by getting the OPTIONS from
     * the server (and verifying the account's credentials).
     *
     * @param aCallback a callback taking an error status (if any) and the
     *        server's options.
     */
    connect: function(aCallback) {
      // If we're already connected, just run the callback and return.
      if (this.connected) {
        if (aCallback)
          aCallback(null);
        return;
      }

      // Otherwise, queue this callback up to fire when we do connect.
      if (aCallback)
        this._connectionCallbacks.push(aCallback);

      // Don't do anything else if we're already trying to connect.
      if (this._waitingForConnection)
        return;

      this._waitingForConnection = true;
      this._connectionError = null;

      this.getOptions((function(aError, aOptions) {
        this._waitingForConnection = false;
        this._connectionError = aError;

        if (aError) {
          console.error('Error connecting to ActiveSync:', aError);
          return this._notifyConnected(aError, aOptions);
        }

        this._connected = true;
        this.versions = aOptions.versions;
        this.supportedCommands = aOptions.commands;
        this.currentVersion = new Version(aOptions.versions.slice(-1)[0]);

        return this._notifyConnected(null, aOptions);
      }).bind(this));
    },

    /**
     * Disconnect from the ActiveSync server, and reset the connection state.
     * The server and credentials remain set however, so you can safely call
     * connect() again immediately after.
     */
    disconnect: function() {
      if (this._waitingForConnection)
        throw new Error("Can't disconnect while waiting for server response");

      this._connected = false;
      this.versions = [];
      this.supportedCommands = [];
      this.currentVersion = null;
    },

    /**
     * Attempt to provision this account. XXX: Currently, this doesn't actually
     * do anything, but it's useful as a test command for Gmail to ensure that
     * the user entered their password correctly.
     *
     * @param aCallback a callback taking an error status (if any) and the
     *        WBXML response
     */
    provision: function(aCallback) {
      var pv = ASCP.Provision.Tags;
      var w = new WBXML.Writer('1.3', 1, 'UTF-8');
      w.stag(pv.Provision)
        .etag();
      this.postCommand(w, aCallback);
    },

    /**
     * Get the options for the server associated with this account.
     *
     * @param aCallback a callback taking an error status (if any), and the
     *        resulting options.
     */
    getOptions: function(aCallback) {
      if (!aCallback) aCallback = nullCallback;

      var conn = this;
      var xhr = new XMLHttpRequest({mozSystem: true, mozAnon: true});
      xhr.open('OPTIONS', this.baseUrl, true);
      setAuthHeader(xhr, this._username, this._password);
      xhr.timeout = this.timeout;

      xhr.upload.onprogress = xhr.upload.onload = function() {
        xhr.timeout = 0;
      };

      xhr.onload = function() {
        if (xhr.status < 200 || xhr.status >= 300) {
          console.error('ActiveSync options request failed with response ' +
                        xhr.status);
          aCallback(new HttpError(xhr.statusText, xhr.status));
          return;
        }

        var result = {
          versions: xhr.getResponseHeader('MS-ASProtocolVersions').split(','),
          commands: xhr.getResponseHeader('MS-ASProtocolCommands').split(','),
        };

        aCallback(null, result);
      };

      xhr.ontimeout = xhr.onerror = function() {
        var error = new Error('Error getting OPTIONS URL');
        console.error(error);
        aCallback(error);
      };

      // Set the response type to "text" so that we don't try to parse an empty
      // body as XML.
      xhr.responseType = 'text';
      xhr.send();
    },

    /**
     * Check if the server supports a particular command. Requires that we be
     * connected to the server already.
     *
     * @param aCommand a string/tag representing the command type
     * @return true iff the command is supported
     */
    supportsCommand: function(aCommand) {
      if (!this.connected)
        throw new Error('Connection required to get command');

      if (typeof aCommand === 'number')
        aCommand = ASCP.__tagnames__[aCommand];
      return this.supportedCommands.indexOf(aCommand) !== -1;
    },

    /**
     * DEPRECATED. See postCommand() below.
     */
    doCommand: function() {
      console.warn('doCommand is deprecated. Use postCommand instead.');
      this.postCommand.apply(this, arguments);
    },

    /**
     * Send a WBXML command to the ActiveSync server and listen for the
     * response.
     *
     * @param aCommand the WBXML representing the command or a string/tag
     *        representing the command type for empty commands
     * @param aCallback a callback to call when the server has responded; takes
     *        two arguments: an error status (if any) and the response as a
     *        WBXML reader. If the server returned an empty response, the
     *        response argument is null.
     * @param aExtraParams (optional) an object containing any extra URL
     *        parameters that should be added to the end of the request URL
     * @param aExtraHeaders (optional) an object containing any extra HTTP
     *        headers to send in the request
     * @param aProgressCallback (optional) a callback to invoke with progress
     *        information, when available. Two arguments are provided: the
     *        number of bytes received so far, and the total number of bytes
     *        expected (when known, 0 if unknown).
     */
    postCommand: function(aCommand, aCallback, aExtraParams, aExtraHeaders,
                          aProgressCallback) {
      var contentType = 'application/vnd.ms-sync.wbxml';

      if (typeof aCommand === 'string' || typeof aCommand === 'number') {
        this.postData(aCommand, contentType, null, aCallback, aExtraParams,
                      aExtraHeaders);
      }
      else {
        var r = new WBXML.Reader(aCommand, ASCP);
        var commandName = r.document[0].localTagName;
        this.postData(commandName, contentType, aCommand.buffer, aCallback,
                      aExtraParams, aExtraHeaders, aProgressCallback);
      }
    },

    /**
     * Send arbitrary data to the ActiveSync server and listen for the response.
     *
     * @param aCommand a string (or WBXML tag) representing the command type
     * @param aContentType the content type of the post data
     * @param aData the data to be posted
     * @param aCallback a callback to call when the server has responded; takes
     *        two arguments: an error status (if any) and the response as a
     *        WBXML reader. If the server returned an empty response, the
     *        response argument is null.
     * @param aExtraParams (optional) an object containing any extra URL
     *        parameters that should be added to the end of the request URL
     * @param aExtraHeaders (optional) an object containing any extra HTTP
     *        headers to send in the request
     * @param aProgressCallback (optional) a callback to invoke with progress
     *        information, when available. Two arguments are provided: the
     *        number of bytes received so far, and the total number of bytes
     *        expected (when known, 0 if unknown).
     */
    postData: function(aCommand, aContentType, aData, aCallback, aExtraParams,
                       aExtraHeaders, aProgressCallback) {
      // Make sure our command name is a string.
      if (typeof aCommand === 'number')
        aCommand = ASCP.__tagnames__[aCommand];

      if (!this.supportsCommand(aCommand)) {
        var error = new Error("This server doesn't support the command " +
                              aCommand);
        console.error(error);
        aCallback(error);
        return;
      }

      // Build the URL parameters.
      var params = [
        ['Cmd', aCommand],
        ['User', this._email],
        ['DeviceId', this._deviceId],
        ['DeviceType', this._deviceType]
      ];
      if (aExtraParams) {
        for (var iter in Iterator(params)) {
          var param = iter[1];
          if (param[0] in aExtraParams)
            throw new TypeError('reserved URL parameter found');
        }
        for (var kv in Iterator(aExtraParams))
          params.push(kv);
      }
      var paramsStr = params.map(function(i) {
        return encodeURIComponent(i[0]) + '=' + encodeURIComponent(i[1]);
      }).join('&');

      // Now it's time to make our request!
      var xhr = new XMLHttpRequest({mozSystem: true, mozAnon: true});
      xhr.open('POST', this.baseUrl + '?' + paramsStr, true);
      setAuthHeader(xhr, this._username, this._password);
      xhr.setRequestHeader('MS-ASProtocolVersion', this.currentVersion);
      xhr.setRequestHeader('Content-Type', aContentType);

      // Add extra headers if we have any.
      if (aExtraHeaders) {
        for (var iter in Iterator(aExtraHeaders)) {
          var key = iter[0], key = iter[1];
          xhr.setRequestHeader(key, value);
        }
      }

      xhr.timeout = this.timeout;

      xhr.upload.onprogress = xhr.upload.onload = function() {
        xhr.timeout = 0;
      };
      xhr.onprogress = function(event) {
        if (aProgressCallback)
          aProgressCallback(event.loaded, event.total);
      };

      var conn = this;
      var parentArgs = arguments;
      xhr.onload = function() {
        // This status code is a proprietary Microsoft extension used to
        // indicate a redirect, not to be confused with the draft-standard
        // "Unavailable For Legal Reasons" status. More info available here:
        // <http://msdn.microsoft.com/en-us/library/gg651019.aspx>
        if (xhr.status === 451) {
          conn.baseUrl = xhr.getResponseHeader('X-MS-Location');
          conn.postData.apply(conn, parentArgs);
          return;
        }

        if (xhr.status < 200 || xhr.status >= 300) {
          console.error('ActiveSync command ' + aCommand + ' failed with ' +
                        'response ' + xhr.status);
          aCallback(new HttpError(xhr.statusText, xhr.status));
          return;
        }

        var response = null;
        if (xhr.response.byteLength > 0)
          response = new WBXML.Reader(new Uint8Array(xhr.response), ASCP);
        aCallback(null, response);
      };

      xhr.ontimeout = xhr.onerror = function() {
        var error = new Error('Error getting command URL');
        console.error(error);
        aCallback(error);
      };

      xhr.responseType = 'arraybuffer';
      xhr.send(aData);
    },
  };

  return exports;
}));

define('mailapi/activesync/folder',
  [
    'rdcommon/log',
    'wbxml',
    'activesync/codepages',
    'activesync/protocol',
    'mimelib',
    '../quotechew',
    '../htmlchew',
    '../date',
    '../syncbase',
    '../util',
    'module',
    'exports'
  ],
  function(
    $log,
    $wbxml,
    $ascp,
    $activesync,
    $mimelib,
    $quotechew,
    $htmlchew,
    $date,
    $sync,
    $util,
    $module,
    exports
  ) {
'use strict';

var DESIRED_SNIPPET_LENGTH = 100;

/**
 * This is minimum number of messages we'd like to get for a folder for a given
 * sync range. It's not exact, since we estimate from the number of messages in
 * the past two weeks, but it's close enough.
 */
var DESIRED_MESSAGE_COUNT = 50;

var FILTER_TYPE = $ascp.AirSync.Enums.FilterType;

/**
 * Map our built-in sync range values to their corresponding ActiveSync
 * FilterType values. We exclude 3 and 6 months, since they aren't valid for
 * email.
 *
 * Also see SYNC_RANGE_ENUMS_TO_MS in `syncbase.js`.
 */
var SYNC_RANGE_TO_FILTER_TYPE = {
  'auto': null,
    '1d': FILTER_TYPE.OneDayBack,
    '3d': FILTER_TYPE.ThreeDaysBack,
    '1w': FILTER_TYPE.OneWeekBack,
    '2w': FILTER_TYPE.TwoWeeksBack,
    '1m': FILTER_TYPE.OneMonthBack,
   'all': FILTER_TYPE.NoFilter,
};

/**
 * This mapping is purely for logging purposes.
 */
var FILTER_TYPE_TO_STRING = {
  0: 'all messages',
  1: 'one day',
  2: 'three days',
  3: 'one week',
  4: 'two weeks',
  5: 'one month',
};

function ActiveSyncFolderConn(account, storage, _parentLog) {
  this._account = account;
  this._storage = storage;
  this._LOG = LOGFAB.ActiveSyncFolderConn(this, _parentLog, storage.folderId);

  this.folderMeta = storage.folderMeta;

  if (!this.syncKey)
    this.syncKey = '0';
}
ActiveSyncFolderConn.prototype = {
  get syncKey() {
    return this.folderMeta.syncKey;
  },

  set syncKey(value) {
    return this.folderMeta.syncKey = value;
  },

  get serverId() {
    return this.folderMeta.serverId;
  },

  /**
   * Get the filter type for this folder. The account-level syncRange property
   * takes precedence here, but if it's set to "auto", we'll look at the
   * filterType on a per-folder basis. The per-folder filterType may be
   * undefined, in which case, we will attempt to infer a good filter type
   * elsewhere (see _inferFilterType()).
   */
  get filterType() {
    var syncRange = this._account.accountDef.syncRange;
    if (SYNC_RANGE_TO_FILTER_TYPE.hasOwnProperty(syncRange)) {
      var accountFilterType = SYNC_RANGE_TO_FILTER_TYPE[syncRange];
      if (accountFilterType)
        return accountFilterType;
      else
        return this.folderMeta.filterType;
    }
    else {
      console.warn('Got an invalid syncRange (' + syncRange +
                   ') using three days back instead');
      return $ascp.AirSync.Enums.FilterType.ThreeDaysBack;
    }
  },

  /**
   * Get the initial sync key for the folder so we can start getting data. We
   * assume we have already negotiated a connection in the caller.
   *
   * @param {string} filterType The filter type for our synchronization
   * @param {function} callback A callback to be run when the operation finishes
   */
  _getSyncKey: function asfc__getSyncKey(filterType, callback) {
    var folderConn = this;
    var account = this._account;
    var as = $ascp.AirSync.Tags;

    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(as.Sync)
       .stag(as.Collections)
         .stag(as.Collection)

    if (account.conn.currentVersion.lt('12.1'))
          w.tag(as.Class, 'Email');

          w.tag(as.SyncKey, '0')
           .tag(as.CollectionId, this.serverId)
           .stag(as.Options)
             .tag(as.FilterType, filterType)
           .etag()
         .etag()
       .etag()
     .etag();

    account.conn.postCommand(w, function(aError, aResponse) {
      if (aError) {
        console.error(aError);
        callback('unknown');
        return;
      }

      // Reset the SyncKey, just in case we don't see a sync key in the
      // response.
      folderConn.syncKey = '0';

      var e = new $wbxml.EventParser();
      e.addEventListener([as.Sync, as.Collections, as.Collection, as.SyncKey],
                         function(node) {
        folderConn.syncKey = node.children[0].textContent;
      });

      e.onerror = function() {}; // Ignore errors.
      e.run(aResponse);

      if (folderConn.syncKey === '0') {
        // We should never actually hit this, since it would mean that the
        // server is refusing to give us a sync key. On the off chance that we
        // do hit it, just bail.
        console.error('Unable to get sync key for folder');
        callback('unknown');
      }
      else {
        callback();
      }
    });
  },

  /**
   * Get an estimate of the number of messages to be synced.  We assume we have
   * already negotiated a connection in the caller.
   *
   * @param {string} filterType The filter type for our estimate
   * @param {function} callback A callback to be run when the operation finishes
   */
  _getItemEstimate: function asfc__getItemEstimate(filterType, callback) {
    var ie = $ascp.ItemEstimate.Tags;
    var as = $ascp.AirSync.Tags;

    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(ie.GetItemEstimate)
       .stag(ie.Collections)
         .stag(ie.Collection)
           .tag(as.SyncKey, this.syncKey)
           .tag(ie.CollectionId, this.serverId)
           .stag(as.Options)
             .tag(as.FilterType, filterType)
           .etag()
         .etag()
       .etag()
     .etag();

    this._account.conn.postCommand(w, function(aError, aResponse) {
      if (aError) {
        console.error(aError);
        callback('unknown');
        return;
      }

      var e = new $wbxml.EventParser();
      var base = [ie.GetItemEstimate, ie.Response];

      var status, estimate;
      e.addEventListener(base.concat(ie.Status), function(node) {
        status = node.children[0].textContent;
      });
      e.addEventListener(base.concat(ie.Collection, ie.Estimate),
                         function(node) {
        estimate = parseInt(node.children[0].textContent, 10);
      });

      try {
        e.run(aResponse);
      }
      catch (ex) {
        console.error('Error parsing GetItemEstimate response', ex, '\n',
                      ex.stack);
        callback('unknown');
        return;
      }

      if (status !== $ascp.ItemEstimate.Enums.Status.Success) {
        console.error('Error getting item estimate:', status);
        callback('unknown');
      }
      else {
        callback(null, estimate);
      }
    });
  },

  /**
   * Infer the filter type for this folder to get a sane number of messages.
   *
   * @param {function} callback A callback to be run when the operation
   *  finishes, taking two arguments: an error (if any), and the filter type we
   *  picked
   */
  _inferFilterType: function asfc__inferFilterType(callback) {
    var folderConn = this;
    var Type = $ascp.AirSync.Enums.FilterType;

    var getEstimate = function(filterType, onSuccess) {
      folderConn._getSyncKey(filterType, function(error) {
        if (error) {
          callback('unknown');
          return;
        }

        folderConn._getItemEstimate(filterType, function(error, estimate) {
          if (error) {
            callback('unknown');
            return;
          }

          onSuccess(estimate);
        });
      });
    };

    getEstimate(Type.TwoWeeksBack, function(estimate) {
      var messagesPerDay = estimate / 14; // Two weeks. Twoooo weeeeeeks.
      var filterType;

      if (estimate < 0)
        filterType = Type.ThreeDaysBack;
      else if (messagesPerDay >= DESIRED_MESSAGE_COUNT)
        filterType = Type.OneDayBack;
      else if (messagesPerDay * 3 >= DESIRED_MESSAGE_COUNT)
        filterType = Type.ThreeDaysBack;
      else if (messagesPerDay * 7 >= DESIRED_MESSAGE_COUNT)
        filterType = Type.OneWeekBack;
      else if (messagesPerDay * 14 >= DESIRED_MESSAGE_COUNT)
        filterType = Type.TwoWeeksBack;
      else if (messagesPerDay * 30 >= DESIRED_MESSAGE_COUNT)
        filterType = Type.OneMonthBack;
      else {
        getEstimate(Type.NoFilter, function(estimate) {
          var filterType;
          if (estimate > DESIRED_MESSAGE_COUNT) {
            filterType = Type.OneMonthBack;
            // Reset the sync key since we're changing filter types. This avoids
            // a round-trip where we'd normally get a zero syncKey from the
            // server.
            folderConn.syncKey = '0';
          }
          else {
            filterType = Type.NoFilter;
          }
          folderConn._LOG.inferFilterType(filterType);
          callback(null, filterType);
        });
        return;
      }

      if (filterType !== Type.TwoWeeksBack) {
        // Reset the sync key since we're changing filter types. This avoids a
        // round-trip where we'd normally get a zero syncKey from the server.
        folderConn.syncKey = '0';
      }
      folderConn._LOG.inferFilterType(filterType);
      callback(null, filterType);
    });
  },

  /**
   * Sync the folder with the server and enumerate all the changes since the
   * last sync.
   *
   * @param {function} callback A function to be called when the operation has
   *   completed, taking three arguments: |added|, |changed|, and |deleted|
   * @param {function} progress A function to be called as the operation
   *   progresses that takes a number in the range [0.0, 1.0] to express
   *   progress.
   */
  _enumerateFolderChanges: function asfc__enumerateFolderChanges(callback,
                                                                 progress) {
    var folderConn = this, storage = this._storage;

    if (!this._account.conn.connected) {
      this._account.conn.connect(function(error) {
        if (error) {
          callback('aborted');
          return;
        }
        folderConn._enumerateFolderChanges(callback, progress);
      });
      return;
    }
    if (!this.filterType) {
      this._inferFilterType(function(error, filterType) {
        if (error) {
          callback('unknown');
          return;
        }
        console.log('We want a filter of', FILTER_TYPE_TO_STRING[filterType]);
        folderConn.folderMeta.filterType = filterType;
        folderConn._enumerateFolderChanges(callback, progress);
      });
      return;
    }
    if (this.syncKey === '0') {
      this._getSyncKey(this.filterType, function(error) {
        if (error) {
          callback('aborted');
          return;
        }
        folderConn._enumerateFolderChanges(callback, progress);
      });
      return;
    }

    var as = $ascp.AirSync.Tags;
    var asEnum = $ascp.AirSync.Enums;
    var asb = $ascp.AirSyncBase.Tags;
    var asbEnum = $ascp.AirSyncBase.Enums;

    var w;

    // If the last sync was ours and we got an empty response back, we can send
    // an empty request to repeat our request. This saves a little bandwidth.
    if (this._account._syncsInProgress++ === 0 &&
        this._account._lastSyncKey === this.syncKey &&
        this._account._lastSyncFilterType === this.filterType &&
        this._account._lastSyncResponseWasEmpty) {
      w = as.Sync;
    }
    else {
      w = new $wbxml.Writer('1.3', 1, 'UTF-8');
      w.stag(as.Sync)
         .stag(as.Collections)
           .stag(as.Collection);

      if (this._account.conn.currentVersion.lt('12.1'))
            w.tag(as.Class, 'Email');

            w.tag(as.SyncKey, this.syncKey)
             .tag(as.CollectionId, this.serverId)
             .tag(as.GetChanges)
             .stag(as.Options)
               .tag(as.FilterType, this.filterType)

      // XXX: For some servers (e.g. Hotmail), we could be smart and get the
      // native body type (plain text or HTML), but Gmail doesn't seem to let us
      // do this. For now, let's keep it simple and always get HTML.
      if (this._account.conn.currentVersion.gte('12.0'))
              w.stag(asb.BodyPreference)
                 .tag(asb.Type, asbEnum.Type.HTML)
               .etag();

              w.tag(as.MIMESupport, asEnum.MIMESupport.Never)
               .tag(as.MIMETruncation, asEnum.MIMETruncation.NoTruncate)
             .etag()
           .etag()
         .etag()
       .etag();
    }

    this._account.conn.postCommand(w, function(aError, aResponse) {
      var added   = [];
      var changed = [];
      var deleted = [];
      var status;
      var moreAvailable = false;

      folderConn._account._syncsInProgress--;

      if (aError) {
        console.error('Error syncing folder:', aError);
        callback('aborted');
        return;
      }

      folderConn._account._lastSyncKey = folderConn.syncKey;
      folderConn._account._lastSyncFilterType = folderConn.filterType;

      if (!aResponse) {
        console.log('Sync completed with empty response');
        folderConn._account._lastSyncResponseWasEmpty = true;
        callback(null, added, changed, deleted);
        return;
      }

      folderConn._account._lastSyncResponseWasEmpty = false;
      var e = new $wbxml.EventParser();
      var base = [as.Sync, as.Collections, as.Collection];

      e.addEventListener(base.concat(as.SyncKey), function(node) {
        folderConn.syncKey = node.children[0].textContent;
      });

      e.addEventListener(base.concat(as.Status), function(node) {
        status = node.children[0].textContent;
      });

      e.addEventListener(base.concat(as.MoreAvailable), function(node) {
        moreAvailable = true;
      });

      e.addEventListener(base.concat(as.Commands, [[as.Add, as.Change]]),
                         function(node) {
        var id, guid, msg;

        for (var iter in Iterator(node.children)) {
          var child = iter[1];
          switch (child.tag) {
          case as.ServerId:
            guid = child.children[0].textContent;
            break;
          case as.ApplicationData:
            try {
              msg = folderConn._parseMessage(child, node.tag === as.Add);
            }
            catch (ex) {
              // If we get an error, just log it and skip this message.
              console.error('Failed to parse a message:', ex, '\n', ex.stack);
              return;
            }
            break;
          }
        }

        if (node.tag === as.Add) {
          msg.header.id = id = storage._issueNewHeaderId();
          msg.header.suid = folderConn._storage.folderId + '/' + id;
          msg.header.guid = '';
        }
        msg.header.srvid = guid;
        // XXX need to get the message's message-id header value!

        var collection = node.tag === as.Add ? added : changed;
        collection.push(msg);
      });

      e.addEventListener(base.concat(as.Commands, [[as.Delete, as.SoftDelete]]),
                         function(node) {
        var guid;

        for (var iter in Iterator(node.children)) {
          var child = iter[1];
          switch (child.tag) {
          case as.ServerId:
            guid = child.children[0].textContent;
            break;
          }
        }

        deleted.push(guid);
      });

      try {
        e.run(aResponse);
      }
      catch (ex) {
        console.error('Error parsing Sync response:', ex, '\n', ex.stack);
        callback('unknown');
        return;
      }

      if (status === asEnum.Status.Success) {
        console.log('Sync completed: added ' + added.length + ', changed ' +
                    changed.length + ', deleted ' + deleted.length);
        callback(null, added, changed, deleted, moreAvailable);
        if (moreAvailable)
          folderConn._enumerateFolderChanges(callback, progress);
      }
      else if (status === asEnum.Status.InvalidSyncKey) {
        console.warn('ActiveSync had a bad sync key');
        callback('badkey');
      }
      else {
        console.error('Something went wrong during ActiveSync syncing and we ' +
                      'got a status of ' + status);
        callback('unknown');
      }
    }, null, null,
    function progressData(bytesSoFar, totalBytes) {
      // We get the XHR progress status and convert it into progress in the
      // range [0.10, 0.80].  The remaining 20% is processing the specific
      // messages, but we don't bother to generate notifications since that
      // is done synchronously.
      if (!totalBytes)
        totalBytes = Math.max(1000000, bytesSoFar);
      progress(0.1 + 0.7 * bytesSoFar / totalBytes);
    });
  },

  /**
   * Parse the DOM of an individual message to build header and body objects for
   * it.
   *
   * @param {WBXML.Element} node The fully-parsed node describing the message
   * @param {boolean} isAdded True if this is a new message, false if it's a
   *   changed one
   * @return {object} An object containing the header and body for the message
   */
  _parseMessage: function asfc__parseMessage(node, isAdded) {
    var em = $ascp.Email.Tags;
    var asb = $ascp.AirSyncBase.Tags;
    var asbEnum = $ascp.AirSyncBase.Enums;

    var header, body, flagHeader;

    if (isAdded) {
      header = {
        id: null,
        srvid: null,
        suid: null,
        guid: null,
        author: null,
        date: null,
        flags: [],
        hasAttachments: false,
        subject: null,
        snippet: null,
      };

      body = {
        date: null,
        size: 0,
        to: null,
        cc: null,
        bcc: null,
        replyTo: null,
        attachments: [],
        relatedParts: [],
        references: null,
        bodyReps: null,
      };

      flagHeader = function(flag, state) {
        if (state)
          header.flags.push(flag);
      }
    }
    else {
      header = {
        flags: [],
        mergeInto: function(o) {
          // Merge flags
          for (var iter in Iterator(this.flags)) {
            var flagstate = iter[1];
            if (flagstate[1]) {
              o.flags.push(flagstate[0]);
            }
            else {
              var index = o.flags.indexOf(flagstate[0]);
              if (index !== -1)
                o.flags.splice(index, 1);
            }
          }

          // Merge everything else
          var skip = ['mergeInto', 'suid', 'srvid', 'guid', 'id', 'flags'];
          for (var iter in Iterator(this)) {
            var key = iter[0], value = iter[1];
            if (skip.indexOf(key) !== -1)
              continue;

            o[key] = value;
          }
        },
      };

      body = {
        mergeInto: function(o) {
          for (var iter in Iterator(this)) {
            var key = iter[0], value = iter[1];
            if (key === 'mergeInto') continue;
            o[key] = value;
          }
        },
      };

      flagHeader = function(flag, state) {
        header.flags.push([flag, state]);
      }
    }

    var bodyType, bodyText;

    for (var iter in Iterator(node.children)) {
      var child = iter[1];
      var childText = child.children.length ? child.children[0].textContent :
                                              null;

      switch (child.tag) {
      case em.Subject:
        header.subject = childText;
        break;
      case em.From:
        header.author = $mimelib.parseAddresses(childText)[0] || null;
        break;
      case em.To:
        body.to = $mimelib.parseAddresses(childText);
        break;
      case em.Cc:
        body.cc = $mimelib.parseAddresses(childText);
        break;
      case em.ReplyTo:
        body.replyTo = $mimelib.parseAddresses(childText);
        break;
      case em.DateReceived:
        body.date = header.date = new Date(childText).valueOf();
        break;
      case em.Read:
        flagHeader('\\Seen', childText === '1');
        break;
      case em.Flag:
        for (var iter2 in Iterator(child.children)) {
          var grandchild = iter2[1];
          if (grandchild.tag === em.Status)
            flagHeader('\\Flagged', grandchild.children[0].textContent !== '0');
        }
        break;
      case asb.Body: // ActiveSync 12.0+
        for (var iter2 in Iterator(child.children)) {
          var grandchild = iter2[1];
          switch (grandchild.tag) {
          case asb.Type:
            bodyType = grandchild.children[0].textContent;
            break;
          case asb.Data:
            bodyText = grandchild.children[0].textContent;
            break;
          }
        }
        break;
      case em.Body: // pre-ActiveSync 12.0
        bodyType = asbEnum.Type.PlainText;
        bodyText = childText;
        break;
      case asb.Attachments: // ActiveSync 12.0+
      case em.Attachments:  // pre-ActiveSync 12.0
        for (var iter2 in Iterator(child.children)) {
          var attachmentNode = iter2[1];
          if (attachmentNode.tag !== asb.Attachment &&
              attachmentNode.tag !== em.Attachment)
            continue;

          var attachment = {
            name: null,
            contentId: null,
            type: null,
            part: null,
            encoding: null,
            sizeEstimate: null,
            file: null,
          };

          var isInline = false;
          for (var iter3 in Iterator(attachmentNode.children)) {
            var attachData = iter3[1];
            var dot, ext;
            var attachDataText = attachData.children.length ?
                                 attachData.children[0].textContent : null;

            switch (attachData.tag) {
            case asb.DisplayName:
            case em.DisplayName:
              attachment.name = attachDataText;

              // Get the file's extension to look up a mimetype, but ignore it
              // if the filename is of the form '.bashrc'.
              dot = attachment.name.lastIndexOf('.');
              ext = dot > 0 ? attachment.name.substring(dot + 1) : '';
              attachment.type = $mimelib.contentTypes[ext] ||
                                'application/octet-stream';
              break;
            case asb.FileReference:
            case em.AttName:
              attachment.part = attachDataText;
              break;
            case asb.EstimatedDataSize:
            case em.AttSize:
              attachment.sizeEstimate = parseInt(attachDataText, 10);
              break;
            case asb.ContentId:
              attachment.contentId = attachDataText;
              break;
            case asb.IsInline:
              isInline = (attachDataText === '1');
              break;
            case asb.FileReference:
            case em.Att0Id:
              attachment.part = attachData.children[0].textContent;
              break;
            }
          }

          if (isInline)
            body.relatedParts.push(attachment);
          else
            body.attachments.push(attachment);
        }
        header.hasAttachments = body.attachments.length > 0;
        break;
      }
    }

    // Process the body as needed.
    if (bodyType === asbEnum.Type.PlainText) {
      var bodyRep = $quotechew.quoteProcessTextBody(bodyText);
      header.snippet = $quotechew.generateSnippet(bodyRep,
                                                  DESIRED_SNIPPET_LENGTH);
      body.bodyReps = ['plain', bodyRep];
    }
    else if (bodyType === asbEnum.Type.HTML) {
      var htmlNode = $htmlchew.sanitizeAndNormalizeHtml(bodyText);
      header.snippet = $htmlchew.generateSnippet(htmlNode,
                                                 DESIRED_SNIPPET_LENGTH);
      body.bodyReps = ['html', htmlNode.innerHTML];
    }

    return { header: header, body: body };
  },

  sync: function asfc_sync(accuracyStamp, doneCallback, progressCallback) {
    var folderConn = this,
        addedMessages = 0,
        changedMessages = 0,
        deletedMessages = 0;

    this._LOG.sync_begin(null, null, null);
    this._enumerateFolderChanges(function (error, added, changed, deleted,
                                           moreAvailable) {
      var storage = folderConn._storage;

      if (error === 'badkey') {
        folderConn._account._recreateFolder(storage.folderId, function(s) {
          // If we got a bad sync key, we'll end up creating a new connection,
          // so just clear out the old storage to make this connection unusable.
          folderConn._storage = null;
          folderConn._LOG.sync_end(null, null, null);
        });
        return;
      }
      else if (error) {
        doneCallback(error);
        return;
      }

      for (var iter in Iterator(added)) {
        var message = iter[1];
        // If we already have this message, it's probably because we moved it as
        // part of a local op, so let's assume that the data we already have is
        // ok. XXX: We might want to verify this, to be safe.
        if (storage.hasMessageWithServerId(message.header.srvid))
          continue;

        storage.addMessageHeader(message.header);
        storage.addMessageBody(message.header, message.body);
        addedMessages++;
      }

      for (var iter in Iterator(changed)) {
        var message = iter[1];
        // If we don't know about this message, just bail out.
        if (!storage.hasMessageWithServerId(message.header.srvid))
          continue;

        storage.updateMessageHeaderByServerId(message.header.srvid, true,
                                              function(oldHeader) {
          message.header.mergeInto(oldHeader);
          return true;
        });
        changedMessages++;
        // XXX: update bodies
      }

      for (var iter in Iterator(deleted)) {
        var messageGuid = iter[1];
        // If we don't know about this message, it's probably because we already
        // deleted it.
        if (!storage.hasMessageWithServerId(messageGuid))
          continue;

        storage.deleteMessageByServerId(messageGuid);
        deletedMessages++;
      }

      if (!moreAvailable) {
        var messagesSeen = addedMessages + changedMessages + deletedMessages;

        // Note: For the second argument here, we report the number of messages
        // we saw that *changed*. This differs from IMAP, which reports the
        // number of messages it *saw*.
        folderConn._LOG.sync_end(addedMessages, changedMessages,
                                 deletedMessages);
        storage.markSyncRange($sync.OLDEST_SYNC_DATE, accuracyStamp, 'XXX',
                              accuracyStamp);
        doneCallback(null, null, messagesSeen);
      }
    },
    progressCallback);
  },

  performMutation: function(invokeWithWriter, callWhenDone) {
    var folderConn = this;
    if (!this._account.conn.connected) {
      this._account.conn.connect(function(error) {
        if (error) {
          callback('unknown');
          return;
        }
        folderConn.performMutation(invokeWithWriter, callWhenDone);
      });
      return;
    }

    var as = $ascp.AirSync.Tags;

    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(as.Sync)
       .stag(as.Collections)
         .stag(as.Collection);

    if (this._account.conn.currentVersion.lt('12.1'))
          w.tag(as.Class, 'Email');

          w.tag(as.SyncKey, this.syncKey)
           .tag(as.CollectionId, this.serverId)
           // Use DeletesAsMoves in non-trash folders. Don't use it in trash
           // folders because that doesn't make any sense.
           .tag(as.DeletesAsMoves, this.folderMeta.type === 'trash' ? '0' : '1')
           // GetChanges defaults to true, so we must explicitly disable it to
           // avoid hearing about changes.
           .tag(as.GetChanges, '0')
           .stag(as.Commands);

    try {
      invokeWithWriter(w);
    }
    catch (ex) {
      console.error('Exception in performMutation callee:', ex,
                    '\n', ex.stack);
      callWhenDone('unknown');
      return;
    }

           w.etag(as.Commands)
         .etag(as.Collection)
       .etag(as.Collections)
     .etag(as.Sync);

    this._account.conn.postCommand(w, function(aError, aResponse) {
      if (aError) {
        console.error('postCommand error:', aError);
        callWhenDone('unknown');
        return;
      }

      var e = new $wbxml.EventParser();
      var syncKey, status;

      var base = [as.Sync, as.Collections, as.Collection];
      e.addEventListener(base.concat(as.SyncKey), function(node) {
        syncKey = node.children[0].textContent;
      });
      e.addEventListener(base.concat(as.Status), function(node) {
        status = node.children[0].textContent;
      });

      try {
        e.run(aResponse);
      }
      catch (ex) {
        console.error('Error parsing Sync response:', ex, '\n', ex.stack);
        callWhenDone('unknown');
        return;
      }

      if (status === $ascp.AirSync.Enums.Status.Success) {
        folderConn.syncKey = syncKey;
        if (callWhenDone)
          callWhenDone(null);
      }
      else {
        console.error('Something went wrong during ActiveSync syncing and we ' +
                      'got a status of ' + status);
        callWhenDone('status:' + status);
      }
    });
  },

  // XXX: take advantage of multipart responses here.
  // See http://msdn.microsoft.com/en-us/library/ee159875%28v=exchg.80%29.aspx
  downloadMessageAttachments: function(uid, partInfos, callback, progress) {
    var folderConn = this;
    if (!this._account.conn.connected) {
      this._account.conn.connect(function(error) {
        if (error) {
          callback('unknown');
          return;
        }
        folderConn.downloadMessageAttachments(uid, partInfos, callback,
                                              progress);
      });
      return;
    }

    var io = $ascp.ItemOperations.Tags;
    var ioStatus = $ascp.ItemOperations.Enums.Status;
    var asb = $ascp.AirSyncBase.Tags;

    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(io.ItemOperations);
    for (var iter in Iterator(partInfos)) {
      var part = iter[1];
      w.stag(io.Fetch)
         .tag(io.Store, 'Mailbox')
         .tag(asb.FileReference, part.part)
       .etag();
    }
    w.etag();

    this._account.conn.postCommand(w, function(aError, aResult) {
      if (aError) {
        console.error('postCommand error:', aError);
        callback('unknown');
        return;
      }

      var globalStatus;
      var attachments = {};

      var e = new $wbxml.EventParser();
      e.addEventListener([io.ItemOperations, io.Status], function(node) {
        globalStatus = node.children[0].textContent;
      });
      e.addEventListener([io.ItemOperations, io.Response, io.Fetch],
                         function(node) {
        var part = null, attachment = {};

        for (var iter in Iterator(node.children)) {
          var child = iter[1];
          switch (child.tag) {
          case io.Status:
            attachment.status = child.children[0].textContent;
            break;
          case asb.FileReference:
            part = child.children[0].textContent;
            break;
          case io.Properties:
            var contentType = null, data = null;

            for (var iter2 in Iterator(child.children)) {
              var grandchild = iter2[1];
              var textContent = grandchild.children[0].textContent;

              switch (grandchild.tag) {
              case asb.ContentType:
                contentType = textContent;
                break;
              case io.Data:
                data = new Buffer(textContent, 'base64');
                break;
              }
            }

            if (contentType && data)
              attachment.data = new Blob([data], { type: contentType });
            break;
          }

          if (part)
            attachments[part] = attachment;
        }
      });
      e.run(aResult);

      var error = globalStatus !== ioStatus.Success ? 'unknown' : null;
      var bodies = [];
      for (var iter in Iterator(partInfos)) {
        var part = iter[1];
        if (attachments.hasOwnProperty(part.part) &&
            attachments[part.part].status === ioStatus.Success) {
          bodies.push(attachments[part.part].data);
        }
        else {
          error = 'unknown';
          bodies.push(null);
        }
      }
      callback(error, bodies);
    });
  },
};

function ActiveSyncFolderSyncer(account, folderStorage, _parentLog) {
  this._account = account;
  this.folderStorage = folderStorage;

  this._LOG = LOGFAB.ActiveSyncFolderSyncer(this, _parentLog,
                                            folderStorage.folderId);

  this.folderConn = new ActiveSyncFolderConn(account, folderStorage, this._LOG);
}
exports.ActiveSyncFolderSyncer = ActiveSyncFolderSyncer;
ActiveSyncFolderSyncer.prototype = {
  /**
   * Can we synchronize?  Not if we don't have a server id!
   */
  get syncable() {
    return this.folderConn.serverId !== null;
  },

  /**
   * Can we grow this sync range?  Not in ActiveSync land!
   */
  get canGrowSync() {
    return false;
  },

  initialSync: function(slice, initialDays, syncCallback,
                        doneCallback, progressCallback) {
    syncCallback('sync', false, true);
    this.folderConn.sync(
      $date.NOW(),
      this.onSyncCompleted.bind(this, doneCallback, true),
      progressCallback);
  },

  refreshSync: function(slice, dir, startTS, endTS, origStartTS,
                        doneCallback, progressCallback) {
    this.folderConn.sync(
      $date.NOW(),
      this.onSyncCompleted.bind(this, doneCallback, false),
      progressCallback);
  },

  // Returns false if no sync is necessary.
  growSync: function(slice, growthDirection, anchorTS, syncStepDays,
                     doneCallback, progressCallback) {
    // ActiveSync is different, and trying to sync more doesn't work with it.
    // Just assume we've got all we need.
    // (There is no need to invoke the callbacks; by returning false, we
    // indicate that we did no work.)
    return false;
  },

  /**
   * Whatever synchronization we last triggered has now completed; we should
   * either trigger another sync if we still want more data, or close out the
   * current sync.
   */
  onSyncCompleted: function ifs_onSyncCompleted(doneCallback, initialSync,
                                                err, bisectInfo, messagesSeen) {
    var storage = this.folderStorage;
    console.log("Sync Completed!", messagesSeen, "messages synced");

    // Expand the accuracy range to cover everybody.
    if (!err)
      storage.markSyncedToDawnOfTime();
    // Always save state, although as an optimization, we could avoid saving state
    // if we were sure that our state with the server did not advance.
    this._account.__checkpointSyncCompleted();

    if (err) {
      doneCallback(err);
      return;
    }

    if (initialSync) {
      storage._curSyncSlice.ignoreHeaders = false;
      storage._curSyncSlice.waitingOnData = 'db';

      storage.getMessagesInImapDateRange(
        0, null, $sync.INITIAL_FILL_SIZE, $sync.INITIAL_FILL_SIZE,
        // Don't trigger a refresh; we just synced.  Accordingly, releaseMutex can
        // be null.
        storage.onFetchDBHeaders.bind(storage, storage._curSyncSlice, false,
                                      doneCallback, null)
      );
    }
    else {
      doneCallback(err);
    }
  },

  allConsumersDead: function() {
  },

  shutdown: function() {
    this.folderConn.shutdown();
    this._LOG.__die();
  },
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  ActiveSyncFolderConn: {
    type: $log.CONNECTION,
    subtype: $log.CLIENT,
    events: {
      inferFilterType: { filterType: false },
    },
    asyncJobs: {
      sync: {
        newMessages: true, changedMessages: true, deletedMessages: true,
      },
    },
  },
  ActiveSyncFolderSyncer: {
    type: $log.DATABASE,
    events: {
    }
  },
});

}); // end define
;
define('mailapi/activesync/jobs',
  [
    'wbxml',
    'activesync/codepages',
    'activesync/protocol',
    'rdcommon/log',
    '../jobmixins',
    'module',
    'exports'
  ],
  function(
    $wbxml,
    $ascp,
    $activesync,
    $log,
    $jobmixins,
    $module,
    exports
  ) {
'use strict';

function ActiveSyncJobDriver(account, state, _parentLog) {
  this.account = account;
  // XXX for simplicity for now, let's assume that ActiveSync GUID's are
  // maintained across folder moves.
  this.resilientServerIds = true;
  this._heldMutexReleasers = [];

  this._LOG = LOGFAB.ActiveSyncJobDriver(this, _parentLog, this.account.id);

  this._state = state;
  // (we only need to use one as a proxy for initialization)
  if (!state.hasOwnProperty('suidToServerId')) {
    state.suidToServerId = {};
    state.moveMap = {};
  }

  this._stateDelta = {
    serverIdMap: null,
    moveMap: null,
  };
}
exports.ActiveSyncJobDriver = ActiveSyncJobDriver;
ActiveSyncJobDriver.prototype = {
  //////////////////////////////////////////////////////////////////////////////
  // helpers

  postJobCleanup: $jobmixins.postJobCleanup,

  allJobsDone: $jobmixins.allJobsDone,

  _accessFolderForMutation: function(folderId, needConn, callback, deathback,
                                     label) {
    var storage = this.account.getFolderStorageForFolderId(folderId),
        self = this;
    storage.runMutexed(label, function(releaseMutex) {
      self._heldMutexReleasers.push(releaseMutex);

      var syncer = storage.folderSyncer;
      if (needConn && !self.account.conn.connected) {
        self.account.conn.connect(function(error) {
          try {
            callback(syncer.folderConn, storage);
          }
          catch (ex) {
            self._LOG.callbackErr(ex);
          }
        });
      }
      else {
        try {
          callback(syncer.folderConn, storage);
        }
        catch (ex) {
          self._LOG.callbackErr(ex);
        }
      }
    });
  },

  _partitionAndAccessFoldersSequentially:
    $jobmixins._partitionAndAccessFoldersSequentially,

  //////////////////////////////////////////////////////////////////////////////
  // modtags

  local_do_modtags: $jobmixins.local_do_modtags,

  do_modtags: function(op, jobDoneCallback, undo) {
    // Note: this method is derived from the IMAP implementation.
    var addTags = undo ? op.removeTags : op.addTags,
        removeTags = undo ? op.addTags : op.removeTags;

    function getMark(tag) {
      if (addTags && addTags.indexOf(tag) !== -1)
        return true;
      if (removeTags && removeTags.indexOf(tag) !== -1)
        return false;
      return undefined;
    }

    var markRead = getMark('\\Seen');
    var markFlagged = getMark('\\Flagged');

    var as = $ascp.AirSync.Tags;
    var em = $ascp.Email.Tags;

    var aggrErr = null;

    this._partitionAndAccessFoldersSequentially(
      op.messages, true,
      function perFolder(folderConn, storage, serverIds, namers, callWhenDone) {
        var modsToGo = 0;
        function tagsModded(err) {
          if (err) {
            console.error('failure modifying tags', err);
            aggrErr = 'unknown';
            return;
          }
          op.progress += (undo ? -serverIds.length : serverIds.length);
          if (--modsToGo === 0)
            callWhenDone();
        }

        // Filter out any offline headers, since the server naturally can't do
        // anything for them. If this means we have no headers at all, just bail
        // out.
        serverIds = serverIds.filter(function(srvid) { return !!srvid; });
        if (!serverIds.length) {
          callWhenDone();
          return;
        }

        folderConn.performMutation(
          function withWriter(w) {
            for (var i = 0; i < serverIds.length; i++) {
              w.stag(as.Change)
                 .tag(as.ServerId, serverIds[i])
                 .stag(as.ApplicationData);

              if (markRead !== undefined)
                w.tag(em.Read, markRead ? '1' : '0');

              if (markFlagged !== undefined)
                w.stag(em.Flag)
                   .tag(em.Status, markFlagged ? '2' : '0')
                 .etag();

                w.etag(as.ApplicationData)
             .etag(as.Change);
            }
          },
          function mutationPerformed(err) {
            if (err)
              aggrErr = err;
            callWhenDone();
          });
      },
      function allDone() {
        jobDoneCallback(aggrErr);
      },
      function deadConn() {
        aggrErr = 'aborted-retry';
      },
      /* reverse if we're undoing */ undo,
      'modtags');
  },

  check_modtags: function(op, callback) {
    callback(null, 'idempotent');
  },

  local_undo_modtags: $jobmixins.local_undo_modtags,

  undo_modtags: function(op, callback) {
    this.do_modtags(op, callback, true);
  },

  //////////////////////////////////////////////////////////////////////////////
  // move

  local_do_move: $jobmixins.local_do_move,

  do_move: function(op, jobDoneCallback) {
    /*
     * The ActiveSync command for this does not produce or consume SyncKeys.
     * As such, we don't need to acquire mutexes for the source folders for
     * synchronization correctness, although it is helpful for ordering
     * purposes and reducing confusion.
     *
     * For the target folder a similar logic exists as long as the server-issued
     * GUID's are resilient against folder moves.  However, we do require in
     * all cases that before synchronizing the target folder that we make sure
     * all move operations to the folder have completed so we message doesn't
     * disappear and then show up again. XXX we are not currently enforcing this
     * yet.
     */
    var aggrErr = null, account = this.account,
        targetFolderStorage = this.account.getFolderStorageForFolderId(
                                op.targetFolder);
    var mo = $ascp.Move.Tags;

    this._partitionAndAccessFoldersSequentially(
      op.messages, true,
      function perFolder(folderConn, storage, serverIds, namers, callWhenDone) {
        // Filter out any offline headers, since the server naturally can't do
        // anything for them. If this means we have no headers at all, just bail
        // out.
        serverIds = serverIds.filter(function(srvid) { return !!srvid; });
        if (!serverIds.length) {
          callWhenDone();
          return;
        }

        // Filter out any offline headers, since the server naturally can't do
        // anything for them. If this means we have no headers at all, just bail
        // out.
        serverIds = serverIds.filter(function(srvid) { return !!srvid; });
        if (!serverIds.length) {
          callWhenDone();
          return;
        }

        var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
        w.stag(mo.MoveItems);
        for (var i = 0; i < serverIds.length; i++) {
          w.stag(mo.Move)
             .tag(mo.SrcMsgId, serverIds[i])
             .tag(mo.SrcFldId, storage.folderMeta.serverId)
             .tag(mo.DstFldId, targetFolderStorage.folderMeta.serverId)
           .etag(mo.Move);
        }
        w.etag(mo.MoveItems);

        account.conn.postCommand(w, function(err, response) {
          if (err) {
            aggrErr = err;
            console.error('failure moving messages:', err);
          }
          callWhenDone();
        });
      },
      function allDone() {
        jobDoneCallback(aggrErr, null, true);
      },
      function deadConn() {
        aggrErr = 'aborted-retry';
      },
      false,
      'move');
  },

  check_move: function(op, jobDoneCallback) {

  },

  local_undo_move: $jobmixins.local_undo_move,

  undo_move: function(op, jobDoneCallback) {
  },

  //////////////////////////////////////////////////////////////////////////////
  // delete

  local_do_delete: $jobmixins.local_do_delete,

  do_delete: function(op, jobDoneCallback) {
    var aggrErr = null;
    var as = $ascp.AirSync.Tags;
    var em = $ascp.Email.Tags;

    this._partitionAndAccessFoldersSequentially(
      op.messages, true,
      function perFolder(folderConn, storage, serverIds, namers, callWhenDone) {
        // Filter out any offline headers, since the server naturally can't do
        // anything for them. If this means we have no headers at all, just bail
        // out.
        serverIds = serverIds.filter(function(srvid) { return !!srvid; });
        if (!serverIds.length) {
          callWhenDone();
          return;
        }

        folderConn.performMutation(
          function withWriter(w) {
            for (var i = 0; i < serverIds.length; i++) {
              w.stag(as.Delete)
                 .tag(as.ServerId, serverIds[i])
               .etag(as.Delete);
            }
          },
          function mutationPerformed(err) {
            if (err) {
              aggrErr = err;
              console.error('failure deleting messages:', err);
            }
            callWhenDone();
          });
      },
      function allDone() {
        jobDoneCallback(aggrErr, null, true);
      },
      function deadConn() {
        aggrErr = 'aborted-retry';
      },
      false,
      'delete');
  },

  check_delete: function(op, callback) {
    callback(null, 'idempotent');
  },

  local_undo_delete: $jobmixins.local_undo_delete,

  // TODO implement
  undo_delete: function(op, callback) {
    callback('moot');
  },

  //////////////////////////////////////////////////////////////////////////////
  // syncFolderList
  //
  // Synchronize our folder list.  This should always be an idempotent operation
  // that makes no sense to undo/redo/etc.

  local_do_syncFolderList: function(op, doneCallback) {
    doneCallback(null);
  },

  do_syncFolderList: function(op, doneCallback) {
    var account = this.account, self = this;
    // establish a connection if we are not already connected
    if (!account.conn.connected) {
      account.conn.connect(function(error) {
        if (error) {
          doneCallback('aborted-retry');
          return;
        }
        self.do_syncFolderList(op, doneCallback);
      });
      return;
    }

    // The inbox needs to be resynchronized if there was no server id and we
    // have active slices displaying the contents of the folder.  (No server id
    // means the sync will not happen.)
    var inboxFolder = account.getFirstFolderWithType('inbox'),
        inboxStorage;
    if (inboxFolder && inboxFolder.serverId === null)
      inboxStorage = account.getFolderStorageForFolderId(inboxFolder.id);

    account.syncFolderList(function(err) {
      if (!err)
        account.meta.lastFolderSyncAt = Date.now();
      // save if it worked
      doneCallback(err ? 'aborted-retry' : null, null, !err);

      if (inboxStorage && inboxStorage.hasActiveSlices) {
        if (!err) {
          console.log("Refreshing fake inbox");
          inboxStorage.resetAndRefreshActiveSlices();
        }
        // XXX: If we do have an error here, we should probably report
        // syncfailed on the slices to let the user retry. However, what needs
        // retrying is syncFolderList, not syncing the messages in a folder.
        // Since that's complicated to handle, and syncFolderList will retry
        // automatically, we can ignore that case for now.
      }
    });
  },

  check_syncFolderList: function(op, doneCallback) {
    doneCallback('idempotent');
  },

  local_undo_syncFolderList: function(op, doneCallback) {
    doneCallback('moot');
  },

  undo_syncFolderList: function(op, doneCallback) {
    doneCallback('moot');
  },

  //////////////////////////////////////////////////////////////////////////////
  // download

  local_do_download: $jobmixins.local_do_download,

  do_download: $jobmixins.do_download,

  check_download: $jobmixins.check_download,

  local_undo_download: $jobmixins.local_undo_download,

  undo_download: $jobmixins.undo_download,

  //////////////////////////////////////////////////////////////////////////////
  // purgeExcessMessages is a NOP for activesync

  local_do_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  do_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  check_purgeExcessMessages: function(op, doneCallback) {
    return 'idempotent';
  },

  local_undo_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  undo_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  //////////////////////////////////////////////////////////////////////////////
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  ActiveSyncJobDriver: {
    type: $log.DAEMON,
    errors: {
      callbackErr: { ex: $log.EXCEPTION },
    },
  },
});

}); // end define
;
/**
 * Implements the ActiveSync protocol for Hotmail and Exchange.
 **/

define('mailapi/activesync/account',
  [
    'rdcommon/log',
    'mailcomposer',
    'wbxml',
    'activesync/codepages',
    'activesync/protocol',
    '../a64',
    '../accountmixins',
    '../mailslice',
    '../searchfilter',
    './folder',
    './jobs',
    '../util',
    'module',
    'exports'
  ],
  function(
    $log,
    $mailcomposer,
    $wbxml,
    $ascp,
    $activesync,
    $a64,
    $acctmixins,
    $mailslice,
    $searchfilter,
    $asfolder,
    $asjobs,
    $util,
    $module,
    exports
  ) {
'use strict';

var bsearchForInsert = $util.bsearchForInsert;

var DEFAULT_TIMEOUT_MS = exports.DEFAULT_TIMEOUT_MS = 30 * 1000;

function ActiveSyncAccount(universe, accountDef, folderInfos, dbConn,
                           receiveProtoConn, _parentLog) {
  this.universe = universe;
  this.id = accountDef.id;
  this.accountDef = accountDef;

  if (receiveProtoConn) {
    this.conn = receiveProtoConn;
  }
  else {
    this.conn = new $activesync.Connection();
    this.conn.open(accountDef.connInfo.server, accountDef.credentials.username,
                   accountDef.credentials.password);
    this.conn.timeout = DEFAULT_TIMEOUT_MS;

    // XXX: We should check for errors during connection and alert the user.
    this.conn.connect();
  }

  this._db = dbConn;

  this._LOG = LOGFAB.ActiveSyncAccount(this, _parentLog, this.id);

  this.enabled = true;
  this.problems = [];

  this.identities = accountDef.identities;

  this.folders = [];
  this._folderStorages = {};
  this._folderInfos = folderInfos;
  this._serverIdToFolderId = {};
  this._deadFolderIds = null;

  this._syncsInProgress = 0;
  this._lastSyncKey = null;
  this._lastSyncResponseWasEmpty = false;

  this.meta = folderInfos.$meta;
  this.mutations = folderInfos.$mutations;

  // ActiveSync has no need of a timezone offset, but it simplifies things for
  // FolderStorage to be able to rely on this.
  this.tzOffset = 0;

  // Sync existing folders
  for (var folderId in folderInfos) {
    if (folderId[0] === '$')
      continue;
    var folderInfo = folderInfos[folderId];

    this._folderStorages[folderId] =
      new $mailslice.FolderStorage(this, folderId, folderInfo, this._db,
                                   $asfolder.ActiveSyncFolderSyncer, this._LOG);
    this._serverIdToFolderId[folderInfo.$meta.serverId] = folderId;
    this.folders.push(folderInfo.$meta);
  }

  this.folders.sort(function(a, b) { return a.path.localeCompare(b.path); });

  this._jobDriver = new $asjobs.ActiveSyncJobDriver(
                          this,
                          this._folderInfos.$mutationState);

  // Ensure we have an inbox.  The server id cannot be magically known, so we
  // create it with a null id.  When we actually sync the folder list, the
  // server id will be updated.
  var inboxFolder = this.getFirstFolderWithType('inbox');
  if (!inboxFolder) {
    // XXX localized Inbox string (bug 805834)
    this._addedFolder(null, '0', 'Inbox',
                      $ascp.FolderHierarchy.Enums.Type.DefaultInbox, true);
  }
}
exports.Account = exports.ActiveSyncAccount = ActiveSyncAccount;
ActiveSyncAccount.prototype = {
  type: 'activesync',
  toString: function asa_toString() {
    return '[ActiveSyncAccount: ' + this.id + ']';
  },

  toBridgeWire: function asa_toBridgeWire() {
    return {
      id: this.accountDef.id,
      name: this.accountDef.name,
      path: this.accountDef.name,
      type: this.accountDef.type,

      enabled: this.enabled,
      problems: this.problems,

      syncRange: this.accountDef.syncRange,

      identities: this.identities,

      credentials: {
        username: this.accountDef.credentials.username,
      },

      servers: [
        {
          type: this.accountDef.type,
          connInfo: this.accountDef.connInfo
        },
      ]
    };
  },

  toBridgeFolder: function asa_toBridgeFolder() {
    return {
      id: this.accountDef.id,
      name: this.accountDef.name,
      path: this.accountDef.name,
      type: 'account',
    };
  },

  get numActiveConns() {
    return 0;
  },

  saveAccountState: function asa_saveAccountState(reuseTrans, callback,
                                                  reason) {
    var account = this;
    var perFolderStuff = [];
    for (var iter in Iterator(this.folders)) {
      var folder = iter[1];
      var folderStuff = this._folderStorages[folder.id]
                           .generatePersistenceInfo();
      if (folderStuff)
        perFolderStuff.push(folderStuff);
    }

    this._LOG.saveAccountState(reason);
    var trans = this._db.saveAccountFolderStates(
      this.id, this._folderInfos, perFolderStuff, this._deadFolderIds,
      function stateSaved() {
        if (callback)
         callback();
      }, reuseTrans);
    this._deadFolderIds = null;
    return trans;
  },

  /**
   * We are being told that a synchronization pass completed, and that we may
   * want to consider persisting our state.
   */
  __checkpointSyncCompleted: function() {
    this.saveAccountState(null, null, 'checkpointSync');
  },

  shutdown: function asa_shutdown() {
    this._LOG.__die();
  },

  sliceFolderMessages: function asa_sliceFolderMessages(folderId,
                                                        bridgeHandle) {
    var storage = this._folderStorages[folderId],
        slice = new $mailslice.MailSlice(bridgeHandle, storage, this._LOG);

    storage.sliceOpenMostRecent(slice);
  },

  searchFolderMessages: function(folderId, bridgeHandle, phrase, whatToSearch) {
    var storage = this._folderStorages[folderId],
        slice = new $searchfilter.SearchSlice(bridgeHandle, storage, phrase,
                                              whatToSearch, this._LOG);
    // the slice is self-starting, we don't need to call anything on storage
  },

  syncFolderList: function asa_syncFolderList(callback) {
    // We can assume that we already have a connection here, since jobs.js
    // ensures it.
    var account = this;

    var fh = $ascp.FolderHierarchy.Tags;
    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(fh.FolderSync)
       .tag(fh.SyncKey, this.meta.syncKey)
     .etag();

    this.conn.postCommand(w, function(aError, aResponse) {
      if (aError) {
        callback(aError);
        return;
      }
      var e = new $wbxml.EventParser();
      var deferredAddedFolders = [];

      e.addEventListener([fh.FolderSync, fh.SyncKey], function(node) {
        account.meta.syncKey = node.children[0].textContent;
      });

      e.addEventListener([fh.FolderSync, fh.Changes, [fh.Add, fh.Delete]],
                         function(node) {
        var folder = {};
        for (var iter in Iterator(node.children)) {
          var child = iter[1];
          folder[child.localTagName] = child.children[0].textContent;
        }

        if (node.tag === fh.Add) {
          if (!account._addedFolder(folder.ServerId, folder.ParentId,
                                    folder.DisplayName, folder.Type))
            deferredAddedFolders.push(folder);
        }
        else {
          account._deletedFolder(folder.ServerId);
        }
      });

      try {
        e.run(aResponse);
      }
      catch (ex) {
        console.error('Error parsing FolderSync response:', ex, '\n',
                      ex.stack);
        callback('unknown');
        return;
      }

      // It's possible we got some folders in an inconvenient order (i.e. child
      // folders before their parents). Keep trying to add folders until we're
      // done.
      while (deferredAddedFolders.length) {
        var moreDeferredAddedFolders = [];
        for (var iter in Iterator(deferredAddedFolders)) {
          var folder = iter[1];
          if (!account._addedFolder(folder.ServerId, folder.ParentId,
                                    folder.DisplayName, folder.Type))
            moreDeferredAddedFolders.push(folder);
        }
        if (moreDeferredAddedFolders.length === deferredAddedFolders.length)
          throw new Error('got some orphaned folders');
        deferredAddedFolders = moreDeferredAddedFolders;
      }

      console.log('Synced folder list');
      if (callback)
        callback(null);
    });
  },

  // Map folder type numbers from ActiveSync to Gaia's types
  _folderTypes: {
     1: 'normal', // Generic
     2: 'inbox',  // DefaultInbox
     3: 'drafts', // DefaultDrafts
     4: 'trash',  // DefaultDeleted
     5: 'sent',   // DefaultSent
     6: 'normal', // DefaultOutbox
    12: 'normal', // Mail
  },

  /**
   * Update the internal database and notify the appropriate listeners when we
   * discover a new folder.
   *
   * @param {string} serverId A GUID representing the new folder
   * @param {string} parentServerId A GUID representing the parent folder, or
   *  '0' if this is a root-level folder
   * @param {string} displayName The display name for the new folder
   * @param {string} typeNum A numeric value representing the new folder's type,
   *   corresponding to the mapping in _folderTypes above
   * @param {boolean} suppressNotification (optional) if true, don't notify any
   *   listeners of this addition
   * @return {object} the folderMeta if we added the folder, true if we don't
   *   care about this kind of folder, or null if we need to wait until later
   *   (e.g. if we haven't added the folder's parent yet)
   */
  _addedFolder: function asa__addedFolder(serverId, parentServerId, displayName,
                                          typeNum, suppressNotification) {
    if (!(typeNum in this._folderTypes))
      return true; // Not a folder type we care about.

    var folderType = $ascp.FolderHierarchy.Enums.Type;

    var path = displayName;
    var parentFolderId = null;
    var depth = 0;
    if (parentServerId !== '0') {
      parentFolderId = this._serverIdToFolderId[parentServerId];
      // We haven't learned about the parent folder. Just return, and wait until
      // we do.
      if (parentFolderId === undefined)
        return null;
      var parent = this._folderInfos[parentFolderId];
      path = parent.$meta.path + '/' + path;
      depth = parent.$meta.depth + 1;
    }

    // Handle sentinel Inbox.
    if (typeNum === folderType.DefaultInbox) {
      var existingInboxMeta = this.getFirstFolderWithType('inbox');
      if (existingInboxMeta) {
        // Update the server ID to folder ID mapping.
        delete this._serverIdToFolderId[existingInboxMeta.serverId];
        this._serverIdToFolderId[serverId] = existingInboxMeta.id;

        // Update everything about the folder meta.
        existingInboxMeta.serverId = serverId;
        existingInboxMeta.name = displayName;
        existingInboxMeta.path = path;
        existingInboxMeta.depth = depth;
        return existingInboxMeta;
      }
    }

    var folderId = this.id + '/' + $a64.encodeInt(this.meta.nextFolderNum++);
    var folderInfo = this._folderInfos[folderId] = {
      $meta: {
        id: folderId,
        serverId: serverId,
        name: displayName,
        type: this._folderTypes[typeNum],
        path: path,
        parentId: parentFolderId,
        depth: depth,
        lastSyncedAt: 0,
        syncKey: '0',
      },
      // any changes to the structure here must be reflected in _recreateFolder!
      $impl: {
        nextId: 0,
        nextHeaderBlock: 0,
        nextBodyBlock: 0,
      },
      accuracy: [],
      headerBlocks: [],
      bodyBlocks: [],
      serverIdHeaderBlockMapping: {},
    };

    console.log('Added folder ' + displayName + ' (' + folderId + ')');
    this._folderStorages[folderId] =
      new $mailslice.FolderStorage(this, folderId, folderInfo, this._db,
                                   $asfolder.ActiveSyncFolderSyncer, this._LOG);
    this._serverIdToFolderId[serverId] = folderId;

    var folderMeta = folderInfo.$meta;
    var idx = bsearchForInsert(this.folders, folderMeta, function(a, b) {
      return a.path.localeCompare(b.path);
    });
    this.folders.splice(idx, 0, folderMeta);

    if (!suppressNotification)
      this.universe.__notifyAddedFolder(this, folderMeta);

    return folderMeta;
  },

  /**
   * Update the internal database and notify the appropriate listeners when we
   * find out a folder has been removed.
   *
   * @param {string} serverId A GUID representing the deleted folder
   * @param {boolean} suppressNotification (optional) if true, don't notify any
   *   listeners of this addition
   */
  _deletedFolder: function asa__deletedFolder(serverId, suppressNotification) {
    var folderId = this._serverIdToFolderId[serverId],
        folderInfo = this._folderInfos[folderId],
        folderMeta = folderInfo.$meta;

    console.log('Deleted folder ' + folderMeta.name + ' (' + folderId + ')');
    delete this._serverIdToFolderId[serverId];
    delete this._folderInfos[folderId];
    delete this._folderStorages[folderId];

    var idx = this.folders.indexOf(folderMeta);
    this.folders.splice(idx, 1);

    if (this._deadFolderIds === null)
      this._deadFolderIds = [];
    this._deadFolderIds.push(folderId);

    if (!suppressNotification)
      this.universe.__notifyRemovedFolder(this, folderMeta);
  },

  /**
   * Recreate the folder storage for a particular folder; useful when we end up
   * desyncing with the server and need to start fresh.
   *
   * @param {string} folderId the local ID of the folder
   * @param {function} callback a function to be called when the operation is
   *   complete, taking the new folder storage
   */
  _recreateFolder: function asa__recreateFolder(folderId, callback) {
    this._LOG.recreateFolder(folderId);
    var folderInfo = this._folderInfos[folderId];
    folderInfo.$impl = {
      nextId: 0,
      nextHeaderBlock: 0,
      nextBodyBlock: 0,
    };
    folderInfo.accuracy = [];
    folderInfo.headerBlocks = [];
    folderInfo.bodyBlocks = [];
    folderInfo.serverIdHeaderBlockMapping = {};

    if (this._deadFolderIds === null)
      this._deadFolderIds = [];
    this._deadFolderIds.push(folderId);

    var self = this;
    this.saveAccountState(null, function() {
      var newStorage =
        new $mailslice.FolderStorage(self, folderId, folderInfo, self._db,
                                     $asfolder.ActiveSyncFolderSyncer,
                                     self._LOG);
      for (var iter in Iterator(self._folderStorages[folderId]._slices)) {
        var slice = iter[1];
        slice._storage = newStorage;
        slice.reset();
        newStorage.sliceOpenMostRecent(slice);
      }
      self._folderStorages[folderId]._slices = [];
      self._folderStorages[folderId] = newStorage;

      callback(newStorage);
    }, 'recreateFolder');
  },

  /**
   * Create a folder that is the child/descendant of the given parent folder.
   * If no parent folder id is provided, we attempt to create a root folder.
   *
   * @args[
   *   @param[parentFolderId String]
   *   @param[folderName]
   *   @param[containOnlyOtherFolders Boolean]{
   *     Should this folder only contain other folders (and no messages)?
   *     On some servers/backends, mail-bearing folders may not be able to
   *     create sub-folders, in which case one would have to pass this.
   *   }
   *   @param[callback @func[
   *     @args[
   *       @param[error @oneof[
   *         @case[null]{
   *           No error, the folder got created and everything is awesome.
   *         }
   *         @case['offline']{
   *           We are offline and can't create the folder.
   *         }
   *         @case['already-exists']{
   *           The folder appears to already exist.
   *         }
   *         @case['unknown']{
   *           It didn't work and we don't have a better reason.
   *         }
   *       ]]
   *       @param[folderMeta ImapFolderMeta]{
   *         The meta-information for the folder.
   *       }
   *     ]
   *   ]]{
   *   }
   * ]
   */
  createFolder: function asa_createFolder(parentFolderId, folderName,
                                          containOnlyOtherFolders, callback) {
    var account = this;
    if (!this.conn.connected) {
      this.conn.connect(function(error) {
        if (error) {
          callback('unknown');
          return;
        }
        account.createFolder(parentFolderId, folderName,
                             containOnlyOtherFolders, callback);
      });
      return;
    }

    var parentFolderServerId = parentFolderId ?
      this._folderInfos[parentFolderId] : '0';

    var fh = $ascp.FolderHierarchy.Tags;
    var fhStatus = $ascp.FolderHierarchy.Enums.Status;
    var folderType = $ascp.FolderHierarchy.Enums.Type.Mail;

    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(fh.FolderCreate)
       .tag(fh.SyncKey, this.meta.syncKey)
       .tag(fh.ParentId, parentFolderServerId)
       .tag(fh.DisplayName, folderName)
       .tag(fh.Type, folderType)
     .etag();

    this.conn.postCommand(w, function(aError, aResponse) {
      var e = new $wbxml.EventParser();
      var status, serverId;

      e.addEventListener([fh.FolderCreate, fh.Status], function(node) {
        status = node.children[0].textContent;
      });
      e.addEventListener([fh.FolderCreate, fh.SyncKey], function(node) {
        account.meta.syncKey = node.children[0].textContent;
      });
      e.addEventListener([fh.FolderCreate, fh.ServerId], function(node) {
        serverId = node.children[0].textContent;
      });

      try {
        e.run(aResponse);
      }
      catch (ex) {
        console.error('Error parsing FolderCreate response:', ex, '\n',
                      ex.stack);
        callback('unknown');
        return;
      }

      if (status === fhStatus.Success) {
        var folderMeta = account._addedFolder(serverId, parentFolderServerId,
                                              folderName, folderType);
        callback(null, folderMeta);
      }
      else if (status === fhStatus.FolderExists) {
        callback('already-exists');
      }
      else {
        callback('unknown');
      }
    });
  },

  /**
   * Delete an existing folder WITHOUT ANY ABILITY TO UNDO IT.  Current UX
   * does not desire this, but the unit tests do.
   *
   * Callback is like the createFolder one, why not.
   */
  deleteFolder: function asa_deleteFolder(folderId, callback) {
    var account = this;
    if (!this.conn.connected) {
      this.conn.connect(function(error) {
        if (error) {
          callback('unknown');
          return;
        }
        account.deleteFolder(folderId, callback);
      });
      return;
    }

    var folderMeta = this._folderInfos[folderId].$meta;

    var fh = $ascp.FolderHierarchy.Tags;
    var fhStatus = $ascp.FolderHierarchy.Enums.Status;
    var folderType = $ascp.FolderHierarchy.Enums.Type.Mail;

    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(fh.FolderDelete)
       .tag(fh.SyncKey, this.meta.syncKey)
       .tag(fh.ServerId, folderMeta.serverId)
     .etag();

    this.conn.postCommand(w, function(aError, aResponse) {
      var e = new $wbxml.EventParser();
      var status;

      e.addEventListener([fh.FolderDelete, fh.Status], function(node) {
        status = node.children[0].textContent;
      });
      e.addEventListener([fh.FolderDelete, fh.SyncKey], function(node) {
        account.meta.syncKey = node.children[0].textContent;
      });

      try {

        e.run(aResponse);
      }
      catch (ex) {
        console.error('Error parsing FolderDelete response:', ex, '\n',
                      ex.stack);
        callback('unknown');
        return;
      }

      if (status === fhStatus.Success) {
        account._deletedFolder(folderMeta.serverId);
        callback(null, folderMeta);
      }
      else {
        callback('unknown');
      }
    });
  },

  sendMessage: function asa_sendMessage(composer, callback) {
    var account = this;
    if (!this.conn.connected) {
      this.conn.connect(function(error) {
        if (error) {
          callback('unknown');
          return;
        }
        account.sendMessage(composer, callback);
      });
      return;
    }

    // we want the bcc included because that's how we tell the server the bcc
    // results.
    composer.withMessageBuffer({ includeBcc: true }, function(mimeBuffer) {
      // ActiveSync 14.0 has a completely different API for sending email. Make
      // sure we format things the right way.
      if (this.conn.currentVersion.gte('14.0')) {
        var cm = $ascp.ComposeMail.Tags;
        var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
        w.stag(cm.SendMail)
           .tag(cm.ClientId, Date.now().toString()+'@mozgaia')
           .tag(cm.SaveInSentItems)
           .stag(cm.Mime)
             .opaque(mimeBuffer)
           .etag()
         .etag();

        this.conn.postCommand(w, function(aError, aResponse) {
          if (aError) {
            console.error(aError);
            callback('unknown');
            return;
          }

          if (aResponse === null) {
            console.log('Sent message successfully!');
            callback(null);
          }
          else {
            console.error('Error sending message. XML dump follows:\n' +
                          aResponse.dump());
            callback('unknown');
          }
        });
      }
      else { // ActiveSync 12.x and lower
        this.conn.postData('SendMail', 'message/rfc822',
                           mimeBuffer,
                           function(aError, aResponse) {
          if (aError) {
            console.error(aError);
            callback('unknown');
            return;
          }

          console.log('Sent message successfully!');
          callback(null);
        }, { SaveInSent: 'T' });
      }
    }.bind(this));
  },

  getFolderStorageForFolderId: function asa_getFolderStorageForFolderId(
                               folderId) {
    return this._folderStorages[folderId];
  },

  getFolderStorageForServerId: function asa_getFolderStorageForServerId(
                               serverId) {
    return this._folderStorages[this._serverIdToFolderId[serverId]];
  },

  getFolderMetaForFolderId: function(folderId) {
    if (this._folderInfos.hasOwnProperty(folderId))
      return this._folderInfos[folderId].$meta;
    return null;
  },

  ensureEssentialFolders: function(callback) {
    // XXX I am assuming ActiveSync servers are smart enough to already come
    // with these folders.  If not, we should move IMAP's ensureEssentialFolders
    // into the mixins class.
    if (callback)
      callback();
  },

  scheduleMessagePurge: function(folderId, callback) {
    // ActiveSync servers have no incremental folder growth, so message purging
    // makes no sense for them.
    if (callback)
      callback();
  },

  runOp: $acctmixins.runOp,
  getFirstFolderWithType: $acctmixins.getFirstFolderWithType,
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  ActiveSyncAccount: {
    type: $log.ACCOUNT,
    events: {
      createFolder: {},
      deleteFolder: {},
      recreateFolder: { id: false },
      saveAccountState: { reason: false },
    },
    asyncJobs: {
      runOp: { mode: true, type: true, error: false, op: false },
    },
    errors: {
      opError: { mode: false, type: false, ex: $log.EXCEPTION },
    }
  },
});

}); // end define
;
/**
 * Configurator for activesync
 **/

define('mailapi/activesync/configurator',
  [
    'rdcommon/log',
    '../accountcommon',
    '../a64',
    'activesync/protocol',
    './account',
    'exports'
  ],
  function(
    $log,
    $accountcommon,
    $a64,
    $asproto,
    $asacct,
    exports
  ) {

exports.account = $asacct;
exports.protocol = $asproto;
exports.configurator = {
  tryToCreateAccount: function cfg_as_ttca(universe, userDetails, domainInfo,
                                           callback, _LOG) {
    var credentials = {
      username: domainInfo.incoming.username,
      password: userDetails.password,
    };

    var self = this;
    var conn = new $asproto.Connection();
    conn.open(domainInfo.incoming.server, credentials.username,
              credentials.password);
    conn.timeout = $asacct.DEFAULT_TIMEOUT_MS;

    conn.connect(function(error, options) {
      if (error) {
        // This error is basically an indication of whether we were able to
        // call getOptions or not.  If the XHR request completed, we get an
        // HttpError.  If we timed out or an XHR error occurred, we get a
        // general Error.
        var failureType,
            failureDetails = { server: domainInfo.incoming.server };

        if (error instanceof $asproto.HttpError) {
          if (error.status === 401) {
            failureType = 'bad-user-or-pass';
          }
          else if (error.status === 403) {
            failureType = 'not-authorized';
          }
          // Treat any other errors where we talked to the server as a problem
          // with the server.
          else {
            failureType = 'server-problem';
            failureDetails.status = error.status;
          }
        }
        else {
          // We didn't talk to the server, so let's call it an unresponsive
          // server.
          failureType = 'unresponsive-server';
        }
        callback(failureType, null, failureDetails);
        return;
      }

      var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
      var accountDef = {
        id: accountId,
        name: userDetails.accountName || userDetails.emailAddress,

        type: 'activesync',
        syncRange: 'auto',

        credentials: credentials,
        connInfo: {
          server: domainInfo.incoming.server
        },

        identities: [
          {
            id: accountId + '/' +
                $a64.encodeInt(universe.config.nextIdentityNum++),
            name: userDetails.displayName || domainInfo.displayName,
            address: userDetails.emailAddress,
            replyTo: null,
            signature: null
          },
        ]
      };

      self._loadAccount(universe, accountDef, conn, function (account) {
        callback(null, account, null);
      });
    });
  },

  recreateAccount: function cfg_as_ra(universe, oldVersion, oldAccountInfo,
                                      callback) {
    var oldAccountDef = oldAccountInfo.def;
    var credentials = {
      username: oldAccountDef.credentials.username,
      password: oldAccountDef.credentials.password,
    };
    var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
    var accountDef = {
      id: accountId,
      name: oldAccountDef.name,

      type: 'activesync',
      syncRange: oldAccountDef.syncRange,

      credentials: credentials,
      connInfo: {
        server: oldAccountDef.connInfo.server
      },

      identities: $accountcommon.recreateIdentities(universe, accountId,
                                     oldAccountDef.identities)
    };

    this._loadAccount(universe, accountDef, null, function (account) {
      callback(null, account, null);
    });
  },

  /**
   * Save the account def and folder info for our new (or recreated) account and
   * then load it.
   */
  _loadAccount: function cfg_as__loadAccount(universe, accountDef,
                                             protoConn, callback) {
    // XXX: Just reload the old folders when applicable instead of syncing the
    // folder list again, which is slow.
    var folderInfo = {
      $meta: {
        nextFolderNum: 0,
        nextMutationNum: 0,
        lastFolderSyncAt: 0,
        syncKey: '0',
      },
      $mutations: [],
      $mutationState: {},
    };
    universe.saveAccountDef(accountDef, folderInfo);
    universe._loadAccount(accountDef, folderInfo, protoConn, callback);
  },
};

}); // end define;