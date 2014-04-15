'use strict';

var Utils = {
  prettyDate: function ut_prettyDate(time) {
    var _ = navigator.mozL10n.get;
    var dtf = new navigator.mozL10n.DateTimeFormat();
    return dtf.localeFormat(new Date(time), _('shortTimeFormat'));
  },

  headerDate: function ut_headerDate(time) {
    var _ = navigator.mozL10n.get;
    var dtf = new navigator.mozL10n.DateTimeFormat();
    var today = _('today');
    var yesterday = _('yesterday');
    var diff = (Date.now() - time) / 1000;
    var day_diff = Math.floor(diff / 86400);
    if (isNaN(day_diff))
      return '(incorrect date)';
    if (day_diff < 0 || diff < 0) {
      return dtf.localeFormat(new Date(time), _('shortDateTimeFormat'));
    }
    return day_diff == 0 && today ||
      day_diff == 1 && yesterday ||
      day_diff < 6 && dtf.localeFormat(new Date(time), '%A') ||
      dtf.localeFormat(new Date(time), '%x');
  },

  getDayDate: function re_getDayDate(timestamp) {
    var date = new Date(timestamp);
    var startDate = new Date(date.getFullYear(),
                             date.getMonth(), date.getDate());
    return startDate.getTime();
  },

  getPhoneNumberPrimaryInfo: function ut_getPhoneNumberPrimaryInfo(matchingTel,
                                                                   contact) {
    if (contact) {
      if (contact.name && contact.name.length && contact.name[0] !== '') {
        return contact.name;
      } else if (contact.org && contact.org.length && contact.org[0] !== '') {
        return contact.org;
      }
    }
    if (matchingTel) {
      return matchingTel.value;
    }
    return null;
  },

  toCamelCase: function ut_toCamelCase(str) {
    return str.replace(/\-(.)/g, function replacer(str, p1) {
      return p1.toUpperCase();
    });
  },

  /**
   * In case of a call linked to a contact, the additional information of the
   * phone number subject of the call consists in the type and carrier
   * associated with this phone number.
   *
   * Each call is associated with an *unique number* and this phone number can
   * belong to n specific contact(s). We don't care about the contact having
   * more than one phone number, as we are only interested in the additional
   * information of the current call that is associated with *one and only one*
   * phone number.
   *
   * The type of the phone number will be localized if we have a matching key.
   */
  getPhoneNumberAdditionalInfo:
    function ut_getPhoneNumberAdditionalInfo(matchingTel) {
    var number = matchingTel.number || matchingTel.value;
    if (!number) {
      return;
    }
    var carrier = matchingTel.carrier;
    // In case that there is no stored type for this number, we default to
    // "Mobile".
    var type = matchingTel.type;
    if (Array.isArray(type)) {
      type = type[0];
    }

    var _ = navigator.mozL10n.get;

    var result = type ? _(type) : _('mobile');
    result = result ? result : type; // no translation found for this type

    if (carrier) {
      result += ', ' + carrier;
    } else {
      result += ', ' + number;
    }

    return result;
  },

  addEllipsis: function ut_addEllipsis(view, fakeView, ellipsisSide) {
    var side = ellipsisSide || 'begin';
    LazyL10n.get(function localized(_) {
      var localizedSide;
      if (navigator.mozL10n.language.direction === 'rtl') {
        localizedSide = (side === 'begin' ? 'right' : 'left');
      } else {
        localizedSide = (side === 'begin' ? 'left' : 'right');
      }
      var computedStyle = window.getComputedStyle(view, null);
      var currentFontSize = parseInt(
        computedStyle.getPropertyValue('font-size')
      );
      var viewWidth = view.getBoundingClientRect().width;
      fakeView.style.fontSize = currentFontSize + 'px';
      fakeView.style.fontWeight = computedStyle.getPropertyValue('font-weight');
      fakeView.innerHTML = view.value ? view.value : view.innerHTML;

      var value = fakeView.innerHTML;

      // Guess the possible position of the ellipsis in order to minimize
      // the following while loop iterations:
      var counter = value.length -
        (viewWidth *
         (fakeView.textContent.length /
           fakeView.getBoundingClientRect().width));

      var newPhoneNumber;
      while (fakeView.getBoundingClientRect().width > viewWidth) {

        if (localizedSide == 'left') {
          newPhoneNumber = '\u2026' + value.substr(-value.length + counter);
        } else if (localizedSide == 'right') {
          newPhoneNumber = value.substr(0, value.length - counter) + '\u2026';
        }

        fakeView.innerHTML = newPhoneNumber;
        counter++;
      }

      if (newPhoneNumber) {
        if (view.value) {
          view.value = newPhoneNumber;
        } else {
          view.innerHTML = newPhoneNumber;
        }
      }
    });
  },

  getNextFontSize:
    function ut_getNextFontSize(view, fakeView, maxFontSize,
      minFontSize, fontStep) {
        var computedStyle = window.getComputedStyle(view, null);
        var fontSize = parseInt(computedStyle.getPropertyValue('font-size'));
        var viewWidth = view.getBoundingClientRect().width;
        var viewHeight = view.getBoundingClientRect().height;
        fakeView.style.fontSize = fontSize + 'px';
        fakeView.innerHTML = (view.value ? view.value : view.innerHTML);

        var rect = fakeView.getBoundingClientRect();

        while ((rect.width < viewWidth) && (fontSize < maxFontSize)) {
          fontSize = Math.min(fontSize + fontStep, maxFontSize);
          fakeView.style.fontSize = fontSize + 'px';
          rect = fakeView.getBoundingClientRect();
        }

        while ((rect.width > viewWidth) && (fontSize > minFontSize)) {
          fontSize = Math.max(fontSize - fontStep, minFontSize);
          fakeView.style.fontSize = fontSize + 'px';
          rect = fakeView.getBoundingClientRect();
        }

        return fontSize;
  }
};

