/* global Clock, EPGController */

'use strict';

(function(exports) {

  function EPG() {
    this._fetchElement();

    // Unit of EPG timeline is 30 min
    this.timelineUnit = 30 * 60000;

    // Time offset represents the most left visible time in program container
    this.visibleTimeOffset = Math.floor(Date.now() / this.timelineUnit);

    // Number of timeslot that can be shown in program container
    this.visibleTimeSize = 4;

    this.dateFormatter = new window.navigator.mozL10n.DateTimeFormat();

    this.clock = new Clock();
    this.clock.start(this._updateClock.bind(this));

    this.epgController = new EPGController(
      this.visibleTimeOffset - this.visibleTimeSize,
      this.timelineUnit
    );
    this.epgController.on('scanned', this._onScanned.bind(this));
    this.epgController.on('appendChannel', this._appendChannel.bind(this));
    this.epgController.on('updateProgram', this._updateProgramSlot.bind(this));
    this.epgController.on('addTimeline', this._addTimeline.bind(this));
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

  proto._onScanned = function epg__onScanned(stream) {
    this.videoElement.src = stream;
    this.epgController.fetchPrograms(
      this.visibleTimeOffset - this.visibleTimeSize, 3 * this.visibleTimeSize);
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
    this._addProgramSlot(index);
  };

  /**
   * Add one more timeslot for every channels to program list.
   */
  proto._addProgramSlot = function epg__addProgramSlot(index) {
    var rowElement;
    var columnElement;
    var i;
    for (i = 0; i < this.programListElement.children.length; i++) {
      rowElement = this.programListElement.children[i];
      columnElement = document.createElement('LI');
      columnElement.dataset.duration = '1';
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
  proto._appendChannel = function epg__appendChannel(channel) {
    var channelElement = document.createElement('LI');
    var channelTitle = document.createElement('SPAN');
    channelTitle.classList.add('title');
    channelTitle.textContent = channel.name;
    channelElement.textContent = channel.number;
    channelElement.appendChild(channelTitle);
    this.channelListElement.appendChild(channelElement);

    var programRow = document.createElement('UL');
    this.programListElement.appendChild(programRow);
  };

  proto._updateProgramSlot = function epg__updateProgramSlot(configs) {
    var rowElement = this.programListElement.children[configs.row];
    var columnElement = rowElement.children[configs.column];
    if (configs.title) {
      columnElement.textContent = configs.title;
    }
    if (configs.isVisible) {
      columnElement.classList.remove('hidden');
    } else {
      columnElement.classList.add('hidden');
    }
    if (configs.duration) {
      columnElement.dataset.duration = configs.duration;
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

  exports.EPG = EPG;
  EPG.prototype = proto;
})(window);
