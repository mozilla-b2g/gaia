/* exported LocalizationHelper */
(function(exports) {
  'use strict';

  /**
   * Look for attachment iframes and localize them - mozL10n doesn't do this
   * XXX: remove once bug 1020130 is fixed
   */
  function localizeAttachmentIFrames() {
    var attachmentContainers = document.querySelectorAll(
      'iframe.attachment-container'
    );

    Array.forEach(attachmentContainers, function(attachmentContainer) {
      var doc = attachmentContainer.contentDocument;
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
    var dateTimeElements = document.querySelectorAll('.l10n-contains-date');

    Array.forEach(dateTimeElements, function(element) {
      if (!element.dataset.l10nDate) {
        return;
      }

      var formatL10nId = element.dataset.l10nDateFormat;

      if (!formatL10nId) {
        return;
      }

      formatL10nId = JSON.parse(formatL10nId);

      if (isTimeFormatChanged && !formatL10nId.hour) {
        return;
      }
      formatL10nId.hour12 = navigator.mozHour12;

      var formatter = new Intl.DateTimeFormat(
        navigator.languages, formatL10nId
      );
      var localeData = formatter.format(new Date(+element.dataset.l10nDate));

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

  exports.LocalizationHelper = {
    init: function () {
      // This will be called during startup, and every time the language is
      // changed
      navigator.mozL10n.ready(function localized() {
        localizeAttachmentIFrames();
        localizeDateTime();
      });

      // This event is fired when time format (12h/24h) is changed
      window.addEventListener(
        'timeformatchange',
        localizeDateTime.bind(null, /* isTimeFormatChanged */ true)
      );
    }
  };
})(window);
