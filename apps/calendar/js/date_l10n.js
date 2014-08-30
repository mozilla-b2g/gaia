(function(exports) {
'use strict';

/**
 * Localizes all elements with data-l10n-date-format.
 */
exports.localizeElements = function() {
  var elements = document.querySelectorAll('[data-l10n-date-format]');
  for (var i = 0; i < elements.length; i++) {
    exports.localizeElement(elements[i]);
  }
};

/**
 * Localize a single element expected to have data-l10n-date-format.
 */
exports.localizeElement = function(element) {
  var date = element.dataset.date;
  if (!date) {
    return;
  }

  var l10n = navigator.mozL10n;
  var format = l10n.get(element.dataset.l10nDateFormat);
  element.textContent = l10n.DateTimeFormat().localeFormat(
    new Date(date),
    format
  );
};

}(Calendar.dateL10n = {}));
