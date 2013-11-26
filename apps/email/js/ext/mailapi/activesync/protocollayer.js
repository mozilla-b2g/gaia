
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
  if (typeof exports === 'object') {
    define = function(deps, factory) {
      deps = deps.map.forEach(function(id) {
        return require(id);
      });
      module.exports = factory(deps);
    };
    define.amd = {};
  }

  if (typeof define === 'function' && define.amd) {
    define('activesync/codepages',[
      'wbxml',
      './codepages/Common',
      './codepages/AirSync',
      './codepages/Contacts',
      './codepages/Email',
      './codepages/Calendar',
      './codepages/Move',
      './codepages/ItemEstimate',
      './codepages/FolderHierarchy',
      './codepages/MeetingResponse',
      './codepages/Tasks',
      './codepages/ResolveRecipients',
      './codepages/ValidateCert',
      './codepages/Contacts2',
      './codepages/Ping',
      './codepages/Provision',
      './codepages/Search',
      './codepages/GAL',
      './codepages/AirSyncBase',
      './codepages/Settings',
      './codepages/DocumentLibrary',
      './codepages/ItemOperations',
      './codepages/ComposeMail',
      './codepages/Email2',
      './codepages/Notes',
      './codepages/RightsManagement'
    ], factory);
  } else {
    root.ActiveSyncCodepages = factory(WBXML,
                                       ASCPCommon,
                                       ASCPAirSync,
                                       ASCPContacts,
                                       ASCPEmail,
                                       ASCPCalendar,
                                       ASCPMove,
                                       ASCPItemEstimate,
                                       ASCPHierarchy,
                                       ASCPMeetingResponse,
                                       ASCPTasks,
                                       ASCPResolveRecipients,
                                       ASCPValidateCert,
                                       ASCPContacts2,
                                       ASCPPing,
                                       ASCPProvision,
                                       ASCPSearch,
                                       ASCPGAL,
                                       ASCPAirSyncBase,
                                       ASCPSettings,
                                       ASCPDocumentLibrary,
                                       ASCPItemOperations,
                                       ASCPComposeMail,
                                       ASCPEmail2,
                                       ASCPNotes,
                                       ASCPRightsManagement);
  }
}(this, function(WBXML, Common, AirSync, Contacts, Email, Calendar, Move,
                 ItemEstimate, FolderHierarchy, MeetingResponse, Tasks,
                 ResolveRecipients, ValidateCert, Contacts2, Ping, Provision,
                 Search, GAL, AirSyncBase, Settings, DocumentLibrary,
                 ItemOperations, ComposeMail, Email2, Notes, RightsManagement) {
  'use strict';

  var codepages = {
    Common: Common,
    AirSync: AirSync,
    Contacts: Contacts,
    Email: Email,
    Calendar: Calendar,
    Move: Move,
    ItemEstimate: ItemEstimate,
    FolderHierarchy: FolderHierarchy,
    MeetingResponse: MeetingResponse,
    Tasks: Tasks,
    ResolveRecipients: ResolveRecipients,
    ValidateCert: ValidateCert,
    Contacts2: Contacts2,
    Ping: Ping,
    Provision: Provision,
    Search: Search,
    GAL: GAL,
    AirSyncBase: AirSyncBase,
    Settings: Settings,
    DocumentLibrary: DocumentLibrary,
    ItemOperations: ItemOperations,
    ComposeMail: ComposeMail,
    Email2: Email2,
    Notes: Notes,
    RightsManagement: RightsManagement
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
  // node.js
  if (typeof exports === 'object') {
    module.exports = factory();
    this.Blob = require('./blob').Blob;
    var stringencoding = require('stringencoding');
    this.TextEncoder = stringencoding.TextEncoder;
    this.TextDecoder = stringencoding.TextDecoder;
  }
  // browser environment, AMD loader
  else if (typeof define === 'function' && define.amd) {
    define('wbxml',factory);
  }
  // browser environment, no AMD loader
  else {
    root.WBXML = factory();
  }
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

  var EndOfData = {
    message: 'THIS IS AN INTERNAL CONTROL FLOW HACK THAT YOU SHOULD NOT SEE'
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

    for (var name in codepages) {
      var page = codepages[name];
      if (name.match(/^__/))
        continue;

      if (page.Tags) {
        // The upper byte(s) correspond to the namespace.
        var tagName, tagValue;
        for (tagName in page.Tags) {
          tagValue = page.Tags[tagName];
          codepages.__nsnames__[tagValue >> 8] = name;
          break;
        }

        for (tagName in page.Tags) {
          tagValue = page.Tags[tagName];
          codepages.__tagnames__[tagValue] = tagName;
        }
      }

      if (page.Attrs) {
        for (var attrName in page.Attrs) {
          var attrData = page.Attrs[attrName];
          if (!('name' in attrData))
            attrData.name = attrName;
          codepages.__attrdata__[attrData.value] = attrData;
          page.Attrs[attrName] = attrData.value;
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
  for (var mibId in mib2str) {
    var mibStr = mib2str[mibId];
    str2mib[mibStr] = mibId;
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
      for (var name in this._attrs) {
        var pieces = this._attrs[name];
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

      for (var i = 0; i < pieces.length; i++) {
        var hunk = pieces[i];
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
        throw EndOfData;
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
        if (e !== EndOfData)
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

  /**
   * @param version {String}
   *   WBXML version. v1.1 is the most recent W3C spec.  The Open Mobile
   *   Alliance spec version is v1.3.
   * @param pid {Number}
   *   The public identifier.  Popular choices include 0 (it's in the string
   *   table) and 1 (Unknown/missing).  ActiveSync uses 1.  Check your standard
   *   for other values.
   * @param charset {String}
   *   This must be 'UTF-8', but conceptually it's the string value of an IANA
   *   allocated MIB enum.  This must be UTF-8 because we use TextEncoder and
   *   it only likes to encode into UTF-8 and UTF-16 to make the world a better
   *   place.  We could support UTF-16 if we added a MIB entry, probably.
   * @param [strings=null] {String[]}
   *   A list of strings to encode into the string table.  Use `str_t` to
   *   reference the string table by offset.  You'll want to provide an
   *   enhancement if you really want to use this functionality because it
   *   would be horribly painful to use as it exists.
   * @param [dataType="arraybuffer"] {String}
   *   The type of output desired from the Writer.  Currently supported values
   *   are "arraybuffer" (the default) and "blob".  You must use "blob" if you
   *   want to write Blobs into the output (currently only supported for use
   *   by opaque()).  If using "arraybuffer", retrieve your output from the
   *   `buffer` or `bytes` getters.  If using "blob", retrieve it using `blob`.
   */
  function Writer(version, pid, charset, strings, dataType) {
    // When creating a Blob for output, we use our normal _rawbuf/_buffer/_pos
    // logic until a Blob gets written via opaque().  At that point we wrap the
    // ArrayBuffer into a Blob, push it into _blobs, and reset the ArrayBuffer
    // state.
    if (dataType === 'blob')
      this._blobs = [];
    else
      this._blobs = null;
    this.dataType = dataType || 'arraybuffer';
    this._rawbuf = new ArrayBuffer(1024);
    this._buffer = new Uint8Array(this._rawbuf);
    this._pos = 0;
    this._codepage = 0;
    this._tagStack = [];

    /**
     * @private
     * @property _rootTagValue
     * @type Number|null
     *
     * The tag value of the first tag written to the buffer, or null if no
     * tag has yet been written.  This is used by jsas's postCommand helper
     * method to extract the command from an already-written string as a caller
     * convenience.  It is publicly exposed via the `firstLocalTagName` getter.
     */
    this._rootTagValue = null;

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
      for (var i = 0; i < bytes.length; i++) {
        var b = bytes[i];
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
  Writer.ent = function(code) { return new Writer.Entity(code); };
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
        if (!this._rootTagValue)
          this._rootTagValue = tag;
      }

      if (attrs.length) {
        for (var i = 0; i < attrs.length; i++) {
          var attr = attrs[i];
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
        for (var i = 0; i < value.length; i++) {
          var piece = value[i];
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

    /**
     * Write opaque data. (OPAQUE token followed by data).
     *
     * @param data {String|TypedArray|Blob}
     *   You must have specified dataType=blob in the constructor to write a
     *   Blob.
     */
    opaque: function(data) {
      this._write(Tokens.OPAQUE);
      if (data instanceof Blob) {
        if (!this._blobs)
          throw new Error('Writer not opened in blob mode');
        this._write_mb_uint32(data.size);
        // Because we're forgetting about our typed array and its buffer, we
        // don't need to snapshot it with a Bool or new ArrayBuffer, etc.
        this._blobs.push(this.bytes);
        this._blobs.push(data);
        // reset out buffer state
        this._rawbuf = new ArrayBuffer(1024);
        this._buffer = new Uint8Array(this._rawbuf);
        this._pos = 0;
      }
      else if (typeof data === 'string') {
        this._write_mb_uint32(data.length);
        this._write_str(data);
      }
      else { // Array or Uint8Array
        this._write_mb_uint32(data.length);
        for (var i = 0; i < data.length; i++)
          this._write(data[i]);
      }
      return this;
    },

    /**
     * Returns a fresh ArrayBuffer containing the written data.
     *
     * @property buffer
     * @type ArrayBuffer
     */
    get buffer() { return this._rawbuf.slice(0, this._pos); },
    /**
     * Returns a Uint8Array view on the backing raw buffer.  The backing
     * ArrayBuffer will very likely be larger than the returned array, so be
     * careful about making assumptions about the backing buffer.
     *
     * @property bytes
     * @type Uint8Array
     */
    get bytes() { return new Uint8Array(this._rawbuf, 0, this._pos); },
    get blob() {
      if (!this._blobs)
        throw new Error("No blobs!");
      var useBlobs = this._blobs;
      // We don't have a concept of finalizing the stream right now, although
      // it's pretty unlikely anyone would write to us after this given the
      // semantics of XML documents...
      if (this._pos)
        useBlobs = useBlobs.concat([this.bytes]);
      // Our existing consumers don't care about a mime type right now, but
      // maybe there should be a way to specify one?
      var superBlob = new Blob(useBlobs);
      return superBlob;
    },

    /**
     * Return the tag value of the root tag of the WBXML document.
     */
    get rootTag() {
      return this._rootTagValue;
    },
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
      var listeners = this.listeners, iListener, listener;
      for (var iNode = 0; iNode < doclen; iNode++) {
        var node = doc[iNode];
        if (node.type === 'TAG') {
          fullPath.push(node.tag);
          for (iListener = 0; iListener < listeners.length; iListener++) {
            listener = listeners[iListener];
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

          for (iListener = 0; iListener < listeners.length; iListener++) {
            listener = listeners[iListener];
            if (this._pathMatches(fullPath, listener.path)) {
              recording++;
            }
          }
        }
        else if (node.type === 'ETAG') {
          for (iListener = 0; iListener < listeners.length; iListener++) {
            listener = listeners[iListener];
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/Common',[], factory);
  else
    root.ASCPCommon = factory();
}(this, function() {
  'use strict';

  return {
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
  };
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/Contacts',[], factory);
  else
    root.ASCPContacts = factory();
}(this, function() {
  'use strict';

  return {
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
  };
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/Calendar',[], factory);
  else
    root.ASCPCalendar = factory();
}(this, function() {
  'use strict';

  return {
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
  };
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/MeetingResponse',[], factory);
  else
    root.ASCPMeetingResponse = factory();
}(this, function() {
  'use strict';

  return {
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
  };
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/Tasks',[], factory);
  else
    root.ASCPTasks = factory();
}(this, function() {
  'use strict';

  return {
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
    }
  };
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/ResolveRecipients',[], factory);
  else
    root.ASCPResolveRecipients = factory();
}(this, function() {
  'use strict';

  return {
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
  };
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/ValidateCert',[], factory);
  else
    root.ASCPValidateCert = factory();
}(this, function() {
  'use strict';

  return {
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
  };
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/Contacts2',[], factory);
  else
    root.ASCPContacts2 = factory();
}(this, function() {
  'use strict';

  return {
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
    }
  };
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/Ping',[], factory);
  else
    root.ASCPPing = factory();
}(this, function() {
  'use strict';

  return {
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
  };
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/Provision',[], factory);
  else
    root.ASCPProvision = factory();
}(this, function() {
  'use strict';

  return {
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
    }
  };
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/Search',[], factory);
  else
    root.ASCPSearch = factory();
}(this, function() {
  'use strict';

  return {
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
      }
    }
  };
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/GAL',[], factory);
  else
    root.ASCPGAL = factory();
}(this, function() {
  'use strict';

  return {
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
    }
  };
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/Settings',[], factory);
  else
    root.ASCPSettings = factory();
}(this, function() {
  'use strict';

  return {
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
      }
    }
  };
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/DocumentLibrary',[], factory);
  else
    root.ASCPDocumentLibrary = factory();
}(this, function() {
  'use strict';

  return {
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
  };
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/ComposeMail',[], factory);
  else
    root.ASCPComposeMail = factory();
}(this, function() {
  'use strict';

  return {
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
    }
  };
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/Email2',[], factory);
  else
    root.ASCPEmail2 = factory();
}(this, function() {
  'use strict';

  return {
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
      }
    }
  };
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/Notes',[], factory);
  else
    root.ASCPNotes = factory();
}(this, function() {
  'use strict';

  return {
    Tags: {
      Subject:          0x1705,
      MessageClass:     0x1706,
      LastModifiedDate: 0x1707,
      Categories:       0x1708,
      Category:         0x1709,
    }
  };
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
    module.exports = factory();
  else if (typeof define === 'function' && define.amd)
    define('activesync/codepages/RightsManagement',[], factory);
  else
    root.ASCPRightsManagement = factory();
}(this, function() {
  'use strict';

  return {
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
    }
  };
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

      var uid = Math.random();
      self.postMessage({
        uid: uid,
        type: 'configparser',
        cmd: 'accountactivesync',
        args: [xhr.responseText]
      });

      self.addEventListener('message', function onworkerresponse(evt) {
        var data = evt.data;
        if (data.type != 'configparser' || data.cmd != 'accountactivesync' ||
            data.uid != uid) {
          return;
        }
        self.removeEventListener(evt.type, onworkerresponse);

        var args = data.args;
        var config = args[0], error = args[1], redirectedEmail = args[2];
        if (error) {
          aCallback(new AutodiscoverDomainError(error), config);
        } else if (redirectedEmail) {
          autodiscover(redirectedEmail, aPassword, aTimeout, aCallback, true);
        } else {
          aCallback(null, config);
        }
      });
    };

    xhr.ontimeout = xhr.onerror = function() {
      // Something bad happened in the network layer, so treat this like an HTTP
      // error.
      aCallback(new HttpError('Error getting Autodiscover URL', null));
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

    /**
     * Debug support function that is called every time an XHR call completes.
     * This is intended to be used for logging.
     *
     * The arguments to the function are:
     *
     * - type: 'options' if caused by a call to getOptions.  'post' if caused by
     *   a call to postCommand/postData.
     *
     * - special: 'timeout' if a timeout error occurred, 'redirect' if the
     *   status code was 451 and the call is being reissued, 'error' if some
     *   type of error occurred, or 'ok' on success.  Check xhr.status for the
     *   specific http status code.
     *
     * - xhr: The XMLHttpRequest used.  Use this to check the statusCode,
     *   statusText, or response headers.
     *
     * - params: The object dictionary of parameters encoded into the URL.
     *   Always present if type is 'post', not present for 'options'.
     *
     * - extraHeaders: Optional dictionary of extra request headers that were
     *   provided.  These will not include the always-present request headers of
     *   MS-ASProtocolVersion and Content-Type.
     *
     * - sent data: If type is 'post', the ArrayBuffer provided to xhr.send().
     *
     * - response: In the case of a successful 'post', the WBXML Reader instance
     *   that will be passed to the callback for the method.  If you use the
     *   reader, you are responsible for calling rewind() on it.
     */
    this.onmessage = null;
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
     * @param aURL the ActiveSync URL to connect to
     * @param aUsername the account's username
     * @param aPassword the account's password
     */
    open: function(aURL, aUsername, aPassword) {
      // XXX: We add the default service path to the URL if it's not already
      // there. This is a hack to work around the failings of Hotmail (and
      // possibly other servers), which doesn't provide the service path in its
      // URL. If it turns out this causes issues with other domains, remove it.
      var servicePath = '/Microsoft-Server-ActiveSync';
      this.baseUrl = aURL;
      if (!this.baseUrl.endsWith(servicePath))
        this.baseUrl += servicePath;

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
          if (conn.onmessage)
            conn.onmessage('options', 'error', xhr, null, null, null, null);
          aCallback(new HttpError(xhr.statusText, xhr.status));
          return;
        }

        // These headers are comma-separated lists. Sometimes, people like to
        // put spaces after the commas, so make sure we trim whitespace too.
        var result = {
          versions: xhr.getResponseHeader('MS-ASProtocolVersions')
                       .split(/\s*,\s*/),
          commands: xhr.getResponseHeader('MS-ASProtocolCommands')
                       .split(/\s*,\s*/)
        };

        if (conn.onmessage)
          conn.onmessage('options', 'ok', xhr, null, null, null, result);
        aCallback(null, result);
      };

      xhr.ontimeout = xhr.onerror = function() {
        var error = new Error('Error getting OPTIONS URL');
        console.error(error);
        if (conn.onmessage)
          conn.onmessage('options', 'timeout', xhr, null, null, null, null);
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
     * @param aCommand {WBXML.Writer|String|Number}
     *   The WBXML representing the command or a string/tag representing the
     *   command type for empty commands
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
      // WBXML.Writer
      else {
        var commandName = ASCP.__tagnames__[aCommand.rootTag];
        this.postData(
          commandName, contentType,
          aCommand.dataType === 'blob' ? aCommand.blob : aCommand.buffer,
          aCallback, aExtraParams, aExtraHeaders, aProgressCallback);
      }
    },

    /**
     * Send arbitrary data to the ActiveSync server and listen for the response.
     *
     * @param aCommand a string (or WBXML tag) representing the command type
     * @param aContentType the content type of the post data
     * @param aData {ArrayBuffer|Blob} the data to be posted
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
        ['User', this._username],
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
          if (conn.onmessage)
            conn.onmessage(aCommand, 'redirect', xhr, params, aExtraHeaders,
                           aData, null);
          conn.postData.apply(conn, parentArgs);
          return;
        }

        if (xhr.status < 200 || xhr.status >= 300) {
          console.error('ActiveSync command ' + aCommand + ' failed with ' +
                        'response ' + xhr.status);
          if (conn.onmessage)
            conn.onmessage(aCommand, 'error', xhr, params, aExtraHeaders,
                           aData, null);
          aCallback(new HttpError(xhr.statusText, xhr.status));
          return;
        }

        var response = null;
        if (xhr.response.byteLength > 0)
          response = new WBXML.Reader(new Uint8Array(xhr.response), ASCP);
        if (conn.onmessage)
          conn.onmessage(aCommand, 'ok', xhr, params, aExtraHeaders,
                         aData, response);
        aCallback(null, response);
      };

      xhr.ontimeout = xhr.onerror = function() {
        var error = new Error('Error getting command URL');
        console.error(error);
        if (conn.onmessage)
          conn.onmessage(aCommand, 'timeout', xhr, params, aExtraHeaders,
                         aData, null);
        aCallback(error);
      };

      xhr.responseType = 'arraybuffer';
      xhr.send(aData);
    },
  };

  return exports;
}));
