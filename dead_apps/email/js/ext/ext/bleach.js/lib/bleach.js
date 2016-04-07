if (typeof exports === 'object' && typeof define !== 'function') {
    define = function (factory) {
        factory(require, exports, module);
    };
}

define(function (require, exports, module) {
var tokenizer = require('./bleach/css-parser/tokenizer');
var parser = require('./bleach/css-parser/parser');

var ALLOWED_TAGS = [
    'a',
    'abbr',
    'acronym',
    'b',
    'blockquote',
    'code',
    'em',
    'i',
    'li',
    'ol',
    'strong',
    'ul'
];
var ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title'],
    'abbr': ['title'],
    'acronym': ['title']
};
var ALLOWED_STYLES = [];

var Node = {
  ELEMENT_NODE                :  1,
  ATTRIBUTE_NODE              :  2,
  TEXT_NODE                   :  3,
  CDATA_SECTION_NODE          :  4,
  ENTITY_REFERENCE_NODE       :  5,
  ENTITY_NODE                 :  6,
  PROCESSING_INSTRUCTION_NODE :  7,
  COMMENT_NODE                :  8,
  DOCUMENT_NODE               :  9,
  DOCUMENT_TYPE_NODE          : 10,
  DOCUMENT_FRAGMENT_NODE      : 11,
  NOTATION_NODE               : 12
};

var DEFAULTS = {
  tags: ALLOWED_TAGS,
  prune: [],
  attributes: ALLOWED_ATTRIBUTES,
  styles: ALLOWED_STYLES,
  strip: false,
  stripComments: true
};

/**
 * Clean a string.
 */
exports.clean = function (html, opts) {
  if (!html) return '';

  // This is poor's man doctype/meta cleanup. I wish DOMParser works in a
  // worker but it sounds like a dream, see bug 677123.
  // Someone needs to come with a better approach but I'm running out of
  // time...
  // Prevoiusly, only removed DOCTYPE at start of string, but some HTML
  // senders are so bad they just leave them in the middle of email
  // content, as if they just dump from their CMS. So removing all of them
  // now
  html = html.replace(/<!DOCTYPE\s+[^>]*>/gi, '');

  return exports.cleanNode(html, opts);
};


/**
 */
exports.cleanNode = function(html, opts) {
try {
  function debug(str) {
    console.log("Bleach: " + str + "\n");
  }

  opts = opts || DEFAULTS;

  var attrsByTag = opts.hasOwnProperty('attributes') ?
                    opts.attributes : DEFAULTS.attributes;
  var wildAttrs;
  if (Array.isArray(attrsByTag)) {
    wildAttrs = attrsByTag;
    attrsByTag = {};
  } else if (attrsByTag.hasOwnProperty('*')) {
    wildAttrs = attrsByTag['*'];
  } else {
    wildAttrs = [];
  }
  var sanitizeOptions = {
    ignoreComment: ('stripComments' in opts) ? opts.stripComments
                                             : DEFAULTS.stripComments,
    allowedStyles: opts.styles || DEFAULTS.styles,
    allowedTags: opts.tags || DEFAULTS.tags,
    stripMode: ('strip' in opts) ? opts.strip : DEFAULTS.strip,
    pruneTags: opts.prune || DEFAULTS.prune,
    allowedAttributesByTag: attrsByTag,
    wildAttributes: wildAttrs,
    callbackRegexp: opts.callbackRegexp || null,
    callback: opts.callbackRegexp && opts.callback || null,
    maxLength: opts.maxLength || 0
  };

  var sanitizer = new HTMLSanitizer(sanitizeOptions);
  HTMLParser.HTMLParser(html, sanitizer);
  return sanitizer.output;
} catch(e) {
  console.error(e, '\n', e.stack);
  throw e;
}

};

var RE_NORMALIZE_WHITESPACE = /\s+/g;

var HTMLSanitizer = function(options) {
  this.output = '';

  this.ignoreComment = options.ignoreComment;
  this.allowedStyles = options.allowedStyles;
  this.allowedTags = options.allowedTags;
  this.stripMode = options.stripMode;
  this.pruneTags = options.pruneTags;
  this.allowedAttributesByTag = options.allowedAttributesByTag;
  this.wildAttributes = options.wildAttributes;

  this.callbackRegexp = options.callbackRegexp;
  this.callback = options.callback;

  this.isInsideStyleTag = false;
  // How many pruned tag types are on the stack; we require them to be fully
  // balanced, but don't care if what's inside them is balanced or not.
  this.isInsidePrunedTag = 0;
  // Similar; not clear why we need to bother counting for these. debug?
  this.isInsideStrippedTag = 0;

  // Added to allow snippet generation. Pass in
  // maxLength to get snippet work.
  this.maxLength = options.maxLength || 0;

  // Flag to indicate parsing should not
  // continue because maxLength has been hit.
  this.complete = false;

  // If just getting a snippet, the input
  // may also just be an HTML snippet, so
  // if parsing cannot continue, signal
  // just to stop at that point.
  this.ignoreFragments = this.maxLength > 0;
};

HTMLSanitizer.prototype = {
  start: function(tag, attrs, unary) {
    // - prune (trumps all else)
    if (this.pruneTags.indexOf(tag) !== -1) {
      if (!unary)
        this.isInsidePrunedTag++;
      return;
    }
    else if (this.isInsidePrunedTag) {
      return;
    }
    // - strip
    if (this.allowedTags.indexOf(tag) === -1) {
      // In strip mode we discard the tag rather than escaping it.
      if (this.stripMode) {
        if (!unary) {
          this.isInsideStrippedTag++;
        }
        return;
      }

      // The tag is not in the whitelist
      this.output += "&lt;" + (unary ? "/" : "") + tag + "&gt;";
      return;
    }

    this.isInsideStyleTag = (tag == "style" && !unary);

    // If a callback was specified and it matches the tag name, then invoke
    // the callback.  This happens before the attribute filtering so that
    // the function can observe dangerous attributes, but in the event of
    // the (silent) failure of this function, they will still be safely
    // removed.
    var callbackRegexp = this.callbackRegexp;
    if (callbackRegexp && callbackRegexp.test(tag)) {
      attrs = this.callback(tag, attrs);
    }

    var whitelist = this.allowedAttributesByTag[tag];
    var wildAttrs = this.wildAttributes;
    var result = "<" + tag;
    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i];
      var attrName = attr.name.toLowerCase();
      if (attr.safe || wildAttrs.indexOf(attrName) !== -1 ||
          (whitelist && whitelist.indexOf(attrName) !== -1)) {
        if (attrName == "style") {
          var attrValue = '';
          try {
            attrValue = CSSParser.parseAttribute(attr.escaped,
                                                   this.allowedStyles);
          } catch (e) {
            console.log('CSSParser.parseAttribute failed for: "' +
                         attr.escaped + '", skipping. Error: ' + e);
          }
          result += " " + attrName + '="' + attrValue + '"';
        } else {
          result += " " + attrName + '="' + attr.escaped + '"';
        }
      }
    }
    result += (unary ? "/" : "") + ">";

    this.output += result;
  },

  end: function(tag) {
    if (this.pruneTags.indexOf(tag) !== -1) {
      this.isInsidePrunedTag--;
      return;
    }
    else if (this.isInsidePrunedTag) {
      return;
    }

    if (this.allowedTags.indexOf(tag) === -1) {
      if (this.isInsideStrippedTag) {
        this.isInsideStrippedTag--;
        return;
      }

      this.output += "&lt;/" + tag + "&gt;";
      return;
    }

    if (this.isInsideStyleTag) {
      this.isInsideStyleTag = false;
    }

    this.output += "</" + tag + ">";
  },

  chars: function(text) {
    if (this.isInsidePrunedTag || this.complete)
      return;
    if (this.isInsideStyleTag) {
      this.output += CSSParser.parseBody(text, this.allowedStyles);
      return;
    }

    //console.log('HTML SANITIZER CHARS GIVEN: ' + text);
    if (this.maxLength) {
      if (this.insideTagForSnippet) {
        if (text.indexOf('>') !== -1) {
          // All clear now, for the next chars call
          this.insideTagForSnippet = false;
        }
        return;
      } else {
        // Skip chars that are for a tag, not wanted for a snippet.
        if (text.charAt(0) === '<') {
          this.insideTagForSnippet = true;
          return;
        }
      }

      // the whitespace down to one whitespace character.
      var normalizedText = text.replace(RE_NORMALIZE_WHITESPACE, ' ');

      // If the join would create two adjacents spaces, then skip the one
      // on the thing we are concatenating.
      var length = this.output.length;
      if (length && normalizedText[0] === ' ' &&
          this.output[length - 1] === ' ') {
        normalizedText = normalizedText.substring(1);
      }

      this.output += normalizedText;
      if (this.output.length >= this.maxLength) {
        this.output = this.output.substring(0, this.maxLength);
        // XXX We got the right numbers of chars
        // Do not process anymore, and also set state
        // the parser can use to know to stop doing work.
        this.complete = true;
      }
    } else {
      this.output += escapeHTMLTextKeepingExistingEntities(text);
    }
  },

  comment: function(comment) {
    if (this.isInsidePrunedTag)
      return;
    if (this.ignoreComment)
      return;
    this.output += '<!--' + comment + '-->';
  }
};

/*
 * HTML Parser By John Resig (ejohn.org)
 * Although the file only calls out MPL as a valid license, the upstream is
 * available under Apache 2.0 and John Resig has indicated by e-mail to
 * asuth@mozilla.com on 2013-03-13 that Apache 2.0 is fine.  So we are using
 * it under Apache 2.0.
 * http://ejohn.org/blog/pure-javascript-html-parser/
 *
 * Original code by Erik Arvidsson, tri-licensed under Apache 2.0, MPL 1.1
 * (probably implicitly 1.1+), or GPL 2.0+ (as visible in the file):
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 *
 * // Use like so:
 * HTMLParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 */


var HTMLParser = (function(){
  // Important syntax notes from the WHATWG HTML spec and observations.
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/syntax.html
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/common-microsyntaxes.html#common-parser-idioms
  //
  // The spec says _html_ tag names are [A-Za-z0-9]; we also include '-' and '_'
  // because that's what the code already did, but also since Gecko seems to be
  // very happy to parse those characters.
  //
  // The spec defines attributes by what they must not include, which is:
  // [\0\s"'>/=] plus also no control characters, or non-unicode characters.
  //
  // The (inherited) code used to have the regular expression effectively
  // validate the attribute syntax by including their grammer in the regexp.
  // The problem with this is that it can make the regexp fail to match tags
  // that are clearly tags.  When we encountered (quoted) attributes without
  // whitespace between them, we would escape the entire tag.  Attempted
  // trivial fixes resulted in regex back-tracking, which begged the issue of
  // why the regex would do this in the first place.  So we stopped doing that.
  //
  // CDATA *is not a thing* in the HTML namespace.  <![CDATA[ just gets treated
  // as a "bogus comment".  See:
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/tokenization.html#markup-declaration-open-state

  // NOTE: tag and attr regexps changed to ignore name spaces prefixes!
  //
  // CHANGE: "we" previously required there to be white-space between attributes.
  // Unfortunately, the world does not agree with this, so we now require
  // whitespace only after the tag name prior to the first attribute and make
  // the whole attribute clause optional.
  //
  // - Regular Expressions for parsing tags and attributes
  // ^<                     anchored tag open character
  // (?:[-A-Za-z0-9_]+:)?   eat the namespace
  // ([-A-Za-z0-9_]+)       the tag name
  // ([^>]*)                capture attributes and/or closing '/' if present
  // >                      tag close character
  var startTag = /^<(?:[-A-Za-z0-9_]+:)?([-A-Za-z0-9_]+)([^>]*)>/,
  // ^<\/                   close tag lead-in
  // (?:[-A-Za-z0-9_]+:)?   optional tag prefix
  // ([-A-Za-z0-9_]+)       tag name
  // [^>]*                  The spec says this should be whitespace, we forgive.
  // >
    endTag = /^<\/(?:[-A-Za-z0-9_]+:)?([-A-Za-z0-9_]+)[^>]*>/,
  // NOTE: This regexp was doing something freaky with the value quotings
  // before. (?:"((?:\\.|[^"])*)") instead of (?:"[^"]*") from the tag part,
  // which is deeply confusing.  Since the period thing seems meaningless, I am
  // replacing it from the bits from startTag
  //
  // (?:[-A-Za-z0-9_]+:)?   attribute prefix
  // ([-A-Za-z0-9_]+)       attribute name
  // (?:                    The attribute doesn't need a value
  //  \s*=\s*               whitespace, = to indicate value, whitespace
  //  (?:                   attribute values:
  //   (?:"([^"]*)")|       capture double-quoted
  //   (?:'([^']*)')|       capture single-quoted
  //   ([^>\s]+)            capture unquoted
  //  )
  // )?                    (the attribute does't need a value)
    attr = /(?:[-A-Za-z0-9_]+:)?([-A-Za-z0-9_]+)(?:\s*=\s*(?:(?:"([^"]*)")|(?:'([^']*)')|([^>\s]+)))?/g;

  // - Empty Elements - HTML 4.01
  var empty = makeMap("area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed");

  // - Block Elements - HTML 4.01
  var block = makeMap("address,applet,blockquote,button,center,dd,del,dir,div,dl,dt,fieldset,form,frameset,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,p,pre,script,table,tbody,td,tfoot,th,thead,tr,ul");

  // - Inline Elements - HTML 4.01, With the exception of "a", bug 1091310.
  // The "close inline if current tag is block" used in bleach is now a bit out
  // of date with the HTML parsing definition:
  // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody
  // Specifically, native "inline" vs "block" elements are not primary branch
  // points in closing logic, but it is very tag-specific. The most notable
  // point  is that p elements should be closed more often by those rules than
  // what is done here, and 'a' elements are not treated special when wrapping
  // a "block" element.. And in the case of
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1091310
  // specifically, there is no special closing behavior when encountering a
  // table start tag, except to close any previously open p tag.
  // Complete removal of the "block" and "inline" checking for closed tags was
  // considered to fix bug 1091310, and to match more closely the behavior in
  // the spec document. However:
  // - we are currently looking at limiting the amount of changes for a possible
  //   uplift to a more stable branch in gaia
  // - There are still some notable inconsistencies with the spec, like this
  //   code not closing of p tags in the same way.
  // - These lists have things like iframe, object, and script in them, and want
  //   to really think through the possible impact of the change in behavior.
  var inline = makeMap("abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var");

  // - Elements that you can, intentionally, leave open (and close themselves)
  var closeSelf = makeMap("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr");

  // - Attributes that have their values filled in disabled="disabled"
  var fillAttrs = makeMap("checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected");

  // - Special Elements (can contain anything)
  var special = makeMap("script,style");

  var HTMLParser = this.HTMLParser = function( html, handler ) {
    var index, chars, match, stack = [], last = html;
    stack.last = function(){
      return this[ this.length - 1 ];
    };

    while ( html ) {
      chars = true;

      // Make sure we're not in a script or style element
      if ( !stack.last() || !special[ stack.last() ] ) {

        // Comment
        if ( html.lastIndexOf("<!--", 0) == 0 ) {
          index = html.indexOf("-->");

          // WHATWG spec says the text can't start with the closing tag.
          // Of course, this is not obeyed, and it arguably is harmless to
          // interpret the string "<!---->" as just a one-off dumb comment.
          if ( index >= 4 ) {
            if ( handler.comment)
              handler.comment( html.substring( 4, index ) );
            html = html.substring( index + 3 );
            chars = false;
          } else {
            // The comment does not have a end. Let's return the whole string as a comment then.
            if ( handler.comment )
              handler.comment( html.substring( 4, -1 ) );
            html = '';
            chars = false;
          }

        // end tag
        } else if ( html.lastIndexOf("</", 0) == 0 ) {
          match = html.match( endTag );

          if ( match ) {
            html = html.substring( match[0].length );
            match[0].replace( endTag, parseEndTag );
            chars = false;
          }

        // start tag
        } else if ( html.lastIndexOf("<", 0) == 0 ) {
          match = html.match( startTag );

          if ( match ) {
            html = html.substring( match[0].length );
            match[0].replace( startTag, parseStartTag );
            chars = false;
          }
        }

        if ( chars ) {
          index = html.indexOf("<");

          if (index === 0) {
            // This is not a valid tag in regards of the parser.
            var text = html.substring(0, 1);
            html = html.substring(1);
          } else {
            var text = index < 0 ? html : html.substring( 0, index );
            html = index < 0 ? "" : html.substring( index );
          }

          if ( handler.chars ) {
            handler.chars( text );
            if ( handler.complete )
              return this;
          }
        }

      } else { // specials: script or style
        var skipWork = false;
        html = html.replace(
          // we use "[^]" instead of "." because it matches newlines too
          new RegExp("^([^]*?)<\/" + stack.last() + "[^>]*>", "i"),
          function(all, text){
            if (!skipWork) {
              text = text.replace(/<!--([^]*?)-->/g, "$1")
                .replace(/<!\[CDATA\[([^]*?)]]>/g, "$1");

              if ( handler.chars ) {
                handler.chars( text );
                skipWork = handler.complete;
              }
            }

            return "";
          });

        if ( handler.complete )
          return this;

        parseEndTag( "", stack.last() );
      }

      if ( html == last ) {
        // May just have a fragment of HTML, to
        // generate a snippet. If that is the case
        // just end parsing now.
        if ( handler.ignoreFragments ) {
          return;
        } else {
          console.log(html);
          console.log(last);
          throw "Parse Error: " + html;
        }
      }
      last = html;
    }

    // Clean up any remaining tags
    parseEndTag();

    function parseStartTag( tag, tagName, rest ) {
      tagName = tagName.toLowerCase();
      if ( block[ tagName ] ) {
        while ( stack.last() && inline[ stack.last() ] ) {
          parseEndTag( "", stack.last() );
        }
      }

      if ( closeSelf[ tagName ] && stack.last() == tagName ) {
        parseEndTag( "", tagName );
      }

      var unary = empty[ tagName ];
      // to simplify the regexp, the 'rest capture group now absorbs the /, so
      // we need to strip it off if it's there.
      if (rest.length && rest[rest.length - 1] === '/') {
        unary = true;
        rest = rest.slice(0, -1);
      }

      if ( !unary )
        stack.push( tagName );

      if ( handler.start ) {
        var attrs = [];

        rest.replace(attr, function(match, name) {
          // The attr regexp capture groups:
          // 1: attribute name
          // 2: double-quoted attribute value (whitespace allowed inside)
          // 3: single-quoted attribute value (whitespace allowed inside)
          // 4: un-quoted attribute value (whitespace forbidden)
          // We need to escape double-quotes because of the risks in there.
          var value = arguments[2] ? arguments[2] :
            arguments[3] ? arguments[3] :
            arguments[4] ? arguments[4] :
            fillAttrs[name] ? name : "";

          attrs.push({
            name: name,
            value: value,
            escaped: value.replace(/"/g, '&quot;'),
            safe: false
          });
        });

        if ( handler.start )
          handler.start( tagName, attrs, unary );
      }
    }

    function parseEndTag( tag, tagName ) {
      // If no tag name is provided, clean shop
      if ( !tagName )
        var pos = 0;

      // Find the closest opened tag of the same type
      else {
        tagName = tagName.toLowerCase();
        for ( var pos = stack.length - 1; pos >= 0; pos-- )
          if ( stack[ pos ] == tagName )
            break;
      }

      if ( pos >= 0 ) {
        // Close all the open elements, up the stack
        for ( var i = stack.length - 1; i >= pos; i-- )
          if ( handler.end )
            handler.end( stack[ i ] );

        // Remove the open elements from the stack
        stack.length = pos;
      }
    }
  };

  function makeMap(str){
    var obj = {}, items = str.split(",");
    for ( var i = 0; i < items.length; i++ )
      obj[ items[i] ] = true;
    return obj;
  }

  return this;
})();

var CSSParser = {
  parseAttribute: function (data, allowedStyles) {
    var tokens = tokenizer.tokenize(data, { loc: true });
    var rule = parser.parse(tokens, 'declaration');

    var keepText = [];
    this._filterDeclarations(null, rule.value, allowedStyles, data, keepText);
    var oot = keepText.join('');
    //console.log('IN:', data, '\n OUT:', oot);
    return oot;
  },

  _filterDeclarations: function(parent, decls, allowedStyles, fullText,
                                textOut) {
    for (var i = 0; i < decls.length; i++) {
      var decl = decls[i];
      if (decl.type !== 'DECLARATION') {
        continue;
      }
      if (allowedStyles.indexOf(decl.name) !== -1) {
        textOut.push(fullText.substring(
          decl.startTok.loc.start.idx,
          // If we have a parent and our parent ends on the same token as us,
          // then don't emit our ending token (ex: '}'), otherwise do emit it
          // (ex: ';').  We don't want a parent when it's synthetic like for
          // parseAttribute.
          (parent && parent.endTok === decl.endTok) ?
            decl.endTok.loc.start.idx :
            decl.endTok.loc.end.idx + 1));
      }
    }
  },

  parseBody: function (data, allowedStyles) {
    var body = "";
    var oot = "";

    try {
      var tokens = tokenizer.tokenize(data, { loc: true });
      var stylesheet = parser.parse(tokens);

      var keepText = [];

      for (var i = 0; i < stylesheet.value.length; i++) {
        var sub = stylesheet.value[i];
        if (sub.type === 'STYLE-RULE') {
          // We want our tokens up to the start of our first child.  If we have
          // no children, just go up to the start of our ending token.
          keepText.push(data.substring(
            sub.startTok.loc.start.idx,
            sub.value.length ? sub.value[0].startTok.loc.start.idx
                             : sub.endTok.loc.start.idx));
          this._filterDeclarations(sub, sub.value, allowedStyles, data, keepText);
          // we want all of our terminating token.
          keepText.push(data.substring(
            sub.endTok.loc.start.idx, sub.endTok.loc.end.idx + 1));
        }
      }

      oot = keepText.join('');
    } catch (e) {
      console.log('bleach CSS parsing failed, skipping. Error: ' + e);
      oot = '';
    }

    //console.log('IN:', data, '\n OUT:', oot);
    return oot;
  }
};


var entities = {
  34 : 'quot',
  38 : 'amp',
  39 : 'apos',
  60 : 'lt',
  62 : 'gt',
  160 : 'nbsp',
  161 : 'iexcl',
  162 : 'cent',
  163 : 'pound',
  164 : 'curren',
  165 : 'yen',
  166 : 'brvbar',
  167 : 'sect',
  168 : 'uml',
  169 : 'copy',
  170 : 'ordf',
  171 : 'laquo',
  172 : 'not',
  173 : 'shy',
  174 : 'reg',
  175 : 'macr',
  176 : 'deg',
  177 : 'plusmn',
  178 : 'sup2',
  179 : 'sup3',
  180 : 'acute',
  181 : 'micro',
  182 : 'para',
  183 : 'middot',
  184 : 'cedil',
  185 : 'sup1',
  186 : 'ordm',
  187 : 'raquo',
  188 : 'frac14',
  189 : 'frac12',
  190 : 'frac34',
  191 : 'iquest',
  192 : 'Agrave',
  193 : 'Aacute',
  194 : 'Acirc',
  195 : 'Atilde',
  196 : 'Auml',
  197 : 'Aring',
  198 : 'AElig',
  199 : 'Ccedil',
  200 : 'Egrave',
  201 : 'Eacute',
  202 : 'Ecirc',
  203 : 'Euml',
  204 : 'Igrave',
  205 : 'Iacute',
  206 : 'Icirc',
  207 : 'Iuml',
  208 : 'ETH',
  209 : 'Ntilde',
  210 : 'Ograve',
  211 : 'Oacute',
  212 : 'Ocirc',
  213 : 'Otilde',
  214 : 'Ouml',
  215 : 'times',
  216 : 'Oslash',
  217 : 'Ugrave',
  218 : 'Uacute',
  219 : 'Ucirc',
  220 : 'Uuml',
  221 : 'Yacute',
  222 : 'THORN',
  223 : 'szlig',
  224 : 'agrave',
  225 : 'aacute',
  226 : 'acirc',
  227 : 'atilde',
  228 : 'auml',
  229 : 'aring',
  230 : 'aelig',
  231 : 'ccedil',
  232 : 'egrave',
  233 : 'eacute',
  234 : 'ecirc',
  235 : 'euml',
  236 : 'igrave',
  237 : 'iacute',
  238 : 'icirc',
  239 : 'iuml',
  240 : 'eth',
  241 : 'ntilde',
  242 : 'ograve',
  243 : 'oacute',
  244 : 'ocirc',
  245 : 'otilde',
  246 : 'ouml',
  247 : 'divide',
  248 : 'oslash',
  249 : 'ugrave',
  250 : 'uacute',
  251 : 'ucirc',
  252 : 'uuml',
  253 : 'yacute',
  254 : 'thorn',
  255 : 'yuml',
  402 : 'fnof',
  913 : 'Alpha',
  914 : 'Beta',
  915 : 'Gamma',
  916 : 'Delta',
  917 : 'Epsilon',
  918 : 'Zeta',
  919 : 'Eta',
  920 : 'Theta',
  921 : 'Iota',
  922 : 'Kappa',
  923 : 'Lambda',
  924 : 'Mu',
  925 : 'Nu',
  926 : 'Xi',
  927 : 'Omicron',
  928 : 'Pi',
  929 : 'Rho',
  931 : 'Sigma',
  932 : 'Tau',
  933 : 'Upsilon',
  934 : 'Phi',
  935 : 'Chi',
  936 : 'Psi',
  937 : 'Omega',
  945 : 'alpha',
  946 : 'beta',
  947 : 'gamma',
  948 : 'delta',
  949 : 'epsilon',
  950 : 'zeta',
  951 : 'eta',
  952 : 'theta',
  953 : 'iota',
  954 : 'kappa',
  955 : 'lambda',
  956 : 'mu',
  957 : 'nu',
  958 : 'xi',
  959 : 'omicron',
  960 : 'pi',
  961 : 'rho',
  962 : 'sigmaf',
  963 : 'sigma',
  964 : 'tau',
  965 : 'upsilon',
  966 : 'phi',
  967 : 'chi',
  968 : 'psi',
  969 : 'omega',
  977 : 'thetasym',
  978 : 'upsih',
  982 : 'piv',
  8226 : 'bull',
  8230 : 'hellip',
  8242 : 'prime',
  8243 : 'Prime',
  8254 : 'oline',
  8260 : 'frasl',
  8472 : 'weierp',
  8465 : 'image',
  8476 : 'real',
  8482 : 'trade',
  8501 : 'alefsym',
  8592 : 'larr',
  8593 : 'uarr',
  8594 : 'rarr',
  8595 : 'darr',
  8596 : 'harr',
  8629 : 'crarr',
  8656 : 'lArr',
  8657 : 'uArr',
  8658 : 'rArr',
  8659 : 'dArr',
  8660 : 'hArr',
  8704 : 'forall',
  8706 : 'part',
  8707 : 'exist',
  8709 : 'empty',
  8711 : 'nabla',
  8712 : 'isin',
  8713 : 'notin',
  8715 : 'ni',
  8719 : 'prod',
  8721 : 'sum',
  8722 : 'minus',
  8727 : 'lowast',
  8730 : 'radic',
  8733 : 'prop',
  8734 : 'infin',
  8736 : 'ang',
  8743 : 'and',
  8744 : 'or',
  8745 : 'cap',
  8746 : 'cup',
  8747 : 'int',
  8756 : 'there4',
  8764 : 'sim',
  8773 : 'cong',
  8776 : 'asymp',
  8800 : 'ne',
  8801 : 'equiv',
  8804 : 'le',
  8805 : 'ge',
  8834 : 'sub',
  8835 : 'sup',
  8836 : 'nsub',
  8838 : 'sube',
  8839 : 'supe',
  8853 : 'oplus',
  8855 : 'otimes',
  8869 : 'perp',
  8901 : 'sdot',
  8968 : 'lceil',
  8969 : 'rceil',
  8970 : 'lfloor',
  8971 : 'rfloor',
  9001 : 'lang',
  9002 : 'rang',
  9674 : 'loz',
  9824 : 'spades',
  9827 : 'clubs',
  9829 : 'hearts',
  9830 : 'diams',
  338 : 'OElig',
  339 : 'oelig',
  352 : 'Scaron',
  353 : 'scaron',
  376 : 'Yuml',
  710 : 'circ',
  732 : 'tilde',
  8194 : 'ensp',
  8195 : 'emsp',
  8201 : 'thinsp',
  8204 : 'zwnj',
  8205 : 'zwj',
  8206 : 'lrm',
  8207 : 'rlm',
  8211 : 'ndash',
  8212 : 'mdash',
  8216 : 'lsquo',
  8217 : 'rsquo',
  8218 : 'sbquo',
  8220 : 'ldquo',
  8221 : 'rdquo',
  8222 : 'bdquo',
  8224 : 'dagger',
  8225 : 'Dagger',
  8240 : 'permil',
  8249 : 'lsaquo',
  8250 : 'rsaquo',
  8364 : 'euro'
};

var reverseEntities;
// Match on named entities as well as numeric/hex entities as well,
// covering range from &something; &Another; &#1234; &#x22; &#X2F;
// http://www.whatwg.org/specs/web-apps/current-work/multipage/syntax.html#character-references
var entityRegExp = /\&([#a-zA-Z0-9]+);/g;

function makeReverseEntities () {
  reverseEntities = {};
  Object.keys(entities).forEach(function (key) {
    reverseEntities[entities[key]] = key;
  });
}

/**
 * Escapes HTML characters like [<>"'&] in the text,
 * leaving existing HTML entities intact.
 */
function escapeHTMLTextKeepingExistingEntities(text) {
  return text.replace(/[<>"']|&(?![#a-zA-Z0-9]+;)/g, function(c) {
    return '&#' + c.charCodeAt(0) + ';';
  });
}

exports.unescapeHTMLEntities = function unescapeHTMLEntities(text) {
  return text.replace(entityRegExp, function (match, ref) {
    var converted = '';
    if (ref.charAt(0) === '#') {
      var secondChar = ref.charAt(1);
      if (secondChar === 'x' || secondChar === 'X') {
        // hex
        converted = String.fromCharCode(parseInt(ref.substring(2), 16));
      } else {
        // base 10 reference
        converted = String.fromCharCode(parseInt(ref.substring(1), 10));
      }
    } else {
      // a named character reference
      // build up reverse entities on first use.
      if (!reverseEntities)
        makeReverseEntities();

      if (reverseEntities.hasOwnProperty(ref))
        converted = String.fromCharCode(reverseEntities[ref]);
    }
    return converted;
  });
};

/**
 * Renders text content safe for injecting into HTML by
 * replacing all characters which could be used to create HTML elements.
 */
exports.escapePlaintextIntoElementContext = function (text) {
  return text.replace(/[&<>"'\/]/g, function(c) {
    var code = c.charCodeAt(0);
    return '&' + (entities[code] || '#' + code) + ';';
  });
}

/**
 * Escapes all characters with ASCII values less than 256, other than
 * alphanumeric characters, with the &#xHH; format to prevent
 * switching out of the attribute.
 */
exports.escapePlaintextIntoAttribute = function (text) {
  return text.replace(/[\u0000-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u0100]/g, function(c) {
    var code = c.charCodeAt(0);
    return '&' + (entities[code] || '#' + code) + ';';
  });
}


}); // end define
