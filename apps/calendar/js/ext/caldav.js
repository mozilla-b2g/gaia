// wrapper for non-node envs
;(function (sax) {

sax.parser = function (strict, opt) { return new SAXParser(strict, opt) }
sax.SAXParser = SAXParser
sax.SAXStream = SAXStream
sax.createStream = createStream

// When we pass the MAX_BUFFER_LENGTH position, start checking for buffer overruns.
// When we check, schedule the next check for MAX_BUFFER_LENGTH - (max(buffer lengths)),
// since that's the earliest that a buffer overrun could occur.  This way, checks are
// as rare as required, but as often as necessary to ensure never crossing this bound.
// Furthermore, buffers are only tested at most once per write(), so passing a very
// large string into write() might have undesirable effects, but this is manageable by
// the caller, so it is assumed to be safe.  Thus, a call to write() may, in the extreme
// edge case, result in creating at most one complete copy of the string passed in.
// Set to Infinity to have unlimited buffers.
sax.MAX_BUFFER_LENGTH = 64 * 1024

var buffers = [
  "comment", "sgmlDecl", "textNode", "tagName", "doctype",
  "procInstName", "procInstBody", "entity", "attribName",
  "attribValue", "cdata", "script"
]

sax.EVENTS = // for discoverability.
  [ "text"
  , "processinginstruction"
  , "sgmldeclaration"
  , "doctype"
  , "comment"
  , "attribute"
  , "opentag"
  , "closetag"
  , "opencdata"
  , "cdata"
  , "closecdata"
  , "error"
  , "end"
  , "ready"
  , "script"
  , "opennamespace"
  , "closenamespace"
  ]

function SAXParser (strict, opt) {
  if (!(this instanceof SAXParser)) return new SAXParser(strict, opt)

  var parser = this
  clearBuffers(parser)
  parser.q = parser.c = ""
  parser.bufferCheckPosition = sax.MAX_BUFFER_LENGTH
  parser.opt = opt || {}
  parser.opt.lowercase = parser.opt.lowercase || parser.opt.lowercasetags;
  parser.looseCase = parser.opt.lowercase ? "toLowerCase" : "toUpperCase"
  parser.tags = []
  parser.closed = parser.closedRoot = parser.sawRoot = false
  parser.tag = parser.error = null
  parser.strict = !!strict
  parser.noscript = !!(strict || parser.opt.noscript)
  parser.state = S.BEGIN
  parser.ENTITIES = Object.create(sax.ENTITIES)
  parser.attribList = []

  // namespaces form a prototype chain.
  // it always points at the current tag,
  // which protos to its parent tag.
  if (parser.opt.xmlns) parser.ns = Object.create(rootNS)

  // mostly just for error reporting
  parser.position = parser.line = parser.column = 0
  emit(parser, "onready")
}

function checkBufferLength (parser) {
  var maxAllowed = Math.max(sax.MAX_BUFFER_LENGTH, 10)
    , maxActual = 0
  for (var i = 0, l = buffers.length; i < l; i ++) {
    var len = parser[buffers[i]].length
    if (len > maxAllowed) {
      // Text/cdata nodes can get big, and since they're buffered,
      // we can get here under normal conditions.
      // Avoid issues by emitting the text node now,
      // so at least it won't get any bigger.
      switch (buffers[i]) {
        case "textNode":
          closeText(parser)
        break

        case "cdata":
          emitNode(parser, "oncdata", parser.cdata)
          parser.cdata = ""
        break

        case "script":
          emitNode(parser, "onscript", parser.script)
          parser.script = ""
        break

        default:
          error(parser, "Max buffer length exceeded: "+buffers[i])
      }
    }
    maxActual = Math.max(maxActual, len)
  }
  // schedule the next check for the earliest possible buffer overrun.
  parser.bufferCheckPosition = (sax.MAX_BUFFER_LENGTH - maxActual)
                             + parser.position
}

function clearBuffers (parser) {
  for (var i = 0, l = buffers.length; i < l; i ++) {
    parser[buffers[i]] = ""
  }
}

SAXParser.prototype =
  { end: function () { end(this) }
  , write: write
  , resume: function () { this.error = null; return this }
  , close: function () { return this.write(null) }
  }

try {
  var Stream = require("stream").Stream
} catch (ex) {
  var Stream = function () {}
}


var streamWraps = sax.EVENTS.filter(function (ev) {
  return ev !== "error" && ev !== "end"
})

function createStream (strict, opt) {
  return new SAXStream(strict, opt)
}

function SAXStream (strict, opt) {
  if (!(this instanceof SAXStream)) return new SAXStream(strict, opt)

  Stream.apply(me)

  this._parser = new SAXParser(strict, opt)
  this.writable = true
  this.readable = true


  var me = this

  this._parser.onend = function () {
    me.emit("end")
  }

  this._parser.onerror = function (er) {
    me.emit("error", er)

    // if didn't throw, then means error was handled.
    // go ahead and clear error, so we can write again.
    me._parser.error = null
  }

  streamWraps.forEach(function (ev) {
    Object.defineProperty(me, "on" + ev, {
      get: function () { return me._parser["on" + ev] },
      set: function (h) {
        if (!h) {
          me.removeAllListeners(ev)
          return me._parser["on"+ev] = h
        }
        me.on(ev, h)
      },
      enumerable: true,
      configurable: false
    })
  })
}

SAXStream.prototype = Object.create(Stream.prototype,
  { constructor: { value: SAXStream } })

SAXStream.prototype.write = function (data) {
  this._parser.write(data.toString())
  this.emit("data", data)
  return true
}

SAXStream.prototype.end = function (chunk) {
  if (chunk && chunk.length) this._parser.write(chunk.toString())
  this._parser.end()
  return true
}

SAXStream.prototype.on = function (ev, handler) {
  var me = this
  if (!me._parser["on"+ev] && streamWraps.indexOf(ev) !== -1) {
    me._parser["on"+ev] = function () {
      var args = arguments.length === 1 ? [arguments[0]]
               : Array.apply(null, arguments)
      args.splice(0, 0, ev)
      me.emit.apply(me, args)
    }
  }

  return Stream.prototype.on.call(me, ev, handler)
}



// character classes and tokens
var whitespace = "\r\n\t "
  // this really needs to be replaced with character classes.
  // XML allows all manner of ridiculous numbers and digits.
  , number = "0124356789"
  , letter = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  // (Letter | "_" | ":")
  , nameStart = letter+"_:"
  , nameBody = nameStart+number+"-."
  , quote = "'\""
  , entity = number+letter+"#"
  , attribEnd = whitespace + ">"
  , CDATA = "[CDATA["
  , DOCTYPE = "DOCTYPE"
  , XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace"
  , XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/"
  , rootNS = { xml: XML_NAMESPACE, xmlns: XMLNS_NAMESPACE }

// turn all the string character sets into character class objects.
whitespace = charClass(whitespace)
number = charClass(number)
letter = charClass(letter)
nameStart = charClass(nameStart)
nameBody = charClass(nameBody)
quote = charClass(quote)
entity = charClass(entity)
attribEnd = charClass(attribEnd)

function charClass (str) {
  return str.split("").reduce(function (s, c) {
    s[c] = true
    return s
  }, {})
}

function is (charclass, c) {
  return charclass[c]
}

function not (charclass, c) {
  return !charclass[c]
}

var S = 0
sax.STATE =
{ BEGIN                     : S++
, TEXT                      : S++ // general stuff
, TEXT_ENTITY               : S++ // &amp and such.
, OPEN_WAKA                 : S++ // <
, SGML_DECL                 : S++ // <!BLARG
, SGML_DECL_QUOTED          : S++ // <!BLARG foo "bar
, DOCTYPE                   : S++ // <!DOCTYPE
, DOCTYPE_QUOTED            : S++ // <!DOCTYPE "//blah
, DOCTYPE_DTD               : S++ // <!DOCTYPE "//blah" [ ...
, DOCTYPE_DTD_QUOTED        : S++ // <!DOCTYPE "//blah" [ "foo
, COMMENT_STARTING          : S++ // <!-
, COMMENT                   : S++ // <!--
, COMMENT_ENDING            : S++ // <!-- blah -
, COMMENT_ENDED             : S++ // <!-- blah --
, CDATA                     : S++ // <![CDATA[ something
, CDATA_ENDING              : S++ // ]
, CDATA_ENDING_2            : S++ // ]]
, PROC_INST                 : S++ // <?hi
, PROC_INST_BODY            : S++ // <?hi there
, PROC_INST_QUOTED          : S++ // <?hi "there
, PROC_INST_ENDING          : S++ // <?hi "there" ?
, OPEN_TAG                  : S++ // <strong
, OPEN_TAG_SLASH            : S++ // <strong /
, ATTRIB                    : S++ // <a
, ATTRIB_NAME               : S++ // <a foo
, ATTRIB_NAME_SAW_WHITE     : S++ // <a foo _
, ATTRIB_VALUE              : S++ // <a foo=
, ATTRIB_VALUE_QUOTED       : S++ // <a foo="bar
, ATTRIB_VALUE_UNQUOTED     : S++ // <a foo=bar
, ATTRIB_VALUE_ENTITY_Q     : S++ // <foo bar="&quot;"
, ATTRIB_VALUE_ENTITY_U     : S++ // <foo bar=&quot;
, CLOSE_TAG                 : S++ // </a
, CLOSE_TAG_SAW_WHITE       : S++ // </a   >
, SCRIPT                    : S++ // <script> ...
, SCRIPT_ENDING             : S++ // <script> ... <
}

sax.ENTITIES =
{ "apos" : "'"
, "quot" : "\""
, "amp"  : "&"
, "gt"   : ">"
, "lt"   : "<"
}

for (var S in sax.STATE) sax.STATE[sax.STATE[S]] = S

// shorthand
S = sax.STATE

function emit (parser, event, data) {
  parser[event] && parser[event](data)
}

function emitNode (parser, nodeType, data) {
  if (parser.textNode) closeText(parser)
  emit(parser, nodeType, data)
}

function closeText (parser) {
  parser.textNode = textopts(parser.opt, parser.textNode)
  if (parser.textNode) emit(parser, "ontext", parser.textNode)
  parser.textNode = ""
}

function textopts (opt, text) {
  if (opt.trim) text = text.trim()
  if (opt.normalize) text = text.replace(/\s+/g, " ")
  return text
}

function error (parser, er) {
  closeText(parser)
  er += "\nLine: "+parser.line+
        "\nColumn: "+parser.column+
        "\nChar: "+parser.c
  er = new Error(er)
  parser.error = er
  emit(parser, "onerror", er)
  return parser
}

function end (parser) {
  if (parser.state !== S.TEXT) error(parser, "Unexpected end")
  closeText(parser)
  parser.c = ""
  parser.closed = true
  emit(parser, "onend")
  SAXParser.call(parser, parser.strict, parser.opt)
  return parser
}

function strictFail (parser, message) {
  if (parser.strict) error(parser, message)
}

function newTag (parser) {
  if (!parser.strict) parser.tagName = parser.tagName[parser.looseCase]()
  var parent = parser.tags[parser.tags.length - 1] || parser
    , tag = parser.tag = { name : parser.tagName, attributes : {} }

  // will be overridden if tag contails an xmlns="foo" or xmlns:foo="bar"
  if (parser.opt.xmlns) tag.ns = parent.ns
  parser.attribList.length = 0
}

function qname (name) {
  var i = name.indexOf(":")
    , qualName = i < 0 ? [ "", name ] : name.split(":")
    , prefix = qualName[0]
    , local = qualName[1]

  // <x "xmlns"="http://foo">
  if (name === "xmlns") {
    prefix = "xmlns"
    local = ""
  }

  return { prefix: prefix, local: local }
}

function attrib (parser) {
  if (!parser.strict) parser.attribName = parser.attribName[parser.looseCase]()
  if (parser.opt.xmlns) {
    var qn = qname(parser.attribName)
      , prefix = qn.prefix
      , local = qn.local

    if (prefix === "xmlns") {
      // namespace binding attribute; push the binding into scope
      if (local === "xml" && parser.attribValue !== XML_NAMESPACE) {
        strictFail( parser
                  , "xml: prefix must be bound to " + XML_NAMESPACE + "\n"
                  + "Actual: " + parser.attribValue )
      } else if (local === "xmlns" && parser.attribValue !== XMLNS_NAMESPACE) {
        strictFail( parser
                  , "xmlns: prefix must be bound to " + XMLNS_NAMESPACE + "\n"
                  + "Actual: " + parser.attribValue )
      } else {
        var tag = parser.tag
          , parent = parser.tags[parser.tags.length - 1] || parser
        if (tag.ns === parent.ns) {
          tag.ns = Object.create(parent.ns)
        }
        tag.ns[local] = parser.attribValue
      }
    }

    // defer onattribute events until all attributes have been seen
    // so any new bindings can take effect; preserve attribute order
    // so deferred events can be emitted in document order
    parser.attribList.push([parser.attribName, parser.attribValue])
  } else {
    // in non-xmlns mode, we can emit the event right away
    parser.tag.attributes[parser.attribName] = parser.attribValue
    emitNode( parser
            , "onattribute"
            , { name: parser.attribName
              , value: parser.attribValue } )
  }

  parser.attribName = parser.attribValue = ""
}

function openTag (parser, selfClosing) {
  if (parser.opt.xmlns) {
    // emit namespace binding events
    var tag = parser.tag

    // add namespace info to tag
    var qn = qname(parser.tagName)
    tag.prefix = qn.prefix
    tag.local = qn.local
    tag.uri = tag.ns[qn.prefix] || qn.prefix

    if (tag.prefix && !tag.uri) {
      strictFail(parser, "Unbound namespace prefix: "
                       + JSON.stringify(parser.tagName))
    }

    var parent = parser.tags[parser.tags.length - 1] || parser
    if (tag.ns && parent.ns !== tag.ns) {
      Object.keys(tag.ns).forEach(function (p) {
        emitNode( parser
                , "onopennamespace"
                , { prefix: p , uri: tag.ns[p] } )
      })
    }

    // handle deferred onattribute events
    for (var i = 0, l = parser.attribList.length; i < l; i ++) {
      var nv = parser.attribList[i]
      var name = nv[0]
        , value = nv[1]
        , qualName = qname(name)
        , prefix = qualName.prefix
        , local = qualName.local
        , uri = tag.ns[prefix] || ""
        , a = { name: name
              , value: value
              , prefix: prefix
              , local: local
              , uri: uri
              }

      // if there's any attributes with an undefined namespace,
      // then fail on them now.
      if (prefix && prefix != "xmlns" && !uri) {
        strictFail(parser, "Unbound namespace prefix: "
                         + JSON.stringify(prefix))
        a.uri = prefix
      }
      parser.tag.attributes[name] = a
      emitNode(parser, "onattribute", a)
    }
    parser.attribList.length = 0
  }

  // process the tag
  parser.sawRoot = true
  parser.tags.push(parser.tag)
  emitNode(parser, "onopentag", parser.tag)
  if (!selfClosing) {
    // special case for <script> in non-strict mode.
    if (!parser.noscript && parser.tagName.toLowerCase() === "script") {
      parser.state = S.SCRIPT
    } else {
      parser.state = S.TEXT
    }
    parser.tag = null
    parser.tagName = ""
  }
  parser.attribName = parser.attribValue = ""
  parser.attribList.length = 0
}

function closeTag (parser) {
  if (!parser.tagName) {
    strictFail(parser, "Weird empty close tag.")
    parser.textNode += "</>"
    parser.state = S.TEXT
    return
  }
  // first make sure that the closing tag actually exists.
  // <a><b></c></b></a> will close everything, otherwise.
  var t = parser.tags.length
  var tagName = parser.tagName
  if (!parser.strict) tagName = tagName[parser.looseCase]()
  var closeTo = tagName
  while (t --) {
    var close = parser.tags[t]
    if (close.name !== closeTo) {
      // fail the first time in strict mode
      strictFail(parser, "Unexpected close tag")
    } else break
  }

  // didn't find it.  we already failed for strict, so just abort.
  if (t < 0) {
    strictFail(parser, "Unmatched closing tag: "+parser.tagName)
    parser.textNode += "</" + parser.tagName + ">"
    parser.state = S.TEXT
    return
  }
  parser.tagName = tagName
  var s = parser.tags.length
  while (s --> t) {
    var tag = parser.tag = parser.tags.pop()
    parser.tagName = parser.tag.name
    emitNode(parser, "onclosetag", parser.tagName)

    var x = {}
    for (var i in tag.ns) x[i] = tag.ns[i]

    var parent = parser.tags[parser.tags.length - 1] || parser
    if (parser.opt.xmlns && tag.ns !== parent.ns) {
      // remove namespace bindings introduced by tag
      Object.keys(tag.ns).forEach(function (p) {
        var n = tag.ns[p]
        emitNode(parser, "onclosenamespace", { prefix: p, uri: n })
      })
    }
  }
  if (t === 0) parser.closedRoot = true
  parser.tagName = parser.attribValue = parser.attribName = ""
  parser.attribList.length = 0
  parser.state = S.TEXT
}

function parseEntity (parser) {
  var entity = parser.entity.toLowerCase()
    , num
    , numStr = ""
  if (parser.ENTITIES[entity]) return parser.ENTITIES[entity]
  if (entity.charAt(0) === "#") {
    if (entity.charAt(1) === "x") {
      entity = entity.slice(2)
      num = parseInt(entity, 16)
      numStr = num.toString(16)
    } else {
      entity = entity.slice(1)
      num = parseInt(entity, 10)
      numStr = num.toString(10)
    }
  }
  entity = entity.replace(/^0+/, "")
  if (numStr.toLowerCase() !== entity) {
    strictFail(parser, "Invalid character entity")
    return "&"+parser.entity + ";"
  }
  return String.fromCharCode(num)
}

function write (chunk) {
  var parser = this
  if (this.error) throw this.error
  if (parser.closed) return error(parser,
    "Cannot write after close. Assign an onready handler.")
  if (chunk === null) return end(parser)
  var i = 0, c = ""
  while (parser.c = c = chunk.charAt(i++)) {
    parser.position ++
    if (c === "\n") {
      parser.line ++
      parser.column = 0
    } else parser.column ++
    switch (parser.state) {

      case S.BEGIN:
        if (c === "<") parser.state = S.OPEN_WAKA
        else if (not(whitespace,c)) {
          // have to process this as a text node.
          // weird, but happens.
          strictFail(parser, "Non-whitespace before first tag.")
          parser.textNode = c
          parser.state = S.TEXT
        }
      continue

      case S.TEXT:
        if (parser.sawRoot && !parser.closedRoot) {
          var starti = i-1
          while (c && c!=="<" && c!=="&") {
            c = chunk.charAt(i++)
            if (c) {
              parser.position ++
              if (c === "\n") {
                parser.line ++
                parser.column = 0
              } else parser.column ++
            }
          }
          parser.textNode += chunk.substring(starti, i-1)
        }
        if (c === "<") parser.state = S.OPEN_WAKA
        else {
          if (not(whitespace, c) && (!parser.sawRoot || parser.closedRoot))
            strictFail("Text data outside of root node.")
          if (c === "&") parser.state = S.TEXT_ENTITY
          else parser.textNode += c
        }
      continue

      case S.SCRIPT:
        // only non-strict
        if (c === "<") {
          parser.state = S.SCRIPT_ENDING
        } else parser.script += c
      continue

      case S.SCRIPT_ENDING:
        if (c === "/") {
          emitNode(parser, "onscript", parser.script)
          parser.state = S.CLOSE_TAG
          parser.script = ""
          parser.tagName = ""
        } else {
          parser.script += "<" + c
          parser.state = S.SCRIPT
        }
      continue

      case S.OPEN_WAKA:
        // either a /, ?, !, or text is coming next.
        if (c === "!") {
          parser.state = S.SGML_DECL
          parser.sgmlDecl = ""
        } else if (is(whitespace, c)) {
          // wait for it...
        } else if (is(nameStart,c)) {
          parser.startTagPosition = parser.position - 1
          parser.state = S.OPEN_TAG
          parser.tagName = c
        } else if (c === "/") {
          parser.startTagPosition = parser.position - 1
          parser.state = S.CLOSE_TAG
          parser.tagName = ""
        } else if (c === "?") {
          parser.state = S.PROC_INST
          parser.procInstName = parser.procInstBody = ""
        } else {
          strictFail(parser, "Unencoded <")
          parser.textNode += "<" + c
          parser.state = S.TEXT
        }
      continue

      case S.SGML_DECL:
        if ((parser.sgmlDecl+c).toUpperCase() === CDATA) {
          emitNode(parser, "onopencdata")
          parser.state = S.CDATA
          parser.sgmlDecl = ""
          parser.cdata = ""
        } else if (parser.sgmlDecl+c === "--") {
          parser.state = S.COMMENT
          parser.comment = ""
          parser.sgmlDecl = ""
        } else if ((parser.sgmlDecl+c).toUpperCase() === DOCTYPE) {
          parser.state = S.DOCTYPE
          if (parser.doctype || parser.sawRoot) strictFail(parser,
            "Inappropriately located doctype declaration")
          parser.doctype = ""
          parser.sgmlDecl = ""
        } else if (c === ">") {
          emitNode(parser, "onsgmldeclaration", parser.sgmlDecl)
          parser.sgmlDecl = ""
          parser.state = S.TEXT
        } else if (is(quote, c)) {
          parser.state = S.SGML_DECL_QUOTED
          parser.sgmlDecl += c
        } else parser.sgmlDecl += c
      continue

      case S.SGML_DECL_QUOTED:
        if (c === parser.q) {
          parser.state = S.SGML_DECL
          parser.q = ""
        }
        parser.sgmlDecl += c
      continue

      case S.DOCTYPE:
        if (c === ">") {
          parser.state = S.TEXT
          emitNode(parser, "ondoctype", parser.doctype)
          parser.doctype = true // just remember that we saw it.
        } else {
          parser.doctype += c
          if (c === "[") parser.state = S.DOCTYPE_DTD
          else if (is(quote, c)) {
            parser.state = S.DOCTYPE_QUOTED
            parser.q = c
          }
        }
      continue

      case S.DOCTYPE_QUOTED:
        parser.doctype += c
        if (c === parser.q) {
          parser.q = ""
          parser.state = S.DOCTYPE
        }
      continue

      case S.DOCTYPE_DTD:
        parser.doctype += c
        if (c === "]") parser.state = S.DOCTYPE
        else if (is(quote,c)) {
          parser.state = S.DOCTYPE_DTD_QUOTED
          parser.q = c
        }
      continue

      case S.DOCTYPE_DTD_QUOTED:
        parser.doctype += c
        if (c === parser.q) {
          parser.state = S.DOCTYPE_DTD
          parser.q = ""
        }
      continue

      case S.COMMENT:
        if (c === "-") parser.state = S.COMMENT_ENDING
        else parser.comment += c
      continue

      case S.COMMENT_ENDING:
        if (c === "-") {
          parser.state = S.COMMENT_ENDED
          parser.comment = textopts(parser.opt, parser.comment)
          if (parser.comment) emitNode(parser, "oncomment", parser.comment)
          parser.comment = ""
        } else {
          parser.comment += "-" + c
          parser.state = S.COMMENT
        }
      continue

      case S.COMMENT_ENDED:
        if (c !== ">") {
          strictFail(parser, "Malformed comment")
          // allow <!-- blah -- bloo --> in non-strict mode,
          // which is a comment of " blah -- bloo "
          parser.comment += "--" + c
          parser.state = S.COMMENT
        } else parser.state = S.TEXT
      continue

      case S.CDATA:
        if (c === "]") parser.state = S.CDATA_ENDING
        else parser.cdata += c
      continue

      case S.CDATA_ENDING:
        if (c === "]") parser.state = S.CDATA_ENDING_2
        else {
          parser.cdata += "]" + c
          parser.state = S.CDATA
        }
      continue

      case S.CDATA_ENDING_2:
        if (c === ">") {
          if (parser.cdata) emitNode(parser, "oncdata", parser.cdata)
          emitNode(parser, "onclosecdata")
          parser.cdata = ""
          parser.state = S.TEXT
        } else if (c === "]") {
          parser.cdata += "]"
        } else {
          parser.cdata += "]]" + c
          parser.state = S.CDATA
        }
      continue

      case S.PROC_INST:
        if (c === "?") parser.state = S.PROC_INST_ENDING
        else if (is(whitespace, c)) parser.state = S.PROC_INST_BODY
        else parser.procInstName += c
      continue

      case S.PROC_INST_BODY:
        if (!parser.procInstBody && is(whitespace, c)) continue
        else if (c === "?") parser.state = S.PROC_INST_ENDING
        else if (is(quote, c)) {
          parser.state = S.PROC_INST_QUOTED
          parser.q = c
          parser.procInstBody += c
        } else parser.procInstBody += c
      continue

      case S.PROC_INST_ENDING:
        if (c === ">") {
          emitNode(parser, "onprocessinginstruction", {
            name : parser.procInstName,
            body : parser.procInstBody
          })
          parser.procInstName = parser.procInstBody = ""
          parser.state = S.TEXT
        } else {
          parser.procInstBody += "?" + c
          parser.state = S.PROC_INST_BODY
        }
      continue

      case S.PROC_INST_QUOTED:
        parser.procInstBody += c
        if (c === parser.q) {
          parser.state = S.PROC_INST_BODY
          parser.q = ""
        }
      continue

      case S.OPEN_TAG:
        if (is(nameBody, c)) parser.tagName += c
        else {
          newTag(parser)
          if (c === ">") openTag(parser)
          else if (c === "/") parser.state = S.OPEN_TAG_SLASH
          else {
            if (not(whitespace, c)) strictFail(
              parser, "Invalid character in tag name")
            parser.state = S.ATTRIB
          }
        }
      continue

      case S.OPEN_TAG_SLASH:
        if (c === ">") {
          openTag(parser, true)
          closeTag(parser)
        } else {
          strictFail(parser, "Forward-slash in opening tag not followed by >")
          parser.state = S.ATTRIB
        }
      continue

      case S.ATTRIB:
        // haven't read the attribute name yet.
        if (is(whitespace, c)) continue
        else if (c === ">") openTag(parser)
        else if (c === "/") parser.state = S.OPEN_TAG_SLASH
        else if (is(nameStart, c)) {
          parser.attribName = c
          parser.attribValue = ""
          parser.state = S.ATTRIB_NAME
        } else strictFail(parser, "Invalid attribute name")
      continue

      case S.ATTRIB_NAME:
        if (c === "=") parser.state = S.ATTRIB_VALUE
        else if (is(whitespace, c)) parser.state = S.ATTRIB_NAME_SAW_WHITE
        else if (is(nameBody, c)) parser.attribName += c
        else strictFail(parser, "Invalid attribute name")
      continue

      case S.ATTRIB_NAME_SAW_WHITE:
        if (c === "=") parser.state = S.ATTRIB_VALUE
        else if (is(whitespace, c)) continue
        else {
          strictFail(parser, "Attribute without value")
          parser.tag.attributes[parser.attribName] = ""
          parser.attribValue = ""
          emitNode(parser, "onattribute",
                   { name : parser.attribName, value : "" })
          parser.attribName = ""
          if (c === ">") openTag(parser)
          else if (is(nameStart, c)) {
            parser.attribName = c
            parser.state = S.ATTRIB_NAME
          } else {
            strictFail(parser, "Invalid attribute name")
            parser.state = S.ATTRIB
          }
        }
      continue

      case S.ATTRIB_VALUE:
        if (is(whitespace, c)) continue
        else if (is(quote, c)) {
          parser.q = c
          parser.state = S.ATTRIB_VALUE_QUOTED
        } else {
          strictFail(parser, "Unquoted attribute value")
          parser.state = S.ATTRIB_VALUE_UNQUOTED
          parser.attribValue = c
        }
      continue

      case S.ATTRIB_VALUE_QUOTED:
        if (c !== parser.q) {
          if (c === "&") parser.state = S.ATTRIB_VALUE_ENTITY_Q
          else parser.attribValue += c
          continue
        }
        attrib(parser)
        parser.q = ""
        parser.state = S.ATTRIB
      continue

      case S.ATTRIB_VALUE_UNQUOTED:
        if (not(attribEnd,c)) {
          if (c === "&") parser.state = S.ATTRIB_VALUE_ENTITY_U
          else parser.attribValue += c
          continue
        }
        attrib(parser)
        if (c === ">") openTag(parser)
        else parser.state = S.ATTRIB
      continue

      case S.CLOSE_TAG:
        if (!parser.tagName) {
          if (is(whitespace, c)) continue
          else if (not(nameStart, c)) strictFail(parser,
            "Invalid tagname in closing tag.")
          else parser.tagName = c
        }
        else if (c === ">") closeTag(parser)
        else if (is(nameBody, c)) parser.tagName += c
        else {
          if (not(whitespace, c)) strictFail(parser,
            "Invalid tagname in closing tag")
          parser.state = S.CLOSE_TAG_SAW_WHITE
        }
      continue

      case S.CLOSE_TAG_SAW_WHITE:
        if (is(whitespace, c)) continue
        if (c === ">") closeTag(parser)
        else strictFail("Invalid characters in closing tag")
      continue

      case S.TEXT_ENTITY:
      case S.ATTRIB_VALUE_ENTITY_Q:
      case S.ATTRIB_VALUE_ENTITY_U:
        switch(parser.state) {
          case S.TEXT_ENTITY:
            var returnState = S.TEXT, buffer = "textNode"
          break

          case S.ATTRIB_VALUE_ENTITY_Q:
            var returnState = S.ATTRIB_VALUE_QUOTED, buffer = "attribValue"
          break

          case S.ATTRIB_VALUE_ENTITY_U:
            var returnState = S.ATTRIB_VALUE_UNQUOTED, buffer = "attribValue"
          break
        }
        if (c === ";") {
          parser[buffer] += parseEntity(parser)
          parser.entity = ""
          parser.state = returnState
        }
        else if (is(entity, c)) parser.entity += c
        else {
          strictFail("Invalid character entity")
          parser[buffer] += "&" + parser.entity + c
          parser.entity = ""
          parser.state = returnState
        }
      continue

      default:
        throw new Error(parser, "Unknown state: " + parser.state)
    }
  } // while
  // cdata blocks can get very big under normal conditions. emit and move on.
  // if (parser.state === S.CDATA && parser.cdata) {
  //   emitNode(parser, "oncdata", parser.cdata)
  //   parser.cdata = ""
  // }
  if (parser.position >= parser.bufferCheckPosition) checkBufferLength(parser)
  return parser
}

})(typeof exports === "undefined" ? sax = {} : exports)
;
(function(global, module) {

  /**
   * Define a list of paths
   * this will only be used in the browser.
   */
  var paths = {};


  /**
   * Exports object is a shim
   * we use in the browser to
   * create an object that will behave much
   * like module.exports
   */
  function Exports(path) {
    this.path = path;
  }

  Exports.prototype = {

    /**
     * Unified require between browser/node.
     * Path is relative to this file so you
     * will want to use it like this from any depth.
     *
     *
     *   var Leaf = ns.require('sub/leaf');
     *
     *
     * @param {String} path path lookup relative to this file.
     */
    require: function exportRequire(path) {
      if (typeof(window) === 'undefined') {
        return require(require('path').join(__dirname, path));
      } else {
        return paths[path];
      }
    },

    /**
     * Maps exports to a file path.
     */
    set exports(val) {
      return paths[this.path] = val;
    },

    get exports() {
      return paths[this.path];
    }
  };

  /**
   * Module object constructor.
   *
   *
   *    var module = Module('sub/leaf');
   *    module.exports = function Leaf(){}
   *
   *
   * @constructor
   * @param {String} path file path.
   */
  function Module(path) {
    return new Exports(path);
  }

  Module.require = Exports.prototype.require;
  Module.exports = Module;
  Module._paths = paths;


  /**
   * Reference self as exports
   * which also happens to be the constructor
   * so you can assign items to the namespace:
   *
   *    //assign to Module.X
   *    //assume module.exports is Module
   *    module.exports.X = Foo; //Module.X === Foo;
   *    Module.exports('foo'); //creates module.exports object.
   *
   */
  module.exports = Module;

  /**
   * In the browser assign
   * to a global namespace
   * obviously 'Module' would
   * be whatever your global namespace is.
   */
  if (this.window)
    window.Caldav = Module;

}(
  this,
  (typeof(module) === 'undefined') ?
    {} :
    module
));

(function(module, ns) {
  // Credit: Andreas Gal - I removed the callback / xhr logic

  // Iterate over all entries if x is an array, otherwise just call fn on x.

  /* Pattern for an individual entry: name:value */
  var ENTRY = /^([A-Za-z0-9-]+)((?:;[A-Za-z0-9-]+=(?:"[^"]+"|[^";:,]+)(?:,(?:"[^"]+"|[^";:,]+))*)*):(.*)$/;

  /* Pattern for an individual parameter: name=value[,value] */
  var PARAM = /;([A-Za-z0-9-]+)=((?:"[^"]+"|[^";:,]+)(?:,(?:"[^"]+"|[^";:,]+))*)/g;

  /* Pattern for an individual parameter value: value | "value" */
  var PARAM_VALUE = /,?("[^"]+"|[^";:,]+)/g;

  // Parse a calendar in iCal format.
  function ParseICal(text) {
    // Parse the text into an object graph
    var lines = text.replace(/\r/g, '').split('\n');
    var tos = Object.create(null);
    var stack = [tos];

    // Parse parameters for an entry. Foramt: <param>=<pvalue>[;...]
    function parseParams(params) {
      var map = Object.create(null);
      var param = PARAM.exec(params);
      while (param) {
        var values = [];
        var value = PARAM_VALUE.exec(param[2]);
        while (value) {
          values.push(value[1].replace(/^"(.*)"$/, '$1'));
          value = PARAM_VALUE.exec(param[2]);
        }
        map[param[1].toLowerCase()] = (values.length > 1 ? values : values[0]);
        param = PARAM.exec(params);
      }
      return map;
    }

    // Add a property to the current object. If a property with the same name
    // already exists, turn it into an array.
    function add(prop, value, params) {
      if (params)
        value = { parameters: parseParams(params), value: value };
      if (prop in tos) {
        var previous = tos[prop];
        if (previous instanceof Array) {
          previous.push(value);
          return;
        }
        value = [previous, value];
      }
      tos[prop] = value;
    }

    for (var n = 0; n < lines.length; ++n) {
      var line = lines[n];
      // check whether the line continues (next line stats with space or tab)
      var nextLine;
      while ((nextLine = lines[n+1]) && (nextLine[0] === ' ' || nextLine[0] === '\t')) {
        line += nextLine.substr(1);
        ++n;
        continue;
      }
      // parse the entry, format is 'PROPERTY:VALUE'
      var matches = ENTRY.exec(line);

      if (!matches) {
        throw new Error('invalid format');
      }

      var prop = matches[1].toLowerCase();
      var params = matches[2];
      var value = matches[3];
      switch (prop) {
      case 'begin':
        var obj = Object.create(null);
        add(value.toLowerCase(), obj);
        stack.push(tos = obj);
        break;
      case 'end':
        stack.pop();
        tos = stack[stack.length - 1];
        if (stack.length == 1) {
          var cal = stack[0];
          if (typeof cal.vcalendar !== 'object' || cal.vcalendar instanceof Array) {
            throw new Error('single vcalendar object expected');
          }

          return cal.vcalendar;
        }
        break;
      default:
        add(prop, value, params);
        break;
      }
    }
    throw new Error('unexpected end of file');
  }

  function Value(v) {
    return (typeof v !== 'object') ? v : v.value;
  }

  function Parameter(v, name) {
    if (typeof v !== 'object')
      return undefined;
    return v.parameters[name];
  }

  // Parse a time specification.
  function ParseDateTime(v) {
    var dt = Value(v);
    if (Parameter(v, 'VALUE') === 'DATE') {
      // 20081202
      return new Date(dt.substr(0, 4), dt.substr(4, 2), dt.substr(6, 2));
    }
    v = Value(v);
    // 20120426T130000Z
    var year = dt.substr(0, 4);
    var month = dt.substr(4, 2) - 1;
    var day = dt.substr(6, 2);
    var hour = dt.substr(9, 2);
    var min = dt.substr(11, 2);
    var sec = dt.substr(13, 2);
    if (dt[15] == 'Z') {
      return new Date(Date.UTC(year, month, day, hour, min, sec));
    }
    return new Date(year, month, day, hour, min, sec);
  }

  module.exports = ParseICal;

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('ical'), Caldav] :
    [module, require('./caldav')]
));

/**
@namespace
*/
(function(module, ns) {
  /**
   * Constructor
   *
   * @param {Object} list of events to add onto responder.
   */
  function Responder(events) {
    this._$events = Object.create(null);

    if (typeof(events) !== 'undefined') {
      this.addEventListener(events);
    }
  };

  /**
   * Stringifies request to websocket
   *
   *
   * @param {String} command command name.
   * @param {Object} data object to be sent over the wire.
   * @return {String} json object.
   */
  Responder.stringify = function stringify(command, data) {
    return JSON.stringify([command, data]);
  };

  /**
   * Parses request from WebSocket.
   *
   * @param {String} json json string to translate.
   * @return {Object} ex: { event: 'test', data: {} }.
   */
  Responder.parse = function parse(json) {
    var data;
    try {
      data = (json.forEach) ? json : JSON.parse(json);
    } catch (e) {
      throw new Error("Could not parse json: '" + json + '"');
    }

    return {event: data[0], data: data[1]};
  };

  Responder.prototype = {
    parse: Responder.parse,
    stringify: Responder.stringify,

    /**
     * Events on this instance
     *
     * @type Object
     */
    _$events: null,

    /**
     * Recieves json string event and dispatches an event.
     *
     * @param {String|Object} json data object to respond to.
     * @param {String} json.event event to emit.
     * @param {Object} json.data data to emit with event.
     * @param {Object} [params] option number of params to pass to emit.
     * @return {Object} result of WebSocketCommon.parse.
     */
    respond: function respond(json) {
      var event = Responder.parse(json),
          args = Array.prototype.slice.call(arguments).slice(1);

      args.unshift(event.data);
      args.unshift(event.event);

      this.emit.apply(this, args);

      return event;
    },

    //TODO: Extract event emitter logic

    /**
     * Adds an event listener to this object.
     *
     *
     * @param {String} type event name.
     * @param {Function} callback event callback.
     */
    addEventListener: function addEventListener(type, callback) {
      var event;

      if (typeof(callback) === 'undefined' && typeof(type) === 'object') {
        for (event in type) {
          if (type.hasOwnProperty(event)) {
            this.addEventListener(event, type[event]);
          }
        }

        return this;
      }

      if (!(type in this._$events)) {
        this._$events[type] = [];
      }

      this._$events[type].push(callback);

      return this;
    },

    /**
     * Adds an event listener which will
     * only fire once and then remove itself.
     *
     *
     * @param {String} type event name.
     * @param {Function} callback fired when event is emitted.
     */
    once: function once(type, callback) {
      var self = this;
      function onceCb() {
        self.removeEventListener(type, onceCb);
        callback.apply(this, arguments);
      }

      this.addEventListener(type, onceCb);

      return this;
    },

    /**
     * Emits an event.
     *
     * Accepts any number of additional arguments to pass unto
     * event listener.
     *
     * @param {String} eventName name of the event to emit.
     * @param {Object} [arguments] additional arguments to pass.
     */
    emit: function emit() {
      var args = Array.prototype.slice.call(arguments),
          event = args.shift(),
          eventList,
          self = this;

      if (event in this._$events) {
        eventList = this._$events[event];

        eventList.forEach(function(callback) {
          callback.apply(self, args);
        });
      }

      return this;
    },

    /**
     * Removes all event listeners for a given event type
     *
     *
     * @param {String} event event type to remove.
     */
    removeAllEventListeners: function removeAllEventListeners(name) {
      if (name in this._$events) {
        //reuse array
        this._$events[name].length = 0;
      }

      return this;
    },

    /**
     * Removes a single event listener from a given event type
     * and callback function.
     *
     *
     * @param {String} eventName event name.
     * @param {Function} callback same instance of event handler.
     */
    removeEventListener: function removeEventListener(name, callback) {
      var i, length, events;

      if (!(name in this._$events)) {
        return false;
      }

      events = this._$events[name];

      for (i = 0, length = events.length; i < length; i++) {
        if (events[i] && events[i] === callback) {
          events.splice(i, 1);
          return true;
        }
      }

      return false;
    }

  };

  Responder.prototype.on = Responder.prototype.addEventListener;
  module.exports = Responder;

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('responder'), Caldav] :
    [module, require('./caldav')]
));
(function(module, ns) {

  var Responder = ns.require('responder');

  if (typeof(window) === 'undefined') {
    Parser.sax = require('sax');
  } else {
    Parser.sax = sax;
  }

  /**
   * Creates a parser object.
   *
   * @param {Object} baseHandler base sax handler.
   */
  function Parser(baseHandler) {
    var handler;

    var events = [
      'ontext',
      'onopentag',
      'onclosetag',
      'onerror',
      'onend'
    ];

    if (typeof(baseHandler) !== 'undefined') {
      handler = baseHandler;
    } else {
      handler = ns.require('sax/base');
    }

    this.stack = [];
    this.handles = {};
    this._handlerStack = [];
    this.tagStack = [];
    this.root = this.current = {};

    this.setHandler(handler);

    this._parse = Parser.sax.parser(true, {
      xmlns: true,
      trim: true,
      normalize: false,
      lowercase: true
    });

    events.forEach(function(event) {
      this._parse[event] = this[event].bind(this);
    }, this);

    Responder.call(this);
  }

  Parser.prototype = {

    __proto__: Responder.prototype,

    /**
     * Sets current handler, optionally adding
     * previous one to the handlerStack.
     *
     * @param {Object} handler new handler.
     * @param {Boolean} storeOriginal store old handler?
     */
    setHandler: function(handler, storeOriginal) {
      if (storeOriginal) {
        this._handlerStack.push(this.handler);
      }

      this.handler = handler;
    },

    /**
     * Sets handler to previous one in the stack.
     */
    restoreHandler: function() {
      if (this._handlerStack.length) {
        this.handler = this._handlerStack.pop();
      }
    },

    /**
     * Registers a top level handler
     *
     * @param {String} tag xmlns uri/local tag name for example
     *                     DAV:/a.
     *
     * @param {Object} handler new handler to use when tag is
     *                         triggered.
     */
    registerHandler: function(tag, handler) {
      this.handles[tag] = handler;
    },

    /**
     * Writes data into the parser.
     *
     * @param {String} chunk partial/complete chunk of xml.
     */
    write: function(chunk) {
      return this._parse.write(chunk);
    },

    get closed() {
      return this._parse.closed;
    },

    /**
     * Determines if given tagSpec has a specific handler.
     *
     * @param {String} tagSpec usual tag spec.
     */
    getHandler: function(tagSpec) {
      var handler;
      var handlers = this.handler.handles;

      if (!handlers) {
        handlers = this.handles;
      }

      if (tagSpec in handlers) {
        handler = handlers[tagSpec];

        if (handler !== this.handler) {
          return handler;
        }
      }

      return false;
    },

    _fireHandler: function(event, data) {
      if (typeof(this.handler[event]) === 'function') {
        this.handler[event].call(this, data, this.handler);
      }
    },

    onopentag: function(data) {
      var handle;
      var stackData = {
        local: data.local,
        name: data.name
      };

      //build tagSpec for others to use.
      data.tagSpec = data.uri + '/' + data.local;

      //add to stackData
      stackData.tagSpec = data.tagSpec;

      // shortcut to the current tag object
      this.currentTag = stackData;

      //determine if we need to switch to another
      //handler object.
      handle = this.getHandler(data.tagSpec);

      if (handle) {
        //switch to new handler object
        this.setHandler(handle, true);
        stackData.handler = handle;
      }

      this.tagStack.push(stackData);
      this._fireHandler('onopentag', data);
    },

    //XXX: optimize later
    get currentTag() {
      return this.tagStack[this.tagStack.length - 1];
    },

    onclosetag: function(data) {
      var stack, handler;

      stack = this.currentTag;

      if (stack.handler) {
        //fire oncomplete handler if available
        this._fireHandler('oncomplete');
      }

      //fire the onclosetag event
      this._fireHandler('onclosetag', data);

      if (stack.handler) {
        //restore previous handler
        this.restoreHandler();
      }

      //actually remove the stack tag
      this.tagStack.pop();
    },

    ontext: function(data) {
      this._fireHandler('ontext', data);
    },

    onerror: function(data) {
      //TODO: XXX implement handling of parsing errors.
      //unlikely but possible if server goes down
      //or there is some authentication issue that
      //we miss.
      this._fireHandler('onerror', data);
    },

    onend: function() {
      this._fireHandler('onend', this.root);
    }
  };

  module.exports = Parser;

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('sax'), Caldav] :
    [module, require('./caldav')]
));
(function(module, ns) {

  function Template(root, rootAttrs) {
    if (typeof(rootAttrs) === 'undefined') {
      rootAttrs = {};
    }

    this.rootTag = root;
    this.rootAttrs = rootAttrs;
    this.activeNamespaces = {};
  }

  Template.prototype = {

    defaultNamespace: 'dav',
    doctype: '<?xml version="1.0" encoding="UTF-8"?>',

    _nsId: 0,

    xmlns: {
      dav: 'DAV:',
      calserver: 'http://calendarserver.org/ns/',
      ical: 'http://apple.com/ns/ical/',
      caldav: 'urn:ietf:params:xml:ns:caldav'
    },

    render: function(content) {
      var output = this.doctype;
      output += this.tag(this.rootTag, this.rootAttrs, content);

      return output;
    },

    /**
     * Registers an xml tag/namespace.
     *
     * @param {String} prefix xmlns.
     * @param {String} tag tag name.
     * @return {String} xml tag name.
     */
    _registerTag: function(prefix, tag) {
      if (prefix in this.xmlns) {
        prefix = this.xmlns[prefix];
      }

      if (prefix in this.activeNamespaces) {
        prefix = this.activeNamespaces[prefix];
      } else {
        var alias = 'N' + this._nsId++;
        this.activeNamespaces[prefix] = alias;
        this.rootAttrs['xmlns:' + alias] = prefix;
        prefix = alias;
      }

      return prefix + ':' + tag;
    },

    /**
     * Returns a xml string based on
     * input. Registers given xmlns on main
     * template. Always use this with render.
     *
     * @param {String|Array} tagDesc as a string defaults to
     *                               .defaultNamespace an array
     *                               takes a xmlns or an alias
     *                               defined in .xmlns.
     *
     * @param {Object} [attrs] optional attributes.
     * @param {String} content content of tag.
     * @return {String} xml tag output.
     */
    tag: function(tagDesc, attrs, content) {

      if (typeof(attrs) === 'string') {
        content = attrs;
        attrs = {};
      }

      if (typeof(content) === 'undefined') {
        content = false;
      }

      if (attrs && typeof(attrs.render) === 'function') {
        content = attrs.render(this);
        attrs = {};
      }

      if (typeof(tagDesc) === 'string') {
        tagDesc = [this.defaultNamespace, tagDesc];
      }

      var fullTag = this._registerTag(tagDesc[0], tagDesc[1]);
      var output = '';
      var key;

      output += '<' + fullTag + '';

      for (key in attrs) {
        output += ' ' + key + '="' + attrs[key] + '"';
      }

      if (content) {
        output += '>' + content + '</' + fullTag + '>';
      } else {
        output += ' />';
      }

      return output;
    }

  };

  module.exports = Template;

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('template'), Caldav] :
    [module, require('./caldav')]
));
/**
@namespace
*/
(function(module, ns) {
  var Native;

  if (typeof(window) === 'undefined') {
    Native = require('xmlhttprequest').XMLHttpRequest;
  } else {
    Native = window.XMLHttpRequest;
  }

  /**
   * Creates a XHR wrapper.
   * Depending on the platform this is loaded
   * from the correct wrapper type will be used.
   *
   * Options are derived from properties on the prototype.
   * See each property for its default value.
   *
   * @class
   * @name Caldav.Xhr
   * @param {Object} options options for xhr.
   * @param {String} [options.method="GET"] any HTTP verb like 'GET' or 'POST'.
   * @param {Boolean} [options.async] false will indicate
   *                   a synchronous request.
   * @param {Object} [options.headers] full of http headers.
   * @param {Object} [options.data] post data.
   */
  function Xhr(options) {
    var key;
    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  Xhr.prototype = {
    globalXhrOptions: null,
    xhrClass: Native,
    method: 'GET',
    async: true,
    waiting: false,
    user: null,
    password: null,
    url: null,

    headers: {},
    data: null,

    _seralize: function _seralize() {
      return this.data;
    },

    /**
     * Aborts request if its in progress.
     */
    abort: function abort() {
      if (this.xhr) {
        this.xhr.abort();
      }
    },

    /**
     * Sends request to server.
     *
     * @param {Function} callback success/failure handler.
     */
    send: function send(callback) {
      var header, xhr;

      if (typeof(callback) === 'undefined') {
        callback = this.callback;
      }

      if (this.globalXhrOptions) {
        xhr = new this.xhrClass(this.globalXhrOptions);
      } else {
        xhr = new this.xhrClass();
      }

      this.xhr = xhr;
      xhr.open(this.method, this.url, this.async, this.user, this.password);

      for (header in this.headers) {
        if (this.headers.hasOwnProperty(header)) {
          xhr.setRequestHeader(header, this.headers[header]);
        }
      }

      xhr.onreadystatechange = function onReadyStateChange() {
        var data;
        if (xhr.readyState === 4) {
          data = xhr.responseText;
          this.waiting = false;
          callback(null, xhr);
        }
      }.bind(this);

      this.waiting = true;
      xhr.send(this._seralize());
    }
  };

  module.exports = Xhr;

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('xhr'), Caldav] :
    [module, require('./caldav')]
));
(function(module, ns) {

  var XHR = ns.require('xhr');

  /**
   * Connection objects contain
   * general information to be reused
   * across XHR requests.
   *
   * Also handles normalization of path details.
   */
  function Connection(options) {
    if (typeof(options) === 'undefined') {
      options = {};
    }

    var key;

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }

    var domain = options.domain;

    if (domain) {
      if (domain.substr(-1) === '/') {
        this.domain = domain.substr(0, domain.length - 1);
      }
    }

  }

  Connection.prototype = {
    /**
     * Default username for requests.
     */
    user: '',

    /**
     * Default passwords for requests.
     */
    password: '',

    /**
     * Default domain for requests.
     */
    domain: '',

    /**
     * Creates new XHR request based on default
     * options for connection.
     *
     * @return {Caldav.Xhr} http request set with default options.
     */
    request: function(options) {
      if (typeof(options) === 'undefined') {
        options = {};
      }

      var copy = {};
      var key;
      // copy options

      for (key in options) {
        copy[key] = options[key];
      }

      if (!copy.user) {
        copy.user = this.user;
      }

      if (!copy.password) {
        copy.password = this.password;
      }

      if (copy.url && copy.url.indexOf('http') !== 0) {
        var url = copy.url;
        if (url.substr(0, 1) !== '/') {
          url = '/' + url;
        }
        copy.url = this.domain + url;
      }

      return new XHR(copy);
    }

  };

  module.exports = Connection;

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('connection'), Caldav] :
    [module, require('./caldav')]
));
(function(module, ns) {

  function CalendarData() {
    this._hasItems = false;
    this.struct = {};
  }

  CalendarData.prototype = {

    rootName: 'calendar-data',
    compName: 'comp',
    propName: 'prop',

    /**
     * Appends a list of fields
     * to a given iCalendar field set.
     *
     * @param {String} type iCal fieldset (VTODO, VEVENT,...).
     */
    select: function(type, list) {
      if (typeof(list) === 'undefined') {
        list = true;
      }

      var struct = this.struct;
      this._hasItems = true;

      if (!(type in struct)) {
        struct[type] = [];
      }

      if (list instanceof Array) {
        struct[type] = struct[type].concat(list);
      } else {
        struct[type] = list;
      }

      return this;
    },

    /**
     * Accepts an object full of arrays
     * recuse when encountering another object.
     */
    _renderFieldset: function(template, element) {
      var tag;
      var value;
      var i;
      var output = '';
      var elementOutput = '';

      for (tag in element) {
        value = element[tag];
        for (i = 0; i < value.length; i++) {
          if (typeof(value[i]) === 'object') {
            elementOutput += this._renderFieldset(
              template,
              value[i]
            );
          } else {
            elementOutput += template.tag(
              ['caldav', this.propName],
              { name: value[i] }
            );
          }
        }
        output += template.tag(
          ['caldav', this.compName],
          { name: tag },
          elementOutput || null
        );
        elementOutput = '';
      }

      return output;
    },

    _defaultRender: function(template) {
      return template.tag(['caldav', this.rootName]);
    },

    /**
     * Renders CalendarData with a template.
     *
     * @param {WebCals.Template} template calendar to render.
     * @return {String} <calendardata /> xml output.
     */
    render: function(template) {
      if (!this._hasItems) {
        return this._defaultRender(template);
      }

      var struct = this.struct;
      var output = template.tag(
        ['caldav', this.rootName],
        template.tag(
          ['caldav', this.compName],
          { name: 'VCALENDAR' },
          this._renderFieldset(template, struct)
        )
      );

      return output;
    }
  };


  module.exports = CalendarData;

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('templates/calendar_data'), Caldav] :
    [module, require('../caldav')]
));
(function(module, ns) {

  var CalendarData = ns.require('templates/calendar_data');

  function CalendarFilter() {
    CalendarData.call(this);
  }

  CalendarFilter.prototype = {

    __proto__: CalendarData.prototype,

    add: CalendarData.prototype.select,

    _defaultRender: function(template) {
      var inner = this._renderFieldset(template, { VCALENDAR: [{ VEVENT: true }] });
      return template.tag(['caldav', this.rootName], inner);
    },

    compName: 'comp-filter',
    rootName: 'filter'
  };

  module.exports = CalendarFilter;

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('templates/calendar_filter'), Caldav] :
    [module, require('../caldav')]
));

(function(module, ns) {

  var Base = {

    name: 'base',

    tagField: 'local',

    /**
     * Creates a new object with base as its prototype.
     * Adds ._super to object as convenience prop to access
     * the parents functions.
     *
     * @param {Object} obj function overrides.
     * @return {Object} new object.
     */
    create: function(obj) {
      var key;
      var child = Object.create(this);

      child._super = this;

      for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          child[key] = obj[key];
        }
      }

      return child;
    },

    onopentag: function(data, handler) {
      var current = this.current;
      var name = data[handler.tagField];

      this.stack.push(this.current);

      if (name in current) {
        var next = {};

        if (!(current[name] instanceof Array)) {
          current[name] = [current[name]];
        }

        current[name].push(next);

        this.current = next;
      } else {
        this.current = current[name] = {};
      }
    },

    ontext: function(data) {
      this.current.value = data;
    },

    onclosetag: function() {
      this.current = this.stack.pop();
    },

    onend: function() {
      this.emit('complete', this.root);
    }
  };

  module.exports = Base;

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('sax/base'), Caldav] :
    [module, require('../caldav')]
));
(function(module, ns) {

  var HTTP_STATUS = /([0-9]{3,3})/;

  var Base = ns.require('sax/base');
  var ParseICal = ns.require('ical');

  var TextHandler = Base.create({
    name: 'text',

    //don't add text only elements
    //to the stack as objects
    onopentag: null,
    onclosetag: null,

    //add the value to the parent
    //value where key is local tag name
    //and value is the text.
    ontext: function(data) {
      var handler = this.handler;
      this.current[this.currentTag[handler.tagField]] = data;
    }
  });

  var CalendarDataHandler = Base.create({
    name: 'calendar data',

    //don't add text only elements
    //to the stack as objects
    onopentag: null,
    onclosetag: null,

    //add the value to the parent
    //value where key is local tag name
    //and value is the text.
    ontext: function(data) {
      var handler = this.handler;
      this.current[this.currentTag[handler.tagField]] = ParseICal(data);
    }
  });


  var HrefHandler = Base.create({
    name: 'href',

    onopentag: function() {
      if (this.currentTag.handler === this.handler) {
        this.stack.push(this.current);
        this.current = null;
      }
    },

    onclosetag: function() {
      var current = this.currentTag;
      var data;

      if (current.handler === this.handler) {
        data = this.current;

        this.current = this.stack.pop();
        this.current[current.local] = data;
      }
    },

    ontext: function(data) {
      if (this.currentTag.local === 'href') {
        this.current = data;
      }
    }

  });

  var HttpStatusHandler = TextHandler.create({
    name: 'status',

    ontext: function(data, handler) {
      var match = data.match(HTTP_STATUS);

      if (match) {
        var handler = this.handler;
        this.current[this.currentTag[handler.tagField]] = match[1];
      } else {
        this._super.ontext.call(this, data, handler);
      }
    }
  });

  var PrivilegeSet = Base.create({
    name: 'PrivilegeSet',

    name: 'href',

    onopentag: function(data) {
      if (this.currentTag.handler === this.handler) {
        this.stack.push(this.current);
        this.current = [];
      } else {
        if (data.tagSpec !== 'DAV:/privilege') {
          this.current.push(data.local);
        }
      }
    },

    onclosetag: function(data) {
      var current = this.currentTag;
      var data;

      if (current.handler === this.handler) {
        data = this.current;

        this.current = this.stack.pop();
        this.current[current.local] = data;
      }
    },

    ontext: null

  });

  var ArrayHandler = Base.create({
    name: 'array',

    handles: {
      'DAV:/href': TextHandler
    },

    onopentag: function(data, handler) {
      var last;
      var tag = data[handler.tagField];
      var last = this.tagStack[this.tagStack.length - 1];

      if (last.handler === handler) {
        this.stack.push(this.current);
        this.current = this.current[tag] = [];
      } else {
        this.current.push(tag);
      }
    },

    ontext: null,
    onclosetag: null,

    oncomplete: function() {
      this.current = this.stack.pop();
    }

  });

  var PropStatHandler = Base.create({
    name: 'propstat',

    handles: {
      'DAV:/href': TextHandler,
      'http://calendarserver.org/ns//getctag': TextHandler,
      'DAV:/status': HttpStatusHandler,
      'DAV:/resourcetype': ArrayHandler,
      'DAV:/current-user-privilege-set': PrivilegeSet,
      'DAV:/principal-URL': HrefHandler,
      'DAV:/current-user-principal': HrefHandler,
      'urn:ietf:params:xml:ns:caldav/calendar-data': CalendarDataHandler,
      'DAV:/value': TextHandler,
      'DAV:/owner': HrefHandler,
      'DAV:/displayname': TextHandler,
      'urn:ietf:params:xml:ns:caldav/calendar-home-set': HrefHandler,
      'urn:ietf:params:xml:ns:caldav/calendar-timezone': TextHandler,
      'http://apple.com/ns/ical//calendar-color': TextHandler,
      'urn:ietf:params:xml:ns:caldav/calendar-description': TextHandler
    },

    onopentag: function(data, handler) {
      //orphan
      if (data.tagSpec === 'DAV:/propstat') {
        //blank slate propstat
        if (!('propstat' in this.current)) {
          this.current['propstat'] = {};
        }

        this.stack.push(this.current);

        //contents will be copied over later.
        return this.current = {};
      }

      handler._super.onopentag.call(this, data, handler);
    },

    oncomplete: function() {
      var propstat = this.stack[this.stack.length - 1];
      propstat = propstat.propstat;
      var key;
      var status = this.current.status;
      var props = this.current.prop;

      delete this.current.status;
      delete this.current.prop;

      for (key in props) {
        if (props.hasOwnProperty(key)) {
          propstat[key] = {
            status: status,
            value: props[key]
          };
        }
      }
    }
  });

  var Response = Base.create({
    name: 'dav_response',
    handles: {
      'DAV:/href': TextHandler,
      'DAV:/propstat': PropStatHandler
    },

    onopentag: function(data, handler) {
      if (data.tagSpec === 'DAV:/response') {
        this.stack.push(this.current);
        return this.current = {};
      }

      handler._super.onopentag.call(this, data, handler._super);
    },

    oncomplete: function() {
      var parent;

      if (this.current.href) {
        parent = this.stack[this.stack.length - 1];
        parent[this.current.href] = this.current.propstat;
      }
    }

  });

  module.exports = Response;

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('sax/dav_response'), Caldav] :
    [module, require('../caldav')]
));
(function(module, ns) {

  var SAX = ns.require('sax');
  var XHR = ns.require('xhr');


  /**
   * Creates an (Web/Cal)Dav request.
   *
   * @param {Caldav.Connection} connection connection details.
   * @param {Object} options additional options for request.
   */
  function Abstract(connection, options) {
    if (typeof(options) === 'undefined') {
      options = {};
    }

    var key;
    var xhrOptions = {};

    this.sax = new SAX();

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }

    if (!connection) {
      throw new Error('must pass connection object');
    }

    this.connection = connection;

    this.xhr = this.connection.request({
      url: this.url,
      headers: { 'Content-Type': 'text/xml' }
    });
  }

  Abstract.prototype = {

    _createPayload: function() {
      return '';
    },

    _processResult: function(req, callback) {
      callback.call(this, null, this.sax.root, req);
    },

    /**
     * Sends request to server.
     *
     * @param {Function} callback node style callback.
     *                            Receives three arguments
     *                            error, parsedData, xhr.
     */
    send: function(callback) {
      var self = this;
      var req = this.xhr;
      req.data = this._createPayload();

      // in the future we may stream data somehow
      req.send(function xhrResult() {
        var xhr = req.xhr;
        if (xhr.status > 199 && xhr.status < 300) {
          // success
          self.sax.write(xhr.responseText).close();
          self._processResult(req, callback);
        } else {
          // fail
          callback(new Error('http error code: ' + xhr.status));
        }
      });
    }
  };

  module.exports = Abstract;

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('request/abstract'), Caldav] :
    [module, require('../caldav')]
));
(function(module, ns) {

  var Abstract = ns.require('request/abstract'),
      Template = ns.require('template'),
      DavResponse = ns.require('sax/dav_response');

  /**
   * Creates a propfind request.
   *
   * @param {String} url location to make request.
   * @param {Object} options options for propfind.
   */
  function Propfind(url, options) {
    Abstract.apply(this, arguments);

    this.template = new Template('propfind');
    this._props = [];
    this.sax.registerHandler(
      'DAV:/response',
      DavResponse
    );

    this.xhr.headers['Depth'] = 0;
    this.xhr.method = 'PROPFIND';
  }

  Propfind.prototype = {
    __proto__: Abstract.prototype,

    get depth() {
      return this.xhr.headers.Depth;
    },

    set depth(val) {
      this.xhr.headers.Depth = val;
    },

    /**
     * Adds property to request.
     *
     * @param {String|Array} tagDesc tag description.
     * @param {Object} [attr] optional tag attrs.
     * @param {Obj} [content] optional content.
     */
    prop: function(tagDesc, attr, content) {
      this._props.push(this.template.tag(tagDesc, attr, content));
    },

    _createPayload: function() {
      var content = this.template.tag('prop', this._props.join(''));
      return this.template.render(content);
    },

    _processResult: function(req, callback) {
      if ('multistatus' in this.sax.root) {
        callback(null, this.sax.root.multistatus, req);
      } else {
        //XXX: Improve error handling
        callback(
          new Error('unexpected xml result'),
          this.sax.root, req
        );
      }
    }

  };

  module.exports = Propfind;

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('request/propfind'), Caldav] :
    [module, require('../caldav')]
));
(function(module, ns) {

  var Propfind = ns.require('request/propfind');
  var CalendarData = ns.require('templates/calendar_data');
  var CalendarFilter = ns.require('templates/calendar_filter');

  /**
   * Creates a calendar query request.
   *
   * Defaults to Depth of 1.
   *
   * @param {CalDav.Connection} connection connection object.
   * @param {Object} options options for calendar query.
   */
  function CalendarQuery(connection, options) {
    Propfind.apply(this, arguments);

    this.xhr.headers['Depth'] = this.depth || 1;
    this.xhr.method = 'REPORT';
    this.fields = new CalendarData();
    this.filters = new CalendarFilter();

    this.template.rootTag = ['caldav', 'calendar-query'];
  }

  CalendarQuery.prototype = {
    __proto__: Propfind.prototype,

    _createPayload: function() {
      var content;
      var props;

      props = this._props.join('');

      if (this.fields) {
        props += this.fields.render(this.template);
      }

      content = this.template.tag('prop', props);

      if (this.filters) {
        content += this.filters.render(this.template);
      }

      return this.template.render(content);
    }

  };

  module.exports = CalendarQuery;

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('request/calendar_query'), Caldav] :
    [module, require('../caldav')]
));
(function(module, ns) {

  /**
   * Creates a propfind request.
   *
   * @param {Caldav.Connection} connection connection details.
   * @param {Object} options options for propfind.
   */
  function CalendarHome(connection, options) {
    var key;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }

    this.connection = connection;
  }

  function findProperty(name, data, single) {
    var url, results = [], prop;

    for (url in data) {
      if (data.hasOwnProperty(url)) {
        if (name in data[url]) {
          prop = data[url][name];
          if (prop.status === '200') {
            results.push(data[url][name].value);
          }
        }
      }
    }

    if (!results.length)
      return false;

    if (typeof(single) !== 'undefined' && single) {
      return results[0];
    }

    return results;
  }

  CalendarHome.prototype = {

    Propfind: ns.require('request/propfind'),

    _findPrincipal: function(url, callback) {
      var find = new this.Propfind(this.connection, {
        url: url
      });

      find.prop('current-user-principal');
      find.prop('principal-URL');

      find.send(function(err, data) {
        var principal;

        if (err) {
          return callback(err);
        }

        principal = findProperty('current-user-principal', data, true);

        if (!principal) {
          principal = findProperty('principal-URL', data, true);
        }

        callback(null, principal);
      });
    },

    _findCalendarHome: function(url, callback) {
      var details = {};
      var find = new this.Propfind(this.connection, {
        url: url
      });

      find.prop(['caldav', 'calendar-home-set']);

      find.send(function(err, data) {
        if (err) {
          return callback(err);
        }

        details = {
          url: findProperty('calendar-home-set', data, true)
        };

        callback(null, details);
      });
    },

    /**
     * Starts request to find calendar home url
     *
     * @param {Function} callback node style where second argument
     *                            are the details of the home calendar.
     */
    send: function(callback) {
      var self = this;
      self._findPrincipal(self.url, function(err, url) {

        if (!url) {
          return callback(new Error('Cannot resolve principal url'));
        }

        self._findCalendarHome(url, function(err, details) {
          callback(err, details);
        });
      });
    }

  };

  module.exports = CalendarHome;

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('request/calendar_home'), Caldav] :
    [module, require('../caldav')]
));
(function(module, ns) {

  var Propfind = ns.require('request/propfind');

  function Resources(connection, options) {
    Propfind.apply(this, arguments);

    this._resources = {};
    this.depth = 1;
  }

  Resources.prototype = {
    __proto__: Propfind.prototype,

    addResource: function(name, handler) {
      this._resources[name] = handler;
    },

    _processResult: function(req, callback) {
      var results = {};
      var url;
      var root;
      var collection;
      var self = this;
      var resources;

      if ('multistatus' in this.sax.root) {
        root = this.sax.root.multistatus;

        for (url in root) {
          collection = root[url];

          resources = collection.resourcetype;

          if (resources.value.forEach) {

            resources.value.forEach(function(type) {
              if (type in self._resources) {

                if (!(type in results)) {
                  results[type] = {};
                }

                results[type][url] = new self._resources[type](
                  self.connection,
                  collection
                );

                results[type][url].url = url;
              }
            });
          }
        }

        callback(null, results, req);

      } else {
        //XXX: Improve error handling
        callback(
          new Error('unexpected xml result'),
          this.sax.root, req
        );
      }
    }

  };

  module.exports = Resources;

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('request/resources'), Caldav] :
    [module, require('../caldav')]
));
(function(module, ns) {

  module.exports = {
    Abstract: ns.require('request/abstract'),
    CalendarQuery: ns.require('request/calendar_query'),
    Propfind: ns.require('request/propfind'),
    CalendarHome: ns.require('request/calendar_home'),
    Resources: ns.require('request/resources')
  };

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('request'), Caldav] :
    [module, require('../caldav')]
));
(function(module, ns) {

  module.exports = {
    Abstract: ns.require('sax/abstract'),
    CalendarQuery: ns.require('sax/dav_response')
  };

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('sax'), Caldav] :
    [module, require('../caldav')]
));

(function(module, ns) {

  module.exports = {
    CalendarData: ns.require('templates/calendar_data'),
    CalendarFilter: ns.require('templates/calendar_filter')
  };

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('templates'), Caldav] :
    [module, require('../caldav')]
));
/**
@namespace
*/
(function(module, ns) {

  var CalendarQuery = ns.require('request/calendar_query');

  /**
   * Represents a (Web/Cal)Dav resource type.
   *
   * @param {Caldav.Connection} connection connection details.
   * @param {Object} options public options on prototype.
   */
  function Calendar(connection, options) {
    if (typeof(options) === 'undefined') {
      options = {};
    }

    if (options.url) {
      this.url = options.url;
    }

    this.connection = connection;
    this.updateFromServer(options);
  }

  Calendar.prototype = {

    _map: {
      'displayname': 'name',

      'calendar-color': 'color',

      'calendar-description': 'description',

      'getctag': 'ctag',
      'getlastmodified': 'lastmodified',

      'resourcetype': {
        field: 'resourcetype',
        defaults: []
      },

      'current-user-privilege-set': {
        field: 'privilegeSet',
        defaults: []
      }

    },

    /**
     * location of calendar resource
     */
    url: null,

    /**
     * displayname as defined by webdav spec
     * Maps to: displayname
     */
    name: null,

    /**
     * color of calendar as defined by ical spec
     * Maps to: calendar-color
     */
    color: null,

    /**
     * description of calendar as described by caldav spec
     * Maps to: calendar-description
     */
    description: null,

    /**
     * change tag (as defined by calendarserver spec)
     * used to determine if a change has occurred to this
     * calendar resource.
     *
     * Maps to: getctag
     */
    ctag: null,

    /**
     * Resource types of this resource will
     * always contain 'calendar'
     *
     * Maps to: resourcetype
     *
     * @type Array
     */
    resourcetype: null,

    /**
     * Set of privileges available to the user.
     *
     * Maps to: current-user-privilege-set
     */
    privilegeSet: null,

    /**
     * Updates calendar details from server.
     */
    updateFromServer: function(options) {
      var key;
      var defaultTo;
      var mapName;
      var value;
      var descriptor;

      if (typeof(options) === 'undefined') {
        options = {};
      }

      for (key in options) {
        if (options.hasOwnProperty(key)) {
          if (key in this._map) {
            descriptor = this._map[key];
            value = options[key];

            if (typeof(descriptor) === 'object') {
              defaultTo = descriptor.defaults;
              mapName = descriptor.field;
            } else {
              defaultTo = '';
              mapName = descriptor;
            }

            if (value.status !== '200') {
              this[mapName] = defaultTo;
            } else {
              this[mapName] = value.value;
            }

          }
        }
      }
    },

    /**
     * Creates a query request for this calendar resource.
     *
     * @return {CalDav.Request.CalendarQuery} query object.
     */
    createQuery: function() {
      return new CalendarQuery(this.connection, {
        url: this.url
      });
    }

  };

  module.exports = Calendar;

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('resources/calendar'), Caldav] :
    [module, require('../caldav')]
));
(function(module, ns) {

  module.exports = {
    Calendar: ns.require('resources/calendar')
  };

}.apply(
  this,
  (this.Caldav) ?
    [Caldav('resources'), Caldav] :
    [module, require('../caldav')]
));

(function(module, ns) {

  var exports = module.exports;

  exports.Ical = ns.require('ical');
  exports.Responder = ns.require('responder');
  exports.Sax = ns.require('sax');
  exports.Template = ns.require('template');
  exports.Xhr = ns.require('xhr');
  exports.Request = ns.require('request');
  exports.Templates = ns.require('templates');
  exports.Connection = ns.require('connection');
  exports.Resources = ns.require('resources');

}.apply(
  this,
  (this.Caldav) ?
    [Caldav, Caldav] :
    [module, require('./caldav')]
));

