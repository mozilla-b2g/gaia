/* global Utils */

/* exported LocalizationHelper */
(function(exports) {
  'use strict';

  /**
   * Look for any iframes and localize them - mozL10n doesn't do this
   * XXX: remove once bug 1020130 is fixed
   */
  function localizeIFrames() {
    Array.forEach(document.querySelectorAll('iframe'), function(iframe) {
      var doc = iframe.contentDocument;
      doc.documentElement.lang = navigator.mozL10n.language.code;
      doc.documentElement.dir = navigator.mozL10n.language.direction;
      navigator.mozL10n.translateFragment(doc.body);
    });
  }

  /**
   * Look for time elements with format and re-translate the date message.
   * More complex because the argument to the l10n string is itself a formatted
   * date using l10n.
   * @param {boolean} isTimeFormatChanged Indicates that time format has been
   * changed and we need to update only elements with time aware formats.
   */
  function localizeDateTime(isTimeFormatChanged) {
    var dateTimeElements = document.querySelectorAll(isTimeFormatChanged ?
      '.l10n-contains-date[data-l10n-date-format12][data-l10n-date-format24]' :
      '.l10n-contains-date'
    );
    Array.forEach(dateTimeElements, function(element) {
      if (!element.dataset.l10nDate) {
        return;
      }

      // If element contains time-aware format then we should respect current
      // time format setting
      var formatL10nId = element.dataset.l10nDateFormat;
      if (element.dataset.l10nDateFormat12 &&
          element.dataset.l10nDateFormat24) {
        formatL10nId = navigator.mozHour12 ?
          element.dataset.l10nDateFormat12 : element.dataset.l10nDateFormat24;
      }

      if (!formatL10nId) {
        return;
      }

      var localeData = Utils.date.format.localeFormat(
        new Date(+element.dataset.l10nDate),
        navigator.mozL10n.get(formatL10nId)
      );

      if (element.hasAttribute('data-l10n-id') &&
          element.hasAttribute('data-l10n-args')) {
        var l10nAttrs = navigator.mozL10n.getAttributes(element);
        l10nAttrs.args.date = localeData;
        navigator.mozL10n.setAttributes(element, l10nAttrs.id, l10nAttrs.args);
      } else {
        element.textContent = localeData;
      }
    });
  }

   /**
   * Re-translate the placeholder messages
   */
  function localizePlaceholders() {
    var placeholderElements = document.querySelectorAll('.js-l10n-placeholder');
    Array.forEach(placeholderElements, function(element) {
      element.dataset.placeholder = navigator.mozL10n.get(
        Utils.camelCase(element.id) + '_placeholder'
      );
    });
  }

  exports.LocalizationHelper = {
    init: function () {
      // This will be called during startup, and every time the language is
      // changed
      navigator.mozL10n.ready(function localized() {
        localizeIFrames();
        localizeDateTime();
        localizePlaceholders();
      });

      // This event is fired when time format (12h/24h) is changed
      window.addEventListener(
        'timeformatchange',
        localizeDateTime.bind(null, /* isTimeFormatChanged */ true)
      );
    }
  };
})(window);
