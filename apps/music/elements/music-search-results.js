(function(window) {
/*jshint maxlen:false*/
'use strict';

var proto = Object.create(HTMLElement.prototype);

proto.createdCallback = function() {
  this.innerHTML = `
  <style scoped>
    music-search-results {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      background: var(--background);
    }

    music-search-results.transitions-on {
      transition:
        opacity 0.2s linear,
        visibility 0s linear 0.2s;
    }

    music-search-results[active] {
      opacity: 1;
      visibility: visible;
      transition-delay: 0s, 0s;
      pointer-events: auto;
    }
  </style>
  <gaia-fast-list id="list">
    <template>
      <a href="\${url}" data-file-path="\${name}" data-section="\${section}">
        <div class="image"><img></div>
        <h3 dir="auto">\${title}</h3>
        <p dir="auto">\${subtitle}</p>
      </a>
    </template>
  </gaia-fast-list>`;

  this.els = {
    list: this.querySelector('#list')
  };

  this.els.list.configure({
    getSectionName: (item) => item.section,
    getItemImageSrc: (item) => this.getItemImageSrc(item)
  });

  this.els.list.addEventListener('click', (e) => this.onLinkClick(e));
};

proto.attachedCallback = function() {
  setTimeout(() => this.enableTransitions());
};

proto.enableTransitions = function() {
  this.classList.add('transitions-on');
};

proto.onLinkClick = function(evt) {
  var link = evt.target.closest('a');
  if (!link) return;
  evt.preventDefault();

  this.close().then(() => {
    this.emit('resultclick', link);
  });
};

// To be overriden by view
// if images are required
proto.getItemImageSrc = function() {};

proto.open = function() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      this.setAttribute('active', true);
      resolve();
    });

    this.emit('open');
  });
};

proto.close = function() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      this.removeAttribute('active');
      this.clearResults();
      resolve();
    });

    this.emit('close');
  });
};

proto.setResults = function(results) {
  if (results.length === 0) {
    return document.l10n.formatValue('search-no-result')
      .then((noResult) => {
        return this.els.list.setModel([{
          title: noResult,
          subtitle: ''
        }]);
      });
  }

  return this.els.list.setModel(results);
};

proto.clearResults = function() {
  return this.els.list.setModel([]);
};

proto.emit = function(name, detail) {
  var evt = new CustomEvent(name, { detail: detail });
  this.dispatchEvent(evt);
};

window.MusicSearchResults = document.registerElement('music-search-results', {
  prototype: proto
});

})(window);
