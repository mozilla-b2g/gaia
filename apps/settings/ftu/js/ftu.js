
'use strict';

function startup() {
  // First-run animation. Wait until it is finished and then show up
  // the real first run configuration panels.
  window.addEventListener('animationend', function(evt) {
    if (evt.target === document.querySelector('#logo')) {
      var rootSection = document.querySelector('#root');
      rootSection.classList.add('show');

      var buttons = document.getElementById('navigation-buttons');
      buttons.classList.add('show');
    }
  });


  // Turn on WiFi.
  try {
    var settings = window.navigator.mozSettings;
    if (settings) {
      settings.createLock().set({ 'wifi.enabled': true });
    }

    gWifiManager.setEnabled(true);
  } catch(e) {
    dump('FOO: ' + e + '\n');
  }


  // Listen changes to the datetime fields and update the device
  // configuration accordingly.
  var future = new Date();

  var date = document.getElementById('date-configuration');
  date.addEventListener('input', function onDateChanged(evt) {
    var value = evt.target.value;
    var linkedElement = evt.target.nextElementSibling.lastElementChild;
    linkedElement.textContent = value;

    if (navigator.mozTime) {
      var values = value.split('-');
      future.setDate(values[2].replace(/^0/,''));
      future.setMonth(values[1].replace(/^0/,'') - 1);
      future.setFullYear(values[0]);

      navigator.mozTime.set(future);
    }
  });

  var time = document.getElementById('time-configuration');
  time.addEventListener('input', function onTimeChanged(evt) {
    var value = evt.target.value;
    var linkedElement = evt.target.nextElementSibling.lastElementChild;
    linkedElement.textContent = value;

    if (navigator.mozTime) {
      future.setHours(value.split(':')[0].replace(/^0/, ''));
      future.setMinutes(value.split(':')[1].replace(/^0/, ''));
      future.setSeconds(0);

      navigator.mozTime.set(future);
    }
  });

  var timezone = document.getElementById('timezone-configuration');
  timezone.addEventListener('change', function onTimeZoneChanged(evt) {
    var value = evt.target.value;
    var linkedElement = evt.target.nextElementSibling.lastElementChild;
    linkedElement.textContent = value;

    navigator.mozSettings.set('time.timezone', value);
  });


  // Listen for sim contacts request.
  var simImport = document.getElementById('import-sim');
  simImport.onclick = function importFromSim() {
    simImport.setAttribute('disabled', 'true');

    var _ = navigator.mozL10n.get;
    function onread() {
      simImport.dataset.state = _('ftu-contacts-import-read');
    };

    function onimport(count) {
      simImport.classList.add('success');
      simImport.dataset.state = _('ftu-contacts-import-import', {
        'contacts' : count
      });
    };

    function onerror() {
      simImport.dataset.state = _('ftu-contacts-import-error');
      simImport.removeAttribute('disabled');
    };

    importSIMContacts(onread, onimport, onerror);
  };
};
window.addEventListener('load', startup);


// The following code is navigation related. Title, progress bar
// and buttons are static and do not move with the rest of the UI
// while going from on page to an other page. The listener above
// listent for hashchange and update title, progress bar and buttons.
window.addEventListener('hashchange', function(evt) {
  var buttons = document.getElementById('navigation-buttons');
  buttons.classList.remove('last');

  var _ = window.navigator.mozL10n.get;

  var back = document.getElementById('back');
  back.textContent = _('ftu-back');

  var next = document.getElementById('next');
  next.dataset.action = '';
  next.textContent = _('ftu-next');

  var progress = document.getElementById('progress');
  var title = document.getElementById('title');

  var header = document.getElementById('header');
  header.dataset.current = document.location.hash.substring(1);

  switch (document.location.hash) {
    case '#root':
      back.dataset.target = '';
      next.dataset.target = 'wifi';
      progress.value = 20;
      title.textContent = _('ftu-language-title');
      break;
    case '#wifi':
      back.dataset.target = 'root';
      next.dataset.target = 'datetime';
      progress.value = 40;
      title.textContent = _('ftu-wifi-title');
      break;
    case '#wifi-auth':
      back.dataset.target = 'wifi';
      next.dataset.target = 'wifi';
      next.dataset.action = 'join';
      next.textContent = _('ftu-join');
      break;
    case '#wifi-status':
      back.dataset.target = 'wifi';
      next.dataset.target = 'wifi';
      next.dataset.action = 'forget';
      next.textContent = _('ftu-forget');
      break;
    case '#datetime':
      back.dataset.target = 'wifi';
      next.dataset.target = 'contacts';
      progress.value = 60;
      title.textContent = _('ftu-datetime-title');
      break;
    case '#contacts':
      back.dataset.target = 'datetime';
      next.dataset.target = 'privacy';
      progress.value = 80;
      title.textContent = _('ftu-contacts-title');
      break;
    case '#privacy':
      back.dataset.target = 'contacts';
      next.dataset.target = 'privacy2';
      progress.value = 90;
      title.textContent = _('ftu-privacy-title');
      break;
    case '#about-your-rights':
      back.dataset.target = 'privacy';
      next.dataset.target = '';
      title.textContent = _('ftu-privacy-about-rights');
      break;
    case '#about-your-privacy':
      back.dataset.target = 'privacy';
      next.dataset.target = '';
      title.textContent = _('ftu-privacy-about-privacy');
      break;
    case '#learn-more':
      back.dataset.target = 'privacy';
      next.dataset.target = '';
      title.textContent = _('ftu-privacy-learn-more');
      break;
    case '#privacy2':
      back.dataset.target = 'privacy';
      next.dataset.target = 'end';
      progress.value = 100;
      title.textContent = _('ftu-privacy-title');
      break;
    case '#privacy-informations':
      back.dataset.target = 'privacy2';
      next.dataset.target = '';
      title.textContent = _('ftu-privacy-about-informations');
      break;
    case '#end':
      progress.value = '';
      buttons.classList.add('last');
      back.dataset.target = '';
      next.dataset.target = 'end';
      next.dataset.action = 'close';
      next.textContent = _('ftu-lets-go');
      title.textContent = '';
      progress.value = 100;
      break;
  }
});

function previous(e) {
  document.location.hash = e.target.dataset.target;
}

function next(e) {
  var dataset = e.target.dataset;
  switch (dataset.action) {
    case 'forget':
      var button = document.querySelector('#wifi-status button');
      button.click();
      break;

    case 'join':
      var button = document.querySelector('#wifi-auth button');
      button.click();
      break;

    case 'close':
      window.close();
      break;
  }

  document.location.hash = dataset.target;
}

