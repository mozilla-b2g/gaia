(function(window) {
/*jshint maxlen:false*/
'use strict';

var proto = Object.create(HTMLElement.prototype);

proto.HEIGHT = 37;

// #form height attribute is the value of proto.HEIGHT
proto.createdCallback = function() {
  var shadowRoot = this.createShadowRoot();
  shadowRoot.innerHTML =
`<style>
  [data-icon]:before { /* Copied from /components/gaia-icons/gaia-icons.css */
    font-family: "gaia-icons";
    content: attr(data-icon);
    display: inline-block;
    font-weight: 500;
    font-style: normal;
    text-decoration: inherit;
    text-transform: none;
    text-rendering: optimizeLegibility;
    font-size: 30px;
    -webkit-font-smoothing: antialiased;
  }
  #form {
    background-color: #202020;
    position: relative;
    width: 100%;
    height: 37px;
    overflow: hidden;
  }
  #form > input,
  #form > button {
    background: none;
    border: none;
    font-size: 1.6rem;
    position: relative;
    height: 100%;
    vertical-align: top;
  }
  #input {
    color: #fff;
    line-height: 4rem;
    margin: 0;
    padding: 0;
    padding-inline-start: 3rem; /* padding-left */
    width: calc(100% - 11.6rem);
  }
  #clear {
    color: #8f9091;
    padding: 0 0.6rem;
    width: 4rem;
    pointer-events: none;
  }
  #input:focus + #clear,
  #clear:active {
    pointer-events: auto;
  }
  #clear:active:before,
  #input:focus + #clear:before {
    content: 'close';
  }
  #close {
    color: #00aac5;
    font-style: italic;
    line-height: 100%;
    padding: 0 1.5rem;
    width: 7rem;
  }
  #close:before {
    content: '';
    background-color: #c7c7c7;
    position: absolute;
    top: 0.7rem;
    bottom: 0.7rem;
    offset-inline-start: -0.1rem; /* left */
    width: 0.1rem;
  }
</style>
<form id="form" role="search">
  <input type="search" id="input" x-inputmode="verbatim" data-l10n-id="search-music">
  <button type="reset" id="clear" data-icon="search"></button>
  <button type="button" id="close" data-l10n-id="search-close"></button>
</form>`;

  var $id = shadowRoot.getElementById.bind(shadowRoot);

  this.els = {
    form:  $id('form'),
    input: $id('input'),
    clear: $id('clear'),
    close: $id('close')
  };

  this.els.results = document.querySelector(this.getAttribute('results'));

  var onSearch = debounce(() => {
    this.dispatchEvent(new CustomEvent('search', {
      detail: this.els.input.value
    }));
  }, 500);

  this.els.form.addEventListener('click', (evt) => {
    var button = evt.target.closest('button');
    switch (button && button.id) {
      case 'clear':
        this.clear();
        onSearch();
        break;
      case 'close':
        this.close();
        break;
    }
  });

  this.els.input.addEventListener('focus', () => this.open());

  this.els.input.addEventListener('input', onSearch);
  this.els.input.addEventListener('keypress', onSearch);

  this.onDOMRetranslated = () => {
    document.l10n.translateFragment(shadowRoot);
  };
};

proto.attachedCallback = function() {
  document.addEventListener('DOMRetranslated', this.onDOMRetranslated);
  this.onDOMRetranslated();
};

proto.detachedCallback = function() {
  document.removeEventListener('DOMRetranslated', this.onDOMRetranslated);
};

proto.attributeChangedCallback = function(attr, oldVal, newVal) {
  switch (attr) {
    case 'results':
      this.els.results = document.querySelector(newVal);
      break;
  }
};

proto.clear = function() {
  window.requestAnimationFrame(() => {
    this.els.form.reset();
    this.els.input.focus();
  });
};

proto.open = function() {
  window.requestAnimationFrame(() => {
    this.els.input.focus();
  });

  this.dispatchEvent(new CustomEvent('open'));

  if (this.els.results) {
    this.els.results.open();
  }
};

proto.close = function() {
  this.els.form.reset();

  this.dispatchEvent(new CustomEvent('close'));

  if (this.els.results) {
    this.els.results.close();
  }
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

function debounce(fn, ms) {
  var timeout;
  return () => {
    var args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  };
}

try {
  window.MusicSearchBox = document.registerElement('music-search-box', {
    prototype: proto
  });
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

})(window);
