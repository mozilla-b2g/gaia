(function(window) {
/*jshint maxlen:false*/
'use strict';

var proto = Object.create(HTMLElement.prototype);

var template =
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
  #container {
    position: relative;
  }
  #form {
    background-color: #202020;
    position: relative;
    width: 100%;
    height: 3.7rem;
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
  #results {
    background: var(--background);
    position: absolute;
    top: 3.7rem;
    left: 0;
    width: 100%;
    height: calc(100vh - 3.7rem);
    z-index: 99999;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s linear, visibility 0s linear 0.2s;
  }
  #results.active {
    opacity: 1;
    visibility: visible;
    transition-delay: 0s, 0s;
  }
  #list a {
    color: var(--text-color);
    text-decoration: none;
    padding: 9px 0;
    width: 100%;
  }
  #list li {
    padding: 0;
  }
  #list h3,
  #list p {
    background: none !important;
    padding-right: 60px;
  }
  #list img {
    right: 0;
    left: auto !important;
    object-fit: cover;
  }
</style>
<div id="container">
  <form id="form" role="search">
    <input type="search" id="input" x-inputmode="verbatim" data-l10n-id="search-music">
    <button type="reset" id="clear" data-icon="search"></button>
    <button type="button" id="close" data-l10n-id="search-close"></button>
  </form>
  <section id="results">
    <gaia-fast-list id="list">
      <template>
        <li>
          <a href="\${url}" data-file-path="\${name}" data-section="\${section}">
            <img>
            <h3>\${title}</h3>
            <p>\${subtitle}</p>
          </a>
        </li>
      </template>
    </gaia-fast-list>
  </section>
</div>`;

proto.createdCallback = function() {
  var shadowRoot = this.createShadowRoot();
  shadowRoot.innerHTML = template;

  var $id = shadowRoot.getElementById.bind(shadowRoot);

  this.els = {
    container: $id('container'),
    form:      $id('form'),
    input:     $id('input'),
    clear:     $id('clear'),
    close:     $id('close'),
    results:   $id('results'),
    list:      $id('list')
  };

  this.els.list.configure({
    getSectionName: (item) => {
      return item.section;
    },

    getItemImageSrc: (item) => {
      return this.getItemImageSrc(item);
    }
  });

  this.els.container.addEventListener('click', (evt) => {
    var button = evt.target.closest('button');
    switch (button && button.id) {
      case 'clear':
        this.clear();
        break;
      case 'close':
        this.close();
        break;
    }
  });

  this.els.input.addEventListener('focus', () => this.open());

  var onSearch = debounce(() => {
    this.dispatchEvent(new CustomEvent('search', {
      detail: this.els.input.value
    }));
  }, 500);

  this.els.input.addEventListener('input', onSearch);
  this.els.input.addEventListener('keypress', onSearch);

  this.els.list.addEventListener('click', (evt) => {
    var link = evt.target.closest('a');
    if (link) {
      evt.preventDefault();

      this.dispatchEvent(new CustomEvent('resultclick', {
        detail: link
      }));

      this.close();
    }
  });

  this.scrollOutOfView();

  this.onDOMLocalized = () => {
    // XXX: Bug 1205799 - view.formatValue errors when called before first
    // language is resolved
    document.l10n.ready.then(() => {
      document.l10n.translateFragment(shadowRoot);
    });
  };
};

proto.attachedCallback = function() {
  document.addEventListener('DOMLocalized', this.onDOMLocalized);
};

proto.detachedCallback = function() {
  document.removeEventListener('DOMLocalized', this.onDOMLocalized);
};

proto.getItemImageSrc = function() {};

proto.scrollOutOfView = function() {
  window.requestAnimationFrame(() => {
    if (this.nextElementSibling) {
      window.scrollTo(0, this.nextElementSibling.offsetTop);
    }
  });
};

proto.clear = function() {
  this.els.form.reset();
  this.els.input.focus();
};

proto.open = function() {
  this.els.input.focus();
  window.requestAnimationFrame(() => {
    this.els.results.classList.add('active');
    document.body.style.overflow = 'hidden';
  });

  this.dispatchEvent(new CustomEvent('open'));
};

proto.close = function() {
  this.els.form.reset();
  window.requestAnimationFrame(() => {
    this.els.results.classList.remove('active');
    document.body.style.overflow = 'auto';

    this.scrollOutOfView();
  });

  this.dispatchEvent(new CustomEvent('close'));
};

proto.setResults = function(results) {
  this.els.list.model = results;
};

function debounce(fn, ms) {
  var timeout;
  return () => {
    var args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  };
}

try {
  window.MusicSearch = document.registerElement('music-search', {
    prototype: proto
  });
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

})(window);
