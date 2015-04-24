define(function(require, exports) {
'use strict';

var dateFormat = require('date_format');

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
  exports._setCurrentTimeFormat();

  window.addEventListener('localized', exports._localizeElements);
  window.addEventListener('timeformatchange', () => {
    exports._setCurrentTimeFormat();
    exports._changeElementsHourFormat();
  });
};

exports._setCurrentTimeFormat = function() {
  document.body.dataset.timeFormat = navigator.mozHour12 ? '12' : '24';
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

exports._changeElementsHourFormat = function() {
  var isHour12 = navigator.mozHour12;
  var previousFormat = isHour12 ? 24 : 12;
  var currentFormat = isHour12 ? 12 : 24;
  var elements = document.querySelectorAll(
    `[data-l10n-date-format*="${previousFormat}"]`
  );

  Array.prototype.forEach.call(elements, (element) => {
    var format = element.dataset.l10nDateFormat.replace(
      previousFormat,
      currentFormat
    );

    element.dataset.l10nDateFormat = format;
    // Remove leading zero of hour items in day, week view sidebars.
    exports._localizeElement(element, {
      addAmPmClass: format === 'week-hour-format12',
      removeLeadingZero: format.contains('hour-format')
    });
  });
};

/**
 * Localize a single element expected to have data-l10n-date-format.
 *
 * Options:
 *
 *   (Boolean) addAmPmClass
 *   (Boolean) removeLeadingZero
 */
exports._localizeElement = function(element, options) {
  var date = element.dataset.date;
  if (!date) {
    return;
  }

  var l10n = navigator.mozL10n;
  var format = l10n.get(element.dataset.l10nDateFormat);
  if (options && options.addAmPmClass) {
    // developer.mozilla.org/docs/Mozilla/Localization/Localization_best_practices#Avoid_unnecessary_complexity_in_strings
    format = format.replace(/\s*%p\s*/, '<span class="ampm">%p</span>');
  }

  var text = dateFormat.localeFormat(new Date(date), format);
  if (options && options.removeLeadingZero) {
    text = text.replace(/^0/, '');
  }

  element.textContent = text;
};

});
