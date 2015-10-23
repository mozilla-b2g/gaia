/* exported LocalizationHelper */
(function(exports) {
  'use strict';

  /**
   * Look for attachment iframes and localize them - l20n.js doesn't do this
   * XXX: remove once bug 1020130 is fixed
   */
  function localizeAttachmentIFrames() {
    var attachmentContainers = Array.from(document.querySelectorAll(
      'iframe.attachment-container'
    ));

    return Promise.all(
      attachmentContainers.map(localizeAttachmentIFrame)
    );
  }

  /**
   * Localize an attachment iframe
   */
  function localizeAttachmentIFrame(attachmentContainer) {
    var doc = attachmentContainer.contentDocument;
    doc.documentElement.lang = document.documentElement.getAttribute('lang');
    doc.documentElement.dir = document.documentElement.getAttribute('dir');
    return document.l10n.translateFragment(doc.body);
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
        var l10nAttrs = document.l10n.getAttributes(element);
        l10nAttrs.args.date = localeData;
        document.l10n.setAttributes(element, l10nAttrs.id, l10nAttrs.args);
      } else {
        element.textContent = localeData;
      }
    });
  }

  exports.LocalizationHelper = {
    init: function () {
      function localize() {
        localizeDateTime();
        return localizeAttachmentIFrames();
      }

      // After startup, call localize every time the language changes
      document.addEventListener('DOMRetranslated', localize);

      // This event is fired when time format (12h/24h) is changed
      window.addEventListener(
        'timeformatchange',
        localizeDateTime.bind(null, /* isTimeFormatChanged */ true)
      );

      // Call localize during startup
      return document.l10n.ready.then(localize);
    }
  };
})(window);
