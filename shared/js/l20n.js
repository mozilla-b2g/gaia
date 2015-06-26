(function () {
  'use strict';

  const modules = new Map();
  const moduleCache = new Map();

  function getModule(id) {
    if (!moduleCache.has(id)) {
      moduleCache.set(id, modules.get(id)())
    }

    return moduleCache.get(id);
  }

  modules.set('lib/intl', function () {
    function prioritizeLocales(def, availableLangs, requested) {
      var supportedLocale;

      for (var i = 0; i < requested.length; i++) {
        var locale = requested[i];

        if (availableLangs.indexOf(locale) !== -1) {
          supportedLocale = locale;
          break;
        }
      }

      if (!supportedLocale || supportedLocale === def) {
        return [def];
      }

      return [supportedLocale, def];
    }

    return { prioritizeLocales };
  });
  modules.set('bindings/html/langs', function () {
    const { prioritizeLocales } = getModule('lib/intl');
    const { qps } = getModule('lib/pseudo');
    const rtlList = ['ar', 'he', 'fa', 'ps', 'qps-plocm', 'ur'];

    function negotiateLanguages(fn, appVersion, defaultLang, availableLangs, additionalLangs, prevLangs, requestedLangs) {
      let allAvailableLangs = Object.keys(availableLangs).concat(additionalLangs || []).concat(Object.keys(qps));
      let newLangs = prioritizeLocales(defaultLang, allAvailableLangs, requestedLangs);
      let langs = newLangs.map(code => ({
        code: code,
        src: getLangSource(appVersion, availableLangs, additionalLangs, code),
        dir: getDirection(code)
      }));

      if (!arrEqual(prevLangs, newLangs)) {
        fn(langs);
      }

      return langs;
    }

    function getDirection(code) {
      return rtlList.indexOf(code) >= 0 ? 'rtl' : 'ltr';
    }

    function arrEqual(arr1, arr2) {
      return arr1.length === arr2.length && arr1.every((elem, i) => elem === arr2[i]);
    }

    function getMatchingLangpack(appVersion, langpacks) {
      for (var i = 0, langpack; langpack = langpacks[i]; i++) {
        if (langpack.target === appVersion) {
          return langpack;
        }
      }

      return null;
    }

    function getLangSource(appVersion, availableLangs, additionalLangs, code) {
      if (additionalLangs && additionalLangs[code]) {
        let lp = getMatchingLangpack(appVersion, additionalLangs[code]);

        if (lp && (!(code in availableLangs) || parseInt(lp.revision) > availableLangs[code])) {
          return 'extra';
        }
      }

      if (code in qps && !(code in availableLangs)) {
        return 'qps';
      }

      return 'app';
    }

    return { negotiateLanguages };
  });
  modules.set('bindings/html/dom', function () {
    const allowed = {
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

    function setAttributes(element, id, args) {
      element.setAttribute('data-l10n-id', id);

      if (args) {
        element.setAttribute('data-l10n-args', JSON.stringify(args));
      }
    }

    function getAttributes(element) {
      return {
        id: element.getAttribute('data-l10n-id'),
        args: JSON.parse(element.getAttribute('data-l10n-args'))
      };
    }

    function getTranslatables(element) {
      var nodes = [];

      if (typeof element.hasAttribute === 'function' && element.hasAttribute('data-l10n-id')) {
        nodes.push(element);
      }

      return nodes.concat.apply(nodes, element.querySelectorAll('*[data-l10n-id]'));
    }

    function translateDocument(view, langs, doc) {
      let setDOMLocalized = function () {
        doc.localized = true;
        dispatchEvent(doc, 'DOMLocalized', langs);
      };

      if (langs[0].code === doc.documentElement.getAttribute('lang')) {
        return Promise.resolve(setDOMLocalized());
      }

      return translateFragment(view, langs, doc.documentElement).then(() => {
        doc.documentElement.lang = langs[0].code;
        doc.documentElement.dir = langs[0].dir;
        setDOMLocalized();
      });
    }

    function translateMutations(view, langs, mutations) {
      let targets = new Set();

      for (let mutation of mutations) {
        switch (mutation.type) {
          case 'attributes':
            targets.add(mutation.target);
            break;

          case 'childList':
            for (let addedNode of mutation.addedNodes) {
              if (addedNode.nodeType === Node.ELEMENT_NODE) {
                targets.add(addedNode);
              }
            }

            break;
        }
      }

      if (targets.size === 0) {
        return;
      }

      let elements = [];
      targets.forEach(target => target.childElementCount ? elements.concat(getTranslatables(target)) : elements.push(target));
      Promise.all(elements.map(elem => getElementTranslation(view, langs, elem))).then(translations => applyTranslations(view, elements, translations));
    }

    function translateFragment(view, langs, frag) {
      let elements = getTranslatables(frag);
      return Promise.all(elements.map(elem => getElementTranslation(view, langs, elem))).then(translations => applyTranslations(view, elements, translations));
    }

    function camelCaseToDashed(string) {
      if (string === 'ariaValueText') {
        return 'aria-valuetext';
      }

      return string.replace(/[A-Z]/g, function (match) {
        return '-' + match.toLowerCase();
      }).replace(/^-/, '');
    }

    function getElementTranslation(view, langs, elem) {
      var l10n = getAttributes(elem);
      return l10n.id ? view.ctx.formatEntity(langs, l10n.id, l10n.args) : false;
    }

    function translateElement(view, langs, elem) {
      return getElementTranslation(view, langs, elem).then(translation => {
        if (!translation) {
          return false;
        }

        view.disconnect();
        applyTranslation(view, elem, translation);
        view.observe();
      });
    }

    function applyTranslations(view, elements, translations) {
      view.disconnect();

      for (let i = 0; i < elements.length; i++) {
        if (translations[i] === false) {
          continue;
        }

        applyTranslation(view, elements[i], translations[i]);
      }

      view.observe();
    }

    function applyTranslation(view, element, translation) {
      var value;

      if (translation.attrs && translation.attrs.innerHTML) {
        value = translation.attrs.innerHTML;
        console.warn('L10n Deprecation Warning: using innerHTML in translations is unsafe ' + 'and will not be supported in future versions of l10n.js. ' + 'See https://bugzil.la/1027117');
      } else {
        value = translation.value;
      }

      if (typeof value === 'string') {
        if (!translation.overlay) {
          element.textContent = value;
        } else {
          var tmpl = element.ownerDocument.createElement('template');
          tmpl.innerHTML = value;
          overlayElement(element, tmpl.content);
        }
      }

      for (var key in translation.attrs) {
        var attrName = camelCaseToDashed(key);

        if (isAttrAllowed({
          name: attrName
        }, element)) {
          element.setAttribute(attrName, translation.attrs[key]);
        }
      }
    }

    function overlayElement(sourceElement, translationElement) {
      var result = translationElement.ownerDocument.createDocumentFragment();
      var k, attr;
      var childElement;

      while (childElement = translationElement.childNodes[0]) {
        translationElement.removeChild(childElement);

        if (childElement.nodeType === Node.TEXT_NODE) {
          result.appendChild(childElement);
          continue;
        }

        var index = getIndexOfType(childElement);
        var sourceChild = getNthElementOfType(sourceElement, childElement, index);

        if (sourceChild) {
          overlayElement(sourceChild, childElement);
          result.appendChild(sourceChild);
          continue;
        }

        if (isElementAllowed(childElement)) {
          for (k = 0, attr; attr = childElement.attributes[k]; k++) {
            if (!isAttrAllowed(attr, childElement)) {
              childElement.removeAttribute(attr.name);
            }
          }

          result.appendChild(childElement);
          continue;
        }

        result.appendChild(document.createTextNode(childElement.textContent));
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

      for (var i = 0, child; child = context.children[i]; i++) {
        if (child.nodeType === Node.ELEMENT_NODE && child.tagName === element.tagName) {
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
      var child;

      while (child = element.previousElementSibling) {
        if (child.tagName === element.tagName) {
          index++;
        }
      }

      return index;
    }

    function dispatchEvent(root, name, langs) {
      var event = new CustomEvent(name, {
        bubbles: false,
        cancelable: false,
        detail: {
          languages: langs
        }
      });
      root.dispatchEvent(event);
    }

    return { setAttributes, getAttributes, translateDocument, translateMutations, translateFragment, translateElement, dispatchEvent };
  });
  modules.set('bindings/html/head', function () {
    function getResourceLinks(head) {
      return Array.prototype.map.call(head.querySelectorAll('link[rel="localization"]'), el => el.getAttribute('href'));
    }

    function getMeta(head) {
      let availableLangs = Object.create(null);
      let defaultLang = null;
      let appVersion = null;
      let els = head.querySelectorAll('meta[name="availableLanguages"],' + 'meta[name="defaultLanguage"],' + 'meta[name="appVersion"]');

      for (let el of els) {
        let name = el.getAttribute('name');
        let content = el.getAttribute('content').trim();

        switch (name) {
          case 'availableLanguages':
            availableLangs = getLangRevisionMap(availableLangs, content);
            break;

          case 'defaultLanguage':
            let [lang, rev] = getLangRevisionTuple(content);
            defaultLang = lang;

            if (!(lang in availableLangs)) {
              availableLangs[lang] = rev;
            }

            break;

          case 'appVersion':
            appVersion = content;
        }
      }

      return {
        defaultLang,
        availableLangs,
        appVersion
      };
    }

    function getLangRevisionMap(seq, str) {
      return str.split(',').reduce((seq, cur) => {
        let [lang, rev] = getLangRevisionTuple(cur);
        seq[lang] = rev;
        return seq;
      }, seq);
    }

    function getLangRevisionTuple(str) {
      let [lang, rev] = str.trim().split(':');
      return [lang, parseInt(rev)];
    }

    return { getResourceLinks, getMeta };
  });
  modules.set('bindings/html/view', function () {
    const { getResourceLinks } = getModule('bindings/html/head');
    const { setAttributes, getAttributes, dispatchEvent, translateDocument, translateFragment, translateMutations } = getModule('bindings/html/dom');
    const observerConfig = {
      attributes: true,
      characterData: false,
      childList: true,
      subtree: true,
      attributeFilter: ['data-l10n-id', 'data-l10n-args']
    };

    class View {
      constructor(service, doc) {
        this.service = service;
        this.doc = doc;
        this.ctx = this.service.env.createContext(getResourceLinks(doc.head));
        this.ready = new Promise(function (resolve) {
          let viewReady = function (evt) {
            doc.removeEventListener('DOMLocalized', viewReady);
            resolve(evt.detail.languages);
          };

          doc.addEventListener('DOMLocalized', viewReady);
        });
        let observer = new MutationObserver(onMutations.bind(this));

        this.observe = () => observer.observe(this.doc, observerConfig);

        this.disconnect = () => observer.disconnect();

        this.observe();
      }
      formatValue(id, args) {
        return this.service.languages.then(langs => this.ctx.formatValue(langs, id, args));
      }
      formatEntity(id, args) {
        return this.service.languages.then(langs => this.ctx.formatEntity(langs, id, args));
      }
      translateFragment(frag) {
        return this.service.languages.then(langs => translateFragment(this, langs, frag));
      }
    }

    View.prototype.setAttributes = setAttributes;
    View.prototype.getAttributes = getAttributes;

    function translate(langs) {
      dispatchEvent(this.doc, 'supportedlanguageschange', langs);
      return this.ctx.fetch(langs).then(() => translateDocument(this, langs, this.doc));
    }

    function onMutations(mutations) {
      return this.service.languages.then(langs => translateMutations(this, langs, mutations));
    }

    return { View, translate };
  });
  modules.set('lib/events', function () {
    function emit(listeners, ...args) {
      let type = args.shift();

      if (listeners[type]) {
        listeners[type].slice().forEach(listener => listener.apply(this, args));
      }

      if (listeners['*']) {
        listeners['*'].slice().forEach(listener => listener.apply(this, args));
      }
    }

    function addEventListener(listeners, type, listener) {
      if (!(type in listeners)) {
        listeners[type] = [];
      }

      listeners[type].push(listener);
    }

    function removeEventListener(listeners, type, listener) {
      let typeListeners = listeners[type];
      let pos = typeListeners.indexOf(listener);

      if (pos === -1) {
        return;
      }

      typeListeners.splice(pos, 1);
    }

    return { emit, addEventListener, removeEventListener };
  });
  modules.set('lib/pseudo', function () {
    function walkContent(node, fn) {
      if (typeof node === 'string') {
        return fn(node);
      }

      if (node.t === 'idOrVar') {
        return node;
      }

      var rv = Array.isArray(node) ? [] : {};
      var keys = Object.keys(node);

      for (var i = 0, key; key = keys[i]; i++) {
        if (key === '$i' || key === '$x') {
          rv[key] = node[key];
        } else {
          rv[key] = walkContent(node[key], fn);
        }
      }

      return rv;
    }

    var reAlphas = /[a-zA-Z]/g;
    var reVowels = /[aeiouAEIOU]/g;
    var ACCENTED_MAP = 'ȦƁƇḒḖƑƓĦĪ' + 'ĴĶĿḾȠǾƤɊŘ' + 'ŞŦŬṼẆẊẎẐ' + '[\\]^_`' + 'ȧƀƈḓḗƒɠħī' + 'ĵķŀḿƞǿƥɋř' + 'şŧŭṽẇẋẏẑ';
    var FLIPPED_MAP = '∀ԐↃpƎɟפHIſ' + 'Ӽ˥WNOԀÒᴚS⊥∩Ʌ' + 'ＭXʎZ' + '[\\]ᵥ_,' + 'ɐqɔpǝɟƃɥıɾ' + 'ʞʅɯuodbɹsʇnʌʍxʎz';

    function makeLonger(val) {
      return val.replace(reVowels, function (match) {
        return match + match.toLowerCase();
      });
    }

    function replaceChars(map, val) {
      return val.replace(reAlphas, function (match) {
        return map.charAt(match.charCodeAt(0) - 65);
      });
    }

    var reWords = /[^\W0-9_]+/g;

    function makeRTL(val) {
      return val.replace(reWords, function (match) {
        return '‮' + match + '‬';
      });
    }

    var reExcluded = /(%[EO]?\w|\{\s*.+?\s*\}|&[#\w]+;|<\s*.+?\s*>)/;

    function mapContent(fn, val) {
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
    }

    function Pseudo(id, name, charMap, modFn) {
      this.id = id;
      this.translate = mapContent.bind(null, function (val) {
        return replaceChars(charMap, modFn(val));
      });
      this.name = this.translate(name);
    }

    const qps = {
      'qps-ploc': new Pseudo('qps-ploc', 'Runtime Accented', ACCENTED_MAP, makeLonger),
      'qps-plocm': new Pseudo('qps-plocm', 'Runtime Mirrored', FLIPPED_MAP, makeRTL)
    };
    return { walkContent, qps };
  });
  modules.set('lib/format/l20n/parser', function () {
    const { L10nError } = getModule('lib/errors');
    const MAX_PLACEABLES = 100;
    return {
      _patterns: null,
      init: function () {
        this._patterns = {
          index: /@cldr\.plural\(\$?(\w+)\)/g,
          placeables: /\{\{\s*\$?([^\s]*?)\s*\}\}/,
          unesc: /\\({{|u[0-9a-fA-F]{4}|.)/g
        };
      },
      parse: function (env, string, simple) {
        if (!this._patterns) {
          this.init();
        }

        this._source = string;
        this._index = 0;
        this._length = this._source.length;
        this.simpleMode = simple;
        this.env = env;
        return this.getL20n();
      },
      getAttributes: function () {
        let attrs = Object.create(null);

        while (true) {
          let attr = this.getKVPWithIndex();
          attrs[attr[0]] = attr[1];
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
      getKVP: function () {
        const key = this.getIdentifier();
        this.getWS();

        if (this._source.charAt(this._index) !== ':') {
          throw this.error('Expected ":"');
        }

        ++this._index;
        this.getWS();
        return [key, this.getValue()];
      },
      getKVPWithIndex: function () {
        const key = this.getIdentifier();
        let index = null;

        if (this._source.charAt(this._index) === '[') {
          ++this._index;
          this.getWS();
          index = this.getIndex();
        }

        this.getWS();

        if (this._source.charAt(this._index) !== ':') {
          throw this.error('Expected ":"');
        }

        ++this._index;
        this.getWS();
        return [key, this.getValue(false, undefined, index)];
      },
      getHash: function () {
        ++this._index;
        this.getWS();
        let hash = {};

        while (true) {
          const hi = this.getKVP();
          hash[hi[0]] = hi[1];
          this.getWS();
          const comma = this._source.charAt(this._index) === ',';

          if (comma) {
            ++this._index;
            this.getWS();
          }

          if (this._source.charAt(this._index) === '}') {
            ++this._index;
            break;
          }

          if (!comma) {
            throw this.error('Expected "}"');
          }
        }

        return hash;
      },
      unescapeString: function (str, opchar) {
        function replace(match, p1) {
          switch (p1) {
            case '\\':
              return '\\';

            case '{{':
              return '{{';

            case opchar:
              return opchar;

            default:
              if (p1.length === 5 && p1.charAt(0) === 'u') {
                return String.fromCharCode(parseInt(p1.substr(1), 16));
              }

              throw this.error('Illegal unescape sequence');
          }
        }

        return str.replace(this._patterns.unesc, replace.bind(this));
      },
      getString: function (opchar) {
        let overlay = false;

        let opcharPos = this._source.indexOf(opchar, this._index + 1);

        outer: while (opcharPos !== -1) {
          let backtrack = opcharPos - 1;

          while (this._source.charCodeAt(backtrack) === 92) {
            if (this._source.charCodeAt(backtrack - 1) === 92) {
              backtrack -= 2;
            } else {
              opcharPos = this._source.indexOf(opchar, opcharPos + 1);
              continue outer;
            }
          }

          break;
        }

        if (opcharPos === -1) {
          throw this.error('Unclosed string literal');
        }

        let buf = this._source.slice(this._index + 1, opcharPos);

        this._index = opcharPos + 1;

        if (!this.simpleMode && buf.indexOf('\\') !== -1) {
          buf = this.unescapeString(buf, opchar);
        }

        if (buf.indexOf('<') > -1 || buf.indexOf('&') > -1) {
          overlay = true;
        }

        if (!this.simpleMode && buf.indexOf('{{') !== -1) {
          return [this.parseString(buf), overlay];
        }

        return [buf, overlay];
      },
      getValue: function (optional, ch, index) {
        let val;

        if (ch === undefined) {
          ch = this._source.charAt(this._index);
        }

        if (ch === '\'' || ch === '"') {
          const valAndOverlay = this.getString(ch);

          if (valAndOverlay[1]) {
            val = {
              '$o': valAndOverlay[0]
            };
          } else {
            val = valAndOverlay[0];
          }
        } else if (ch === '{') {
          val = this.getHash();
        }

        if (val === undefined) {
          if (!optional) {
            throw this.error('Unknown value type');
          }

          return null;
        }

        if (index) {
          return {
            '$v': val,
            '$x': index
          };
        }

        return val;
      },
      getRequiredWS: function () {
        const pos = this._index;

        let cc = this._source.charCodeAt(pos);

        while (cc === 32 || cc === 10 || cc === 9 || cc === 13) {
          cc = this._source.charCodeAt(++this._index);
        }

        return this._index !== pos;
      },
      getWS: function () {
        let cc = this._source.charCodeAt(this._index);

        while (cc === 32 || cc === 10 || cc === 9 || cc === 13) {
          cc = this._source.charCodeAt(++this._index);
        }
      },
      getIdentifier: function () {
        const start = this._index;

        let cc = this._source.charCodeAt(this._index);

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
      getComment: function () {
        this._index += 2;
        const start = this._index;

        const end = this._source.indexOf('*/', start);

        if (end === -1) {
          throw this.error('Comment without closing tag');
        }

        this._index = end + 2;
        return;
      },
      getEntity: function (id, index) {
        const entity = {
          '$i': id
        };

        if (index) {
          entity.$x = index;
        }

        if (!this.getRequiredWS()) {
          throw this.error('Expected white space');
        }

        const ch = this._source.charAt(this._index);

        const value = this.getValue(index === null, ch);
        let attrs = null;

        if (value === null) {
          if (ch === '>') {
            throw this.error('Expected ">"');
          }

          attrs = this.getAttributes();
        } else {
          entity.$v = value;
          const ws1 = this.getRequiredWS();

          if (this._source.charAt(this._index) !== '>') {
            if (!ws1) {
              throw this.error('Expected ">"');
            }

            attrs = this.getAttributes();
          }
        }

        ++this._index;

        if (attrs) {
          for (let key in attrs) {
            entity[key] = attrs[key];
          }
        }

        return entity;
      },
      getEntry: function () {
        if (this._source.charCodeAt(this._index) === 60) {
          ++this._index;
          const id = this.getIdentifier();

          if (this._source.charCodeAt(this._index) === 91) {
            ++this._index;
            return this.getEntity(id, this.getIndex());
          }

          return this.getEntity(id, null);
        }

        if (this._source.charCodeAt(this._index) === 47 && this._source.charCodeAt(this._index + 1) === 42) {
          return this.getComment();
        }

        throw this.error('Invalid entry');
      },
      getL20n: function () {
        const ast = [];
        this.getWS();

        while (this._index < this._length) {
          try {
            const entry = this.getEntry();

            if (entry) {
              ast.push(entry);
            }
          } catch (e) {
            if (this.env) {
              this.env.emit('parseerror', e);
            } else {
              throw e;
            }
          }

          if (this._index < this._length) {
            this.getWS();
          }
        }

        return ast;
      },
      getIndex: function () {
        this.getWS();
        this._patterns.index.lastIndex = this._index;

        const match = this._patterns.index.exec(this._source);

        this._index = this._patterns.index.lastIndex;
        this.getWS();
        this._index++;
        return [{
          t: 'idOrVar',
          v: 'plural'
        }, match[1]];
      },
      parseString: function (str) {
        const chunks = str.split(this._patterns.placeables);
        const complexStr = [];
        const len = chunks.length;
        const placeablesCount = (len - 1) / 2;

        if (placeablesCount >= MAX_PLACEABLES) {
          throw new L10nError('Too many placeables (' + placeablesCount + ', max allowed is ' + MAX_PLACEABLES + ')');
        }

        for (let i = 0; i < chunks.length; i++) {
          if (chunks[i].length === 0) {
            continue;
          }

          if (i % 2 === 1) {
            complexStr.push({
              t: 'idOrVar',
              v: chunks[i]
            });
          } else {
            complexStr.push(chunks[i]);
          }
        }

        return complexStr;
      },
      error: function (message, pos) {
        if (pos === undefined) {
          pos = this._index;
        }

        let start = this._source.lastIndexOf('<', pos - 1);

        const lastClose = this._source.lastIndexOf('>', pos - 1);

        start = lastClose > start ? lastClose + 1 : start;

        const context = this._source.slice(start, pos + 10);

        const msg = message + ' at pos ' + pos + ': "' + context + '"';
        return new L10nError(msg, pos, context);
      }
    };
  });
  modules.set('lib/format/properties/parser', function () {
    const { L10nError } = getModule('lib/errors');
    var MAX_PLACEABLES = 100;
    return {
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
      parse: function (env, source) {
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
              if (env) {
                env.emit('parseerror', e);
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

        if (rawValue.indexOf('<') > -1 || rawValue.indexOf('&') > -1) {
          value = {
            $o: value
          };
        }

        if (attr) {
          pos = this.entryIds[id];

          if (pos === undefined) {
            v = {
              $i: id
            };

            if (key) {
              v[attr] = {};
              v[attr][key] = value;
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
            ast.push({
              $i: id,
              $v: v
            });
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

        ast.push({
          $i: id,
          $v: value
        });
        this.entryIds[id] = ast.length - 1;
      },
      parseString: function (str) {
        var chunks = str.split(this.patterns.placeables);
        var complexStr = [];
        var len = chunks.length;
        var placeablesCount = (len - 1) / 2;

        if (placeablesCount >= MAX_PLACEABLES) {
          throw new L10nError('Too many placeables (' + placeablesCount + ', max allowed is ' + MAX_PLACEABLES + ')');
        }

        for (var i = 0; i < chunks.length; i++) {
          if (chunks[i].length === 0) {
            continue;
          }

          if (i % 2 === 1) {
            complexStr.push({
              t: 'idOrVar',
              v: chunks[i]
            });
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
            t: 'idOrVar',
            v: match[1]
          }, match[2]];
        } else {
          return [{
            t: 'idOrVar',
            v: match[1]
          }];
        }
      }
    };
  });
  modules.set('lib/plurals', function () {
    function getPluralRule(code) {
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
      var index = locales2rules[code.replace(/-.*$/, '')];

      if (!(index in pluralRules)) {
        return function () {
          return 'other';
        };
      }

      return pluralRules[index];
    }

    return { getPluralRule };
  });
  modules.set('lib/resolver', function () {
    const { L10nError } = getModule('lib/errors');
    var KNOWN_MACROS = ['plural'];
    var MAX_PLACEABLE_LENGTH = 2500;
    var nonLatin1 = /[^\x01-\xFF]/;
    var FSI = '⁨';
    var PDI = '⁩';
    const meta = new WeakMap();
    const resolutionChain = new WeakSet();

    function createEntry(node, lang) {
      var keys = Object.keys(node);

      if (typeof node.$v === 'string' && keys.length === 2) {
        return node.$v;
      }

      var attrs;

      for (var i = 0, key; key = keys[i]; i++) {
        if (key[0] === '$') {
          continue;
        }

        if (!attrs) {
          attrs = Object.create(null);
        }

        attrs[key] = createAttribute(node[key], lang, node.$i + '.' + key);
      }

      let entity = {
        value: node.$v !== undefined ? node.$v : null,
        index: node.$x || null,
        attrs: attrs || null
      };
      meta.set(entity, {
        id: node.$i,
        lang
      });
      return entity;
    }

    function createAttribute(node, lang, id) {
      if (typeof node === 'string') {
        return node;
      }

      let attr = {
        value: node.$v || (node !== undefined ? node : null),
        index: node.$x || null
      };
      meta.set(attr, {
        id,
        lang
      });
      return attr;
    }

    function format(ctx, args, entity) {
      let locals = {
        overlay: false
      };

      if (typeof entity === 'string') {
        return [locals, entity];
      }

      if (resolutionChain.has(entity)) {
        const m = meta.get(entity);
        throw new L10nError('Cyclic reference detected: ' + m.id, m.id, m.lang);
      }

      resolutionChain.add(entity);
      let rv;

      try {
        rv = resolveValue(locals, ctx, meta.get(entity).lang, args, entity.value, entity.index);
      } catch (err) {
        const m = meta.get(entity);
        err.id = m.id;
        err.lang = m.lang;
        throw err;
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
        return format(ctx, args, entity);
      }

      throw new L10nError('Unknown reference: ' + id);
    }

    function subPlaceable(locals, ctx, lang, args, id) {
      var res;

      try {
        res = resolveIdentifier(ctx, lang, args, id);
      } catch (err) {
        return [{
          error: err
        }, '{{ ' + id + ' }}'];
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
      return arr.reduce(function (prev, cur) {
        if (typeof cur === 'string') {
          return [prev[0], prev[1] + cur];
        } else if (cur.t === 'idOrVar') {
          var placeable = subPlaceable(locals, ctx, lang, args, cur.v);

          if (placeable[0].overlay) {
            prev[0].overlay = true;
          }

          return [prev[0], prev[1] + placeable[1]];
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

      if (expr.$o) {
        expr = expr.$o;
        locals.overlay = true;
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

    return { createEntry, format };
  });
  modules.set('lib/context', function () {
    const { L10nError } = getModule('lib/errors');
    const { format } = getModule('lib/resolver');
    const { getPluralRule } = getModule('lib/plurals');

    class Context {
      constructor(env, resIds) {
        this._env = env;
        this._resIds = resIds;
      }
      fetch(langs) {
        return this._fetchResources(langs);
      }
      formatValue(langs, id, args) {
        return this.fetch(langs).then(this._fallback.bind(this, Context.prototype._formatValue, id, args));
      }
      formatEntity(langs, id, args) {
        return this.fetch(langs).then(this._fallback.bind(this, Context.prototype._formatEntity, id, args));
      }
      _formatTuple(args, entity) {
        try {
          return format(this, args, entity);
        } catch (err) {
          this._env.emit('resolveerror', err, this);

          return [{
            error: err
          }, err.id];
        }
      }
      _formatValue(args, entity) {
        if (typeof entity === 'string') {
          return entity;
        }

        return this._formatTuple.call(this, args, entity)[1];
      }
      _formatEntity(args, entity) {
        var [locals, value] = this._formatTuple.call(this, args, entity);

        var formatted = {
          value,
          attrs: null,
          overlay: locals.overlay
        };

        if (entity.attrs) {
          formatted.attrs = Object.create(null);
        }

        for (var key in entity.attrs) {
          var [attrLocals, attrValue] = this._formatTuple.call(this, args, entity.attrs[key]);

          formatted.attrs[key] = attrValue;

          if (attrLocals.overlay) {
            formatted.overlay = true;
          }
        }

        return formatted;
      }
      _fetchResources(langs) {
        if (langs.length === 0) {
          return Promise.resolve(langs);
        }

        return Promise.all(this._resIds.map(this._env._getResource.bind(this._env, langs[0]))).then(() => langs);
      }
      _fallback(method, id, args, langs) {
        let lang = langs[0];

        if (!lang) {
          let err = new L10nError('"' + id + '"' + ' not found in any language.', id);

          this._env.emit('notfounderror', err, this);

          return id;
        }

        let entity = this._getEntity(lang, id);

        if (entity) {
          return method.call(this, args, entity);
        } else {
          let err = new L10nError('"' + id + '"' + ' not found in ' + lang.code + '.', id, lang.code);

          this._env.emit('notfounderror', err, this);
        }

        return this._fetchResources(langs.slice(1)).then(this._fallback.bind(this, method, id, args));
      }
      _getEntity(lang, id) {
        var cache = this._env._resCache;

        for (var i = 0, resId; resId = this._resIds[i]; i++) {
          var resource = cache[resId + lang.code + lang.src];

          if (resource instanceof L10nError) {
            continue;
          }

          if (id in resource) {
            return resource[id];
          }
        }

        return undefined;
      }
      _getMacro(lang, id) {
        switch (id) {
          case 'plural':
            return getPluralRule(lang.code);

          default:
            return undefined;
        }
      }
    }

    return { Context };
  });
  modules.set('lib/env', function () {
    const { Context } = getModule('lib/context');
    const { createEntry } = getModule('lib/resolver');
    const PropertiesParser = getModule('lib/format/properties/parser');
    const L20nParser = getModule('lib/format/l20n/parser');
    const { walkContent, qps } = getModule('lib/pseudo');
    const { emit, addEventListener, removeEventListener } = getModule('lib/events');
    const parsers = {
      properties: PropertiesParser.parse.bind(PropertiesParser),
      l20n: L20nParser.parse.bind(L20nParser),
      json: null
    };

    class Env {
      constructor(defaultLang, fetch) {
        this.defaultLang = defaultLang;
        this.fetch = fetch;
        this._resCache = Object.create(null);
        let listeners = {};
        this.emit = emit.bind(this, listeners);
        this.addEventListener = addEventListener.bind(this, listeners);
        this.removeEventListener = removeEventListener.bind(this, listeners);
      }
      createContext(resIds) {
        return new Context(this, resIds);
      }
      _getResource(lang, res) {
        let cache = this._resCache;
        let id = res + lang.code + lang.src;

        if (cache[id]) {
          return cache[id];
        }

        let syntax = res.substr(res.lastIndexOf('.') + 1);
        let parser = parsers[syntax];

        let saveEntries = data => {
          let ast = parser ? parser(this, data) : data;
          cache[id] = createEntries(lang, ast);
        };

        let recover = err => {
          this.emit('fetcherror', err);
          cache[id] = err;
        };

        let langToFetch = lang.src === 'qps' ? {
          code: this.defaultLang,
          src: 'app'
        } : lang;
        return cache[id] = this.fetch(res, langToFetch).then(saveEntries, recover);
      }
    }

    function createEntries(lang, ast) {
      let entries = Object.create(null);
      let create = lang.src === 'qps' ? createPseudoEntry : createEntry;

      for (var i = 0, node; node = ast[i]; i++) {
        entries[node.$i] = create(node, lang);
      }

      return entries;
    }

    function createPseudoEntry(node, lang) {
      return createEntry(walkContent(node, qps[lang.code].translate), lang);
    }

    return { Env };
  });
  modules.set('bindings/html/service', function () {
    const { Env } = getModule('lib/env');
    const { View, translate } = getModule('bindings/html/view');
    const { getMeta } = getModule('bindings/html/head');
    const { negotiateLanguages } = getModule('bindings/html/langs');

    class Service {
      constructor(fetch) {
        let meta = getMeta(document.head);
        this.defaultLanguage = meta.defaultLang;
        this.availableLanguages = meta.availableLangs;
        this.appVersion = meta.appVersion;
        this.env = new Env(this.defaultLanguage, fetch.bind(null, this.appVersion));
        this.views = [document.l10n = new View(this, document)];
      }
      requestLanguages(requestedLangs = navigator.languages) {
        return changeLanguages.call(this, getAdditionalLanguages(), requestedLangs);
      }
      handleEvent(evt) {
        return changeLanguages.call(this, evt.detail || getAdditionalLanguages(), navigator.languages);
      }
    }

    function getAdditionalLanguages() {
      if (navigator.mozApps && navigator.mozApps.getAdditionalLanguages) {
        return navigator.mozApps.getAdditionalLanguages().catch(() => []);
      }

      return Promise.resolve([]);
    }

    function translateViews(langs) {
      return Promise.all(this.views.map(view => translate.call(view, langs)));
    }

    function changeLanguages(additionalLangs, requestedLangs) {
      let prevLangs = this.languages || [];
      return this.languages = Promise.all([additionalLangs, prevLangs]).then(([additionalLangs, prevLangs]) => negotiateLanguages(translateViews.bind(this), this.appVersion, this.defaultLanguage, this.availableLanguages, additionalLangs, prevLangs, requestedLangs));
    }

    return { Service, getAdditionalLanguages };
  });
  modules.set('lib/errors', function () {
    function L10nError(message, id, code) {
      this.name = 'L10nError';
      this.message = message;
      this.id = id;
      this.code = code;
    }

    L10nError.prototype = Object.create(Error.prototype);
    L10nError.prototype.constructor = L10nError;
    return { L10nError };
  });
  modules.set('runtime/web/io', function () {
    const { L10nError } = getModule('lib/errors');

    function load(type, url) {
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();

        if (xhr.overrideMimeType) {
          xhr.overrideMimeType(type);
        }

        xhr.open('GET', url, true);

        if (type === 'application/json') {
          xhr.responseType = 'json';
        }

        xhr.addEventListener('load', function io_onload(e) {
          if (e.target.status === 200 || e.target.status === 0) {
            resolve(e.target.response || e.target.responseText);
          } else {
            reject(new L10nError('Not found: ' + url));
          }
        });
        xhr.addEventListener('error', reject);
        xhr.addEventListener('timeout', reject);

        try {
          xhr.send(null);
        } catch (e) {
          if (e.name === 'NS_ERROR_FILE_NOT_FOUND') {
            reject(new L10nError('Not found: ' + url));
          } else {
            throw e;
          }
        }
      });
    }

    const io = {
      extra: function (code, ver, path, type) {
        return navigator.mozApps.getLocalizationResource(code, ver, path, type);
      },
      app: function (code, ver, path, type) {
        switch (type) {
          case 'text':
            return load('text/plain', path);

          case 'json':
            return load('application/json', path);

          default:
            throw new L10nError('Unknown file type: ' + type);
        }
      }
    };

    function fetch(ver, res, lang) {
      let url = res.replace('{locale}', lang.code);
      let type = res.endsWith('.json') ? 'json' : 'text';
      return io[lang.src](lang.code, ver, url, type);
    }

    return { fetch };
  });
  modules.set('runtime/web/index', function () {
    const { fetch } = getModule('runtime/web/io');
    const { Service } = getModule('bindings/html/service');
    const { setAttributes, getAttributes } = getModule('bindings/html/dom');

    const readyStates = {
      loading: 0,
      interactive: 1,
      complete: 2
    };

    function whenInteractive(callback) {
      if (readyStates[document.readyState] >= readyStates.interactive) {
        return callback();
      }

      document.addEventListener('readystatechange', function onrsc() {
        if (readyStates[document.readyState] >= readyStates.interactive) {
          document.removeEventListener('readystatechange', onrsc);
          callback();
        }
      });
    }

    function init() {
      window.L10n = new Service(fetch);
      window.L10n.requestLanguages(navigator.languages);
      window.addEventListener('languagechange', window.L10n);
      document.addEventListener('additionallanguageschange', window.L10n);
    }

    whenInteractive(init);

    // XXX for easier testing with existing Gaia apps; remove later on
    let once = callback => whenInteractive(() => document.l10n.ready.then(callback));

    navigator.mozL10n = {
      get: id => id,
      once: once,
      ready: once,
      setAttributes: setAttributes,
      getAttributes: getAttributes
    };
  });
  getModule('runtime/web/index');
})();
