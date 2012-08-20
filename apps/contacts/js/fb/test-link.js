var filter = {
    filterBy: ['familyName'],
    filterOp: 'equals',
    filterValue: 'Cantera'
  };

  var filter2 = {
    filterBy: ['familyName'],
    filterOp: 'equals',
    filterValue: 'Apellidos'
  };

function doTest() {
  var req = navigator.mozContacts.find(filter);

  req.onsuccess = function(e) {
    if (e.target.result.length === 0) {
      var data = {
        name: ['Jose Cantera'],
        givenName: 'Jose',
        familyName: 'Cantera',
        tel: [{type: 'home', number: '675432198'}]
      };

      var mc = new mozContact();
      mc.init(data);
      navigator.mozContacts.save(mc).onsuccess = testLink;
    }
    else {
      testLink();
    }
  }
}

function testLink() {
  var req = navigator.mozContacts.find(filter);

  req.onsuccess = function(e) {
    var contactToBeLinked = e.target.result[0];

    var req2 = navigator.mozContacts.find(filter2);
    req2.onsuccess = function(e) {
      var importedContact = e.target.result[0];

      var fbContact = new fb.Contact(contactToBeLinked);

      var freq = fbContact.linkTo({ /* uid: '100001127136581', */
                                          mozContact: importedContact});

      freq.onsuccess = function() {
        window.console.log('Contact was linked successfully');
      }

      freq.onerror = function() {
        window.console.log('OWDError: Linking failed!');
      }
    }
  }

  req.onerror = function(e) {
    window.console.log('OWDError: Linking failed!');
  }
}

function unlink() {
  var req = navigator.mozContacts.find(filter);

  req.onsuccess = function(e) {
    var unlinked = e.target.result[0];
    var fbContact = new fb.Contact(unlinked);

    var freq = fbContact.unlink();

    freq.onsuccess = function() {
      window.console.log('Unlinked!!! successfully');
    }

    freq.onerror = function() {
      window.console.log('OWDError: While unlinking', freq.error);
    }
  }

  req.onerror = function(e) {
    window.console.error(e.target.error);
  }
}
