/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Activities = {
  init: function act_init() {
    window.addEventListener('mozChromeEvent', this);
    window.addEventListener('home', this);
    window.addEventListener('holdhome', this);
  },

  handleEvent: function act_handleEvent(evt) {
    switch (evt.type) {
      case 'mozChromeEvent':
        var detail = evt.detail;
        switch (detail.type) {
          case 'activity-choice':
            this.chooseActivity(detail);
            break;

          case 'activity-done':
            this.reopenActivityCaller(detail);
            break;
        }
        break;
      case 'home':
        if (this._callerApp)
          this._callerApp = null;
        break;
      case 'holdhome':
        if (this._callerApp)
          this._callerApp = null;
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
    this._callerApp = WindowManager.getDisplayedApp();
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

  reopenActivityCaller: function reopenActivityCaller(detail) {
    // Ask Window Manager to bring the caller to foreground.
    // inline activity frame will be removed by this action.

    // XXX: what if we have multiple web activities in-flight?
    if (!this._callerApp)
      return;

    WindowManager.launch(this._callerApp);
    delete this._callerApp;
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
