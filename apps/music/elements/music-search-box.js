(function(window) {
/*jshint maxlen:false*/
'use strict';

var proto = Object.create(HTMLElement.prototype);

proto.HEIGHT = 52; // 12px margin + 40px height

// #form height attribute is the value of proto.HEIGHT
proto.createdCallback = function() {
  var shadowRoot = this.createShadowRoot();
  shadowRoot.innerHTML = `
  <style>
    #inner {
      display: flex;
    }

    gaia-text-input {
      margin: 6px 0 !important;
      flex: 1;
    }

    #close {
      display: none;
      padding: 0 14px;
      -moz-margin-end: -14px;
      border: 0;

      background: none;
      color: var(--highlight-color);
      font-style: italic;
      font-size: 17px;
    }

    .open #close {
      display: block;
    }
  </style>
  <div id="inner">
    <gaia-text-input type="search" clearable id="input"></gaia-text-input>
    <button id="close" data-l10n-id="search-close">Close</button>
  </div>`;

  var $id = shadowRoot.getElementById.bind(shadowRoot);

  this.els = {
    inner: $id('inner'),
    input: $id('input'),
    close: $id('close')
  };

  this.isOpen = false;

  this.els.results = document.querySelector(this.getAttribute('results'));

  var onSearch = debounce(() => {
    this.emit('search', this.els.input.value);
  }, 500);

  this.els.input.addEventListener('focus', () => this.open());
  this.els.close.addEventListener('click', () => this.close());
  this.els.input.addEventListener('input', onSearch);
  this.addEventListener('touchmove', e => e.preventDefault());

  /**
   * Localizes the component's DOM.
   *
   * We can't use data-l10n-id attributes
   * here as l10n.js doesn't support putting
   * `placeholder` attribute on any element
   * other than `<input>`.
   *
   * Because we have to use `.formatValues()` it
   * makes sense to localize `search-close` in
   * the same way.
   *
   * @private
   */
  this.localize = () => {
    document.l10n.formatValues('search', 'search-close')
      .then(([search, close]) => {
        this.els.input.placeholder = search;
        this.els.close.textContent = close;
      });
  };
};

proto.attachedCallback = function() {
  document.addEventListener('DOMRetranslated', this.localize);
  this.localize();
};

proto.detachedCallback = function() {
  document.removeEventListener('DOMRetranslated', this.localize);
};

proto.attributeChangedCallback = function(attr, oldVal, newVal) {
  switch (attr) {
    case 'results':
      this.els.results = document.querySelector(newVal);
      break;
  }
};

proto.clear = function() {
  requestAnimationFrame(() => {
    this.els.input.clear();
  });
};

proto.focus = function() {
  requestAnimationFrame(() => {
    this.els.input.focus();
  });
};

proto.open = function() {
  if (this.isOpen) {
    return;
  }

  this.isOpen = true;
  this.els.inner.classList.add('open');
  this.focus();
  this.emit('open');

  if (this.els.results) {
    this.els.results.open();
  }

};

proto.close = function() {
  if (!this.isOpen) {
    return;
  }

  this.isOpen = false;
  this.els.inner.classList.remove('open');
  this.clear();
  this.emit('close');

  if (this.els.results) {
    this.els.results.close();
  }
};

proto.emit = function(name, detail) {
  var evt = new CustomEvent(name, { detail: detail });
  this.dispatchEvent(evt);
};

Object.defineProperty(proto, 'value', {
  get: function() {
    return this.els.input.value;
  },

  set: function(value) {
    this.els.input.value = value;
  }
});

Object.defineProperty(proto, 'results', {
  get: function() {
    return this.els.results;
  },

  set: function(value) {
    this.els.results = value;
  }
});

window.MusicSearchBox = document.registerElement('music-search-box', {
  prototype: proto
});

/**
 * Utils
 */

function debounce(fn, ms) {
  var timeout;
  return () => {
    var args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  };
}

})(window);
