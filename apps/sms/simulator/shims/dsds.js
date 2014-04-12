'use strict';

(function(exports) {

var markup = '<label><input type="checkbox" /> DSDS</label>' +
  '<div class="dsds-options">' +
    '<label>Default SIM for SMS: ' +
      '<select data-controls="sms"></select></label>' +
    '<label>Default SIM for MMS/data: ' +
      '<select data-controls="mms,data"></select></label>' +
  '</div>';
var container;

function render(line) {
  if (line) {
    container = line;
  }

  line.insertAdjacentHTML('beforeend', markup);
  line.querySelector('input').addEventListener('change', onDsdsChange);
  line.querySelector('.dsds-options')
    .addEventListener('change', onSelectChange);
}

function onDsdsChange(e) {
  var input = e.target;

  if (input.checked) {
    enableDsds();
  } else {
    disableDsds();
  }
}

function onSelectChange(e) {
  var input = e.target;
  var controls = input.dataset.controls;
  if (!controls) {
    return;
  }

  var settings = {};
  controls.split(',').forEach(function(control) {
    settings['ril.' + control + '.defaultServiceId'] = +input.value;
  });
  mozSettings().set(settings);
}

function mozSettings() {
  return exports.Shims.get('mozSettings');
}

function mozMobileConnections() {
  return exports.Shims.get('mozMobileConnections');
}

function enableDsds() {
  var connsShim = mozMobileConnections();
  connsShim.slots(2);
  connsShim.sims(2);

  mozSettings().set({
    'ril.mms.defaultServiceId': 0,
    'ril.sms.defaultServiceId': 0,
    'ril.data.defaultServiceId': 0
  });

  var selects = container.querySelectorAll('.dsds-options select');
  Array.forEach(selects, function(select) {
    select.textContent = '';
    mozMobileConnections().current().forEach(function(simInfo, i) {
      var option = document.createElement('option');
      option.textContent = 'SIM' + i + ': ' + simInfo.iccId;
      option.value = i;
      select.appendChild(option);
    });
  });

  container.classList.add('show-dsds-options');
}

function disableDsds() {
  var connsShim = mozMobileConnections();
  connsShim.slots(1);
  connsShim.sims(1);

  var settingsShim = mozSettings();
  settingsShim.set({
    'ril.mms.defaultServiceId': 0,
    'ril.sms.defaultServiceId': 0,
    'ril.data.defaultServiceId': 0
  });

  container.classList.remove('show-dsds-options');
}

exports.Shims.contribute(
  'DSDS',
  {
    render: render
  }
);

})(window);
