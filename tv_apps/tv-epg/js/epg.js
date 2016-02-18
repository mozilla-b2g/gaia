/* global Clock, EPGController, SpatialNavigator, KeyNavigationAdapter,
          ContextMenu */

'use strict';

(function(exports) {
  function EPG() {
    this._fetchElement();

    // Unit of EPG timeline is 30 min
    this.timelineUnit = 30 * 60000;

    // Time when EPG is opened. It is used as a reference for setting left
    // attribute of program list and timeline
    this.initialTime = Math.floor(Date.now() / this.timelineUnit);

    // Time offset represents the most left visible time in program container
    this.visibleTimeOffset = this.initialTime;

    // Number of timeslot that can be shown in program container
    this.visibleTimeSize = 4;

    // Channel offset represents the first visible channel in program container
    this.visibleChannelOffset = 0;

    // Number of channel that can be shown in program container
    this.visibleChannelSize = 5;

    this.translate = {
      x: 0,
      y: 0
    };

    this.keyNavigatorAdapter = new KeyNavigationAdapter();
    this.keyNavigatorAdapter.init();
    this.keyNavigatorAdapter.on('move', this._onMove.bind(this));

    this.spatialNavigator = new SpatialNavigator([], {
      ignoreHiddenElement: true
    });
    this.spatialNavigator.on('focus', this._onFocus.bind(this));
    this.spatialNavigator.on('unfocus', this._onUnfocus.bind(this));

    this.epgController = new EPGController(
      this.visibleTimeOffset - this.visibleTimeSize,
      this.timelineUnit
    );

    this.clock = new Clock();
    this.clock.start(this._updateClock.bind(this));

    document.addEventListener('DOMRetranslated', () => {
      this.clock.stop();
      this.clock.start(this._updateClock.bind(this));
    }); 

    navigator.mozApps.getSelf().onsuccess = function(evt){
      if (evt.target && evt.target.result) {
        this.contextmenu = new ContextMenu([{
          element: document.getElementById('pin-button-contextmenu'),
          hasText: true
        }], evt.target.result);
      }
    }.bind(this);

    this.epgController.on('scanned', this._onScanned.bind(this));
    this.epgController.on('appendChannel', this._appendChannel.bind(this));
    this.epgController.on('updateProgram', this._updateProgramSlot.bind(this));
    this.epgController.on('addTimeline', this._addTimeline.bind(this));
    this.epgController.on(
      'allTimelineAdded', this._allTimelineAdded.bind(this));
    this.epgController.on(
      'allChannelFetched', this._allChannelFetched.bind(this));
  }

  var proto = {};

  proto._fetchElement = function epg__fetchElement(){
    this.timeElement = document.getElementById('time');
    this.dateElement = document.getElementById('date');
    this.videoElement = document.getElementById('video-thumbnail');
    this.timelineElement = document.getElementById('timeline');
    this.timeMarkerElement = document.getElementById('time-marker');
    this.timePrefixElement = document.getElementById('time-prefix');
    this.channelListElement = document.getElementById('channel-list');
    this.programListElement = document.getElementById('program-list');
    this.programMetaElement = document.getElementById('program-meta');
    this.progressBarElement = document.getElementById('progress-bar');
    this.programTitleElement = document.getElementById('program-title');
    this.programDetailElement = document.getElementById('program-detail');
    this.timeMarkerContainerElement =
      document.getElementById('time-marker-container');
  };

  /**
   * Align timelineOffset and use it as x-axis translate reference point
   */
  proto._allTimelineAdded = function epg__allTimelineAdded() {
    var timeDiff = this.initialTime - this.epgController.timelineOffset;
    this.timelineElement.style.left =
      (-timeDiff * EPG.COLUMN_WIDTH) + 'rem';
    this.programListElement.style.left =
      (-timeDiff * EPG.COLUMN_WIDTH) + 'rem';
  };

  /**
   * Align channelOffset and use it as y-axis translate reference point
   */
  proto._allChannelFetched = function epg__allChannelFetched() {
    this.visibleChannelOffset = this.epgController.channelOffset;
    this.channelListElement.style.top =
      (-this.visibleChannelOffset * EPG.ROW_HEIGHT) + 'rem';
    this.programListElement.style.top =
      (-this.visibleChannelOffset * EPG.ROW_HEIGHT) + 'rem';
  };

  proto._onScanned = function epg__onScanned(stream) {
    this.videoElement.mozSrcObject = stream;
    this.epgController.fetchPrograms(
      this.visibleTimeOffset - this.visibleTimeSize,
      3 * this.visibleTimeSize
    ).then(function() {
      var timeIndex =
        this.visibleTimeOffset - this.epgController.timelineOffset;
      var programElement =
        this.epgController.programTable[timeIndex][this.visibleChannelOffset]
            .element;
      this.spatialNavigator.focus(programElement);
      this._updateProgramProgress(this._currentTime);
      this._updateDate(this.visibleTimeOffset * this.timelineUnit);
    }.bind(this)).catch(function(err) {
      console.error(err);
    });
  };

  /**
   * Add one more timeslot to timeline element.
   */
  proto._addTimeline = function epg__addTimeline(index, time) {
    var timeSlotElement = document.createElement('LI');
    timeSlotElement.textContent = this._timeToString(time).timeWithPrefix;
    if (index < this.timelineElement.children.length) {
      this.timelineElement.insertBefore(
        timeSlotElement, this.timelineElement.children[index]);
    } else {
      this.timelineElement.appendChild(timeSlotElement);
    }
    this._addProgramSlot(index, time / this.timelineUnit);
  };

  /**
   * Add one more timeslot for every channels to program list.
   */
  proto._addProgramSlot = function epg__addProgramSlot(index, time) {
    var rowElement;
    var programElement;
    var i;
    for (i = 0; i < this.programListElement.children.length; i++) {
      rowElement = this.programListElement.children[i];
      programElement = document.createElement('epg-program');
      programElement.startTime = time;
      if (index < this.timelineElement.children.length) {
        rowElement.insertBefore(programElement, rowElement.children[index]);
      } else {
        rowElement.appendChild(programElement);
      }
    }
  };

  /**
   * Create channel elements for input channel
   */
  proto._appendChannel = function epg__appendChannel(channel, index) {
    var channelElement = document.createElement('LI');
    var channelTitle = document.createElement('SPAN');
    channelTitle.classList.add('title');
    channelTitle.textContent = channel.name;
    channelElement.textContent = channel.number;
    channelElement.appendChild(channelTitle);
    this.channelListElement.appendChild(channelElement);

    var programRow = document.createElement('UL');
    programRow.dataset.row = index;

    this.channelListElement.appendChild(channelElement);
    this.programListElement.appendChild(programRow);
  };

  proto._updateProgramSlot = function epg__updateProgramSlot(configs) {
    var rowElement = this.programListElement.children[configs.row];
    var programElement = rowElement.children[configs.column];
    var duration = programElement.duration;

    if (configs.title) {
      programElement.title = configs.title;
    }

    if (configs.duration) {
      duration = configs.duration;
      programElement.duration = duration;
    }

    if (configs.isVisible) {
      programElement.show();
      this.spatialNavigator.add(programElement);
      programElement.resetProgressElement(this.initialTime);
    } else {
      programElement.hide();
      // If the old focus element only contains partial program segment, we have
      // to refocus to the first visible element of the same program.
      if (programElement === this.spatialNavigator.getFocusedElement()) {
        this.spatialNavigator.focus(
          this.epgController.programTable[configs.column][configs.row].element);
      }
      this.spatialNavigator.remove(programElement);
    }

    if (configs.item) {
      configs.item.element = programElement;
    }
  };

  proto._updateClock = function epg_updateClock(date) {
    var timeString = this._timeToString(date);
    this.timePrefixElement.textContent = timeString.prefix;
    this.timeElement.textContent = timeString.time;
    this._currentTime = new Date(date).getTime();
    this._updateProgramProgress(this._currentTime);
  };

  proto._updateProgramProgress = function epg__updateProgramProgress(time) {
    var timeIndex =
      Math.floor(time / this.timelineUnit) - this.epgController.timelineOffset;
    var playingPrograms = this.epgController.programTable[timeIndex];
    var prevPrograms = this.epgController.programTable[timeIndex - 1];
    var row;
    var programElement;

    // Update progress bar in every currently playing program
    for (row in playingPrograms) {
      programElement = playingPrograms[row].element;
      programElement.progress = time / this.timelineUnit;
      this.timeMarkerElement.style.transform =
        'translateX(' +
        ((time / this.timelineUnit - this.initialTime) * EPG.COLUMN_WIDTH) +
        'rem)';

      // Privous program may not be 100% filled because because of little
      // variance of timestamp
      if (prevPrograms && prevPrograms[row] &&
          programElement !== prevPrograms[row].element) {
        programElement = prevPrograms[row].element;
        programElement.fillProgress();
      }
    }

    programElement = this.spatialNavigator.getFocusedElement();
    if (programElement) {
      this.progressBarElement.style.transform =
        programElement.progressElement.style.transform;
    }
  };

  proto._timeToString = function epg__timeToString(time) {
    var formatter = new Intl.DateTimeFormat(navigator.languages, {
      hour: 'numeric',
      minute: 'numeric',
      hour12: window.navigator.mozHour12
    });
    var now = new Date(time);

    var parts = formatter.formatToParts(now);

    var dayperiod = parts.find(part => part.type == 'dayperiod');

    var prefix = dayperiod ? dayperiod.value : '';

    var timeWithoutDayPeriod = parts.map(({type, value}) => {
      return type === 'dayperiod' ? '' : value;
    }).join('');

    return {
      prefix: prefix,
      time: timeWithoutDayPeriod,
      timeWithPrefix: formatter.format(now)
    };
  };

  proto._onFocus = function epg__onFocus(programElement) {
    var rowElement = programElement.parentElement;
    var rowIndex = parseInt(rowElement.dataset.row, 10);
    var rowOffset = this.epgController.channelOffset;

    var startTime = programElement.startTime;
    var timelineOffset = this.epgController.timelineOffset;
    programElement.classList.add('focus');
    rowElement.classList.remove('hidden');
    this._setTitlePadding({
      setToNull: true
    });

    this._displayProgramInfo(
      startTime - this.epgController.timelineOffset, rowIndex);
    this.epgController.switchChannel(rowIndex);
    this.progressBarElement.style.transform =
      programElement.progressElement.style.transform;

    if (rowIndex < this.visibleChannelOffset) {
      // Move up
      this.translate.y = (rowOffset - rowIndex) * EPG.ROW_HEIGHT;
      this.visibleChannelOffset = rowIndex;
    } else if (rowIndex >=
               this.visibleChannelOffset + this.visibleChannelSize ) {
      // Move down
      this.translate.y =
        (rowOffset + this.visibleChannelSize - rowIndex - 1) * EPG.ROW_HEIGHT;
      this.visibleChannelOffset = rowIndex - this.visibleChannelSize + 1;
    }

    if (startTime < this.visibleTimeOffset ||
        startTime >= (this.visibleTimeOffset + this.visibleTimeSize)) {
      // Move left and right
      this.translate.x = (this.initialTime - startTime) * EPG.COLUMN_WIDTH;
      this.visibleTimeOffset = startTime;
      this._updateDate(startTime * this.timelineUnit);
    }
    this._setTitlePadding();

    // Prefetch more older programs
    if (this.visibleTimeOffset - 2 * this.visibleTimeSize < timelineOffset) {
      this.epgController.fetchPrograms(
        timelineOffset - 2 * this.visibleTimeSize,
        2 * this.visibleTimeSize
      ).then(function() {
        this._updateProgramProgress.bind(this._currentTime);
      }.bind(this)).catch(function(err) {
        console.error(err);
      });
    }

    // Prefetch more future programs
    if (this.visibleTimeOffset + 2 * this.visibleTimeSize >
        timelineOffset + this.epgController.totalTimeslotCount) {
      this.epgController.fetchPrograms(
        timelineOffset + this.epgController.totalTimeslotCount,
        2 * this.visibleTimeSize
      ).then(function() {
        this._updateProgramProgress.bind(this._currentTime);
      }.bind(this)).catch(function(err) {
        console.error(err);
      });
    }

    this.channelListElement.style.transform =
      'translateY(' + this.translate.y + 'rem) translateZ(0.01rem)';
    this.timelineElement.style.transform =
      'translateX(' + this.translate.x + 'rem) translateZ(0.01rem)';
    this.programListElement.style.transform =
      'translate(' + this.translate.x + 'rem,' + this.translate.y +
      'rem) translateZ(0.01rem)';
    // Move left instead of translateX in order to disable OMTA and sync with
    // timelineElement and programListElement
    this.timeMarkerContainerElement.style.left = this.translate.x + 'rem';
  };

  /**
   * For every visible programs in the first column, it has to be aligned to
   * the left edge of visible window. If opts.setToNull is true, then the
   * left-padding of each program will be cleared.
   */
  proto._setTitlePadding = function epg__setTitlePadding(opts) {
    var rowOffset = this.visibleChannelOffset;
    var size = this.visibleChannelSize;
    var row;
    var timeOffset = this.visibleTimeOffset - this.epgController.timelineOffset;
    var programElement;
    for(row = rowOffset; row < rowOffset + size; row++) {
      if (this.epgController.programTable[timeOffset][row]) {
        programElement =
          this.epgController.programTable[timeOffset][row].element;
        if (opts && opts.setToNull) {
          programElement.titlePadding = null;
        } else {
          programElement.titlePadding = EPG.COLUMN_WIDTH *
            (this.visibleTimeOffset - programElement.startTime) + 'rem';
        }
      }
    }
  };

  proto._displayProgramInfo = function epg__displayProgramInfo(column, row) {
    var program = this.epgController.programTable[column][row].program;
    this.programTitleElement.textContent = program.title;
    this.programDetailElement.textContent = program.description;

    this.programMetaElement.innerHTML = '';

    var timeIntervalElement = document.createElement('LI');
    var timeText = this._timeToString(program.startTime).timeWithPrefix;
    timeText += ' - ';
    timeText +=
      this._timeToString(program.startTime + program.duration).timeWithPrefix;
    timeIntervalElement.textContent = timeText;
    this.programMetaElement.appendChild(timeIntervalElement);
  };

  proto._updateDate = function epg__updateDate(time) {
    var now = new Date(time);

    return now.toLocaleString(navigator.languages, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  proto._onUnfocus = function epg__onUnfocus(programElement) {
    programElement.classList.remove('focus');
  };

  proto._onMove = function epg__onMove(key) {
    this.spatialNavigator.move(key);
  };

  EPG.ROW_HEIGHT = 11.5;
  EPG.COLUMN_WIDTH = 33.8;
  EPG.COLUMN_MARGIN = 0.3;

  exports.EPG = EPG;
  EPG.prototype = proto;
})(window);
