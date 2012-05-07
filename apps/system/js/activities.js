/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Activities = {
  get element() {
    delete this.element;
    return this.element = document.getElementById('activities');
  },

  get visible() {
    return this.element.classList.contains('visible');
  },

  get list() {
    delete this.list;
    return this.list = this.element.querySelector('.overlay-menu');
  },

  init: function act_init() {
    window.addEventListener('mozChromeEvent', this);
    this.element.addEventListener('click', this);
  },

  handleEvent: function act_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        var choice = evt.target.dataset.choice || null;
        this.choose(choice);
        break;
      case 'mozChromeEvent':
        var detail = evt.detail;
        if (detail.type !== 'activity-choice')
          return;

        this.list.innerHTML = this._listFragment(detail.choices);
        this._id = detail.id;
        this.show();
        break;
    }
  },

  show: function act_show() {
    this.element.classList.add('visible');
  },

  hide: function act_hide() {
    this.element.classList.remove('visible');
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
    this.hide();
  },

  _listFragment: function act_listFragment(choices) {
    var result = '';
    choices.forEach(function(choice, index) {
      result += '<div data-choice="' + index + '">' + choice + '</div>';
    });
    result += '<div>Cancel</div>';

    return result;
  }
};

Activities.init();
