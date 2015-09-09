(function(window) {
'use strict';

var GaiaToolbar = window['gaia-toolbar'];

var proto = Object.create(GaiaToolbar.prototype);

var styles =
`music-tab-bar {
  background-color: #000;
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  -moz-user-select: none;
}

.-content > *,
.more-button {
  transition: none;
}

.-content > .selected {
  color: var(--highlight-color);
}`;

proto.createdCallback = function() {
  GaiaToolbar.prototype.createdCallback.apply(this, arguments);

  this.querySelector('style').innerHTML += styles;

  this.addEventListener('click', (evt) => {
    var tab = evt.target.closest('button');
    if (!tab) {
      return;
    }

    this.selectedElement = tab;
  });

  this.selectedIndex = 0;
};

Object.defineProperty(proto, 'selectedElement', {
  get: function() {
    return this.querySelectorAll('button')[this.selectedIndex];
  },

  set: function(value) {
    var index = [].indexOf.call(this.querySelectorAll('button'), value);
    if (index !== -1) {
      this.selectedIndex = index;
    }
  }
});

Object.defineProperty(proto, 'selectedIndex', {
  get: function() {
    return this._selectedIndex || 0;
  },

  set: function(value) {
    var tabs = this.querySelectorAll('button');
    if (this._selectedIndex === value || value < 0 || value >= tabs.length) {
      return;
    }

    this._selectedIndex = value;

    [].forEach.call(tabs, (tab, index) => {
      if (index === this._selectedIndex) {
        tab.classList.add('selected');
        return;
      }

      tab.classList.remove('selected');
    });

    this.dispatchEvent(new CustomEvent('change', {
      detail: {
        selectedElement: this.selectedElement,
        selectedIndex: this._selectedIndex
      }
    }));
  }
});

try {
  window.MusicTabBar = document.registerElement('music-tab-bar', { prototype: proto });
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

})(window);
