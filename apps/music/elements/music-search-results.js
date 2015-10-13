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
  #list {
    background: var(--background);
    position: relative;
    width: 100%;
    height: 100%;
    z-index: 99999;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s linear, visibility 0s linear 0.2s;
  }
  #list.active {
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
<gaia-fast-list id="list">
  <template>
    <li>
      <a href="\${url}" data-file-path="\${name}" data-section="\${section}">
        <img style="visibility: \${name ? 'visible' : 'hidden'}">
        <h3>\${title}</h3>
        <p>\${subtitle}</p>
      </a>
    </li>
  </template>
</gaia-fast-list>`;

proto.createdCallback = function() {
  var shadowRoot = this.createShadowRoot();
  shadowRoot.innerHTML = template;

  var $id = shadowRoot.getElementById.bind(shadowRoot);

  this.els = {
    list: $id('list')
  };

  this.els.list.configure({
    getSectionName: (item) => {
      return item.section;
    },

    getItemImageSrc: (item) => {
      return this.getItemImageSrc(item);
    }
  });

  this.els.list.addEventListener('click', (evt) => {
    var link = evt.target.closest('a');
    if (link) {
      evt.preventDefault();

      this.close().then(() => {
        this.dispatchEvent(new CustomEvent('resultclick', {
          detail: link
        }));
      });
    }
  });
};

proto.getItemImageSrc = function() {};

proto.open = function() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      this.els.list.classList.add('active');
      resolve();
    });

    this.dispatchEvent(new CustomEvent('open'));
  });
};

proto.close = function() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      this.els.list.classList.remove('active');
      resolve();
    });

    this.dispatchEvent(new CustomEvent('close'));
  });
};

proto.setResults = function(results) {
  if (results.length === 0) {
    document.l10n.formatValue('search-no-result').then((noResult) => {
      this.els.list.model = [{
        title: noResult,
        subtitle: ''
      }];
    });

    return;
  }

  this.els.list.model = results;

  return this.els.list.model;
};

proto.clearResults = function() {
  this.els.list.model = [];

  return this.els.list.model;
};

try {
  window.MusicSearchResults = document.registerElement('music-search-results', {
    prototype: proto
  });
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

})(window);
