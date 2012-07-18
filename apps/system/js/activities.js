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

    var choices = detail.list.choices;
    if (choices.length === 1) {
      this.choose('0');
    } else {
      ListMenu.request(this._listItems(choices), this.choose.bind(this));
    }
  },

  choose: function act_choose(choice) {
    var event = document.createEvent('CustomEvent');
    var returnedChoice = {
      id: this._id,
      type: 'activity-choice'
    };

    // If the user cancels, the choice is -1
    returnedChoice.value = choice || '-1';

    event.initCustomEvent('mozContentEvent', true, true, returnedChoice);
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
