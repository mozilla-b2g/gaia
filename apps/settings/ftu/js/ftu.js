
'use strict';

window.addEventListener('load', function onFTUload() {
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
  var next = document.getElementById('next');
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
    case '#privacy2':
      back.dataset.target = 'privacy';
      next.dataset.target = 'end';
      progress.value = 100;
      break;
    case '#end':
      progress.value = '';
      back.dataset.target = '';
      next.dataset.target = '';
      title.textContent = '';
      break;
  }
});
