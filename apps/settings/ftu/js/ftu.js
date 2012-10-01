
'use strict';

window.addEventListener('load', function onFTUload() {
  var simImport = document.getElementById('import-sim');
  simImport.onclick = function importFromSim() {
    simImport.setAttribute('disabled', 'true');

    function onread() {
      simImport.dataset.state = 'read';
    };

    function onimport(count) {
      simImport.dataset.import = 'Import successfully ' + count + 'contacts';
      simImport.dataset.state = 'import';
    };

    function onerror() {
      simImport.dataset.state = 'error';
      simImport.removeAttribute('disabled');
    };

    importSIMContacts(onread, onimport, onerror);
  };

  gWifiManager.setEnabled(true);
  var settings = window.navigator.mozSettings;
  if (!settings)
    return;
  settings.createLock().set({ 'wifi.enabled': true });
});

var future = new Date();

function onTimeChanged(evt) {
  var value = evt.target.value;
  var linkedElement = evt.target.nextElementSibling.lastElementChild;
  linkedElement.textContent = value;

  if (navigator.mozTime) {
    future.setHours(value.split(':')[0].replace(/^0/, ''));
    future.setMinutes(value.split(':')[1].replace(/^0/, ''));
    future.setSeconds(0);

    navigator.mozTime.set(future);
  }
}

function onDateChanged(evt) {
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
}

function onTimeZoneChanged(evt) {
  var value = evt.target.value;
  var linkedElement = evt.target.nextElementSibling.lastElementChild;
  linkedElement.textContent = value;

  navigator.mozSettings.set('time.timezone', value);
}

window.addEventListener('animationend', function(evt) {
  if (evt.target === document.querySelector('#logo')) {
    var rootSection = document.querySelector('#root');
    rootSection.classList.add('show');

    var buttons = document.getElementById('navigation-buttons');
    buttons.classList.add('show');
  }
});

window.addEventListener('hashchange', function(evt) {
  var back = document.getElementById('back');
  back.textContent = 'Back';

  var next = document.getElementById('next');
  next.dataset.action = '';
  next.textContent = 'Next';

  var progress = document.getElementById('progress');
  var title = document.getElementById('title');

  var header = document.getElementById('header');
  header.dataset.current = document.location.hash.substring(1);

  switch (document.location.hash) {
    case '#root':
      back.dataset.target = '';
      next.dataset.target = 'wifi';
      progress.value = 20;
      title.textContent = 'Select Language';
      break;
    case '#wifi':
      back.dataset.target = 'root';
      next.dataset.target = 'datetime';
      progress.value = 40;
      title.textContent = 'Select a network';
      break;
    case '#wifi-auth':
      back.dataset.target = 'wifi';
      next.dataset.target = 'wifi';
      next.dataset.action = 'join';
      next.textContent = 'Join';
      break;
    case '#wifi-status':
      back.dataset.target = 'wifi';
      next.dataset.target = 'wifi';
      next.dataset.action = 'forget';
      next.textContent = 'Forget';
      break;
    case '#datetime':
      back.dataset.target = 'wifi';
      next.dataset.target = 'contacts';
      progress.value = 60;
      title.textContent = 'Date and Time';
      break;
    case '#contacts':
      back.dataset.target = 'datetime';
      next.dataset.target = 'privacy';
      progress.value = 80;
      title.textContent = 'Import contacts from';
      break;
    case '#privacy':
      back.dataset.target = 'contacts';
      next.dataset.target = 'privacy2';
      progress.value = 90;
      title.textContent = 'Firefox Privacy Choices';
      break;
    case '#about-your-rights':
      back.dataset.target = 'privacy';
      next.dataset.target = '';
      title.textContent = 'About Your Rights';
      break;
    case '#about-your-privacy':
      back.dataset.target = 'privacy';
      next.dataset.target = '';
      title.textContent = 'About Your Privacy';
      break;
    case '#learn-more':
      back.dataset.target = 'privacy';
      next.dataset.target = '';
      title.textContent = 'Learn More';
      break;
    case '#privacy2':
      back.dataset.target = 'privacy';
      next.dataset.target = 'end';
      progress.value = 100;
      break;
    case '#privacy-informations':
      back.dataset.target = 'privacy2';
      next.dataset.target = '';
      title.textContent = 'Privacy Policy';
      break;
    case '#end':
      progress.value = '';
      back.dataset.target = '';
      next.dataset.target = '';
      title.textContent = '';
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
  }

  document.location.hash = dataset.target;
}
