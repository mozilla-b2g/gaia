(function (global) {
  'use strict';

  const modules = new Map();
  const moduleCache = new Map();

  function getModule(id) {
    if (!moduleCache.has(id)) {
      moduleCache.set(id, modules.get(id).call(global))
    }

    return moduleCache.get(id);
  }

  modules.set('bindings/html/overlay', function () {
    const reOverlay = /<|&#?\w+;/;
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

    function overlayElement(element, translation) {
      const value = translation.value;

      if (typeof value === 'string') {
        if (!reOverlay.test(value)) {
          element.textContent = value;
        } else {
          const tmpl = element.ownerDocument.createElement('template');
          tmpl.innerHTML = value;
          overlay(element, tmpl.content);
        }
      }

      for (let key in translation.attrs) {
        const attrName = camelCaseToDashed(key);

        if (isAttrAllowed({
          name: attrName
        }, element)) {
          element.setAttribute(attrName, translation.attrs[key]);
        }
      }
    }

    function overlay(sourceElement, translationElement) {
      const result = translationElement.ownerDocument.createDocumentFragment();
      let k, attr;
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
      const attrName = attr.name.toLowerCase();
      const tagName = element.tagName.toLowerCase();

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
        const type = element.type.toLowerCase();

        if (type === 'submit' || type === 'button' || type === 'reset') {
          return true;
        }
      }

      return false;
    }

    function getNthElementOfType(context, element, index) {
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
      if (string === 'ariaValueText') {
        return 'aria-valuetext';
      }

      return string.replace(/[A-Z]/g, function (match) {
        return '-' + match.toLowerCase();
      }).replace(/^-/, '');
    }

    return { overlayElement };
  });
  modules.set('bindings/html/dom', function () {
    const { overlayElement } = getModule('bindings/html/overlay');
    const reHtml = /[&<>]/g;
    const htmlEntities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;'
    };

    function getResourceLinks(head) {
      return Array.prototype.map.call(head.querySelectorAll('link[rel="localization"]'), el => decodeURI(el.getAttribute('href')));
    }

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
      const nodes = Array.from(element.querySelectorAll('[data-l10n-id]'));

      if (typeof element.hasAttribute === 'function' && element.hasAttribute('data-l10n-id')) {
        nodes.push(element);
      }

      return nodes;
    }

    function translateMutations(view, langs, mutations) {
      const targets = new Set();

      for (let mutation of mutations) {
        switch (mutation.type) {
          case 'attributes':
            targets.add(mutation.target);
            break;

          case 'childList':
            for (let addedNode of mutation.addedNodes) {
              if (addedNode.nodeType === addedNode.ELEMENT_NODE) {
                if (addedNode.childElementCount) {
                  getTranslatables(addedNode).forEach(targets.add.bind(targets));
                } else {
                  if (addedNode.hasAttribute('data-l10n-id')) {
                    targets.add(addedNode);
                  }
                }
              }
            }

            break;
        }
      }

      if (targets.size === 0) {
        return;
      }

      translateElements(view, langs, Array.from(targets));
    }

    function translateFragment(view, langs, frag) {
      return translateElements(view, langs, getTranslatables(frag));
    }

    function getElementsTranslation(view, langs, elems) {
      const keys = elems.map(elem => {
        const id = elem.getAttribute('data-l10n-id');
        const args = elem.getAttribute('data-l10n-args');
        return args ? [id, JSON.parse(args.replace(reHtml, match => htmlEntities[match]))] : id;
      });
      return view._resolveEntities(langs, keys);
    }

    function translateElements(view, langs, elements) {
      return getElementsTranslation(view, langs, elements).then(translations => applyTranslations(view, elements, translations));
    }

    function applyTranslations(view, elems, translations) {
      view._disconnect();

      for (let i = 0; i < elems.length; i++) {
        overlayElement(elems[i], translations[i]);
      }

      view._observe();
    }

    return { getResourceLinks, setAttributes, getAttributes, translateMutations, translateFragment };
  });
  modules.set('bindings/html/view', function () {
    const { documentReady } = getModule('bindings/html/shims');
    const { setAttributes, getAttributes, translateFragment, translateMutations, getResourceLinks } = getModule('bindings/html/dom');
    const observerConfig = {
      attributes: true,
      characterData: false,
      childList: true,
      subtree: true,
      attributeFilter: ['data-l10n-id', 'data-l10n-args']
    };
    const readiness = new WeakMap();

    class View {
      constructor(client, doc) {
        this._doc = doc;
        this.pseudo = {
          'qps-ploc': createPseudo(this, 'qps-ploc'),
          'qps-plocm': createPseudo(this, 'qps-plocm')
        };
        this._interactive = documentReady().then(() => init(this, client));
        const observer = new MutationObserver(onMutations.bind(this));

        this._observe = () => observer.observe(doc, observerConfig);

        this._disconnect = () => observer.disconnect();

        const translateView = langs => translateDocument(this, langs);

        client.on('translateDocument', translateView);
        this.ready = this.resolvedLanguages().then(translateView);
      }
      resolvedLanguages() {
        return this._interactive.then(client => client.method('resolvedLanguages'));
      }
      requestLanguages(langs) {
        return this._interactive.then(client => client.method('requestLanguages', langs));
      }
      _resolveEntities(langs, keys) {
        return this._interactive.then(client => client.method('resolveEntities', client.id, langs, keys));
      }
      formatValue(id, args) {
        return this._interactive.then(client => client.method('formatValues', client.id, [[id, args]])).then(values => values[0]);
      }
      formatValues(...keys) {
        return this._interactive.then(client => client.method('formatValues', client.id, keys));
      }
      translateFragment(frag) {
        return this.resolvedLanguages().then(langs => translateFragment(this, langs, frag));
      }
    }

    View.prototype.setAttributes = setAttributes;
    View.prototype.getAttributes = getAttributes;

    function createPseudo(view, code) {
      return {
        getName: () => view._interactive.then(client => client.method('getName', code)),
        processString: str => view._interactive.then(client => client.method('processString', code, str))
      };
    }

    function init(view, client) {
      view._observe();

      return client.method('registerView', client.id, getResourceLinks(view._doc.head)).then(() => client);
    }

    function onMutations(mutations) {
      return this.resolvedLanguages().then(langs => translateMutations(this, langs, mutations));
    }

    function translateDocument(view, langs) {
      const html = view._doc.documentElement;

      if (readiness.has(html)) {
        return translateFragment(view, langs, html).then(() => setDOMAttrsAndEmit(html, langs)).then(() => langs.map(takeCode));
      }

      const translated = langs[0].code === html.getAttribute('lang') ? Promise.resolve() : translateFragment(view, langs, html).then(() => setDOMAttrs(html, langs));
      return translated.then(() => readiness.set(html, true)).then(() => langs.map(takeCode));
    }

    function setDOMAttrsAndEmit(html, langs) {
      setDOMAttrs(html, langs);
      html.parentNode.dispatchEvent(new CustomEvent('DOMRetranslated', {
        bubbles: false,
        cancelable: false,
        detail: {
          languages: langs.map(takeCode)
        }
      }));
    }

    function setDOMAttrs(html, langs) {
      html.setAttribute('lang', langs[0].code);
      html.setAttribute('dir', langs[0].dir);
    }

    function takeCode(lang) {
      return lang.code;
    }

    return { View, translateDocument };
  });
  modules.set('lib/intl', function () {
    function prioritizeLocales(def, availableLangs, requested) {
      let supportedLocale;

      for (let i = 0; i < requested.length; i++) {
        const locale = requested[i];

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
    const { pseudo } = getModule('lib/pseudo');
    const rtlList = ['ar', 'he', 'fa', 'ps', 'qps-plocm', 'ur'];

    function getMeta(head) {
      let availableLangs = Object.create(null);
      let defaultLang = null;
      let appVersion = null;
      const metas = head.querySelectorAll('meta[name="availableLanguages"],' + 'meta[name="defaultLanguage"],' + 'meta[name="appVersion"]');

      for (let meta of metas) {
        const name = meta.getAttribute('name');
        const content = meta.getAttribute('content').trim();

        switch (name) {
          case 'availableLanguages':
            availableLangs = getLangRevisionMap(availableLangs, content);
            break;

          case 'defaultLanguage':
            const [lang, rev] = getLangRevisionTuple(content);
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
        const [lang, rev] = getLangRevisionTuple(cur);
        seq[lang] = rev;
        return seq;
      }, seq);
    }

    function getLangRevisionTuple(str) {
      const [lang, rev] = str.trim().split(':');
      return [lang, parseInt(rev)];
    }

    function negotiateLanguages(fn, appVersion, defaultLang, availableLangs, additionalLangs, prevLangs, requestedLangs) {
      const allAvailableLangs = Object.keys(availableLangs).concat(additionalLangs || []).concat(Object.keys(pseudo));
      const newLangs = prioritizeLocales(defaultLang, allAvailableLangs, requestedLangs);
      const langs = newLangs.map(code => ({
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
      for (let i = 0, langpack; langpack = langpacks[i]; i++) {
        if (langpack.target === appVersion) {
          return langpack;
        }
      }

      return null;
    }

    function getLangSource(appVersion, availableLangs, additionalLangs, code) {
      if (additionalLangs && additionalLangs[code]) {
        const lp = getMatchingLangpack(appVersion, additionalLangs[code]);

        if (lp && (!(code in availableLangs) || parseInt(lp.revision) > availableLangs[code])) {
          return 'extra';
        }
      }

      if (code in pseudo && !(code in availableLangs)) {
        return 'pseudo';
      }

      return 'app';
    }

    return { getMeta, negotiateLanguages, getDirection };
  });
  modules.set('bindings/html/shims', function () {
    if (typeof NodeList === 'function' && !NodeList.prototype[Symbol.iterator]) {
      NodeList.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
    }

    function documentReady() {
      if (document.readyState !== 'loading') {
        return Promise.resolve();
      }

      return new Promise(resolve => {
        document.addEventListener('readystatechange', function onrsc() {
          document.removeEventListener('readystatechange', onrsc);
          resolve();
        });
      });
    }

    return { documentReady };
  });
  modules.set('lib/pseudo', function () {
    function walkEntry(entry, fn) {
      if (typeof entry === 'string') {
        return fn(entry);
      }

      const newEntry = Object.create(null);

      if (entry.value) {
        newEntry.value = walkValue(entry.value, fn);
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

    function walkValue(value, fn) {
      if (typeof value === 'string') {
        return fn(value);
      }

      if (value.type) {
        return value;
      }

      const newValue = Array.isArray(value) ? [] : Object.create(null);
      const keys = Object.keys(value);

      for (let i = 0, key; key = keys[i]; i++) {
        newValue[key] = walkValue(value[key], fn);
      }

      return newValue;
    }

    function createGetter(id, name) {
      let _pseudo = null;
      return function getPseudo() {
        if (_pseudo) {
          return _pseudo;
        }

        const reAlphas = /[a-zA-Z]/g;
        const reVowels = /[aeiouAEIOU]/g;
        const reWords = /[^\W0-9_]+/g;
        const reExcluded = /(%[EO]?\w|\{\s*.+?\s*\}|&[#\w]+;|<\s*.+?\s*>)/;
        const charMaps = {
          'qps-ploc': 'ȦƁƇḒḖƑƓĦĪ' + 'ĴĶĿḾȠǾƤɊŘ' + 'ŞŦŬṼẆẊẎẐ' + '[\\]^_`' + 'ȧƀƈḓḗƒɠħī' + 'ĵķŀḿƞǿƥɋř' + 'şŧŭṽẇẋẏẑ',
          'qps-plocm': '∀ԐↃpƎɟפHIſ' + 'Ӽ˥WNOԀÒᴚS⊥∩Ʌ' + 'ＭXʎZ' + '[\\]ᵥ_,' + 'ɐqɔpǝɟƃɥıɾ' + 'ʞʅɯuodbɹsʇnʌʍxʎz'
        };
        const mods = {
          'qps-ploc': val => val.replace(reVowels, match => match + match.toLowerCase()),
          'qps-plocm': val => val.replace(reWords, match => '‮' + match + '‬')
        };

        const replaceChars = (map, val) => val.replace(reAlphas, match => map.charAt(match.charCodeAt(0) - 65));

        const transform = val => replaceChars(charMaps[id], mods[id](val));

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

    const pseudo = Object.defineProperties(Object.create(null), {
      'qps-ploc': {
        enumerable: true,
        get: createGetter('qps-ploc', 'Runtime Accented')
      },
      'qps-plocm': {
        enumerable: true,
        get: createGetter('qps-plocm', 'Runtime Mirrored')
      }
    });
    return { walkEntry, walkValue, pseudo };
  });
  modules.set('lib/format/l20n/entries/parser', function () {
    const { L10nError } = getModule('lib/errors');
    const MAX_PLACEABLES = 100;
    return {
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
        const value = this.getValue(ch, index === undefined);
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
      getValue: function (ch = this._source[this._index], optional = false) {
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
        let cc = this._source.charCodeAt(this._index);

        while (cc === 32 || cc === 10 || cc === 9 || cc === 13) {
          cc = this._source.charCodeAt(++this._index);
        }
      },
      getRequiredWS: function () {
        const pos = this._index;

        let cc = this._source.charCodeAt(pos);

        while (cc === 32 || cc === 10 || cc === 9 || cc === 13) {
          cc = this._source.charCodeAt(++this._index);
        }

        return this._index !== pos;
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
      getUnicodeChar: function () {
        for (let i = 0; i < 4; i++) {
          let cc = this._source.charCodeAt(++this._index);

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
            if (placeables > MAX_PLACEABLES - 1) {
              throw this.error('Too many placeables, maximum allowed is ' + MAX_PLACEABLES);
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
        const value = this.getValue();

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
      getHash: function () {
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
  });
  modules.set('lib/format/properties/parser', function () {
    const { L10nError } = getModule('lib/errors');
    var MAX_PLACEABLES = 100;
    return {
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
            complexStr.push({
              type: 'idOrVar',
              name: chunks[i]
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
            type: 'call',
            expr: {
              type: 'prop',
              expr: {
                type: 'glob',
                name: 'cldr'
              },
              prop: 'plural',
              cmpt: false
            },
            args: [{
              type: 'idOrVar',
              name: match[2]
            }]
          }];
        } else {
          return [{
            type: 'idOrVar',
            name: match[1]
          }];
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
  });
  modules.set('lib/plurals', function () {
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

    function isIn(n, list) {
      return list.indexOf(n) !== -1;
    }

    function isBetween(n, start, end) {
      return typeof n === typeof start && start <= n && n <= end;
    }

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
      const index = locales2rules[code.replace(/-.*$/, '')];

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
    const KNOWN_MACROS = ['plural'];
    const MAX_PLACEABLE_LENGTH = 2500;
    const FSI = '⁨';
    const PDI = '⁩';
    const resolutionChain = new WeakSet();

    function format(ctx, lang, args, entity) {
      if (typeof entity === 'string') {
        return [{}, entity];
      }

      if (resolutionChain.has(entity)) {
        throw new L10nError('Cyclic reference detected');
      }

      resolutionChain.add(entity);
      let rv;

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

      const entity = ctx._getEntity(lang, id);

      if (entity) {
        return format(ctx, lang, args, entity);
      }

      throw new L10nError('Unknown reference: ' + id);
    }

    function subPlaceable(locals, ctx, lang, args, id) {
      let newLocals, value;

      try {
        [newLocals, value] = resolveIdentifier(ctx, lang, args, id);
      } catch (err) {
        return [{
          error: err
        }, FSI + '{{ ' + id + ' }}' + PDI];
      }

      if (typeof value === 'number') {
        const formatter = ctx._getNumberFormatter(lang);

        return [newLocals, formatter.format(value)];
      }

      if (typeof value === 'string') {
        if (value.length >= MAX_PLACEABLE_LENGTH) {
          throw new L10nError('Too many characters in placeable (' + value.length + ', max allowed is ' + MAX_PLACEABLE_LENGTH + ')');
        }

        return [newLocals, FSI + value + PDI];
      }

      return [{}, FSI + '{{ ' + id + ' }}' + PDI];
    }

    function interpolate(locals, ctx, lang, args, arr) {
      return arr.reduce(function ([localsSeq, valueSeq], cur) {
        if (typeof cur === 'string') {
          return [localsSeq, valueSeq + cur];
        } else {
          const [, value] = subPlaceable(locals, ctx, lang, args, cur.name);
          return [localsSeq, valueSeq + value];
        }
      }, [locals, '']);
    }

    function resolveSelector(ctx, lang, args, expr, index) {
      let selectorName;

      if (index[0].type === 'call' && index[0].expr.type === 'prop' && index[0].expr.expr.name === 'cldr') {
        selectorName = 'plural';
      } else {
        selectorName = index[0].name;
      }

      const selector = resolveIdentifier(ctx, lang, args, selectorName)[1];

      if (typeof selector !== 'function') {
        return selector;
      }

      const argValue = index[0].args ? resolveIdentifier(ctx, lang, args, index[0].args[0].name)[1] : undefined;

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
        return interpolate(locals, ctx, lang, args, expr);
      }

      if (index) {
        const selector = resolveSelector(ctx, lang, args, expr, index);

        if (selector in expr) {
          return resolveValue(locals, ctx, lang, args, expr[selector]);
        }
      }

      const defaultKey = expr.__default || 'other';

      if (defaultKey in expr) {
        return resolveValue(locals, ctx, lang, args, expr[defaultKey]);
      }

      throw new L10nError('Unresolvable value');
    }

    return { format };
  });
  modules.set('lib/context', function () {
    const { L10nError } = getModule('lib/errors');
    const { format } = getModule('lib/resolver');
    const { getPluralRule } = getModule('lib/plurals');

    class Context {
      constructor(env) {
        this._env = env;
        this._numberFormatters = null;
      }
      _formatTuple(lang, args, entity, id, key) {
        try {
          return format(this, lang, args, entity);
        } catch (err) {
          err.id = key ? id + '::' + key : id;
          err.lang = lang;

          this._env.emit('resolveerror', err, this);

          return [{
            error: err
          }, err.id];
        }
      }
      _formatEntity(lang, args, entity, id) {
        const [, value] = this._formatTuple(lang, args, entity, id);

        const formatted = {
          value,
          attrs: null
        };

        if (entity.attrs) {
          formatted.attrs = Object.create(null);

          for (let key in entity.attrs) {
            const [, attrValue] = this._formatTuple(lang, args, entity.attrs[key], id, key);

            formatted.attrs[key] = attrValue;
          }
        }

        return formatted;
      }
      _formatValue(lang, args, entity, id) {
        return this._formatTuple(lang, args, entity, id)[1];
      }
      fetch(langs) {
        if (langs.length === 0) {
          return Promise.resolve(langs);
        }

        const resIds = Array.from(this._env._resLists.get(this));
        return Promise.all(resIds.map(this._env._getResource.bind(this._env, langs[0]))).then(() => langs);
      }
      _resolve(langs, keys, formatter, prevResolved) {
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

          this._env.emit('notfounderror', new L10nError('"' + id + '"' + ' not found in ' + lang.code, id, lang), this);

          hasUnresolved = true;
        });

        if (!hasUnresolved) {
          return resolved;
        }

        return this.fetch(langs.slice(1)).then(nextLangs => this._resolve(nextLangs, keys, formatter, resolved));
      }
      resolveEntities(langs, keys) {
        return this.fetch(langs).then(langs => this._resolve(langs, keys, this._formatEntity));
      }
      resolveValues(langs, keys) {
        return this.fetch(langs).then(langs => this._resolve(langs, keys, this._formatValue));
      }
      _getEntity(lang, id) {
        const cache = this._env._resCache;
        const resIds = Array.from(this._env._resLists.get(this));

        for (let i = 0, resId; resId = resIds[i]; i++) {
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
      _getNumberFormatter(lang) {
        if (!this._numberFormatters) {
          this._numberFormatters = new Map();
        }

        if (!this._numberFormatters.has(lang)) {
          const formatter = Intl.NumberFormat(lang, {
            useGrouping: false
          });

          this._numberFormatters.set(lang, formatter);

          return formatter;
        }

        return this._numberFormatters.get(lang);
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

    function reportMissing(keys, formatter, resolved) {
      const missingIds = new Set();
      keys.forEach((key, i) => {
        if (resolved && resolved[i] !== undefined) {
          return;
        }

        const id = Array.isArray(key) ? key[0] : key;
        missingIds.add(id);
        resolved[i] = formatter === this._formatValue ? id : {
          value: id,
          attrs: null
        };
      });

      this._env.emit('notfounderror', new L10nError('"' + Array.from(missingIds).join(', ') + '"' + ' not found in any language', missingIds), this);

      return resolved;
    }

    return { Context };
  });
  modules.set('lib/env', function () {
    const { Context } = getModule('lib/context');
    const PropertiesParser = getModule('lib/format/properties/parser');
    const L20nParser = getModule('lib/format/l20n/entries/parser');
    const { walkEntry, pseudo } = getModule('lib/pseudo');
    const { emit, addEventListener, removeEventListener } = getModule('lib/events');
    const parsers = {
      properties: PropertiesParser,
      l20n: L20nParser
    };

    class Env {
      constructor(defaultLang, fetch) {
        this.defaultLang = defaultLang;
        this.fetch = fetch;
        this._resLists = new Map();
        this._resCache = new Map();
        const listeners = {};
        this.emit = emit.bind(this, listeners);
        this.addEventListener = addEventListener.bind(this, listeners);
        this.removeEventListener = removeEventListener.bind(this, listeners);
      }
      createContext(resIds) {
        const ctx = new Context(this);

        this._resLists.set(ctx, new Set(resIds));

        return ctx;
      }
      destroyContext(ctx) {
        const lists = this._resLists;
        const resList = lists.get(ctx);
        lists.delete(ctx);
        resList.forEach(resId => deleteIfOrphan(this._resCache, lists, resId));
      }
      _parse(syntax, lang, data) {
        const parser = parsers[syntax];

        if (!parser) {
          return data;
        }

        const emit = (type, err) => this.emit(type, amendError(lang, err));

        return parser.parse.call(parser, emit, data);
      }
      _create(lang, entries) {
        if (lang.src !== 'pseudo') {
          return entries;
        }

        const pseudoentries = Object.create(null);

        for (let key in entries) {
          pseudoentries[key] = walkEntry(entries[key], pseudo[lang.code].process);
        }

        return pseudoentries;
      }
      _getResource(lang, res) {
        const cache = this._resCache;
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

        const langToFetch = lang.src === 'pseudo' ? {
          code: this.defaultLang,
          src: 'app'
        } : lang;
        const resource = this.fetch(res, langToFetch).then(saveEntries, recover);
        cache.set(id, resource);
        return resource;
      }
    }

    function deleteIfOrphan(cache, lists, resId) {
      const isNeeded = Array.from(lists).some(([ctx, resIds]) => resIds.has(resId));

      if (!isNeeded) {
        cache.forEach((val, key) => key.startsWith(resId) ? cache.delete(key) : null);
      }
    }

    function amendError(lang, err) {
      err.lang = lang;
      return err;
    }

    return { Env, amendError };
  });
  modules.set('bindings/html/remote', function () {
    const { Env } = getModule('lib/env');
    const { pseudo } = getModule('lib/pseudo');
    const { documentReady } = getModule('bindings/html/shims');
    const { getMeta, negotiateLanguages } = getModule('bindings/html/langs');

    class Remote {
      constructor(fetch, broadcast, requestedLangs) {
        this.fetch = fetch;
        this.broadcast = broadcast;
        this.ctxs = new Map();
        this.interactive = documentReady().then(() => this.init(requestedLangs));
      }
      init(requestedLangs) {
        const meta = getMeta(document.head);
        this.defaultLanguage = meta.defaultLang;
        this.availableLanguages = meta.availableLangs;
        this.appVersion = meta.appVersion;
        this.env = new Env(this.defaultLanguage, (...args) => this.fetch(this.appVersion, ...args));
        return this.requestLanguages(requestedLangs);
      }
      registerView(view, resources) {
        return this.interactive.then(() => {
          this.ctxs.set(view, this.env.createContext(resources));
          return true;
        });
      }
      unregisterView(view) {
        return this.ctxs.delete(view);
      }
      resolveEntities(view, langs, keys) {
        return this.ctxs.get(view).resolveEntities(langs, keys);
      }
      formatValues(view, keys) {
        return this.languages.then(langs => this.ctxs.get(view).resolveValues(langs, keys));
      }
      resolvedLanguages() {
        return this.languages;
      }
      requestLanguages(requestedLangs) {
        return changeLanguages.call(this, getAdditionalLanguages(), requestedLangs);
      }
      getName(code) {
        return pseudo[code].name;
      }
      processString(code, str) {
        return pseudo[code].process(str);
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

    function changeLanguages(additionalLangs, requestedLangs) {
      const prevLangs = this.languages || [];
      return this.languages = Promise.all([additionalLangs, prevLangs]).then(([additionalLangs, prevLangs]) => negotiateLanguages(this.broadcast.bind(this, 'translateDocument'), this.appVersion, this.defaultLanguage, this.availableLanguages, additionalLangs, prevLangs, requestedLangs));
    }

    return { Remote, getAdditionalLanguages };
  });
  modules.set('lib/events', function () {
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

    return { emit, addEventListener, removeEventListener };
  });
  modules.set('runtime/web/bridge', function () {
    const { emit, addEventListener } = getModule('lib/events');

    class Client {
      constructor(remote) {
        this.id = this;
        this.remote = remote;
        const listeners = {};

        this.on = (...args) => addEventListener(listeners, ...args);

        this.emit = (...args) => emit(listeners, ...args);
      }
      method(name, ...args) {
        return this.remote[name](...args);
      }
    }

    function broadcast(type, data) {
      Array.from(this.ctxs.keys()).forEach(client => client.emit(type, data));
    }

    return { Client, broadcast };
  });
  modules.set('lib/errors', function () {
    function L10nError(message, id, lang) {
      this.name = 'L10nError';
      this.message = message;
      this.id = id;
      this.lang = lang;
    }

    L10nError.prototype = Object.create(Error.prototype);
    L10nError.prototype.constructor = L10nError;
    return { L10nError };
  });
  modules.set('runtime/web/io', function () {
    const { L10nError } = getModule('lib/errors');

    function load(type, url) {
      return new Promise(function (resolve, reject) {
        const xhr = new XMLHttpRequest();

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
      const url = res.replace('{locale}', lang.code);
      const type = res.endsWith('.json') ? 'json' : 'text';
      return io[lang.src](lang.code, ver, url, type);
    }

    return { fetch };
  });
  modules.set('runtime/web/index', function () {
    const { fetch } = getModule('runtime/web/io');
    const { Client, broadcast } = getModule('runtime/web/bridge');
    const { Remote } = getModule('bindings/html/remote');
    const { View } = getModule('bindings/html/view');
    const remote = new Remote(fetch, broadcast, navigator.languages);
    window.addEventListener('languagechange', remote);
    document.addEventListener('additionallanguageschange', remote);
    document.l10n = new View(new Client(remote), document);
  });
  modules.set('runtime/gaia/index', function () {
    getModule('runtime/web/index');

    //Bug 1204660 - Temporary proxy for shared code. Will be removed once
    //              l10n.js migration is completed.
    navigator.mozL10n = {
      setAttributes: document.l10n.setAttributes,
      getAttributes: document.l10n.getAttributes,
      formatValue: (...args) => document.l10n.formatValue(...args),
      translateFragment: (...args) => document.l10n.translateFragment(...args),
      once: cb => document.l10n.ready.then(cb),
      ready: cb => document.l10n.ready.then(() => {
        document.addEventListener('DOMRetranslated', cb);
        cb();
      })
    };
  });
  getModule('runtime/gaia/index');
})(this);
