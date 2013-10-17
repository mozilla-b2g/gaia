/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * This library exposes a `navigator.mozL10n' object to handle client-side
 * application localization. See: https://github.com/fabi1cazenave/webL10n
 */

(function(window) {
  var gL10nData = {};
  var gLanguage = '';
  var gMacros = {};
  var gReadyState = 'loading';

  // DOM element properties that may be localized with a key:value pair.
  var gNestedProps = ['style', 'dataset'];


  /**
   * Localization resources are declared in the HTML document with <link> nodes:
   *   <link rel="prefetch" type="application/l10n" href="locales.ini" />
   * Such *.ini files are multi-locale dictionaries where all supported locales
   * are listed / defined / imported, and where a fallback locale can easily be
   * defined.
   *
   * These *.ini files can also be compiled to locale-specific JSON dictionaries
   * with the `getDictionary()' method.  Such JSON dictionaries can be used:
   *  - either with a <link> node:
   *   <link rel="prefetch" type="application/l10n" href="{{locale}}.json" />
   *   (in which case, {{locale}} will be replaced by `navigator.language')
   *  - or with an inline <script> node:
   *   <script type="application/l10n" lang="fr"> ... </script>
   *   (in which case, the script matching `navigator.language' will be parsed)
   *
   * This is where `gDefaultLocale' comes in: if a JSON dictionary for the
   * current `navigator.language' value can't be found, use the one matching the
   * default locale.  Note that if the <html> element has a `lang' attribute,
   * its value becomes the default locale.
   */

  var gDefaultLocale = 'en-US';


  /**
   * Synchronously loading l10n resources significantly minimizes flickering
   * from displaying the app with non-localized strings and then updating the
   * strings. Although this will block all script execution on this page, we
   * expect that the l10n resources are available locally on flash-storage.
   *
   * As synchronous XHR is generally considered as a bad idea, we're still
   * loading l10n resources asynchronously -- but we keep this in a setting,
   * just in case... and applications using this library should hide their
   * content until the `localized' event happens.
   */

  var gAsyncResourceLoading = true; // read-only


  /**
   * Debug helpers
   *
   *   gDEBUG == 0: don't display any console message
   *   gDEBUG == 1: display only warnings, not logs
   *   gDEBUG == 2: display all console messages
   */

  var gDEBUG = 1;

  function consoleLog(message) {
    if (gDEBUG >= 2) {
      console.log('[l10n] ' + message);
    }
  };

  function consoleWarn(message) {
    if (gDEBUG) {
      console.warn('[l10n] ' + message);
    }
  };

  function consoleWarn_missingKeys(untranslatedElements, lang) {
    var len = untranslatedElements.length;
    if (!len || !gDEBUG) {
      return;
    }

    var missingIDs = [];
    for (var i = 0; i < len; i++) {
      var l10nId = untranslatedElements[i].getAttribute('data-l10n-id');
      if (missingIDs.indexOf(l10nId) < 0) {
        missingIDs.push(l10nId);
      }
    }
    console.warn('[l10n] ' +
        missingIDs.length + ' missing key(s) for [' + lang + ']: ' +
        missingIDs.join(', '));
  }


  /**
   * DOM helpers for the so-called "HTML API".
   *
   * These functions are written for modern browsers. For old versions of IE,
   * they're overridden in the 'startup' section at the end of this file.
   */

  function getL10nResourceLinks() {
    return document.querySelectorAll('link[type="application/l10n"]');
  }

  function getL10nDictionary(lang) {
    var getInlineDict = function(locale) {
      var sel = 'script[type="application/l10n"][lang="' + locale + '"]';
      return document.querySelector(sel);
    };
    // TODO: support multiple internal JSON dictionaries
    var script = getInlineDict(lang) || getInlineDict(gDefaultLocale);
    return script ? JSON.parse(script.innerHTML) : null;
  }

  function getTranslatableChildren(element) {
    return element ? element.querySelectorAll('*[data-l10n-id]') : [];
  }

  function getL10nAttributes(element) {
    if (!element) {
      return {};
    }

    var l10nId = element.getAttribute('data-l10n-id');
    var l10nArgs = element.getAttribute('data-l10n-args');
    var args = {};
    if (l10nArgs) {
      try {
        args = JSON.parse(l10nArgs);
      } catch (e) {
        consoleWarn('could not parse arguments for #' + l10nId);
      }
    }
    return { id: l10nId, args: args };
  }

  function setTextContent(element, text) {
    // standard case: no element children
    if (!element.firstElementChild) {
      element.textContent = text;
      return;
    }

    // this element has element children: replace the content of the first
    // (non-blank) child textNode and clear other child textNodes
    var found = false;
    var reNotBlank = /\S/;
    for (var child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 3 && reNotBlank.test(child.nodeValue)) {
        if (found) {
          child.nodeValue = '';
        } else {
          child.nodeValue = text;
          found = true;
        }
      }
    }
    // if no (non-empty) textNode is found, insert a textNode before the
    // element's first child.
    if (!found) {
      element.insertBefore(document.createTextNode(text), element.firstChild);
    }
  }

  function fireL10nReadyEvent() {
    var evtObject = document.createEvent('Event');
    evtObject.initEvent('localized', false, false);
    evtObject.language = gLanguage;
    window.dispatchEvent(evtObject);
  }


  /**
   * l10n resource parser:
   *  - reads (async XHR) the l10n resource matching `lang';
   *  - imports linked resources (synchronously) when specified;
   *  - parses the text data (fills `gL10nData');
   *  - triggers success/failure callbacks when done.
   *
   * @param {string} href
   *    URL of the l10n resource to parse.
   *
   * @param {string} lang
   *    locale (language) to parse.
   *
   * @param {Function} successCallback
   *    triggered when the l10n resource has been successully parsed.
   *
   * @param {Function} failureCallback
   *    triggered when the an error has occured.
   *
   * @return {void}
   *    fills gL10nData.
   */

  function parseResource(href, lang, successCallback, failureCallback) {
    var baseURL = href.replace(/\/[^\/]*$/, '/');

    // handle escaped characters (backslashes) in a string
    function evalString(text) {
      if (text.lastIndexOf('\\') < 0) {
        return text;
      }
      return text.replace(/\\\\/g, '\\')
                 .replace(/\\n/g, '\n')
                 .replace(/\\r/g, '\r')
                 .replace(/\\t/g, '\t')
                 .replace(/\\b/g, '\b')
                 .replace(/\\f/g, '\f')
                 .replace(/\\{/g, '{')
                 .replace(/\\}/g, '}')
                 .replace(/\\"/g, '"')
                 .replace(/\\'/g, "'");
    }

    // parse *.properties text data into an l10n dictionary
    function parseProperties(text) {
      var dictionary = [];

      // token expressions
      var reBlank = /^\s*|\s*$/;
      var reComment = /^\s*#|^\s*$/;
      var reSection = /^\s*\[(.*)\]\s*$/;
      var reImport = /^\s*@import\s+url\((.*)\)\s*$/i;
      var reSplit = /^([^=\s]*)\s*=\s*(.+)$/;
      var reUnicode = /\\u([0-9a-fA-F]{1,4})/g;
      var reMultiline = /[^\\]\\$/;

      // parse the *.properties file into an associative array
      function parseRawLines(rawText, extendedSyntax) {
        var entries = rawText.replace(reBlank, '').split(/[\r\n]+/);
        var currentLang = '*';
        var genericLang = lang.replace(/-[a-z]+$/i, '');
        var skipLang = false;
        var match = '';

        for (var i = 0; i < entries.length; i++) {
          var line = entries[i];

          // comment or blank line?
          if (reComment.test(line)) {
            continue;
          }

          // multi-line?
          while (reMultiline.test(line) && i < entries.length) {
            line = line.slice(0, line.length - 1) +
              entries[++i].replace(reBlank, '');
          }

          // the extended syntax supports [lang] sections and @import rules
          if (extendedSyntax) {
            if (reSection.test(line)) { // section start?
              match = reSection.exec(line);
              currentLang = match[1];
              skipLang = (currentLang !== '*') &&
                  (currentLang !== lang) && (currentLang !== genericLang);
              continue;
            } else if (skipLang) {
              continue;
            }
            if (reImport.test(line)) { // @import rule?
              match = reImport.exec(line);
              loadImport(baseURL + match[1]); // load the resource synchronously
            }
          }

          // key-value pair
          var tmp = line.match(reSplit);
          if (tmp && tmp.length == 3) {
            // unescape unicode char codes if needed (e.g. '\u00a0')
            var val = tmp[2].replace(reUnicode, function(match, token) {
              return unescape('%u' + '0000'.slice(token.length) + token);
            });
            dictionary[tmp[1]] = evalString(val);
          }
        }
      }

      // import another *.properties file
      function loadImport(url) {
        loadResource(url, function(content) {
          parseRawLines(content, false); // don't allow recursive imports
        }, null, false); // load synchronously
      }

      // fill the dictionary
      parseRawLines(text, true);
      return dictionary;
    }

    // load the specified resource file
    function loadResource(url, onSuccess, onFailure, asynchronous) {
      onSuccess = onSuccess || function _onSuccess(data) {};
      onFailure = onFailure || function _onFailure() {
        consoleWarn(url + ' not found.');
      };

      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, asynchronous);
      if (xhr.overrideMimeType) {
        xhr.overrideMimeType('text/plain; charset=utf-8');
      }
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if (xhr.status == 200 || xhr.status === 0) {
            onSuccess(xhr.responseText);
          } else {
            onFailure();
          }
        }
      };
      xhr.onerror = onFailure;
      xhr.ontimeout = onFailure;

      // in Firefox OS with the app:// protocol, trying to XHR a non-existing
      // URL will raise an exception here -- hence this ugly try...catch.
      try {
        xhr.send(null);
      } catch (e) {
        onFailure();
      }
    }

    // load and parse l10n data (warning: global variables are used here)
    loadResource(href, function(response) {
      if (/\.json$/.test(href)) {
        gL10nData = JSON.parse(response); // TODO: support multiple JSON files
      } else { // *.ini or *.properties file
        var data = parseProperties(response);
        for (var key in data) {
          var id, prop, nestedProp, index = key.lastIndexOf('.');
          if (index > 0) { // a property name has been specified
            id = key.slice(0, index);
            prop = key.slice(index + 1);
            index = id.lastIndexOf('.');
            if (index > 0) { // a nested property may have been specified
              nestedProp = id.substr(index + 1);
              if (gNestedProps.indexOf(nestedProp) > -1) {
                id = id.substr(0, index);
                prop = nestedProp + '.' + prop;
              }
            }
          } else { // no property name: assuming text content by default
            index = key.lastIndexOf('[');
            if (index > 0) { // we have a macro index
              id = key.slice(0, index);
              prop = '_' + key.slice(index);
            } else {
              id = key;
              prop = '_';
            }
          }
          if (!gL10nData[id]) {
            gL10nData[id] = {};
          }
          gL10nData[id][prop] = data[key];
        }
      }

      // trigger callback
      if (successCallback) {
        successCallback();
      }
    }, failureCallback, gAsyncResourceLoading);
  };

  // load and parse all resources for the specified locale
  function loadLocale(lang, translationRequired) {
    clear();
    gReadyState = 'loading';
    gLanguage = lang;

    var untranslatedElements = [];

    // if there is an inline / pre-compiled dictionary,
    // the current HTML document can be translated right now
    var inlineDict = getL10nDictionary(lang);
    if (inlineDict) {
      gL10nData = inlineDict;
      if (translationRequired) {
        untranslatedElements = translateFragment();
      }
    }

    // translate the document if required and fire a `localized' event
    function finish() {
      if (translationRequired) {
        if (!inlineDict) {
          // no inline dictionary has been used: translate the whole document
          untranslatedElements = translateFragment();
        } else if (untranslatedElements.length) {
          // the document should have been already translated but the inline
          // dictionary didn't include all necessary l10n keys:
          // try to translate all remaining elements now
          untranslatedElements = translateElements(untranslatedElements);
        }
      }
      // tell the rest of the world we're done
      // -- note that `gReadyState' must be set before the `localized' event is
      //    fired for `localizeElement()' to work as expected
      gReadyState = 'complete';
      fireL10nReadyEvent(lang);
      consoleWarn_missingKeys(untranslatedElements, lang);
    }

    // l10n resource loader
    function l10nResourceLink(link) {
      /**
       * l10n resource links can use the following syntax for href:
       * <link type="application/l10n" href="resources/{{locale}}.json" />
       * -- in which case, {{locale}} will be replaced by `navigator.language'.
       */
      var re = /\{\{\s*locale\s*\}\}/;

      var parse = function(locale, onload, onerror) {
        var href = unescape(link.href).replace(re, locale);
        parseResource(href, locale, onload, function notFound() {
          consoleWarn(href + ' not found.');
          onerror();
        });
      };

      this.load = function(locale, onload, onerror) {
        onerror = onerror || function() {};
        parse(locale, onload, function parseFallbackLocale() {
          /**
           * For links like <link href="resources/{{locale}}.json" />,
           * there's no way to know if the resource file matching the current
           * language has been found... before trying to fetch it with XHR
           * => if something went wrong, try the default locale as fallback.
           */
          if (re.test(unescape(link.href)) && gDefaultLocale != locale) {
            consoleLog('Trying the fallback locale: ' + gDefaultLocale);
            parse(gDefaultLocale, onload, onerror);
          } else {
            onerror();
          }
        });
      };
    }

    // check all <link type="application/l10n" href="..." /> nodes
    // and load the resource files
    var resourceLinks = getL10nResourceLinks();
    var resourceCount = resourceLinks.length;
    if (!resourceCount) {
      consoleLog('no resource to load, early way out');
      translationRequired = false;
      finish();
    } else {
      var onResourceCallback = function() {
        if (--resourceCount <= 0) { // <=> all resources have been XHR'ed
          finish();
        }
      };
      for (var i = 0, l = resourceCount; i < l; i++) {
        var resource = new l10nResourceLink(resourceLinks[i]);
        resource.load(lang, onResourceCallback, onResourceCallback);
      }
    }
  }

  // clear all l10n data
  function clear() {
    gL10nData = {};
    gLanguage = '';
    // TODO: clear all non predefined macros.
    // There's no such macro /yet/ but we're planning to have some...
  }


  /**
   * Get rules for plural forms (shared with JetPack), see:
   * http://unicode.org/repos/cldr-tmp/trunk/diff/supplemental/language_plural_rules.html
   * https://github.com/mozilla/addon-sdk/blob/master/python-lib/plural-rules-generator.p
   *
   * @param {string} lang
   *    locale (language) used.
   *
   * @return {Function}
   *    returns a function that gives the plural form name for a given integer:
   *       var fun = getPluralRules('en');
   *       fun(1)    -> 'one'
   *       fun(0)    -> 'other'
   *       fun(1000) -> 'other'.
   */

  var kPluralForms = ['zero', 'one', 'two', 'few', 'many', 'other'];

  function getPluralRules(lang) {
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

    // utility functions for plural rules methods
    function isIn(n, list) {
      return list.indexOf(n) !== -1;
    }
    function isBetween(n, start, end) {
      return start <= n && n <= end;
    }

    // list of all plural rules methods:
    // map an integer to the plural form name to use
    var pluralRules = {
      '0': function(n) {
        return 'other';
      },
      '1': function(n) {
        if ((isBetween((n % 100), 3, 10)))
          return 'few';
        if (n === 0)
          return 'zero';
        if ((isBetween((n % 100), 11, 99)))
          return 'many';
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '2': function(n) {
        if (n !== 0 && (n % 10) === 0)
          return 'many';
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '3': function(n) {
        if (n == 1)
          return 'one';
        return 'other';
      },
      '4': function(n) {
        if ((isBetween(n, 0, 1)))
          return 'one';
        return 'other';
      },
      '5': function(n) {
        if ((isBetween(n, 0, 2)) && n != 2)
          return 'one';
        return 'other';
      },
      '6': function(n) {
        if (n === 0)
          return 'zero';
        if ((n % 10) == 1 && (n % 100) != 11)
          return 'one';
        return 'other';
      },
      '7': function(n) {
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '8': function(n) {
        if ((isBetween(n, 3, 6)))
          return 'few';
        if ((isBetween(n, 7, 10)))
          return 'many';
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '9': function(n) {
        if (n === 0 || n != 1 && (isBetween((n % 100), 1, 19)))
          return 'few';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '10': function(n) {
        if ((isBetween((n % 10), 2, 9)) && !(isBetween((n % 100), 11, 19)))
          return 'few';
        if ((n % 10) == 1 && !(isBetween((n % 100), 11, 19)))
          return 'one';
        return 'other';
      },
      '11': function(n) {
        if ((isBetween((n % 10), 2, 4)) && !(isBetween((n % 100), 12, 14)))
          return 'few';
        if ((n % 10) === 0 ||
            (isBetween((n % 10), 5, 9)) ||
            (isBetween((n % 100), 11, 14)))
          return 'many';
        if ((n % 10) == 1 && (n % 100) != 11)
          return 'one';
        return 'other';
      },
      '12': function(n) {
        if ((isBetween(n, 2, 4)))
          return 'few';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '13': function(n) {
        if ((isBetween((n % 10), 2, 4)) && !(isBetween((n % 100), 12, 14)))
          return 'few';
        if (n != 1 && (isBetween((n % 10), 0, 1)) ||
            (isBetween((n % 10), 5, 9)) ||
            (isBetween((n % 100), 12, 14)))
          return 'many';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '14': function(n) {
        if ((isBetween((n % 100), 3, 4)))
          return 'few';
        if ((n % 100) == 2)
          return 'two';
        if ((n % 100) == 1)
          return 'one';
        return 'other';
      },
      '15': function(n) {
        if (n === 0 || (isBetween((n % 100), 2, 10)))
          return 'few';
        if ((isBetween((n % 100), 11, 19)))
          return 'many';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '16': function(n) {
        if ((n % 10) == 1 && n != 11)
          return 'one';
        return 'other';
      },
      '17': function(n) {
        if (n == 3)
          return 'few';
        if (n === 0)
          return 'zero';
        if (n == 6)
          return 'many';
        if (n == 2)
          return 'two';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '18': function(n) {
        if (n === 0)
          return 'zero';
        if ((isBetween(n, 0, 2)) && n !== 0 && n != 2)
          return 'one';
        return 'other';
      },
      '19': function(n) {
        if ((isBetween(n, 2, 10)))
          return 'few';
        if ((isBetween(n, 0, 1)))
          return 'one';
        return 'other';
      },
      '20': function(n) {
        if ((isBetween((n % 10), 3, 4) || ((n % 10) == 9)) && !(
            isBetween((n % 100), 10, 19) ||
            isBetween((n % 100), 70, 79) ||
            isBetween((n % 100), 90, 99)
            ))
          return 'few';
        if ((n % 1000000) === 0 && n !== 0)
          return 'many';
        if ((n % 10) == 2 && !isIn((n % 100), [12, 72, 92]))
          return 'two';
        if ((n % 10) == 1 && !isIn((n % 100), [11, 71, 91]))
          return 'one';
        return 'other';
      },
      '21': function(n) {
        if (n === 0)
          return 'zero';
        if (n == 1)
          return 'one';
        return 'other';
      },
      '22': function(n) {
        if ((isBetween(n, 0, 1)) || (isBetween(n, 11, 99)))
          return 'one';
        return 'other';
      },
      '23': function(n) {
        if ((isBetween((n % 10), 1, 2)) || (n % 20) === 0)
          return 'one';
        return 'other';
      },
      '24': function(n) {
        if ((isBetween(n, 3, 10) || isBetween(n, 13, 19)))
          return 'few';
        if (isIn(n, [2, 12]))
          return 'two';
        if (isIn(n, [1, 11]))
          return 'one';
        return 'other';
      }
    };

    // return a function that gives the plural form name for a given integer
    var index = locales2rules[lang.replace(/-.*$/, '')];
    if (!(index in pluralRules)) {
      consoleWarn('plural form unknown for [' + lang + ']');
      return function() { return 'other'; };
    }
    return pluralRules[index];
  }

  // pre-defined 'plural' macro
  gMacros.plural = function(str, param, key, prop) {
    var n = parseFloat(param);
    if (isNaN(n)) {
      return str;
    }

    var data = gL10nData[key];
    if (!data) {
      return str;
    }

    // initialize _pluralRules
    if (!gMacros._pluralRules) {
      gMacros._pluralRules = getPluralRules(gLanguage);
    }
    var index = '[' + gMacros._pluralRules(n) + ']';

    // try to find a [zero|one|two] form if it's defined
    if (n === 0 && (prop + '[zero]') in data) {
      str = data[prop + '[zero]'];
    } else if (n == 1 && (prop + '[one]') in data) {
      str = data[prop + '[one]'];
    } else if (n == 2 && (prop + '[two]') in data) {
      str = data[prop + '[two]'];
    } else if ((prop + index) in data) {
      str = data[prop + index];
    } else if ((prop + '[other]') in data) {
      str = data[prop + '[other]'];
    }

    return str;
  };


  /**
   * l10n dictionary functions
   */

  var reArgs = /\{\{\s*(.+?)\s*\}\}/;                       // arguments
  var reIndex = /\{\[\s*([a-zA-Z]+)\(([a-zA-Z]+)\)\s*\]\}/; // index macros

  // fetch an l10n object, warn if not found, apply `args' if possible
  function getL10nData(key, args) {
    var data = gL10nData[key];
    if (!data) {
      return null;
    }

    /**
     * This is where l10n expressions should be processed.
     * The plan is to support C-style expressions from the l20n project;
     * until then, only two kinds of simple expressions are supported:
     *   {[ index ]} and {{ arguments }}.
     */
    var rv = {};
    for (var prop in data) {
      var str = data[prop];
      str = substIndexes(str, args, key, prop);
      str = substArguments(str, args, key);
      rv[prop] = str;
    }
    return rv;
  }

  // return an array of all {{arguments}} found in a string
  function getL10nArgs(str) {
    var args = [];
    var match = reArgs.exec(str);
    while (match && match.length >= 2) {
      args.push({
        name: match[1], // name of the argument
        subst: match[0] // substring to replace (including braces and spaces)
      });
      str = str.substr(match.index + match[0].length);
      match = reArgs.exec(str);
    }
    return args;
  }

  // return a sub-dictionary sufficient to translate a given fragment
  function getSubDictionary(fragment) {
    if (!fragment) { // by default, return a clone of the whole dictionary
      return JSON.parse(JSON.stringify(gL10nData));
    }

    var dict = {};
    var elements = getTranslatableChildren(fragment);

    function checkGlobalArguments(str) {
      var match = getL10nArgs(str);
      for (var i = 0; i < match.length; i++) {
        var arg = match[i].name;
        if (arg in gL10nData) {
          dict[arg] = gL10nData[arg];
        }
      }
    }

    for (var i = 0, l = elements.length; i < l; i++) {
      var id = getL10nAttributes(elements[i]).id;
      var data = gL10nData[id];
      if (!id || !data) {
        continue;
      }

      dict[id] = data;
      for (var prop in data) {
        var str = data[prop];
        checkGlobalArguments(str);

        if (reIndex.test(str)) { // macro index
          for (var j = 0; j < kPluralForms.length; j++) {
            var key = id + '[' + kPluralForms[j] + ']';
            if (key in gL10nData) {
              dict[key] = gL10nData[key];
              checkGlobalArguments(gL10nData[key]);
            }
          }
        }
      }
    }

    return dict;
  }

  // replace {[macros]} with their values
  function substIndexes(str, args, key, prop) {
    var reMatch = reIndex.exec(str);
    if (!reMatch || !reMatch.length) {
      return str;
    }

    // an index/macro has been found
    // Note: at the moment, only one parameter is supported
    var macroName = reMatch[1];
    var paramName = reMatch[2];
    var param;
    if (args && paramName in args) {
      param = args[paramName];
    } else if (paramName in gL10nData) {
      param = gL10nData[paramName];
    }

    // there's no macro parser yet: it has to be defined in gMacros
    if (macroName in gMacros) {
      var macro = gMacros[macroName];
      str = macro(str, param, key, prop);
    }
    return str;
  }

  // replace {{arguments}} with their values
  function substArguments(str, args, key) {
    var match = getL10nArgs(str);
    for (var i = 0; i < match.length; i++) {
      var sub, arg = match[i].name;
      if (args && arg in args) {
        sub = args[arg];
      } else if (arg in gL10nData) {
        sub = gL10nData[arg]['_'];
      } else {
        consoleLog('argument {{' + arg + '}} for #' + key + ' is undefined.');
        return str;
      }
      str = str.replace(match[i].subst, sub);
    }
    return str;
  }

  // translate an HTML element
  // -- returns true if the element could be translated, false otherwise
  function translateElement(element) {
    var l10n = getL10nAttributes(element);
    if (!l10n.id) {
      return true;
    }

    // get the related l10n object
    var data = getL10nData(l10n.id, l10n.args);
    if (!data) {
      return false;
    }

    // translate element (TODO: security checks?)
    for (var k in data) {
      if (k === '_') {
        setTextContent(element, data._);
      } else {
        var idx = k.lastIndexOf('.');
        var nestedProp = k.substr(0, idx);
        if (gNestedProps.indexOf(nestedProp) > -1) {
          element[nestedProp][k.substr(idx + 1)] = data[k];
        } else if (k === 'ariaLabel') {
          element.setAttribute('aria-label', data[k]);
        } else {
          element[k] = data[k];
        }
      }
    }
    return true;
  }

  // translate an array of HTML elements
  // -- returns an array of elements that could not be translated
  function translateElements(elements) {
    var untranslated = [];
    for (var i = 0, l = elements.length; i < l; i++) {
      if (!translateElement(elements[i])) {
        untranslated.push(elements[i]);
      }
    }
    return untranslated;
  }

  // translate an HTML subtree
  // -- returns an array of elements that could not be translated
  function translateFragment(element) {
    element = element || document.documentElement;
    var untranslated = translateElements(getTranslatableChildren(element));
    if (!translateElement(element)) {
      untranslated.push(element);
    }
    return untranslated;
  }

  // localize an element as soon as mozL10n is ready
  function localizeElement(element, id, args) {
    if (!element) {
      return;
    }

    if (!id) {
      element.removeAttribute('data-l10n-id');
      element.removeAttribute('data-l10n-args');
      setTextContent(element, '');
      return;
    }

    // set the data-l10n-[id|args] attributes
    element.setAttribute('data-l10n-id', id);
    if (args && typeof args === 'object') {
      element.setAttribute('data-l10n-args', JSON.stringify(args));
    } else {
      element.removeAttribute('data-l10n-args');
    }

    // if l10n resources are ready, translate now;
    // if not, the element will be translated along with the document anyway.
    if (gReadyState === 'complete') {
      translateElement(element);
    }
  }


  /**
   * Startup & Public API
   *
   * This section is quite specific to the B2G project: old browsers are not
   * supported and the API is slightly different from the standard webl10n one.
   */

  // load the default locale on startup
  function l10nStartup() {
    gDefaultLocale = document.documentElement.lang || gDefaultLocale;
    gReadyState = 'interactive';
    consoleLog('loading [' + navigator.language + '] resources, ' +
        (gAsyncResourceLoading ? 'asynchronously.' : 'synchronously.'));

    // load the default locale and translate the document if required
    var translationRequired =
      (document.documentElement.lang !== navigator.language);
    loadLocale(navigator.language, translationRequired);
  }

  // the B2G build system doesn't expose any `document'...
  if (typeof(document) !== 'undefined') {
    if (document.readyState === 'complete' ||
      document.readyState === 'interactive') {
      window.setTimeout(l10nStartup);
    } else {
      document.addEventListener('DOMContentLoaded', l10nStartup);
    }
  }

  // load the appropriate locale if the language setting has changed
  if ('mozSettings' in navigator && navigator.mozSettings) {
    navigator.mozSettings.addObserver('language.current', function(event) {
      loadLocale(event.settingValue, true);
    });
  }

  // public API
  navigator.mozL10n = {
    // get a localized string
    get: function l10n_get(key, args) {
      var data = getL10nData(key, args);
      if (!data) {
        consoleWarn('#' + key + ' is undefined.');
        return '';
      } else {
        return data._;
      }
    },

    // get|set the document language and direction
    get language() {
      return {
        // get|set the document language (ISO-639-1)
        get code() { return gLanguage; },
        set code(lang) { loadLocale(lang, true); },

        // get the direction (ltr|rtl) of the current language
        get direction() {
          // http://www.w3.org/International/questions/qa-scripts
          // Arabic, Hebrew, Farsi, Pashto, Urdu
          var rtlList = ['ar', 'he', 'fa', 'ps', 'ur'];
          return (rtlList.indexOf(gLanguage) >= 0) ? 'rtl' : 'ltr';
        }
      };
    },

    // translate an element or document fragment
    translate: translateFragment,

    // localize an element (= set its data-l10n-* attributes and translate it)
    localize: localizeElement,

    // get (a part of) the dictionary for the current locale
    getDictionary: getSubDictionary,

    // this can be used to prevent race conditions
    get readyState() { return gReadyState; },
    ready: function l10n_ready(callback) {
      if (!callback) {
        return;
      }
      if (gReadyState == 'complete') {
        window.setTimeout(callback);
      } else {
        window.addEventListener('localized', callback);
      }
    }
  };

  consoleLog('library loaded.');
})(this);

