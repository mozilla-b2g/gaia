
'use strict';

const LandingPage = (function() {

  var _ = navigator.mozL10n.get;
  var dateTimeFormat = new navigator.mozL10n.DateTimeFormat();
  var timeFormat = '%H:%M';
  var dateFormat = '%A %e %B';

  var page = document.querySelector('#landing-page');
  var clockElem = document.querySelector('#landing-clock');
  var dateElem = document.querySelector('#landing-date');

  page.addEventListener('gridpageshowstart', initTime);

  var updateInterval;
  page.addEventListener('gridpagehideend', function onPageHideEnd() {
    window.clearInterval(updateInterval);
  });

  window.addEventListener('localized', function localize() {
    timeFormat = _('shortTimeFormat') || timeFormat;
    dateFormat = _('longDateFormat') || dateFormat;
    initTime();
  });

  var clockOrigin = document.location.protocol + '//clock.' +
        document.location.host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');

  document.querySelector('#landing-time').addEventListener('click',
    function launchClock(evt) {
      Applications.getByOrigin(clockOrigin).launch();
    }
  );

  document.addEventListener('mozvisibilitychange', function mozVisChange() {
    if (!page.dataset.currentPage) {
      return;
    }

    document.mozHidden ? window.clearInterval(updateInterval) : initTime();
  });

  function initTime() {
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

    clockElem.textContent = dateTimeFormat.localeFormat(date, timeFormat);
    dateElem.textContent = dateTimeFormat.localeFormat(date, dateFormat);

    return date;
  }

}());
