define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:setting');
var bind = require('lib/bind');
var View = require('view');

/**
 * Exports
 */

module.exports = View.extend({
  tag: 'li',
  name: 'setting',

  initialize: function(options) {
    this.l10n = options.l10n || navigator.mozL10n;
    this.model = options.model;
    this.model.on('change', this.render);
    this.on('destroy', this.onDestroy);
    this.el.classList.add(this.model.get('icon'));
    this.el.classList.add('test-' + this.model.get('title') + '-setting');
    bind(this.el, 'click', this.onClick);
  },

  onClick: function() {
    this.emit('click', this);
  },

  onDestroy: function() {
    this.model.off('change', this.render);
  },

  render: function() {
    var data = this.model.get();

    data.selected = this.model.selected();
    data.value = data.selected && data.selected.title;

    this.el.innerHTML = this.template(data);
    debug('rendered item %s', data.key);
    return this;
  },

  template: function(data) {
    var value;

    // some data items are not to be localized
    if (data.optionsLocalizable === false) {
      value = data.value;
    } else {
      value = this.l10n.get(data.value);
    }

    return '<div class="setting_text">' +
      '<h4 class="setting_title">' + this.l10n.get(data.title) + '</h4>' +
      '<h5 class="setting_value">' + value + '</h5>' +
    '</div>';
  },
});

});
