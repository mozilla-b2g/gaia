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
    this.el.dataset.icon = this.model.get('icon');
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
    this.el.setAttribute('role', 'option');


    var localizedValue;
    if (data.optionsLocalizable === false) {
      localizedValue = Promise.resolve(data.value);
    } else {
      localizedValue = this.l10n.formatValue(data.value);
    }

    localizedValue.then(valueString => {
      this.l10n.setAttributes(
        this.el,
        'setting-option-' + data.title,
        { value: valueString }
      );
      this.el.innerHTML = this.template({
        titleL10n: 'data-l10n-id="' + data.title + '"',
        valueL10n: data.optionsLocalizable !== false ? 'data-l10n-id="' +
          data.value + '"' : '',
        valueText: data.optionsLocalizable === false ? data.value : '',
      });

      // Clean up
      delete this.template;

      debug('rendered (item %s)', data.key);
    });

    return this;
  },

  template: function(data) {
    return '<div class="setting_text">' +
      '<h4 class="setting_title" ' + data.titleL10n + '></h4>' +
      '<h5 class="setting_value" ' + data.valueL10n + '>' + 
        data.valueText +
      '</h5>' +
    '</div>';
  },
});

});
