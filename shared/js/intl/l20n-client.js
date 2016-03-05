(function () {
  'use strict';

  /* global bridge, BroadcastChannel */

  const Client = bridge.client;
  const channel = new BroadcastChannel('l20n-channel');

  // Polyfill NodeList.prototype[Symbol.iterator] for Chrome.
  // See https://code.google.com/p/chromium/issues/detail?id=401699
  if (typeof NodeList === 'function' && !NodeList.prototype[Symbol.iterator]) {
    NodeList.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
  }

  // A document.ready shim
  // https://github.com/whatwg/html/issues/127
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

  // Intl.Locale
  function getDirection(code) {
    const tag = code.split('-')[0];
    return ['ar', 'he', 'fa', 'ps', 'ur'].indexOf(tag) >= 0 ?
      'rtl' : 'ltr';
  }

  // Opera and Safari don't support it yet
  if (navigator.languages === undefined) {
    navigator.languages = [navigator.language];
  }

  function getResourceLinks(head) {
    return Array.prototype.map.call(
      head.querySelectorAll('link[rel="localization"]'),
      el => el.getAttribute('href'));
  }

  function getMeta(head) {
    let availableLangs = Object.create(null);
    let defaultLang = null;
    let appVersion = null;

    // XXX take last found instead of first?
    const metas = Array.from(head.querySelectorAll(
      'meta[name="availableLanguages"],' +
      'meta[name="defaultLanguage"],' +
      'meta[name="appVersion"]'));
    for (let meta of metas) {
      const name = meta.getAttribute('name');
      const content = meta.getAttribute('content').trim();
      switch (name) {
        case 'availableLanguages':
          availableLangs = getLangRevisionMap(
            availableLangs, content);
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
    return str.split(',').reduce((prevSeq, cur) => {
      const [lang, rev] = getLangRevisionTuple(cur);
      prevSeq[lang] = rev;
      return prevSeq;
    }, seq);
  }

  function getLangRevisionTuple(str) {
    const [lang, rev]  = str.trim().split(':');
    // if revision is missing, use NaN
    return [lang, parseInt(rev)];
  }

  // match the opening angle bracket (<) in HTML tags, and HTML entities like
  // &amp;, &#0038;, &#x0026;.
  const reOverlay = /<|&#?\w+;/;

  const allowed = {
    elements: [
      'a', 'em', 'strong', 'small', 's', 'cite', 'q', 'dfn', 'abbr', 'data',
      'time', 'code', 'var', 'samp', 'kbd', 'sub', 'sup', 'i', 'b', 'u',
      'mark', 'ruby', 'rt', 'rp', 'bdi', 'bdo', 'span', 'br', 'wbr'
    ],
    attributes: {
      global: ['title', 'aria-label', 'aria-valuetext', 'aria-moz-hint'],
      a: ['download'],
      area: ['download', 'alt'],
      // value is special-cased in isAttrAllowed
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
        // start with an inert template element and move its children into
        // `element` but such that `element`'s own children are not replaced
        const tmpl = element.ownerDocument.createElement('template');
        tmpl.innerHTML = value;
        // overlay the node with the DocumentFragment
        overlay(element, tmpl.content);
      }
    }

    for (let key in translation.attrs) {
      const attrName = camelCaseToDashed(key);
      if (isAttrAllowed({ name: attrName }, element)) {
        element.setAttribute(attrName, translation.attrs[key]);
      }
    }
  }

  // The goal of overlay is to move the children of `translationElement`
  // into `sourceElement` such that `sourceElement`'s own children are not
  // replaced, but onle have their text nodes and their attributes modified.
  //
  // We want to make it possible for localizers to apply text-level semantics to
  // the translations and make use of HTML entities. At the same time, we
  // don't trust translations so we need to filter unsafe elements and
  // attribtues out and we don't want to break the Web by replacing elements to
  // which third-party code might have created references (e.g. two-way
  // bindings in MVC frameworks).
  function overlay(sourceElement, translationElement) {
    const result = translationElement.ownerDocument.createDocumentFragment();
    let k, attr;

    // take one node from translationElement at a time and check it against
    // the allowed list or try to match it with a corresponding element
    // in the source
    let childElement;
    while ((childElement = translationElement.childNodes[0])) {
      translationElement.removeChild(childElement);

      if (childElement.nodeType === childElement.TEXT_NODE) {
        result.appendChild(childElement);
        continue;
      }

      const index = getIndexOfType(childElement);
      const sourceChild = getNthElementOfType(sourceElement, childElement, index);
      if (sourceChild) {
        // there is a corresponding element in the source, let's use it
        overlay(sourceChild, childElement);
        result.appendChild(sourceChild);
        continue;
      }

      if (isElementAllowed(childElement)) {
        const sanitizedChild = childElement.ownerDocument.createElement(
          childElement.nodeName);
        overlay(sanitizedChild, childElement);
        result.appendChild(sanitizedChild);
        continue;
      }

      // otherwise just take this child's textContent
      result.appendChild(
        translationElement.ownerDocument.createTextNode(
          childElement.textContent));
    }

    // clear `sourceElement` and append `result` which by this time contains
    // `sourceElement`'s original children, overlayed with translation
    sourceElement.textContent = '';
    sourceElement.appendChild(result);

    // if we're overlaying a nested element, translate the allowed
    // attributes; top-level attributes are handled in `translateElement`
    // XXX attributes previously set here for another language should be
    // cleared if a new language doesn't use them; https://bugzil.la/922577
    if (translationElement.attributes) {
      for (k = 0, attr; (attr = translationElement.attributes[k]); k++) {
        if (isAttrAllowed(attr, sourceElement)) {
          sourceElement.setAttribute(attr.name, attr.value);
        }
      }
    }
  }

  // XXX the allowed list should be amendable; https://bugzil.la/922573
  function isElementAllowed(element) {
    return allowed.elements.indexOf(element.tagName.toLowerCase()) !== -1;
  }

  function isAttrAllowed(attr, element) {
    const attrName = attr.name.toLowerCase();
    const tagName = element.tagName.toLowerCase();
    // is it a globally safe attribute?
    if (allowed.attributes.global.indexOf(attrName) !== -1) {
      return true;
    }
    // are there no allowed attributes for this element?
    if (!allowed.attributes[tagName]) {
      return false;
    }
    // is it allowed on this element?
    // XXX the allowed list should be amendable; https://bugzil.la/922573
    if (allowed.attributes[tagName].indexOf(attrName) !== -1) {
      return true;
    }
    // special case for value on inputs with type button, reset, submit
    if (tagName === 'input' && attrName === 'value') {
      const type = element.type.toLowerCase();
      if (type === 'submit' || type === 'button' || type === 'reset') {
        return true;
      }
    }
    return false;
  }

  // Get n-th immediate child of context that is of the same type as element.
  // XXX Use querySelector(':scope > ELEMENT:nth-of-type(index)'), when:
  // 1) :scope is widely supported in more browsers and 2) it works with
  // DocumentFragments.
  function getNthElementOfType(context, element, index) {
    /* jshint boss:true */
    let nthOfType = 0;
    for (let i = 0, child; child = context.children[i]; i++) {
      if (child.nodeType === child.ELEMENT_NODE &&
          child.tagName === element.tagName) {
        if (nthOfType === index) {
          return child;
        }
        nthOfType++;
      }
    }
    return null;
  }

  // Get the index of the element among siblings of the same type.
  function getIndexOfType(element) {
    let index = 0;
    let child;
    while ((child = element.previousElementSibling)) {
      if (child.tagName === element.tagName) {
        index++;
      }
    }
    return index;
  }

  function camelCaseToDashed(string) {
    // XXX workaround for https://bugzil.la/1141934
    if (string === 'ariaValueText') {
      return 'aria-valuetext';
    }

    return string
      .replace(/[A-Z]/g, match => '-' + match.toLowerCase())
      .replace(/^-/, '');
  }

  const reHtml = /[&<>]/g;
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
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
    const nodes = Array.from(element.querySelectorAll('[data-l10n-id]'));

    if (typeof element.hasAttribute === 'function' &&
        element.hasAttribute('data-l10n-id')) {
      nodes.push(element);
    }

    return nodes;
  }

  function translateMutations(view, mutations) {
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

    translateElements(view, Array.from(targets));
  }

  function translateFragment(view, frag) {
    return translateElements(view, getTranslatables(frag));
  }

  function getElementsTranslation(view, elems) {
    const keys = elems.map(elem => {
      const id = elem.getAttribute('data-l10n-id');
      const args = elem.getAttribute('data-l10n-args');
      return args ? [
        id,
        JSON.parse(args.replace(reHtml, match => htmlEntities[match]))
      ] : id;
    });

    return view.formatEntities(...keys);
  }

  function translateElements(view, elements) {
    return getElementsTranslation(view, elements).then(
      translations => applyTranslations(view, elements, translations));
  }

  function applyTranslations(view, elems, translations) {
    disconnect(view, null, true);
    for (let i = 0; i < elems.length; i++) {
      overlayElement(elems[i], translations[i]);
    }
    reconnect(view);
  }

  const observerConfig = {
    attributes: true,
    characterData: false,
    childList: true,
    subtree: true,
    attributeFilter: ['data-l10n-id', 'data-l10n-args']
  };

  const observers = new WeakMap();

  function initMutationObserver(view) {
    observers.set(view, {
      roots: new Set(),
      observer: new MutationObserver(
        mutations => translateMutations(view, mutations)),
    });
  }

  function translateRoots(view) {
    const roots = Array.from(observers.get(view).roots);
    return Promise.all(roots.map(
        root => translateFragment(view, root)));
  }

  function observe(view, root) {
    const obs = observers.get(view);
    if (obs) {
      obs.roots.add(root);
      obs.observer.observe(root, observerConfig);
    }
  }

  function disconnect(view, root, allRoots) {
    const obs = observers.get(view);
    if (obs) {
      obs.observer.disconnect();
      if (allRoots) {
        return;
      }
      obs.roots.delete(root);
      obs.roots.forEach(
        other => obs.observer.observe(other, observerConfig));
    }
  }

  function reconnect(view) {
    const obs = observers.get(view);
    if (obs) {
      obs.roots.forEach(
        root => obs.observer.observe(root, observerConfig));
    }
  }

  const viewProps = new WeakMap();

  class View {
    constructor(client, doc) {
      this.pseudo = {
        'fr-x-psaccent': createPseudo(this, 'fr-x-psaccent'),
        'ar-x-psbidi': createPseudo(this, 'ar-x-psbidi')
      };

      const initialized = documentReady().then(() => init(this, client));
      this._interactive = initialized.then(() => client);
      this.ready = initialized.then(langs => translateView(this, langs));
      initMutationObserver(this);

      viewProps.set(this, {
        doc: doc,
        ready: false
      });

      client.on('languageschangerequest',
        requestedLangs => this.requestLanguages(requestedLangs));
    }

    requestLanguages(requestedLangs, isGlobal) {
      const method = isGlobal ?
        client => client.method('requestLanguages', requestedLangs) :
        client => changeLanguages(this, client, requestedLangs);
      return this._interactive.then(method);
    }

    handleEvent() {
      return this.requestLanguages(navigator.languages);
    }

    formatEntities(...keys) {
      return this._interactive.then(
        client => client.method('formatEntities', client.id, keys));
    }

    formatValue(id, args) {
      return this._interactive.then(
        client => client.method('formatValues', client.id, [[id, args]])).then(
        values => values[0]);
    }

    formatValues(...keys) {
      return this._interactive.then(
        client => client.method('formatValues', client.id, keys));
    }

    translateFragment(frag) {
      return translateFragment(this, frag);
    }

    observeRoot(root) {
      observe(this, root);
    }

    disconnectRoot(root) {
      disconnect(this, root);
    }
  }

  View.prototype.setAttributes = setAttributes;
  View.prototype.getAttributes = getAttributes;

  function createPseudo(view, code) {
    return {
      getName: () => view._interactive.then(
        client => client.method('getName', code)),
      processString: str => view._interactive.then(
        client => client.method('processString', code, str)),
    };
  }

  function init(view, client) {
    const doc = viewProps.get(view).doc;
    const resources = getResourceLinks(doc.head);
    const meta = getMeta(doc.head);
    view.observeRoot(doc.documentElement);
    return getAdditionalLanguages().then(
      additionalLangs => client.method(
        'registerView', client.id, resources, meta, additionalLangs,
        navigator.languages));
  }

  function changeLanguages(view, client, requestedLangs) {
    const doc = viewProps.get(view).doc;
    const meta = getMeta(doc.head);
    return getAdditionalLanguages()
      .then(additionalLangs => client.method(
        'changeLanguages', client.id, meta, additionalLangs, requestedLangs
      ))
      .then(({langs, haveChanged}) => haveChanged ?
        translateView(view, langs) : undefined
      );
  }

  function getAdditionalLanguages() {
    return Promise.resolve(Object.create(null));
  }

  function translateView(view, langs) {
    const props = viewProps.get(view);
    const html = props.doc.documentElement;

    if (props.ready) {
      return translateRoots(view).then(
        () => setAllAndEmit(html, langs));
    }

    const translated =
      // has the document been already pre-translated?
      langs[0].code === html.getAttribute('lang') ?
        Promise.resolve() :
        translateRoots(view).then(
          () => setLangDir(html, langs));

    return translated.then(() => {
      setLangs(html, langs);
      props.ready = true;
    });
  }

  function setLangs(html, langs) {
    const codes = langs.map(lang => lang.code);
    html.setAttribute('langs', codes.join(' '));
  }

  function setLangDir(html, langs) {
    const code = langs[0].code;
    html.setAttribute('lang', code);
    html.setAttribute('dir', getDirection(code));
  }

  function setAllAndEmit(html, langs) {
    setLangDir(html, langs);
    setLangs(html, langs);
    html.parentNode.dispatchEvent(new CustomEvent('DOMRetranslated', {
      bubbles: false,
      cancelable: false,
    }));
  }

  const client = new Client({
    service: 'l20n',
    endpoint: channel,
    timeout: false
  });

  document.l10n = new View(client, document);

  window.addEventListener('pageshow', () => client.connect());
  window.addEventListener('pagehide', () => client.disconnect());
  window.addEventListener('languagechange', document.l10n);
  document.addEventListener('additionallanguageschange', document.l10n);

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
    }),
  };

}());
