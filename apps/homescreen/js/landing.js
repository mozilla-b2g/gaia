
'use strict';

const LandingPage = (function() {

  var _ = navigator.mozL10n.get;
  var dateTimeFormat = new navigator.mozL10n.DateTimeFormat();

  var timeFormat, dateFormat, clockElemNumbers, clockElemMeridiem,
      dateElem, updateInterval;

  var localized = false;
  window.addEventListener('localized', function localizedReady() {
    localized = true;
  });

  function localize() {
    timeFormat = _('shortTimeFormat');
    dateFormat = _('longDateFormat');
    initTime();
  }

  function initTime() {
    window.clearInterval(updateInterval);
    var date = updateUI();
    setTimeout(function setUpdateInterval() {
      updateUI();
      updateInterval = window.setInterval(function updating() {
        updateUI();
      }, 60000);
    }, (60 - date.getSeconds()) * 1000);
  }

  function updateUI() {
    var date = new Date();

    var time = dateTimeFormat.localeFormat(date, timeFormat);
    clockElemNumbers.textContent = time.match(/([012]?\d):[0-5]\d/g);
    clockElemMeridiem.textContent = (time.match(/AM|PM/i) || []).join('');
    dateElem.textContent = dateTimeFormat.localeFormat(date, dateFormat);

    return date;
  }

  function initialize() {
    clockElemNumbers = document.querySelector('#landing-clock .numbers');
    clockElemMeridiem = document.querySelector('#landing-clock .meridiem');
    dateElem = document.querySelector('#landing-date');

    var clockOrigin = document.location.protocol + '//clock.' +
        document.location.host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
    var landingTime = document.querySelector('#landing-time');
    landingTime.addEventListener('click', function launchClock(evt) {
      GridManager.getAppByOrigin(clockOrigin).launch();
    });
    landingTime.addEventListener('contextmenu', function contextMenu(evt) {
      evt.stopImmediatePropagation();
    });

    document.addEventListener('mozvisibilitychange', function mozVisChange() {
      if (document.location.hash != '#root') {
        return;
      }

      document.mozHidden ? window.clearInterval(updateInterval) : initTime();
    });

    if (localized) {
      localize();
    }

    window.addEventListener('localized', localize);
  }

  return {
    init: initialize
  };

}());

if (document.readyState === 'complete') {
  LandingPage.init();
} else {
  window.addEventListener('DOMContentLoaded', function landingStart() {
    LandingPage.init();
    window.removeEventListener('DOMContentLoaded', landingStart);
  });
}
