/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/* We will get this const definition from shared/js/keyboard_helper.js
const TYPE_GROUP = {
  'text': true,
  'number': true,
  'option': true
}

const SETTINGS_KEY = 'keyboard.enabled-layouts';
*/

var KeyboardLayout = {
  keyboardLayouts: {},

  init: function kl_init() {
    this.getAllElements();
    KeyboardHelper.getAllLayouts(this.makeLayoutList.bind(this));
    Settings.mozSettings.addObserver('keyboard.enabled-layouts',
        this.updateList.bind(this));
  },

  getAllElements: function kl_getAllElements() {
    for (var type in TYPE_GROUP) {
      var key = type + 'LayoutList';
      this[key] = document.getElementById(key);
    }
  },

  makeLayoutList: function kl_makeLayoutList(allLayouts) {
    this.keyboardLayouts = allLayouts;
    // make lists
    for (var type in TYPE_GROUP) {
      var listElement = this[type + 'LayoutList'].querySelector('ul');
      var layouts = this.keyboardLayouts[type];

      this.clearLayoutList(listElement);
      for (var i in layouts) {
        var aItem = this.newLayoutItem(type, i, layouts[i]);
        listElement.appendChild(aItem);
      }
      // all lists are default hidden, we will show the list only when
      // there are more than one layouts for the user configure.
      this[type + 'LayoutList'].hidden = (layouts.length <= 1);
    }
  },

  updateList: function kl_updateList(evt) {
    this.makeLayoutList(JSON.parse(evt.settingValue));
  },

  newLayoutItem: function kl_appendLayout(type, index, layout) {
    var layoutName = document.createElement('a');
    //XXX we should display an unique name here, not just layout name.
    layoutName.textContent = layout.name;

    var label = document.createElement('label');
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.type = type;
    checkbox.dataset.index = index;
    checkbox.checked = layout.enabled;
    checkbox.addEventListener('change', this);
    var span = document.createElement('span');

    label.appendChild(checkbox);
    label.appendChild(span);

    var li = document.createElement('li');
    li.appendChild(label);
    li.appendChild(layoutName);
    return li;
  },

  clearLayoutList: function kl_clearLayoutList(list) {
    while (list.hasChildNodes()) {
      list.removeChild(list.lastChild);
    }
  },

  handleEvent: function kl_handleEvent(evt) {
    if (evt.target.type !== 'checkbox')
      return;
    // TODO should check if this is the last one
    // if yes, prevent it to be disabled.
    var checkbox = evt.target;
    var layoutType = checkbox.dataset.type;
    var layoutIndex = checkbox.dataset.index;
    this.keyboardLayouts[layoutType][layoutIndex].enabled = checkbox.checked;

    var obj = {};
    obj[SETTINGS_KEY] = JSON.stringify(this.keyboardLayouts);
    Settings.mozSettings.createLock().set(obj);
  }
};

navigator.mozL10n.ready(KeyboardLayout.init.bind(KeyboardLayout));
