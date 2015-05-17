/* global evt, Promise, asyncStorage */

'use strict';

(function(exports) {

  function ChannelManager() {

    this.isReady = false;
    this.currentTuners = {};
    this.playingState = {};
  }

  var proto = Object.create(new evt());

  // Current hash
  Object.defineProperty(proto, 'currentHash', {
    get: function() {
      var state = this.playingState;
      var currentHash = '#';
      currentHash += state.tunerId;
      currentHash += (',' + state.sourceType);
      currentHash += (',' + state.channelNumber);
      return currentHash;
    }
  });

  proto.getTuner = function cm_getTuner(tunerId) {
    tunerId = tunerId || this.playingState.tunerId;
    return this.currentTuners[tunerId];
  };

  proto.getSource = function cm_getSource(sourceType) {
    sourceType = sourceType || this.playingState.sourceType;
    var tuner = this.getTuner();
    if (!tuner || !tuner.sources) {
      return null;
    }
    return tuner.sources[sourceType];
  };

  proto.getChannel = function cm_getChannel(channelNumber) {
    channelNumber = channelNumber || this.playingState.channelNumber;
    var source = this.getSource();
    if (!source || !source.channelIndexHash) {
      return null;
    }
    var index = source.channelIndexHash[channelNumber];
    return source.channels[index];
  };

  /**
   * Fetch tuner, source and channel settings from URL hash. If URL hash is
   * empty, then fetch settings from asyncStorage.
   */
  proto.fetchSettingFromHash = function cm_fetchSettingFromHash(hash) {
    return new Promise(function(resolve, reject) {
      var fetch = function(hash) {
        if(hash) {
          hash = hash.substring(1).split(',');
          this.playingState = {
            tunerId: hash[0],
            sourceType: hash[1],
            channelNumber: hash[2]
          };
        }
      }.bind(this);

      if (hash) {
        fetch(hash);
        resolve();
      } else {
        asyncStorage.getItem('TV_Hash', function(item) {
          fetch(item);
          resolve();
        });
      }
    }.bind(this));
  };

  /**
   * Retrieve all the currently available TV tuners.
   */
  proto.scanTuners = function cm_scanTuners() {
    navigator.tv.getTuners().then(function onsuccess(tuners) {
      this.currentTuners = {};
      tuners.forEach(function initTuner(tuner) {
        this.currentTuners[tuner.id] = {
          tuner: tuner,
          sources: {}
        };
      }.bind(this));

      if (!this.playingState.tunerId) {
        this.playingState.tunerId = tuners[0].id;
      }

      if (!this.getTuner()) {
        this.fire('error');
        return;
      }

      this.scanSources();
    }.bind(this));
  };

  /**
   * Retrieve all the currently available TV sources from current TV tuner.
   */
  proto.scanSources = function cm_scanSources() {
    var tunerObject = this.getTuner();
    tunerObject.tuner.getSources().then(function getSources(sources) {
      tunerObject.sources = {};
      if (sources.length === 0) {
        console.error('Error, no source found!');
        return;
      }

      sources.forEach(function initSource(source) {
        tunerObject.sources[source.type] = {
          source: source,
          channels: [],
          channelIndexHash: {}
        };
      }.bind(this));

      if (!this.playingState.sourceType) {
        this.playingState.sourceType = sources[0].type;
      }

      if (!this.getSource()) {
        this.fire('error');
        return;
      }

      this.scanChannels();
    }.bind(this));
  };

  /**
   * Retrieve all the currently available TV channels from current TV source.
   * We have to scan the channels before calling getChannels.
   */
  proto.scanChannels = function cm_scanChannels() {
    var sourceObject = this.getSource();
    sourceObject.source.getChannels().then(function onsuccess(channels) {
      sourceObject.channels = [];
      sourceObject.channelIndexHash = {};
      if (channels.length === 0) {
        console.error('Error, no channel found!');
        return;
      }

      var i;
      for (i = 0; i < channels.length; i++) {
        sourceObject.channelIndexHash[channels[i].number] = i;
        sourceObject.channels[i] = {
          channel: channels[i],
          programs: [],
        };
      }

      if (!this.playingState.channelNumber) {
        this.playingState.channelNumber = channels[0].number;
      }

      if (!this.getChannel()) {
        this.fire('error');
        return;
      }

      this.isReady = true;
      this.fire('scanned');
    }.bind(this), function onerror(error) {
      console.error(error);
    });
  };

  proto.setPlayingSource = function cm_setPlayingSource(callback) {
    var tunerObject = this.getTuner();
    if (tunerObject.tuner.currentSource === this.getSource().source) {
      this.setPlayingChannel(callback);
      return;
    }

    tunerObject.tuner.setCurrentSource(this.playingState.sourceType)
      .then(function() {
        this.setPlayingChannel(callback);
      }.bind(this), function() {
        console.error('Source not found');
      });
  };

  proto.setPlayingChannel = function cm_setPlayingChannel(callback) {
    if (this.getSource().source.isScanning) {
      if (callback) {
        callback();
      }
      console.error('Source is still scanning.');
      return;
    }

    this.getSource().source.setCurrentChannel(this.playingState.channelNumber)
      .then(function() {
        if (callback) {
          callback();
        }
      }.bind(this), function() {
        console.error('Channel not found');
      });
  };

  proto.switchChannel = function cm_switchChannel(direction) {
    if (!this.getChannel() || !this.isReady) {
      return false;
    }

    var channelList = this.getSource().channels;
    var channelIndex = this.getSource()
                           .channelIndexHash[this.playingState.channelNumber];
    if (channelIndex!== 0 && !channelIndex) {
      return false;
    }

    switch(direction) {
      case ChannelManager.KEY_UP:
        channelIndex++;
        break;
      case ChannelManager.KEY_DOWN:
        channelIndex--;
        break;
      default:
        return;
    }

    channelIndex = (channelIndex < 0) ? channelList.length - 1 : channelIndex;
    channelIndex = (channelIndex > channelList.length - 1) ? 0 : channelIndex;
    this.playingState.channelNumber = channelList[channelIndex].channel.number;
    return true;
  };

  ChannelManager.KEY_UP = 'up';
  ChannelManager.KEY_DOWN = 'down';
  ChannelManager.prototype = proto;
  exports.ChannelManager = ChannelManager;
})(window);
