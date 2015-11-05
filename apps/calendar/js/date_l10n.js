define(function(require, exports) {
'use strict';

var IntlHelper = require('shared/intl_helper');

/**
 * Observes localized events and localizes elements
 * with data-l10n-date-format should be registered
 * after the first localized event.
 *
 *
 * Example:
 *
 *
 *    <span
 *      data-date="Wed Jan 09 2013 19:25:38 GMT+0100 (CET)"
 *      data-l10n-date-format="%x">
 *
 *      2013/9/19
 *
 *    </span>
 *
 */

exports.init = function() {
  window.addEventListener('localized', exports._localizeElements);
  window.addEventListener('timeformatchange', exports._localizeElements);
};

/**
 * Localizes all elements with data-l10n-date-format.
 */
exports._localizeElements = function() {
  var elements = document.querySelectorAll('[data-l10n-date-format]');
  for (var i = 0; i < elements.length; i++) {
    exports._localizeElement(elements[i]);
  }
};

/**
 * Localize a single element expected to have data-l10n-date-format.
 */
exports._localizeElement = function(element) {
  var date = element.dataset.date;
  if (!date) {
    return;
  }

  var format = element.dataset.l10nDateFormat;
  var formatter = IntlHelper.get(format);
  var text;

  if (format === 'week-hour-format') {
    text = formatter.format(new Date(date), {
      dayperiod: '<span class="ampm" aria-hidden="true">$&</span>',
    });
  } else {
    text = formatter.format(new Date(date));
  }

  element.textContent = text;
};

});
