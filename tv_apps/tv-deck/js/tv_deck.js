/* global ChannelManager, KeyNavigationAdapter, SimpleKeyNavigation,
          asyncStorage, MozActivity, PinCard */

'use strict';

(function(exports) {

  /**
   * TVDeck is the app that can watch TV channels by connecting TVManager API.
   * Every (tuner, source, channel) combination creates an unique URL hash.
   * Thus, channel switching can be done by simply changing the URL hash and
   * handled by onhashchange handler.
   */
  function TVDeck() {
    navigator.mozApps.getSelf().onsuccess = function(evt){
      if (evt.target && evt.target.result) {
        this.selfApp = evt.target.result;
        this._fetchElements();
        // XXX: Currently, we do not support tuner switching
        asyncStorage.getItem('Last-Tuner-ID', function(tunerId) {
          this._init(tunerId);
          this.channelManager.fetchSettingFromHash(window.location.hash);
          this.channelManager.scanTuners();
        }.bind(this));
      }
    }.bind(this);
  }

  var proto = {};

  proto._init = function td__init(tunerId) {

    // lastChannelId maintains number of channel-switching user did.
    this.lastChannelId = 0;
    this.channelManager = new ChannelManager(tunerId);
    this.channelManager.on('scanned', this.setHash.bind(this));
    this.channelManager.on('error', this._showErrorState.bind(this));

    // enterNumberTimeoutDelay determines the waiting time for switching TV
    // channel according to the number user entered.
    this.enterNumberTimeoutDelay = 2000;

    // enterNumberTimeoutId is used to record timeout function that will switch
    // current TV channel according to the number user entered. We have to
    // cancel timeout function if an user enters one more number within waiting
    // time, i.e. enterNumberTimeoutDelay.
    this.enterNumberTimeoutId = null;

    // panelTimeoutDelay is the timeout delay for channel panel to be hidden.
    this.panelTimeoutDelay = 3000;
    // panelTimeoutId is used to record timeout function with 3s delay that will
    // hide channel-panel and button-group-panel. It will be created whenever a
    // channel is changed. We have to cancel this timeout function when an user
    // switch channel very fast within 3s.
    this.panelTimeoutId = null;

    // Dependencies
    this.keyNavigatorAdapter = new KeyNavigationAdapter();
    this.keyNavigatorAdapter.init();
    this.keyNavigatorAdapter.on('move', this._onSwitch.bind(this));
    this.keyNavigatorAdapter.on('enter-keyup', this._onEnter.bind(this));

    this.simpleKeyNavigation = new SimpleKeyNavigation();

    this.pinCard = new PinCard(this.selfApp);
    this.pinCard.on('update-pin-button', this.updatePinButton.bind(this));

    // Event listeners setup
    window.addEventListener('hashchange', this._onHashChange.bind(this));
    document.addEventListener('keyup', this._onEnterNumber.bind(this));

    // Determine whether a card should be pinned or unpinned.
    document.addEventListener('contextmenu', this.updatePinButton.bind(this));
  };

  proto._fetchElements = function td__fetchElements() {
    this.overlay = document.getElementById('overlay');
    this.tvStreamElement = document.getElementById('tv-stream');
    this.channelPanel = document.getElementById('channel-panel');
    this.channelNumber = document.getElementById('channel-number');
    this.channelTitle = document.getElementById('channel-title');
    this.buttonGroupPanel = document.getElementById('button-group-panel');
    this.pinButton = document.getElementById('pin-button');
    this.pinButtonContextmenu =
                        document.getElementById('pin-button-contextmenu');
    this.menuButton = document.getElementById('menu-button');
    this.loadingIcon = document.getElementById('loading-icon');
    this.bubbleElement = document.getElementById('bubble-animation');

    // Flash animation
    this.channelPanel.addEventListener('animationend', function(){
      this.channelPanel.classList.remove('flash');
    }.bind(this));

    // Hide loadingIcon when animationend
    this.loadingIcon.addEventListener('animationend', function(){
      this.loadingIcon.classList.add('hidden');
    }.bind(this));
  };

  /**
   * Handles onhashchange event. If the hash is valid, then set current source
   * and channel to the new value.
   */
  proto._onHashChange = function td_onHashChange() {
    this.lastChannelId++;

    var id = this.lastChannelId;
    var hash = window.location.hash;

    this.buttonGroupPanel.classList.add('hidden');
    this.overlay.classList.add('visible');
    this.channelPanel.classList.remove('hidden');
    if (this.simpleKeyNavigation.target) {
      this.simpleKeyNavigation.stop();
      this.channelPanel.focus();
    }

    this.channelManager.fetchSettingFromHash(hash);

    // Cancel onPanelTimeout function, otherwise, panels will be hidden
    // after 3 seconds.
    clearTimeout(this.panelTimeoutId);
    if (!this.channelManager.getTuner()) {
      this.channelManager.scanTuners();
    } else if (!this.channelManager.getSource()) {
      this.channelManager.scanSources();
    } else if (!this.channelManager.getChannel()) {
      this.channelManager.scanChannels();
    } else {
      this._rotateLoadingIcon();
      this._updateChannelInfo();
      this.channelManager.setPlayingSource(function() {
        // When an user swiches back and forth very fast, we only have to
        // handle the last hash. Since setPlayingSource is an async function,
        // id is used to record the last change.
        if (id === this.lastChannelId) {
          this.buttonGroupPanel.classList.remove('hidden');
          this.overlay.classList.remove('visible');
          this.updatePinButton();
          this.bubbleElement.play([this.pinButton, this.menuButton]);
          this.simpleKeyNavigation.start(
            [this.pinButton, this.menuButton],
            SimpleKeyNavigation.DIRECTION.HORIZONTAL
          );

          this.panelTimeoutId = setTimeout(this._onPanelTimeout.bind(this),
                                           this.panelTimeoutDelay);

          var newStream = this.channelManager.getTuner().tuner.stream;
          if (this.tvStreamElement.src !== newStream) {
            this.tvStreamElement.src = newStream;
            this.tvStreamElement.play();
          }
        }
      }.bind(this));
    }
  };

  proto._updateChannelInfo = function td__updateChannelInfo(title, number) {
    this.channelTitle.textContent =
                      title || this.channelManager.getChannel().channel.name;
    this.channelNumber.textContent =
                      number || this.channelManager.playingState.channelNumber;
  };

  proto.setHash = function td_setHash() {
    if (!this.channelManager.isReady) {
      return;
    }

    if (this.channelManager.currentHash === window.location.hash) {
      this._onHashChange();
    }
    window.location.hash = this.channelManager.currentHash;
  };

  /**
   * Up and down keys are for switching channels, where left and right keys are
   * for navigating buttons in button-group.
   */
  proto._onSwitch = function td__onSwitch(direction) {
    switch(direction) {
      case 'up':
      case 'down':
        this.channelManager.switchChannel(direction);
        break;
      case 'left':
      case 'right':
        if (!this.panelTimeoutId) {
          return;
        }
        clearTimeout(this.panelTimeoutId);
        this.panelTimeoutId =
            setTimeout(this._onPanelTimeout.bind(this), this.panelTimeoutDelay);
        return;
      default:
        return;
    }

    clearTimeout(this.enterNumberTimeoutId);
    this.enterNumberTimeoutId = null;
    this.setHash();
  };

  /**
   * onEnterNumber handles event when an user enters a number through keyboard.
   * Channel will be switched after enterNumberTimeoutDelay.
   */
  proto._onEnterNumber = function td__onEnterNumber(evt) {
    var number = evt.keyCode - 48;
    if (number >= 0 && number <= 9) {
      if (!this.enterNumberTimeoutId) {
        this.channelNumber.textContent = '';
      }

      clearTimeout(this.enterNumberTimeoutId);
      clearTimeout(this.panelTimeoutId);
      this.enterNumberTimeoutId =
            setTimeout(this._onEnter.bind(this), this.enterNumberTimeoutDelay);
      this.channelPanel.classList.remove('hidden');
      this.channelPanel.focus();

      // length is limit to 4 digits
      if (this.channelNumber.textContent.length < 4) {
        this.channelNumber.textContent += number;
      }
    }
  };

  /**
   * onEnter switch channels accroding to channelNumber element. It will be
   * triggerred either by pressing enter key or enterNumebrTimeout.
   */
  proto._onEnter = function td__onEnter() {
    if (this.enterNumberTimeoutId) {
      clearTimeout(this.enterNumberTimeoutId);
      this.enterNumberTimeoutId = null;

      clearTimeout(this.panelTimeoutId);
      this.panelTimeoutId =
            setTimeout(this._onPanelTimeout.bind(this), this.panelTimeoutDelay);

      var newNumber = this.channelNumber.textContent;
      var newIndex =
                  this.channelManager.getSource().channelIndexHash[newNumber];

      // reset back to current channel number if the number entered
      // is not valid.
      if (newIndex !== 0 && !newIndex) {
        this.channelNumber.textContent =
                              this.channelManager.playingState.channelNumber;
        this.channelPanel.classList.add('flash');
        this.simpleKeyNavigation.focus();
        return;
      }

      this.channelManager.playingState.channelNumber = newNumber;
      this.setHash();
    }
  };

  proto._showErrorState = function td__showErrorState() {
    this._updateChannelInfo('---', '--');
    this.tvStreamElement.removeAttribute('src');
    this.tvStreamElement.load();
  };

  proto._rotateLoadingIcon = function td__rotateLoadingIcon() {
    if (!this.loadingIcon) {
      return;
    }
    this.loadingIcon.classList.remove('loading-circle');
    this.loadingIcon.classList.remove('hidden');

    // getComputedStyle on an element somehow will not reflow pseudo elements
    // under it, we have to manually reflow those pseudo elements.
    window.getComputedStyle(this.loadingIcon).width;
    window.getComputedStyle(this.loadingIcon, ':before').width;
    window.getComputedStyle(this.loadingIcon, ':after').width;
    this.loadingIcon.classList.add('loading-circle');
  };

  proto._onPanelTimeout = function td_onPanelTimeout() {
    this.buttonGroupPanel.classList.add('hidden');
    this.channelPanel.classList.add('hidden');
    this.simpleKeyNavigation.stop();
    this.channelPanel.focus();
    this.panelTimeoutId = null;
  };

    /**
   * Update pin button in button-group-panel and contextmenu.
   */
  proto.updatePinButton = function td_updatePinButton() {
    if (this.pinCard.pinnedChannels[this.channelManager.currentHash]) {
      // Show unpin button if current channel is pinned.
      this.pinButtonContextmenu.setAttribute('data-l10n-id', 'unpin-from-home');
      this.pinButtonContextmenu.onclick = this._unpinFromHome.bind(this);
      this.pinButton.onclick = this._unpinFromHome.bind(this);
    } else {
      // Show pin button if current channel is not pinned yet.
      this.pinButtonContextmenu.setAttribute('data-l10n-id', 'pin-to-home');
      this.pinButtonContextmenu.onclick = this._pinToHome.bind(this);
      this.pinButton.onclick = this._pinToHome.bind(this);
    }
  };

  proto._pinToHome = function td__pinToHome() {

    var number = window.location.hash.split(',')[2];

    /* jshint nonew:false */
    new MozActivity({
      name: 'pin',
      data: {
        type: 'Application',
        group: 'tv',
        name: {raw: 'CH ' + number},
        manifestURL: this.selfApp.manifestURL,
        launchURL: window.location.href
      }
    });
  };

  proto._unpinFromHome = function td__unpinFromHome() {

    var message = {
      type: 'unpin',
      data: {
        manifestURL: this.selfApp.manifestURL,
        launchURL: window.location.href
      }
    };

    this.selfApp.connect('appdeck-channel').then(function (ports) {
      ports.forEach(function(port) {
        port.postMessage(message);
      });
    });
  };

  exports.TVDeck = TVDeck;
  TVDeck.prototype = proto;
})(window);
