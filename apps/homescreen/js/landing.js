
'use strict';

const LandingPage = (function() {

  var _ = navigator.mozL10n.get;
  var dateTimeFormat = new navigator.mozL10n.DateTimeFormat();
  var timeFormat, dateFormat;

  var page = document.querySelector('#landing-page');
  var clockElemNumbers = document.querySelector('#landing-clock .numbers');
  var clockElemMeridiem = document.querySelector('#landing-clock .meridiem');
  var dateElem = document.querySelector('#landing-date');

  var updateInterval = null;
  var updateTimeout = null;

  page.addEventListener('gridpagehideend', function onPageHideEnd() {
    stopClock();
  });

  navigator.mozL10n.ready(function localize() {
    timeFormat = _('shortTimeFormat');
    dateFormat = _('longDateFormat');
    startClock();
    page.addEventListener('gridpageshowstart', startClock);
  });

  var clockOrigin = document.location.protocol + '//clock.' +
        document.location.host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');

  var landingTime = document.querySelector('#landing-time');
  landingTime.addEventListener('click', function launchClock(evt) {
    Applications.getByOrigin(clockOrigin).launch();
  });

  landingTime.addEventListener('contextmenu', function contextMenu(evt) {
    evt.stopImmediatePropagation();
  });

  document.addEventListener('mozvisibilitychange', function mozVisChange() {
    document.mozHidden ? stopClock() : startClock();
  });

  function startClock() {
    var date = updateUI();

    if (updateTimeout == null) {
      updateTimeout = window.setTimeout(function setUpdateInterval() {
        updateUI();

        if (updateInterval == null) {
          updateInterval = window.setInterval(function updating() {
            updateUI();
          }, 60000);
        }
      }, (60 - date.getSeconds()) * 1000);
    }
  }

  function stopClock() {
    if (updateTimeout != null) {
      window.clearTimeout(updateTimeout);
      updateTimeout = null;
    }

    if (updateInterval != null) {
      window.clearInterval(updateInterval);
      updateInterval = null;
    }
  }

  function updateUI() {
    var date = new Date();

    var time = dateTimeFormat.localeFormat(date, timeFormat);
    clockElemNumbers.textContent = time.match(/([012]?\d).[0-5]\d/g);
    clockElemMeridiem.textContent = (time.match(/AM|PM/i) || []).join('');
    dateElem.textContent = dateTimeFormat.localeFormat(date, dateFormat);

    return date;
  }

}());
