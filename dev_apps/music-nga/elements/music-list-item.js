(function(window) {
'use strict';

var proto = Object.create(HTMLAnchorElement.prototype);

var template =
`<style scoped>
  #container {
    display: block;
    position: relative;
    margin: 0;
    width: 100%;
    height: 6rem;
    text-decoration: none;
    -moz-user-select: none;
  }
  h1, h2 {
    font-weight: normal;
    position: absolute;
    margin: 0.2rem 0 0;
    padding: 0 0.5rem 0 0;
    left: 3rem;
    width: calc(100% - 12rem);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  h1 {
    color: #fff;
    font-size: 1.9rem;
    top: 0.6rem;
  }
  h2 {
    color: #8a9699;
    font-size: 1.7rem;
    top: 3rem;
  }
  img {
    position: absolute;
    top: 0;
    right: 2.5rem;
    width: 6rem;
    height: 6rem;
    object-fit: cover;
  }
</style>
<div id="container">
  <h1></h1>
  <h2></h2>
  <img>
</div>`;

proto.createdCallback = function() {
  var shadowRoot = this.createShadowRoot();
  shadowRoot.innerHTML = template;

  this.els = {
    title:     shadowRoot.querySelector('h1'),
    subtitle:  shadowRoot.querySelector('h2'),
    thumbnail: shadowRoot.querySelector('img')
  };

  ['title', 'subtitle', 'thumbnail'].forEach(prop => {
    var value = this[prop];
    this[prop] = '';
    this[prop] = value;
  });
};

proto.attributeChangedCallback = function(attr, oldVal, newVal) {
  switch (attr) {
    case 'title':
      this.els.title.textContent = newVal;
      this.setAttribute('starts-with', newVal.charAt(0).toUpperCase());
      break;
    case 'subtitle':
      this.els.subtitle.textContent = newVal;
      break;
    case 'thumbnail':
      this.els.thumbnail.src = newVal;
      break;
  }
};

['title', 'subtitle', 'thumbnail'].forEach(function(prop) {
  Object.defineProperty(proto, prop, {
    get: function() {
      return this.getAttribute(prop);
    },

    set: function(value) {
      this.setAttribute(prop, value || '');
    }
  });
});

try {
  window.MusicListItem = document.registerElement('music-list-item', {
    prototype: proto,
    extends: 'a'
  });
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

})(window);
