requireApp('communications/contacts/js/utilities/vcard_parser.js');
requireApp('communications/contacts/test/unit/mock_mozContacts.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_contact.js');

var vcf1 = 'BEGIN:VCARD\n' +
  'VERSION:2.1\n' +
  'N;ENCODING=QUOTED-PRINTABLE;CHARSET=utf-8:Gump;F=C3=B3rrest\n' +
  'ORG;ENCODING=QUOTED-PRINTABLE;CHARSET=utf-8:B=C3=B3bba Gump Shrimp Co.\n' +
  'TITLE;ENCODING=QUOTED-PRINTABLE;CHARSET=utf-8:Shr=C3=B3mp Man\n' +
  'PHOTO;GIF:http://www.example.com/dir_photos/my_photo.gif\n' +
  'TEL;WORK;VOICE:(111) 555-1212\n' +
  'TEL;HOME;VOICE:(404) 555-1212\n' +
  'ADR;WORK;ENCODING=QUOTED-PRINTABLE:;;100 W=C3=A1ters Edge;Baytown;LA;' +
  '30314;United States of America\n' +
  'LABEL;WORK;ENCODING=QUOTED-PRINTABLE:100 Waters Edge=0D=0ABaytown, ' +
  'LA 30314=0D=0AUnited States of America\n' +
  'ADR;HOME:;;42 Plantation St.;Baytown;LA;30314;United States of America\n' +
  'LABEL;HOME;ENCODING=QUOTED-PRINTABLE:42 Plantation St.=0D=0ABaytown, ' +
  'LA 30314=0D=0AUnited States of America\n' +
  'EMAIL;PREF;INTERNET:forrestgump@example.com\n' +
  'REV:20080424T195243Z\n' +
  'END:VCARD';

var vcf2 = 'BEGIN:VCARD\n' +
  'VERSION:3.0\n' +
  'N:Gump;Forrest\n' +
  'FN:Forrest Gump\n' +
  'ORG:Bubba Gump Shrimp Co.\n' +
  'TITLE:Shrimp Man\n' +
  'PHOTO;VALUE=URL;TYPE=GIF:http://www.example.com/dir_photos/my_photo.gif\n' +
  'TEL;TYPE=WORK,VOICE:(111) 555-1212\n' +
  'TEL;TYPE=HOME,VOICE:(404) 555-1212\n' +
  'ADR;TYPE=WORK:;;100 Waters Edge;Baytown;LA;30314;' +
  'United States of America\n' +
  'LABEL;TYPE=WORK:100 Waters Edge\nBaytown, ' +
  'LA 30314\nUnited States of America\n' +
  'ADR;TYPE=HOME:;;42 Plantation St.;Baytown;' +
  'LA;30314;United States of America\n' +
  'LABEL;TYPE=HOME:42 Plantation St.\nBaytown, ' +
  'LA 30314\nUnited States of America\n' +
  'EMAIL;TYPE=PREF,INTERNET:forrestgump@example.com\n' +
  'REV:2008-04-24T19:52:43Z\n' +
  'END:VCARD';

var vcf3 = 'BEGIN:VCARD\n' +
  'VERSION:4.0\n' +
  'N:Gump;Forrest;;;\n' +
  'FN:Forrest Gump\n' +
  'ORG:Bubba Gump Shrimp Co.\n' +
  'TITLE:Shrimp Man\n' +
  'PHOTO;MEDIATYPE=image/gif:http://www.example.com/dir_photos/my_photo.gif\n' +
  'TEL;TYPE=work,voice;VALUE=uri:tel:+1-111-555-1212\n' +
  'TEL;TYPE=home,voice;VALUE=uri:tel:+1-404-555-1212\n' +
  'ADR;TYPE=work;LABEL="100 Waters Edge\nBaytown, ' +
  'LA 30314\nUnited States of America"\n' +
  '  :;;100 Waters Edge;Baytown;LA;30314;United States of America\n' +
  'ADR;TYPE=home;LABEL="42 Plantation St.\nBaytown, ' +
  'LA 30314\nUnited States of America"\n' +
  '  :;;42 Plantation St.;Baytown;LA;30314;United States of America\n' +
  'EMAIL:forrestgump@example.com\n' +
  'REV:20080424T195243Z\n' +
  'END:VCARD';

var vcf4 = 'BEGIN:VCARD\n' +
  'VERSION:3.0\n' +
  'FN;CHARSET=UTF-8:Foo Bar\n' +
  'N;CHARSET=UTF-8:Bar;Foo;;;\n' +
  'BDAY;CHARSET=UTF-8:1975-05-20\n' +
  'TEL;CHARSET=UTF-8;TYPE=CELL;PREF:(123) 456-7890\n' +
  'TEL;CHARSET=UTF-8;TYPE=WORK:(123) 666-7890\n' +
  'EMAIL;CHARSET=UTF-8;TYPE=HOME:example@example.org\n' +
  'ORG;CHARSET=UTF-8:;\n' +
  'END:VCARD\n';

var vcfwrong1 = 'BEGIN:VCARD\n' +
  'VERSION:4.0\n' +
  'N:Gump;Forrest;;;\n' +
  'FN:Forrest Gump\n' +
  'ORG:Bubba Gump Shrimp Co.\n' +
  '  TITLE:Shrimp Man\n' +
  'PHOTO;MEDIATYPE=image/gif:http://www.example.com/dir_photos/my_photo.gif\n' +
  '  TEL;TYPE=work,voice;VALUE=uri:tel:+1-111-555-1212\n' +
  'TEL;TYPE=home,voice;VALUE=uri:tel:+1-404-555-1212\n' +
  'ADR;TYPE=work;LABEL="100 Waters Edge\nBaytown, ' +
  'LA 30314\nUnited States of America"\n' +
  ':;;100 Waters Edge;Baytown;LA;30314;United States of America\n' +
  'ADR;TYPE=home;LABEL="42 Plantation St.\nBaytown, ' +
  'LA 30314\nUnited States of America"\n' +
  ':;;42 Plantation St.;Baytown;LA;30314;United States of America\n' +
  'EMAIL:forrestgump@example.com\n' +
  'REV:20080424T195243Z\n' +
  'END:VCARD\n' +
  'BEGIN:VCARD\n' +
  'VERSION:4.0\n' +
  'akajslkfj\n' +
  'END:VCARD';

var vcf5 = 'BEGIN:VCARD\n' +
  'VERSION:2.1\n' +
  'N:Tanzbein;Tanja;;;\n' +
  'FN:Tanja Tanzbein\n' +
  'TEL;WORK:+3434269362248\n' +
  'END:VCARD\n' +
  'BEGIN:VCARD\n' +
  'VERSION:2.1\n' +
  'N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:' +
  '=52=C3=BC=63=6B=65=72;=54=68=6F=6D=61=73;;;\n' +
  'FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:\n' +
  '=54=68=6F=6D=61=73=20=52=C3=BC=63=6B=65=72\n' +
  'TEL;CELL:+72682252873\n' +
  'END:VCARD';

suite('vCard parsing settings', function() {
  function stub(additionalCode, ret) {
    if (additionalCode && typeof additionalCode !== 'function')
      ret = additionalCode;

    var nfn = function() {
      nfn.callCount++;
      nfn.calledWith = [].slice.call(arguments);

      if (typeof additionalCode === 'function')
        additionalCode.apply(this, arguments);

      return ret;
    };
    nfn.callCount = 0;
    return nfn;
  }

  var realMozContact, realMozContacts;
  suite('SD Card import', function() {
    setup(function() {
      realMozContacts = navigator.mozContacts;
      navigator.mozContacts = MockMozContacts;

      if (window.mozContact)
        realMozContact = window.mozContact;
      window.mozContact = MockMozContact;
    });

    teardown(function() {
      navigator.mozContacts = realMozContacts;
      window.mozContact = realMozContact || null;
    });

    test('- should properly decode Quoted Printable texts ', function(done) {
      var str = 'áàéèíìóòúùäëïöü¡¡¡·=';
      var realEncoded = '=C3=A1=C3=A0=C3=A9=C3=A8=C3=AD=C3=AC=C3=B3=C3=B2=C3' +
        '=BA=C3=B9=C3=A4=C3=AB=C3=AF=C3=B6=C3=BC=C2=A1=C2=A1=C2=A1=C2=B7=3D';

      var encoded = VCFReader._decodeQuoted(realEncoded);
      assert.strictEqual(encoded, str);
      done();
    });

    test('- test for processing name 1 ', function(done) {
      var contact = new mozContact();
      var data = {
        fn: [
          { meta: {}, value: ['Johnny'] }
        ],
        n: [
          {
            value: [
              'Doe', 'John', 'Richard', 'Mr.', 'Jr.'
            ],
            meta: {}
          }
        ]
      };
      VCFReader.processName(data, contact);

      assert.strictEqual(contact.name[0], 'Johnny');
      assert.strictEqual(contact.familyName[0], 'Doe');
      assert.strictEqual(contact.givenName[0], 'John');
      assert.strictEqual(contact.additionalName[0], 'Richard');
      assert.strictEqual(contact.honorificPrefix[0], 'Mr.');
      assert.strictEqual(contact.honorificSuffix[0], 'Jr.');
      done();
    });


    test('- test for processing name 2 ', function(done) {
      var contact = new mozContact();
      var data = {
        n: [
          {
            value: [
              'Doe', 'John', 'Richard', 'Mr.', 'Jr.'
            ],
            meta: {}
          }
        ]
      };
      VCFReader.processName(data, contact);

      assert.strictEqual(contact.name[0], 'Doe John Richard Mr. Jr.');
      assert.strictEqual(contact.familyName[0], 'Doe');
      assert.strictEqual(contact.givenName[0], 'John');
      assert.strictEqual(contact.additionalName[0], 'Richard');
      assert.strictEqual(contact.honorificPrefix[0], 'Mr.');
      assert.strictEqual(contact.honorificSuffix[0], 'Jr.');
      done();
    });

    test('- test for processing name 2 ', function(done) {
      var contact = new mozContact();
      var data = {
        adr: [
          {
            meta: { type: 'WORK' },
            value: [
              '', '',
              '650 Castro Street',
              'Mountain View',
              'California',
              '94041-2021',
              'USA'
            ]}
        ]};
      VCFReader.processAddr(data, contact);

      assert.strictEqual(contact.adr[0].streetAddress, '650 Castro Street');
      assert.strictEqual(contact.adr[0].locality, 'Mountain View');
      assert.strictEqual(contact.adr[0].region, 'California');
      assert.strictEqual(contact.adr[0].postalCode, '94041-2021');
      assert.strictEqual(contact.adr[0].countryName, 'USA');
      done();
    });

    test('- should return a correct JSON object from VCF 2.1 ', function(done) {
      var reader = new VCFReader(vcf1);

      reader.onread = stub();
      reader.onimported = stub();
      reader.onerror = stub();
      reader.process(function import_finish(contacts) {
        assert.strictEqual(1, contacts.length);
        assert.strictEqual(1, reader.onread.callCount);
        assert.strictEqual(1, reader.onimported.callCount);

        assert.strictEqual(0, reader.onerror.callCount);
        var contact = contacts[0];

        assert.strictEqual('Gump Fórrest', contact.name[0]);
        assert.strictEqual('Fórrest', contact.givenName[0]);
        assert.strictEqual('Bóbba Gump Shrimp Co.', contact.org[0]);
        assert.strictEqual('Shrómp Man', contact.jobTitle[0]);

        assert.strictEqual('WORK', contact.tel[0].type[0]);
        assert.strictEqual('(111) 555-1212', contact.tel[0].value);
        assert.strictEqual('HOME', contact.tel[1].type[0]);
        assert.strictEqual('(404) 555-1212', contact.tel[1].value);
        assert.strictEqual('WORK', contact.adr[0].type[0]);

        assert.strictEqual('100 Wáters Edge', contact.adr[0].streetAddress);
        assert.strictEqual('Baytown', contact.adr[0].locality);
        assert.strictEqual('LA', contact.adr[0].region);
        assert.strictEqual('30314', contact.adr[0].postalCode);
        assert.strictEqual('United States of America',
          contact.adr[0].countryName);

        assert.strictEqual('HOME', contact.adr[1].type[0]);
        assert.strictEqual('42 Plantation St.', contact.adr[1].streetAddress);
        assert.strictEqual('Baytown', contact.adr[1].locality);
        assert.strictEqual('LA', contact.adr[1].region);
        assert.strictEqual('30314', contact.adr[1].postalCode);
        assert.strictEqual('United States of America',
          contact.adr[1].countryName);

        assert.strictEqual('forrestgump@example.com', contact.email[0].value);
        assert.strictEqual('PREF', contact.email[0].type[0]);


        done();
      });
    });
    test('- should return a correct JSON object from VCF 3.0', function(done) {
      var reader = new VCFReader(vcf2);

      reader.onread = stub();
      reader.onimported = stub();
      reader.onerror = stub();

      reader.process(function import_finish(contacts) {
        assert.strictEqual(1, contacts.length);

        assert.strictEqual(1, reader.onread.callCount);
        assert.strictEqual(1, reader.onimported.callCount);
        assert.strictEqual(0, reader.onerror.callCount);

        var contact = contacts[0];

        assert.strictEqual('Forrest Gump', contact.name[0]);
        assert.strictEqual('Forrest', contact.givenName[0]);
        assert.strictEqual('Bubba Gump Shrimp Co.', contact.org[0]);
        assert.strictEqual('Shrimp Man', contact.jobTitle[0]);

        assert.strictEqual('WORK', contact.tel[0].type[0]);
        assert.strictEqual('(111) 555-1212', contact.tel[0].value);
        assert.strictEqual('HOME', contact.tel[1].type[0]);
        assert.strictEqual('(404) 555-1212', contact.tel[1].value);

        assert.strictEqual('WORK', contact.adr[0].type[0]);
        assert.strictEqual('100 Waters Edge', contact.adr[0].streetAddress);
        assert.strictEqual('Baytown', contact.adr[0].locality);
        assert.strictEqual('LA', contact.adr[0].region);
        assert.strictEqual('30314', contact.adr[0].postalCode);
        assert.strictEqual('United States of America',
          contact.adr[0].countryName);

        assert.strictEqual('HOME', contact.adr[1].type[0]);
        assert.strictEqual('42 Plantation St.', contact.adr[1].streetAddress);
        assert.strictEqual('Baytown', contact.adr[1].locality);
        assert.strictEqual('LA', contact.adr[1].region);
        assert.strictEqual('30314', contact.adr[1].postalCode);
        assert.strictEqual('United States of America',
          contact.adr[1].countryName);

        assert.strictEqual('forrestgump@example.com', contact.email[0].value);
        assert.strictEqual('PREF', contact.email[0].type[0]);
        done();

      });
    });

    test('- should return a correct JSON object from VCF 4.0', function(done) {
      var reader = new VCFReader(vcf3);

      reader.onread = stub();
      reader.onimported = stub();
      reader.onerror = stub();

      reader.process(function import_finish(contacts) {
        assert.strictEqual(1, contacts.length);

        assert.strictEqual(1, reader.onread.callCount);
        assert.strictEqual(1, reader.onimported.callCount);
        assert.strictEqual(0, reader.onerror.callCount);

        var contact = contacts[0];

        assert.strictEqual('Forrest Gump', contact.name[0]);
        assert.strictEqual('Forrest', contact.givenName[0]);
        assert.strictEqual('Bubba Gump Shrimp Co.', contact.org[0]);
        assert.strictEqual('Shrimp Man', contact.jobTitle[0]);

        assert.strictEqual('work', contact.tel[0].type[0]);
        assert.strictEqual('+1-111-555-1212', contact.tel[0].value);
        assert.strictEqual('home', contact.tel[1].type[0]);
        assert.strictEqual('+1-404-555-1212', contact.tel[1].value);

        assert.strictEqual('work', contact.adr[0].type[0]);

        assert.strictEqual('100 Waters Edge', contact.adr[0].streetAddress);
        assert.strictEqual('Baytown', contact.adr[0].locality);
        assert.strictEqual('LA', contact.adr[0].region);
        assert.strictEqual('30314', contact.adr[0].postalCode);
        assert.strictEqual('United States of America',
          contact.adr[0].countryName);
        assert.strictEqual('home', contact.adr[1].type[0]);
        assert.strictEqual('42 Plantation St.', contact.adr[1].streetAddress);
        assert.strictEqual('Baytown', contact.adr[1].locality);
        assert.strictEqual('LA', contact.adr[1].region);
        assert.strictEqual('30314', contact.adr[1].postalCode);
        assert.strictEqual('United States of America',
          contact.adr[1].countryName);

        assert.strictEqual('forrestgump@example.com', contact.email[0].value);
        done();

      });
    });

    test('- should return a correct JSON object from weird encoding',
         function(done) {
      var reader = new VCFReader(vcf5);

      reader.onread = stub();
      reader.onimported = stub();
      reader.onerror = stub();

      reader.process(function import_finish(contacts) {
        assert.strictEqual(2, contacts.length);

        assert.strictEqual(1, reader.onread.callCount);
        assert.strictEqual(2, reader.onimported.callCount);
        assert.strictEqual(0, reader.onerror.callCount);

        var contact = contacts[0];

        assert.strictEqual('Tanja Tanzbein', contact.name[0]);
        assert.strictEqual('Tanja', contact.givenName[0]);
        assert.strictEqual('WORK', contact.tel[0].type[0]);
        assert.strictEqual('+3434269362248', contact.tel[0].value);

        var contact2 = contacts[1];
        assert.strictEqual('Thomas Rücker', contact2.name[0]);
        assert.strictEqual('Thomas', contact2.givenName[0]);
        assert.strictEqual('CELL', contact2.tel[0].type[0]);
        assert.strictEqual('+72682252873', contact2.tel[0].value);

        done();
      });
    });

    test('- should return a single entry', function(done) {
      var reader = new VCFReader(vcfwrong1);
      reader.onread = stub();
      reader.onimported = stub();
      reader.onerror = stub();

      reader.process(function import_finish(contacts) {
        assert.strictEqual(1, contacts.length);
        done();
      });
    });
    test('- Test for UTF8 charset', function(done) {
      var reader = new VCFReader(vcf4);
      reader.onread = stub();
      reader.onimported = stub();
      reader.onerror = stub();

      reader.process(function import_finish(contacts) {
        var contact = contacts[0];
        assert.strictEqual('Foo Bar', contact.name[0]);
        assert.strictEqual('Foo', contact.givenName[0]);
        assert.strictEqual('CELL', contact.tel[0].type[0]);
        assert.strictEqual('WORK', contact.tel[1].type[0]);
        assert.strictEqual(true, contact.tel[0].pref);
        assert.strictEqual('(123) 456-7890', contact.tel[0].value);
        assert.strictEqual('(123) 666-7890', contact.tel[1].value);
        assert.strictEqual('', contact.org[0]);
        assert.strictEqual('HOME', contact.email[0].type[0]);
        assert.strictEqual('example@example.org', contact.email[0].value);
        done();
      });
    });
    test('- Test for vcardToContact', function(done) {
      VCFReader.processName = stub();
      VCFReader.processAddr = stub();
      VCFReader.processComm = stub();
      VCFReader.processFields = function(vc, obj) {
        obj.name = vc.name;
      };

      var ct = VCFReader.vcardToContact({ name: ['Sergi'] });
      assert.strictEqual('Sergi', ct.name[0]);
      done();
    });
  });
});
