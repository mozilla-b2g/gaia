/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Activities = {
  init: function act_init() {
    window.addEventListener('mozChromeEvent', this);
  },

  handleEvent: function act_handleEvent(evt) {
    if (evt.type !== 'mozChromeEvent')
      return;

    var detail = evt.detail;
    if (detail.type !== 'activity-choice')
      return;

    this._id = detail.id;

    var choices = detail.choices;
    if (choices.length === 1) {
      this.choose('0');
    } else {
      // Since the mozChromeEvent could be triggered by a 'click', and gecko
      // event are synchronous make sure to exit the event loop before
      // showing the list.
      setTimeout((function nextTick() {
        // XXX: l10n issue of activity name
        ListMenu.request(this._listItems(choices), detail.name,
                         this.choose.bind(this), this.cancel.bind(this));
      }).bind(this));
    }
  },

  choose: function act_choose(choice) {
    var returnedChoice = {
      id: this._id,
      type: 'activity-choice',
      value: choice
    };

    this._sendEvent(returnedChoice);
    delete this._id;
  },

  cancel: function act_cancel(value) {
    var returnedChoice = {
      id: this._id,
      type: 'activity-choice',
      value: -1
    };

    this._sendEvent(returnedChoice);
    delete this._id;
  },

  _sendEvent: function act_sendEvent(value) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentEvent', true, true, value);
    window.dispatchEvent(event);
  },

  _listItems: function act_listItems(choices) {
    var items = [];

    choices.forEach(function(choice, index) {
      items.push({
        label: choice.title,
        icon: choice.icon,
        value: index
      });
    });

    return items;
  }
};

Activities.init();
