/* global ChannelManager, KeyNavigationAdapter, SimpleKeyNavigation */

'use strict';

(function(exports) {

  /**
   * TVDeck is the app that can watch TV channels by connecting TVManager API.
   * Every (tuner, source, channel) combination creates an unique URL hash.
   * Thus, channel switching can be done by simply changing the URL hash and
   * handled by onhashchange handler.
   */
  function TVDeck() {

    this._init();
    this._fetchElements();

    // Initialize TVDeck. Fetch initial (tuner, source, channel) values from
    // either URL hash or localStorage, and then scan all available tuners,
    // sources and channels.
    this.fetchSettingFromHash();
    this.scanTuners();
  }

  var proto = {};

  // Current tuner object playing by TV (we may have another tuner for recording
  // in the future).
  Object.defineProperty(proto, 'playingTuner', {
    get: function() {
      return this.currentTuners[this.playingTunerId];
    }
  });

  // Current source object playing by TV (we may have another source for
  // recording in the future).
  Object.defineProperty(proto, 'playingSource', {
    get: function() {
      if (!this.playingTuner || !this.playingTuner.sources) {
        return null;
      }
      return this.playingTuner.sources[this.playingSourceType];
    }
  });

  // Current channel object playing by TV (we may have another source for
  // recording in the future).
  Object.defineProperty(proto, 'playingChannel', {
    get: function() {
      var playingSource = this.playingSource;
      var index = playingSource.channelIndexHash[this.playingChannelNumber];
      if (!playingSource || !playingSource.channelIndexHash) {
        return null;
      }
      return playingSource.channels[index];
    }
  });

  // Current hash
  Object.defineProperty(proto, 'currentHash', {
    get: function() {
      return this.playingTunerId + ',' + this.playingSourceType +
             ',' + this.playingChannelNumber;
    }
  });

  proto._init = function td__init() {

    // lastChannelId maintains number of channel-switching user did.
    this.lastChannelId = 0;
    this.manifestURL = null;
    this.origin = null;
    this.currentTuners = {};
    this.channelManager = new ChannelManager(this);

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

    // Event listeners setup
    window.addEventListener('hashchange', this._onHashChange.bind(this));
    document.addEventListener('keyup', this._onEnterNumber.bind(this));
    navigator.mozApps.getSelf().onsuccess = function(evt){
      if (evt.target && evt.target.result) {
        this.origin = evt.target.result.origin;
        this.manifestURL = evt.target.result.manifestURL;
      }
    }.bind(this);

    // Set the 'ontunerchanged' event handler.
    navigator.tv.ontunerchanged = function(event) {
      var operation = event.operation;
      var changedTuner = event.tuner;

      switch (operation) {
        case 'added':
          this.currentTuners[changedTuner.id] = {
            tuner: changedTuner,
            sources: {}
          };
          break;
        case 'removed':
          this.currentTuners[changedTuner.id] = null;
          if (this.playingTunerId === changedTuner.id) {
            this._showErrorState();
          }
          break;
        default:
          break;
      }
    }.bind(this);
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
   * Fetch tuner, source and channel settings from URL hash. If URL hash is
   * empty, then fetch settings from localStorage.
   */
  proto.fetchSettingFromHash = function td_fetchSettingFromHash() {
    var hash;
    hash = window.location.hash.substring(1);
    if (hash.length === 0) {
      hash = window.localStorage.getItem('TV_Hash');
    }

    if(hash) {
      hash = hash.split(',');
      this.playingTunerId = hash[0];
      this.playingSourceType = hash[1];
      this.playingChannelNumber = hash[2];
    }
  };

  /**
   * Handles onhashchange event. If the hash is valid, then set current source
   * and channel to the new value.
   */
  proto._onHashChange = function td_onHashChange() {
    this.lastChannelId++;
    var id = this.lastChannelId;
    this.buttonGroupPanel.classList.add('hidden');
    this.overlay.classList.add('visible');
    this.channelPanel.classList.remove('hidden');
    if (this.simpleKeyNavigation.target) {
      this.simpleKeyNavigation.stop();
    }

    this.fetchSettingFromHash();

    // Cancel onPanelTimeout function, otherwise, panels will be hidden after 3
    // seconds.
    clearTimeout(this.panelTimeoutId);
    if (!this.playingTuner) {
      this.scanTuners();
    } else if (!this.playingSource) {
      this.scanSources();
    } else if (!this.playingChannel) {
      this.scanChannels();
    } else {
      this._rotateLoadingIcon();
      this.updateChannelInfo();
      this.setPlayingSource(function() {
        // When an user swiches back and forth very fast, we only have to handle
        // the last hash. Since setPlayingSource is an async function, id is
        // used to record the last change.
        if (id === this.lastChannelId) {
          this.buttonGroupPanel.classList.remove('hidden');
          this.overlay.classList.remove('visible');
          this.channelManager.updatePinButton();
          this.bubbleElement.play([this.pinButton, this.menuButton]);
          this.simpleKeyNavigation.start(
            [this.pinButton, this.menuButton],
            SimpleKeyNavigation.DIRECTION.HORIZONTAL
          );

          this.panelTimeoutId =
            setTimeout(this._onPanelTimeout.bind(this), this.panelTimeoutDelay);
        }
      }.bind(this));
    }
    window.localStorage.setItem('TV_Hash', window.location.hash.substring(1));
  };

  /**
   * Retrieve all the currently available TV tuners.
   */
  proto.scanTuners = function td_scanTuners() {
    navigator.tv.getTuners().then(function onsuccess(tuners) {
      this.currentTuners = {};
      tuners.forEach(function initTuner(tuner) {
        this.currentTuners[tuner.id] = {
          tuner: tuner,
          sources: {}
        };
      }.bind(this));

      if (!this.playingTunerId) {
        this.playingTunerId = tuners[0].id;
      }

      if (!this.playingTuner) {
        this._showErrorState();
        return;
      }

      this.scanSources();
    }.bind(this));
  };

  /**
   * Retrieve all the currently available TV sources from current TV tuner.
   */
  proto.scanSources = function td_scanSources() {
    this.playingTuner.tuner.getSources().then(function getSources(sources) {
      this.playingTuner.sources = {};
      if (sources.length === 0) {
        console.log('Error, no source found!');
        return;
      }

      sources.forEach(function initSource(source) {
        this.playingTuner.sources[source.type] = {
          source: source,
          channels: [],
          channelIndexHash: {}
        };
      }.bind(this));

      if (!this.playingSourceType) {
        this.playingSourceType = sources[0].type;
      }

      if (!this.playingSource) {
        this._showErrorState();
        return;
      }

      this.scanChannels();
    }.bind(this));
  };

  /**
   * Retrieve all the currently available TV channels from current TV source.
   * We have to scan the channels before calling getChannels.
   */
  proto.scanChannels = function td_scanChannels() {
    var source = this.playingSource.source;
    this.playingSource.channels = [];
    this.playingSource.channelIndexHash = {};
    if (source.isScanning) {
      return;
    }

    if (!source.onscanningstatechanged) {
      // XXX: May change to event listener
      source.onscanningstatechanged = function onscanningstatechanged(event) {
        var state = event.state;
        switch (state) {
          case 'completed':
          /* falls through */
          case 'stopped':
            this._onScanningCompleted();
            break;
          default:
            break;
        }
      }.bind(this);
    }

    source.startScanning({
      isRescanned: true
    });
  };

  /**
   * Retrieve all the currently available TV channels from current TV source.
   * Sort channels for channel switching.
   */
  proto._onScanningCompleted = function td_onScanningCompleted() {
    this.playingSource.source.getChannels().then(function onsuccess(channels) {
      if (channels.length === 0) {
        console.log('Error, no channel found!');
        return;
      }

      // Sort channels. Channel number can be XX-XX-XX
      channels.sort(function(channelA, channelB) {
        return this._compareChannel(channelA.number, channelB.number);
      }.bind(this));

      var i;
      for (i = 0; i < channels.length; i++) {
        this.playingSource.channelIndexHash[channels[i].number] = i;
        this.playingSource.channels[i] = {
          channel: channels[i],
          programs: {},
        };
      }

      if (!this.playingChannelNumber) {
        this.playingChannelNumber = channels[0].number;
      }

      if (!this.playingChannel) {
        this._showErrorState();
        return;
      }

      this.setHash();
    }.bind(this), function onerror(error) {
      alert(error);
    });
  };

  proto.setPlayingSource = function td_setPlayingSource(callback) {
    if (this.playingTuner.tuner.currentSource === this.playingSource.source) {
      this.setPlayingChannel(callback);
      return;
    }

    this.playingTuner.tuner.setCurrentSource(this.playingSourceType)
      .then(function() {
        this.setPlayingChannel(callback);
      }.bind(this), function() {
        alert('Source not found');
      });
  };

  proto.setPlayingChannel = function td_setPlayingChannel(callback) {
    this.playingSource.source.setCurrentChannel(this.playingChannelNumber)
      .then(function() {
        /* jshint maxlen:false */
        var newStream = this.playingTuner.tuner.stream;
        if (this.tvStreamElement.src !== newStream) {
          this.tvStreamElement.src = newStream;
          this.tvStreamElement.play();
        }
        if (callback) {
          callback();
        }
      }.bind(this), function() {
        alert('Channel not found');
      });
  };

  proto._compareChannel = function td__compareChannel(channelA, channelB) {
    var dashIndexA = channelA.indexOf('-');
    var dashIndexB = channelB.indexOf('-');
    var numberA = (dashIndexA >= 0) ?
                        channelA.substring(0, dashIndexA) : channelA;
    var numberB = (dashIndexB >= 0) ?
                        channelB.substring(0, dashIndexB) : channelB;
    numberA = parseInt(numberA, 10);
    numberB = parseInt(numberB, 10);

    if (numberA === numberB) {
      if (dashIndexA === -1 && dashIndexB === -1) {
        return 0;
      } else if (dashIndexA !== -1 && dashIndexB === -1) {
        return 1;
      } else if (dashIndexA === -1 && dashIndexB !== -1) {
        return -1;
      }

      channelA = channelA.substring(dashIndexA + 1);
      channelB = channelB.substring(dashIndexB + 1);
      return this._compareChannel(channelA, channelB);
    }
    return numberA - numberB;
  };

  proto.updateChannelInfo = function td_updateChannelInfo(title, number) {
    this.channelTitle.textContent = title || this.playingChannel.channel.name;
    this.channelNumber.textContent = number || this.playingChannelNumber;
  };

  proto.setHash = function td_setHash() {
    if (this.currentHash === window.location.hash.substring(1)) {
      // When initizlizing TVDeck, if either URL hash or localStorage is not
      // null, the URL will be set to the same value in _onScanningCompleted
      // function. However, we still have to call onHashChange function in order
      // to switch to the correct channel.
      this._onHashChange();
    }
    window.location.hash = this.currentHash;
  };

  /**
   * Up and down keys are for switching channels, where left and right keys are
   * for navigating buttons in button-group.
   */
  proto._onSwitch = function td__onSwitch(direction) {
    var channelList = this.playingSource.channels;
    var channelIndex = this.playingSource
                           .channelIndexHash[this.playingChannelNumber];
    var clearEnterNumber = function() {
      clearTimeout(this.enterNumberTimeoutId);
      this.enterNumberTimeoutId = null;
      this.channelNumber.textContent = this.playingChannelNumber;
    }.bind(this);

    switch(direction) {
      case 'up':
        channelIndex++;
        clearEnterNumber();
        break;
      case 'down':
        channelIndex--;
        clearEnterNumber();
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

    channelIndex = (channelIndex < 0) ? channelList.length - 1 : channelIndex;
    channelIndex = (channelIndex > channelList.length - 1) ? 0 : channelIndex;

    // If a channel is not found, add flash animation.
    if (!channelList[channelIndex]) {
      this.channelPanel.classList.add('flash');
      return;
    }

    this.playingChannelNumber = channelList[channelIndex].channel.number;
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

      // reset back to current channel number if the number entered
      // is not valid.
      if (this.playingSource.channelIndexHash[newNumber] !== 0 &&
          !this.playingSource.channelIndexHash[newNumber]) {
        this.channelNumber.textContent = this.playingChannelNumber;
        this.channelPanel.classList.add('flash');
        this.simpleKeyNavigation.focus();
        return;
      }

      this.playingChannelNumber = newNumber;
      this.setHash();
    }
  };

  proto._showErrorState = function td__showErrorState() {
    this.updateChannelInfo('---', '--');
    this.tvStreamElement.src = null;
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
    this.panelTimeoutId = null;
  };

  exports.TVDeck = TVDeck;
  TVDeck.prototype = proto;
})(window);
