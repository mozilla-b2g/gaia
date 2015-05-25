/* global Clock, EPGController, SpatialNavigator, KeyNavigationAdapter */

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

    this.dateFormatter = new window.navigator.mozL10n.DateTimeFormat();

    this.clock = new Clock();
    this.clock.start(this._updateClock.bind(this));

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
    this.timePrefixElement = document.getElementById('time-prefix');
    this.channelListElement = document.getElementById('channel-list');
    this.programListElement = document.getElementById('program-list');
    this.programTitleElement = document.getElementById('program-title');
    this.programDetailElement = document.getElementById('program-detail');
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
    this.videoElement.src = stream;
    this.epgController.fetchPrograms(
      this.visibleTimeOffset - this.visibleTimeSize, 3 * this.visibleTimeSize)
      .then(function() {
        var timeIndex =
          this.visibleTimeOffset - this.epgController.timelineOffset;
        var programElement =
          this.epgController.programTable[timeIndex][this.visibleChannelOffset]
              .element;
        this.spatialNavigator.focus(programElement);
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
    var columnElement;
    var textElement;
    var i;
    for (i = 0; i < this.programListElement.children.length; i++) {
      rowElement = this.programListElement.children[i];
      columnElement = document.createElement('LI');
      columnElement.dataset.duration = '1';
      columnElement.dataset.startTime = time;
      textElement = document.createElement('DIV');
      columnElement.appendChild(textElement);
      if (index < this.timelineElement.children.length) {
        rowElement.insertBefore(columnElement, rowElement.children[index]);
      } else {
        rowElement.appendChild(columnElement);
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
    var columnElement = rowElement.children[configs.column];
    if (configs.title) {
      columnElement.firstElementChild.textContent = configs.title;
    }
    if (configs.isVisible) {
      columnElement.classList.remove('hidden');
      this.spatialNavigator.add(columnElement);
    } else {
      columnElement.classList.add('hidden');
      // If the old focus element only contains partial program segment, we have
      // to refocus to the first visible element of the same program.
      if (columnElement === this.spatialNavigator.getFocusedElement()) {
        this.spatialNavigator.focus(
          this.epgController.programTable[configs.column][configs.row].element);
      }
      this.spatialNavigator.remove(columnElement);
    }
    if (configs.duration) {
      columnElement.dataset.duration = configs.duration;
    }
    if (configs.item) {
      configs.item.element = columnElement;
    }
  };

  proto._updateClock = function epg_updateClock(date) {
    var timeString = this._timeToString(date);
    this.timePrefixElement.textContent = timeString.prefix;
    this.timeElement.textContent = timeString.time;
  };

  proto._timeToString = function epg__timeToString(time) {
    var now = new Date(time);
    var _ = navigator.mozL10n.get;
    var use12Hour = window.navigator.mozHour12;
    var f = new navigator.mozL10n.DateTimeFormat();
    var timeFormat = use12Hour ? _('shortTimeFormat12') :
                                 _('shortTimeFormat24');
    timeFormat = timeFormat.replace('%p', '').trim();
    var formatted = f.localeFormat(now, timeFormat);

    var prefix = use12Hour ? f.localeFormat(now, '%p') : '';
    return {
      prefix: prefix,
      time: formatted,
      timeWithPrefix: formatted + prefix
    };
  };

  proto._onFocus = function epg__onFocus(element) {
    var rowElement = element.parentElement;
    var rowIndex = parseInt(rowElement.dataset.row, 10);
    var rowOffset = this.epgController.channelOffset;

    var startTime = parseInt(element.dataset.startTime, 10);
    var timelineOffset = this.epgController.timelineOffset;

    element.classList.add('focus');
    rowElement.classList.remove('hidden');
    this._setTitlePadding({
      setToNull: true
    });

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
    }
    this._setTitlePadding();

    // Prefetch more older programs
    if (this.visibleTimeOffset - 2 * this.visibleTimeSize < timelineOffset) {
      this.epgController.fetchPrograms(
        timelineOffset - 2 * this.visibleTimeSize, 2 * this.visibleTimeSize);
    }

    // Prefetch more future programs
    if (this.visibleTimeOffset + 2 * this.visibleTimeSize >
        timelineOffset + this.epgController.totalTimeslotCount) {
      this.epgController.fetchPrograms(
        timelineOffset + this.epgController.totalTimeslotCount,
        2 * this.visibleTimeSize
      );
    }

    this.channelListElement.style.transform =
      'translateY(' + this.translate.y + 'rem) translateZ(0.01rem)';
    this.timelineElement.style.transform =
      'translateX(' + this.translate.x + 'rem) translateZ(0.01rem)';
    this.programListElement.style.transform =
      'translate(' + this.translate.x + 'rem,' + this.translate.y +
      'rem) translateZ(0.01rem)';
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
    var programTitleElement;
    var programStartTime;
    for(row = rowOffset; row < rowOffset + size; row++) {
      if (this.epgController.programTable[timeOffset][row]) {
        programElement =
          this.epgController.programTable[timeOffset][row].element;
        programTitleElement = programElement.firstElementChild;
        if (opts && opts.setToNull) {
          programTitleElement.style.paddingLeft = null;
        } else {
          programStartTime = parseInt(programElement.dataset.startTime, 10);
          programTitleElement.style.paddingLeft =
            EPG.COLUMN_WIDTH * (this.visibleTimeOffset - programStartTime) +
            'rem';
        }
      }
    }
  };

  proto._onUnfocus = function epg__onUnfocus(element) {
    element.classList.remove('focus');
  };

  proto._onMove = function epg__onMove(key) {
    this.spatialNavigator.move(key);
  };

  EPG.ROW_HEIGHT = 11.5;
  EPG.COLUMN_WIDTH = 33.8;

  exports.EPG = EPG;
  EPG.prototype = proto;
})(window);
