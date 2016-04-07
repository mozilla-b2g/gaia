(function(window) {
/*jshint maxlen:false*/
'use strict';

var proto = Object.create(HTMLElement.prototype);

injectGlobalStyles();

proto.createdCallback = function() {
  var shadowRoot = this.createShadowRoot();
  shadowRoot.innerHTML =
`<style scoped>
  [hidden] {
    display: none;
  }
  #container {
    background-color: #333;
    color: #fff;
    position: relative;
    width: 100%;
    height: 5rem;
    overflow: hidden;
    -moz-user-select: none;
  }
  #spinner {
    background: url('/img/ui/music-scan-progress.png') no-repeat center center / 100% auto;
    border: none;
    display: block;
    position: absolute;
    top: 1rem;
    left: 1rem;
    width: 2.9rem;
    height: 2.9rem;
    animation: 0.9s music-scan-progress-spinner infinite linear;
  }
  #spinner::-moz-progress-bar {
    background: none;
  }
  #value {
    font-size: 1.2rem;
    font-weight: 700;
    line-height: 5rem;
    text-align: center;
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: 5rem;
    height: 5rem;
  }
  #heading,
  #subheading {
    font-weight: normal;
    box-sizing: border-box;
    position: absolute;
    margin: 0;
    padding: 0 0.5rem;
    left: 5rem;
    width: calc(100% - 5rem);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  #heading {
    font-size: 1.9rem;
    line-height: 3rem;
    top: 0;
  }
  #subheading {
    font-size: 1.4rem;
    top: 3rem;
  }
</style>
<div id="container">
  <progress id="spinner"></progress>
  <span id="value"></span>
  <h1 id="heading"></h1>
  <h2 id="subheading"></h2>
</div>`;

  var $id = shadowRoot.getElementById.bind(shadowRoot);

  this.els = {
    container:  $id('container'),
    spinner:    $id('spinner'),
    value:      $id('value'),
    heading:    $id('heading'),
    subheading: $id('subheading')
  };

  if (!this.hasAttribute('value') && !this.hasAttribute('heading') &&
      !this.hasAttribute('subheading')) {
    this.els.container.hidden = true;
  }

  this.value      = this.getAttribute('value');
  this.heading    = this.getAttribute('heading');
  this.subheading = this.getAttribute('subheading');

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
  var promise;
  var l10nId = this.getAttribute(attr + '-l10n-id');

  if (!newVal && l10nId) {
    promise = document.l10n.formatValues(l10nId);
  } else {
    promise = Promise.resolve();
  }

  promise.then(() => {
    switch (attr) {
      case 'value':
        this.els.value.textContent = newVal;
        break;
      case 'heading':
        this.els.heading.textContent = newVal;
        break;
      case 'subheading':
        this.els.subheading.textContent = newVal;
        break;
    }
  });
};

proto.update = function(properties = {}) {
  this.value      = properties.value      || this.value;
  this.heading    = properties.heading    || this.heading;
  this.subheading = properties.subheading || this.subheading;

  this.els.container.hidden = false;
};

proto.clear = function() {
  this.els.container.hidden = true;
};

['value', 'heading', 'subheading'].forEach((prop) => {
  Object.defineProperty(proto, prop, {
    get: function() {
      return this.getAttribute(prop);
    },

    set: function(value) {
      this.setAttribute(prop, value || '');
    }
  });
});

function injectGlobalStyles() {
  var style = document.createElement('style');
  style.innerHTML =
`@keyframes music-scan-progress-spinner {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`;

  document.head.appendChild(style);
}

try {
  window.MusicScanProgress = document.registerElement('music-scan-progress', {
    prototype: proto
  });
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

})(window);
