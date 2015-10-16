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

    function getDirection(code) {
      return ['ar', 'he', 'fa', 'ps', 'qps-plocm', 'ur'].indexOf(code) >= 0 ? 'rtl' : 'ltr';
    }

    return { documentReady, getDirection };
  });
  modules.set('bindings/html/view', function () {
    const { documentReady, getDirection } = getModule('bindings/html/shims');
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
        this.ready = this._interactive.then(client => client.method('resolvedLanguages')).then(translateView);
      }
      requestLanguages(langs, global) {
        return this._interactive.then(client => client.method('requestLanguages', langs, global));
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
        return this._interactive.then(client => client.method('resolvedLanguages')).then(langs => translateFragment(this, langs, frag));
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
        return translateFragment(view, langs, html).then(() => setDOMAttrsAndEmit(html, langs));
      }

      const translated = langs[0].code === html.getAttribute('lang') ? Promise.resolve() : translateFragment(view, langs, html).then(() => setDOMAttrs(html, langs));
      return translated.then(() => readiness.set(html, true));
    }

    function setDOMAttrsAndEmit(html, langs) {
      setDOMAttrs(html, langs);
      html.parentNode.dispatchEvent(new CustomEvent('DOMRetranslated', {
        bubbles: false,
        cancelable: false
      }));
    }

    function setDOMAttrs(html, langs) {
      const codes = langs.map(lang => lang.code);
      html.setAttribute('langs', codes.join(' '));
      html.setAttribute('lang', codes[0]);
      html.setAttribute('dir', getDirection(codes[0]));
    }

    return { View, translateDocument };
  });
  modules.set('runtime/bridge/bridge', function () {
    const Client = bridge.client;
    const Service = bridge.service;
    const channel = new BroadcastChannel('l20n-channel');

    function broadcast(type, data) {
      return this.service.broadcast(type, data);
    }

    return { Client, Service, channel, broadcast };
  });
  modules.set('runtime/bridge/client', function () {
    const { Client, channel } = getModule('runtime/bridge/bridge');
    const { View } = getModule('bindings/html/view');

    const client = new Client({
      service: 'l20n',
      endpoint: channel,
      timeout: false
    });

    window.addEventListener('pageshow', () => client.connect());
    window.addEventListener('pagehide', () => client.disconnect());

    document.l10n = new View(client, document);

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
  getModule('runtime/bridge/client');
})(this);
