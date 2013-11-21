/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Activities = {
  init: function act_init() {
    window.addEventListener('mozChromeEvent', this);
  },

  handleEvent: function act_handleEvent(evt) {
    switch (evt.type) {
      case 'mozChromeEvent':
        var detail = evt.detail;
        switch (detail.type) {
          case 'activity-choice':
            this.chooseActivity(detail);
            break;
        }
        break;
    }
  },

  chooseActivity: function chooseActivity(detail) {
    this._id = detail.id;

    var choices = detail.choices;
    if (choices.length === 1) {
      this.choose('0');
    } else {
      // Since the mozChromeEvent could be triggered by a 'click', and gecko
      // event are synchronous make sure to exit the event loop before
      // showing the list.
      setTimeout((function nextTick() {
        // Bug 852785: force the keyboard to close before the activity menu
        // shows
        dispatchEvent(new CustomEvent('activitymenuwillopen'));

        var activityName = navigator.mozL10n.get('activity-' + detail.name);
        ActionMenu.open(this._listItems(choices), activityName,
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
      var app = Applications.getByManifestURL(choice.manifest);
      if (!app)
        return;

      items.push({
        label: new ManifestHelper(app.manifest).name,
        icon: choice.icon,
        value: index
      });
    });

    return items;
  }
};

Activities.init();
