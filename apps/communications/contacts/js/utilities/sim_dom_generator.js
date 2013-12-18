'use strict';

// Generates the DOM for each button, depending
// on different variables
function generateButton(singleSim, sim, index) {
  var button = document.createElement('button');
  button.classList.add('icon', 'icon-sim');
  if (singleSim) {
    button.textContent = _('simCard');
  } else {
    button.textContent = _('simNumber', {'number': index});
    if (sim.iccInfo &&
      sim.iccInfo.msisdn) {
      button.textContent += ': ' + sim.iccInfo.msisdn;
    }
  }
  return button;
}

var SimDomGenerator = function SimDomGenerator() {
};

SimDomGenerator.prototype.setIccList = function(list) {
  this.sims = list;
  this.singleSim = (list.length === 1);
};

SimDomGenerator.prototype.generateDOM = function() {
  this.cleanDOM();
  this.generateExportDOM();
  this.generateImportDOM();
};

// Specific DOM generation for export options, generating the
// following code:
//<li id="export-sim-option-<id>" data-source="sim">
//  <button class="icon icon-sim" data-l10n-id="simCard">
//    SIM <number> (optional : msisdn)
//  </button>
//  <p class="error-message" data-l10n-id="noSimMsgExport"></p>
//</li>
SimDomGenerator.prototype.generateExportDOM = function() {
  var exportList = document.getElementById('export-options');
  if (exportList === null) {
    return;
  }

  var firstOption = exportList.firstChild;

  var self = this;
  this.sims.forEach(function onSim(sim, index) {
    if (sim === null) {
      return;
    }
    var iccId = sim.iccInfo.iccid;
    var li = document.createElement('li');
    li.id = 'export-sim-option-' + iccId;
    li.dataset.source = 'sim';
    li.dataset.iccid = iccId;

    var button = generateButton(self.singleSim, sim, index + 1);

    var p = document.createElement('p');
    p.classList.add('error-message');
    p.textContent = _('noSimMsgExport');

    li.appendChild(button);
    li.appendChild(p);

    exportList.insertBefore(li, firstOption);
  });
};

// Specific DOM generation for import options, generating the
// following code:
//<li id="import-sim-option-<id>" data-source="sim-<iccId>">
//  <button class="icon icon-sim" data-l10n-id="importSim2">
//    SIM <number> (optional : msisdn)
//    <p><span></span><time></time></p>
//  </button>
//  <p class="error-message" data-l10n-id="noSimMsg"></p>
//</li>
SimDomGenerator.prototype.generateImportDOM = function() {
  var importList = document.getElementById('import-options');
  if (importList === null) {
    return;
  }
  var firstOption = importList.firstChild;

  var self = this;
  this.sims.forEach(function onSim(sim, index) {
    if (sim === null) {
      return;
    }

    var iccId = sim.iccInfo.iccid;
    var li = document.createElement('li');
    li.dataset.source = 'sim-' + iccId;
    li.dataset.iccid = iccId;
    li.id = 'import-sim-option-' + iccId;

    var button = generateButton(self.singleSim, sim, index + 1);

    var pTime = document.createElement('p');
    pTime.appendChild(document.createElement('span'));
    pTime.appendChild(document.createElement('time'));

    button.appendChild(pTime);

    var p = document.createElement('p');
    p.classList.add('error-message');
    p.textContent = _('noSimMsg');

    li.appendChild(button);
    li.appendChild(p);

    importList.insertBefore(li, firstOption);
  });
};

// Clean any dom elements generated with this class
SimDomGenerator.prototype.cleanDOM = function() {
  // Clean the generated DOM
  function clean(selector) {
    var items = Array.prototype.slice.call(
      document.querySelectorAll(selector));
    if (!items) {
      return;
    }
    items.forEach(function(node) {
      node.parentNode.removeChild(node);
    });
  }

  // Import
  clean('#import-options [data-iccid]');
  // Export
  clean('#export-options [data-iccid]');
};
