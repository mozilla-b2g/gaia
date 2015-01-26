/* global evt */
(function(exports) {
  'use strict';

  function SearchBar() {}

  SearchBar.STATES = Object.freeze({
    'HIDDEN': 'hidden',
    'SHOWING': 'showing',
    'SHOWN': 'shown'
  });

  var proto = SearchBar.prototype = new evt();

  Object.defineProperty(proto, 'state', {
    get: function sb_getState() {
      return this._state;
    },
    set: function sb_setState(state) {
      this._state = state;
      this.fire(state);
    }
  });

  proto.init = function sb_init(ui) {
    this.searchUI = ui;
    this.searchUI.addEventListener('transitionend', this);

    this.voiceButton = this.searchUI.querySelector('.search-mic-button');
    this.voiceButton.addEventListener('transitionend', this);

    this.state = this.searchUI.classList.contains('hidden') ?
                    SearchBar.STATES.HIDDEN : SearchBar.STATES.SHOWN;
  };

  proto.uninit = function sb_uninit() {
    this.searchUI.removeEventListener('transitionend', this);
    this.voiceButton.removeEventListener('transitionend', this);
  };

  proto.show = function sb_show() {
    this.searchUI.classList.remove('hidden');
    this.state = SearchBar.STATES.SHOWING;
  };

  proto.hide = function sb_hide() {
    this.searchUI.classList.add('hidden');
    this.searchUI.classList.remove('opened');
    this.state = SearchBar.STATES.HIDDEN;
  };

  proto.handleEvent = function sb_handleEvent(evt) {
    // We have two steps transition:
    //   1. background-color transition on searchUI
    //   2. opacity on voiceButton
    if (evt.target === this.searchUI &&
        evt.propertyName === 'background-color' &&
        this.state === SearchBar.STATES.SHOWING) {
      this.searchUI.classList.add('opened');
    } else if (evt.target === this.voiceButton &&
               evt.propertyName === 'opacity' &&
               this.state === SearchBar.STATES.SHOWING) {
      this.state = SearchBar.STATES.SHOWN;
    }
  };

  exports.SearchBar = SearchBar;

})(window);
