(function(window) {
'use strict';

const HIDE_OVERLAY_TIMEOUT = 5000;

const REPEAT_VALUES = ['off', 'list', 'song'];
const SHUFFLE_VALUES = ['off', 'on'];

var proto = Object.create(HTMLElement.prototype);


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
  #container {
    background-color: #000;
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    -moz-user-select: none;
  }
  #container > img {
    background-color: #000;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  #container > img[data-layer="front"] {
    opacity: 0;
    visibility: hidden;
    transition: opacity 150ms linear, visibility 0s linear 150ms;
  }
  #container > img[data-layer="front"].active {
    opacity: 1;
    visibility: visible;
    transition-delay: 0s, 0s;
  }
  #container button {
    background: none;
    border: none;
    border-radius: 0;
    color: #fff;
    flex: 0 0 auto;
    margin: 0 1rem;
    width: 6rem;
    transition: background 200ms ease;
  }
  #container button:hover {
    background: transparent;
  }
  #container button:active {
    background: #00caf2;
    transition-duration: 0s;
  }
  #container button:disabled,
  #container button[data-value="off"] {
    opacity: 0.3;
  }
  #container button:disabled:active {
    background: transparent;
  }
  #container button[data-icon="repeat"][data-value="song"]:before {
    content: 'repeat-once'
  }
  #caption,
  #controls {
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    flex-flow: row nowrap;
    position: absolute;
    left: 0;
    width: 100%;
    height: 5rem;
    visibility: hidden;
    transition: transform 300ms ease-in-out, visibility 0s linear 300ms;
  }
  #caption {
    top: 0;
    transform: translateY(-5rem);
  }
  #controls {
    bottom: 0;
    transform: translateY(5rem);
  }
  .show-overlay > #caption,
  .show-overlay > #controls {
    transform: translateY(0);
    visibility: visible;
    transition-delay: 0s, 0s;
  }
  #caption-text {
    position: relative;
    flex: 0 0 auto;
    width: calc(100% - 8rem);
  }
  #artist,
  #album {
    color: #fff;
    font-weight: normal;
    text-shadow: 0 0.1rem rgba(0, 0, 0, 0.5);
    text-indent: 3rem;
    position: relative;
    margin: 0;
    width: 100%;
    height: 2.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  #artist {
    font-size: 1.9rem;
    line-height: 3rem;
  }
  #album {
    font-size: 1.7rem;
    line-height: 2.5rem;
  }
  #rating {
    flex: 1 0 auto;
  }
</style>
<div id="container">
  <img data-layer="back">
  <img data-layer="front" class="active">
  <div id="caption">
    <div id="caption-text">
      <h1 id="artist"></h1>
      <h2 id="album"></h2>
    </div>
    <button type="button"
        data-action="share"
        data-icon="share"
        data-l10n-id="share-song">
    </button>
  </div>
  <div id="controls">
    <button type="button"
        data-action="repeat"
        data-icon="repeat"
        data-l10n-id="repeat-off">
    </button>
    <music-rating id="rating"></music-rating>
    <button type="button"
        data-action="shuffle"
        data-icon="shuffle"
        data-l10n-id="shuffle-toggle">
    </button>
  </div>
</div>`;

  var $ = shadowRoot.querySelector.bind(shadowRoot);

  this.els = {
    container:  $('#container'),
    backImage:  $('img[data-layer="back"]'),
    frontImage: $('img[data-layer="front"]'),
    caption:    $('#caption'),
    controls:   $('#controls'),
    artist:     $('#artist'),
    album:      $('#album'),
    share:      $('[data-action="share"]'),
    repeat:     $('[data-action="repeat"]'),
    shuffle:    $('[data-action="shuffle"]'),
    rating:     $('#rating')
  };

  var onImageLoad = (evt) => {
    window.requestAnimationFrame(() => {
      var newActiveImage = evt.target.closest('img:not(.active)');
      if (!newActiveImage) {
        return;
      }

      var oldActiveImage = this.els.container.querySelector('img.active');
      newActiveImage.classList.add('active');
      oldActiveImage.classList.remove('active');
    });
  };

  [].forEach.call(this.els.container.querySelectorAll('img'), (img) => {
    img.addEventListener('load', onImageLoad);
  });

  this.els.container.addEventListener('transitionend', (evt) => {
    if (!evt.target.matches('img:not(.active)')) {
      return;
    }

    var oldActiveImage = evt.target;
    oldActiveImage.src = null;
  });

  this.els.container.addEventListener('click', (evt) => {
    var button = evt.target.closest('button');
    if (!button) {
      if (evt.target.closest('#rating')) {
        this.overlayVisible = true;
        return;
      }

      this.overlayVisible = !this.overlayVisible;
      return;
    }

    var action = button.dataset.action;
    switch (action) {
      case 'repeat':
        this.nextRepeat();
        break;
      case 'shuffle':
        this.nextShuffle();
        break;
    }

    this.overlayVisible = true;
    this.dispatchEvent(new CustomEvent(action));
  });

  this.els.rating.addEventListener('change', (evt) => {
    this.dispatchEvent(new CustomEvent('ratingchange', {
      detail: evt.detail
    }));
  });

  this.onDOMRetranslated = () => {
    document.l10n.translateFragment(shadowRoot);
  };

  this.repeat = this.getAttribute('repeat');
  this.shuffle = this.getAttribute('shuffle');

  this.overlayVisible = true;
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
    case 'artist':
      this.els.artist.textContent = newVal;
      break;
    case 'album':
      this.els.album.textContent = newVal;
      break;
    case 'repeat':
      this.els.repeat.dataset.value =
        REPEAT_VALUES.indexOf(newVal) !== -1 ? newVal : REPEAT_VALUES[0];
      break;
    case 'shuffle':
      this.els.shuffle.dataset.value =
        SHUFFLE_VALUES.indexOf(newVal) !== -1 ? newVal : SHUFFLE_VALUES[0];
      break;
    case 'src':
      this.els.container.querySelector('img:not(.active)').src = newVal;
      break;
  }
};

proto.nextRepeat = function() {
  this.repeat = REPEAT_VALUES[REPEAT_VALUES.indexOf(this.repeat) + 1];
};

proto.nextShuffle = function() {
  this.shuffle = SHUFFLE_VALUES[SHUFFLE_VALUES.indexOf(this.shuffle) + 1];
};

['artist', 'album', 'src'].forEach(function(prop) {
  Object.defineProperty(proto, prop, {
    get: function() {
      return this.getAttribute(prop);
    },

    set: function(value) {
      this.setAttribute(prop, value || '');
    }
  });
});

Object.defineProperty(proto, 'repeat', {
  get: function() {
    return this.getAttribute('repeat') || REPEAT_VALUES[0];
  },

  set: function(value) {
    value = REPEAT_VALUES.indexOf(value) !== -1 ? value : REPEAT_VALUES[0];
    this.setAttribute('repeat', value);

    this.els.repeat.dataset.l10nId = 'repeat-' + value;

    this.onDOMRetranslated();
  }
});

Object.defineProperty(proto, 'shuffle', {
  get: function() {
    return this.getAttribute('shuffle') || SHUFFLE_VALUES[0];
  },

  set: function(value) {
    value = SHUFFLE_VALUES.indexOf(value) !== -1 ? value : SHUFFLE_VALUES[0];
    this.setAttribute('shuffle', value);
  }
});

Object.defineProperty(proto, 'overlayVisible', {
  get: function() {
    return this.els.container.classList.contains('show-overlay');
  },

  set: function(value) {
    var overlayVisible = !!value;

    clearTimeout(this._hideOverlayTimeout);

    if (overlayVisible) {
      this.els.container.classList.add('show-overlay');
      this._hideOverlayTimeout = setTimeout(() => {
        this.overlayVisible = false;
      }, HIDE_OVERLAY_TIMEOUT);
    }

    else {
      this.els.container.classList.remove('show-overlay');
    }
  }
});

try {
  window.MusicArtwork = document.registerElement('music-artwork', {
    prototype: proto
  });
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

})(window);
