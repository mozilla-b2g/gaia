!function() {

  var select = document.getElementById('reference-workloads');

  var options = [
    {
      name: 'contacts',
      db: 'contacts',
      counts: [0, 200, 500, 1000, 2000]
    },
    {
      name: 'messages',
      db: 'sms',
      counts: [0, 200, 500, 1000, 2000]
    },
    {
      name: 'dialer recents',
      db: 'dialer',
      counts: [0, 50, 100, 200, 500]
    }
  ];

  var targetFiles = {
    sms: '226660312ssm.sqlite',
    contacts: '3406066227csotncta.sqlite',
    dialer: '2584670174dsitanleecreR.sqlite'
  };

  for (var i = 0, option; option = options[i]; i++) {
    for (var j = 0, cLen = option.counts.length; j < cLen; j++) {
      var count = option.counts[j];
      var optionEl = document.createElement('option');
      optionEl.innerHTML = count + ' ' + option.name;
      optionEl.value = option.db + '-' + count;
      select.appendChild(optionEl);
    }
  }

  select.addEventListener('change', function(e) {
    var parts = this.value.split('-');
    var database = parts[0];
    var count = parts[1];

    importRecords(database, count);

    tab.alert('Imported: ' + count + ' ' + database + ' records.');
    this.value = '-1';
  });

  function importRecords(database, count) {
    var Ci = Components.interfaces;

    Components.utils.import('resource://gre/modules/Services.jsm');
    var currProfD = Services.dirsvc.get('ProfD', Ci.nsIFile);
    var profileDir = currProfD.path;

    var file = database + 'Db-' + count + '.sqlite';

    var sourceFile = Services.dirsvc.get('ProfD', Ci.nsILocalFile);
    sourceFile.append('..');
    sourceFile.append('test_media');
    sourceFile.append('reference-workload');
    sourceFile.append(file);

    var targetFolder = Services.dirsvc.get('ProfD', Ci.nsILocalFile);
    targetFolder.append('storage');
    targetFolder.append('persistent');
    targetFolder.append('chrome');
    targetFolder.append('idb');

    try {
      sourceFile.copyTo(targetFolder, targetFiles[database]);
    } catch (e) {
      tab.alert('Could not import file: ' + e);
    }
  }

}();
