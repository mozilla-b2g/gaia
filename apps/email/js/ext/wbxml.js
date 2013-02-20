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

  let exports = {};

  const Tokens = {
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

    let start = 0;
    for (let i = 0; i < data.length; i++) {
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

        let curr = 0;
        for (let i = 0; i < this.strings.length; i++) {
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

    for (let [name, page] in Iterator(codepages)) {
      if (name.match(/^__/))
        continue;

      if (page.Tags) {
        let [,v] = Iterator(page.Tags).next();
        codepages.__nsnames__[v >> 8] = name;

        for (let [tag, value] in Iterator(page.Tags))
          codepages.__tagnames__[value] = tag;
      }

      if (page.Attrs) {
        for (let [attr, data] in Iterator(page.Attrs)) {
          if (!('name' in data))
            data.name = attr;
          codepages.__attrdata__[data.value] = data;
          page.Attrs[attr] = data.value;
        }
      }
    }
  }
  exports.CompileCodepages = CompileCodepages;

  const mib2str = {
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
  const str2mib = {};
  for (let [k, v] in Iterator(mib2str))
    str2mib[v] = k;

  function Element(ownerDocument, type, tag) {
    this.ownerDocument = ownerDocument;
    this.type = type;
    this._attrs = {};

    if (typeof tag === 'string') {
      let pieces = tag.split(':');
      if (pieces.length === 1)
        this.localTagName = pieces[0];
      else        [this.namespaceName, this.localTagName] = pieces;
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
      let ns = this.namespaceName;
      ns = ns ? ns + ':' : '';
      return ns + this.localTagName;
    },

    get attributes() {
      for (let [name, pieces] in Iterator(this._attrs)) {
        let [namespace, localName] = name.split(':');
        yield { name: name, namespace: namespace, localName: localName,
                value: this._getAttribute(pieces) };
      }
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
      let strValue = '';
      let array = [];

      for (let [,hunk] in Iterator(pieces)) {
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
        let namespace = attr >> 8;
        let localAttr = attr & 0xff;

        let localName = this.ownerDocument._codepages.__attrdata__[localAttr]
                            .name;
        let nsName = this.ownerDocument._codepages.__nsnames__[namespace];
        let name = nsName + ':' + localName;

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
      let b;
      let result = 0;
      do {
        b = this._get_uint8();
        result = result*128 + (b & 0x7f);
      } while(b & 0x80);
      return result;
    },

    _get_slice: function(length) {
      let start = this._index;
      this._index += length;
      return this._data.subarray(start, this._index);
    },

    _get_c_string: function() {
      let start = this._index;
      while (this._get_uint8());
      return this._data.subarray(start, this._index - 1);
    },

    rewind: function() {
      this._index = 0;

      let v = this._get_uint8();
      this.version = ((v & 0xf0) + 1).toString() + '.' + (v & 0x0f).toString();
      this.pid = this._get_mb_uint32();
      this.charset = mib2str[this._get_mb_uint32()] || 'unknown';
      this._decoder = TextDecoder(this.charset);

      let tbl_len = this._get_mb_uint32();
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
      const States = {
        BODY: 0,
        ATTRIBUTES: 1,
        ATTRIBUTE_PI: 2,
      };

      let state = States.BODY;
      let currentNode;
      let currentAttr;
      let codepage = 0;
      let depth = 0;
      let foundRoot = false;

      let appendString = (function(s) {
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
        let tok = this._get_uint8();

        if (tok === Tokens.SWITCH_PAGE) {
          codepage = this._get_uint8();
          if (!(codepage in this._codepages.__nsnames__))
            throw new ParseError('unknown codepage '+codepage)
        }
        else if (tok === Tokens.END) {
          if (state === States.BODY && depth-- > 0) {
            if (currentNode) {
              yield currentNode;
              currentNode = null;
            }
            yield new EndTag(this);
          }
          else if (state === States.ATTRIBUTES || state === States.ATTRIBUTE_PI) {
            state = States.BODY;

            yield currentNode;
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
          let e = this._get_mb_uint32();
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
            yield currentNode;
          currentNode = new ProcessingInstruction(this);
        }
        else if (tok === Tokens.STR_T) {
          if (state === States.BODY && depth === 0)
            throw new ParseError('unexpected STR_T token');
          let r = this._get_mb_uint32();
          appendString(this.strings.get(r));
        }
        else if (tok === Tokens.OPAQUE) {
          if (state !== States.BODY)
            throw new ParseError('unexpected OPAQUE token');
          let len = this._get_mb_uint32();
          let data = this._get_slice(len);

          if (currentNode) {
            yield currentNode;
            currentNode = null;
          }
          yield new Opaque(this, data);
        }
        else if (((tok & 0x40) || (tok & 0x80)) && (tok & 0x3f) < 3) {
          let hi = tok & 0xc0;
          let lo = tok & 0x3f;
          let subtype;
          let value;

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

          let ext = new Extension(this, subtype, lo, value);
          if (state === States.BODY) {
            if (currentNode) {
              yield currentNode;
              currentNode = null;
            }
            yield ext;
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

          let tag = (codepage << 8) + (tok & 0x3f);
          if ((tok & 0x3f) === Tokens.LITERAL) {
            let r = this._get_mb_uint32();
            tag = this.strings.get(r);
          }

          if (currentNode)
            yield currentNode;
          currentNode = new Element(this, (tok & 0x40) ? 'STAG' : 'TAG', tag);
          if (tok & 0x40)
            depth++;

          if (tok & 0x80) {
            state = States.ATTRIBUTES;
          }
          else {
            state = States.BODY;

            yield currentNode;
            currentNode = null;
          }
        }
        else { // if (state === States.ATTRIBUTES || state === States.ATTRIBUTE_PI)
          let attr = (codepage << 8) + tok;
          if (!(tok & 0x80)) {
            if (tok === Tokens.LITERAL) {
              let r = this._get_mb_uint32();
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
    },

    dump: function(indentation, header) {
      let result = '';

      if (indentation === undefined)
        indentation = 2;
      let indent = function(level) {
        return new Array(level*indentation + 1).join(' ');
      };
      let tagstack = [];

      if (header) {
        result += 'Version: ' + this.version + '\n';
        result += 'Public ID: ' + this.pid + '\n';
        result += 'Charset: ' + this.charset + '\n';
        result += 'String table:\n  "' +
                  this.strings.strings.join('"\n  "') + '"\n\n';
      }

      let newline = false;
      for (let node in this.document) {
        if (node.type === 'TAG' || node.type === 'STAG') {
          result += indent(tagstack.length) + '<' + node.tagName;

          for (let attr in node.attributes) {
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
          let tag = tagstack.pop();
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

    let [major, minor] = version.split('.').map(function(x) {
      return parseInt(x);
    });
    let v = ((major - 1) << 4) + minor;

    let charsetNum = charset;
    if (typeof charset === 'string') {
      charsetNum = str2mib[charset];
      if (charsetNum === undefined)
        throw new Error('unknown charset '+charset);
    }
    let encoder = this._encoder = TextEncoder(charset);

    this._write(v);
    this._write(pid);
    this._write(charsetNum);
    if (strings) {
      let bytes = strings.map(function(s) { return encoder.encode(s); });
      let len = bytes.reduce(function(x, y) { return x + y.length + 1; }, 0);
      this._write_mb_uint32(len);
      for (let [,b] in Iterator(bytes)) {
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
    const validTypes = {
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

    let info = validTypes[subtype];
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
        let buffer = new Uint8Array(this._rawbuf);

        for (let i = 0; i < this._buffer.length; i++)
          buffer[i] = this._buffer[i];

        this._buffer = buffer;
      }

      this._buffer[this._pos++] = tok;
    },

    _write_mb_uint32: function(value) {
      let bytes = [];
      bytes.push(value % 0x80);
      while (value >= 0x80) {
        value >>= 7;
        bytes.push(0x80 + (value % 0x80));
      }

      for (let i = bytes.length - 1; i >= 0; i--)
        this._write(bytes[i]);
    },

    _write_bytes: function(bytes) {
      for (let i = 0; i < bytes.length; i++)
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

      let flags = 0x00;
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
        for (let [,attr] in Iterator(attrs))
          this._writeAttr(attr);
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
        for (let [,piece] in Iterator(value))
          this._writeText(piece, inAttr);
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
      let tail = arguments.length > 1 ? arguments[arguments.length - 1] : null;
      if (tail === null || tail instanceof Writer.Attribute) {
        let rest = Array.prototype.slice.call(arguments, 1);
        this._writeTag(tag, false, rest);
        return this;
      }
      else {
        let head = Array.prototype.slice.call(arguments, 0, -1);
        return this.stag.apply(this, head)
                     .text(tail)
                   .etag();
      }
    },

    stag: function(tag) {
      let rest = Array.prototype.slice.call(arguments, 1);
      this._writeTag(tag, true, rest);
      this._tagStack.push(tag);
      return this;
    },

    etag: function(tag) {
      if (this._tagStack.length === 0)
        throw new Error('Spurious etag() call!');
      let expectedTag = this._tagStack.pop();
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
        for (let i = 0; i < data.length; i++)
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
      let fullPath = [];
      let recPath = [];
      let recording = 0;

      for (let node in reader.document) {
        if (node.type === 'TAG') {
          fullPath.push(node.tag);
          for (let [,listener] in Iterator(this.listeners)) {
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

          for (let [,listener] in Iterator(this.listeners)) {
            if (this._pathMatches(fullPath, listener.path)) {
              recording++;
            }
          }
        }
        else if (node.type === 'ETAG') {
          for (let [,listener] in Iterator(this.listeners)) {
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
