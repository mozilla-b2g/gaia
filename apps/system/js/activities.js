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

    ListMenu.request(this._listItems(detail.choices), this.choose.bind(this));
    this._id = detail.id;
  },

  choose: function act_choose(choice) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentEvent', true, true, {
      id: this._id,
      type: 'activity-choice',
      value: choice
    });
    window.dispatchEvent(event);

    delete this._id;
  },

  _listItems: function act_listItems(choices) {
    var items = [];

    choices.forEach(function(choice, index) {
      items.push({label: choice.title,
                  icon: choice.icon,
                  value: index
      });
    });

    return items;
  }
};

Activities.init();
