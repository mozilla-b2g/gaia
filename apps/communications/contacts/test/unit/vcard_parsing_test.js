requireApp('communications/contacts/js/utilities/vcard_parser.js');

var vcf1 = 'BEGIN:VCARD\n' +
  'VERSION:2.1\n' +
  'N;ENCODING=QUOTED-PRINTABLE;CHARSET=utf-8:Gump;F=C3=B3rrest\n' +
//  'FN:Forrest Gump\n' +
  'ORG:Bubba Gump Shrimp Co.\n' +
  'TITLE:Shrimp Man\n' +

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
  ':;;100 Waters Edge;Baytown;LA;30314;United States of America\n' +
  'ADR;TYPE=home;LABEL="42 Plantation St.\nBaytown, ' +
  'LA 30314\nUnited States of America"\n' +
  ':;;42 Plantation St.;Baytown;LA;30314;United States of America\n' +
  'EMAIL:forrestgump@example.com\n' +
  'REV:20080424T195243Z\n' +
  'END:VCARD';

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

  suite('SD Card import', function() {
    setup(function() {
      navigator.mozContacts = {
        save: function() {
          var req = {};
          setTimeout(function() {
            if (req.onsuccess)
              req.onsuccess();
          }, 200);
          return req;
        }
      };
    });

    teardown(function() { });

    test('- should return a correct JSON object from VCF 2.1', function(done) {
      var reader = new VCFReader(vcf1);

      reader.onread = stub();
      reader.onimported = stub();
      reader.onerror = stub();
      reader.process(function import_finish(contacts) {
        assert.equal(1, contacts.length);
        assert.equal(1, reader.onread.callCount);
        assert.equal(1, reader.onimported.callCount);

        assert.equal(0, reader.onerror.callCount);
        var contact = contacts[0];

        assert.equal('Gump Fórrest', contact.name);
        assert.equal('Fórrest', contact.givenName);
        assert.equal('Bubba Gump Shrimp Co.', contact.org[0]);
        assert.equal('Shrimp Man', contact.jobTitle[0]);

        assert.equal('http://www.example.com/dir_photos/my_photo.gif',
          contact.photo[0]);

        assert.equal('WORK', contact.tel[0].type);
        assert.equal('(111) 555-1212', contact.tel[0].value);
        assert.equal('HOME', contact.tel[1].type);
        assert.equal('(404) 555-1212', contact.tel[1].value);

        assert.equal('WORK', contact.adr[0].type);
        assert.equal('100 Wáters Edge', contact.adr[0].streetAddress);
        assert.equal('Baytown', contact.adr[0].locality);
        assert.equal('LA', contact.adr[0].region);
        assert.equal('30314', contact.adr[0].postalCode);
        assert.equal('United States of America', contact.adr[0].countryName);

        assert.equal('HOME', contact.adr[1].type);
        assert.equal('42 Plantation St.', contact.adr[1].streetAddress);
        assert.equal('Baytown', contact.adr[1].locality);
        assert.equal('LA', contact.adr[1].region);
        assert.equal('30314', contact.adr[1].postalCode);
        assert.equal('United States of America', contact.adr[1].countryName);

        assert.equal('forrestgump@example.com', contact.email[0].value);
        assert.equal('PREF', contact.email[0].type);

        done();
      });
    });

    test('- should return a correct JSON object from VCF 3.0', function(done) {
      var reader = new VCFReader(vcf2);

      reader.onread = stub();
      reader.onimported = stub();
      reader.onerror = stub();

      reader.process(function import_finish(contacts) {
        assert.equal(1, contacts.length);

        assert.equal(1, reader.onread.callCount);
        assert.equal(1, reader.onimported.callCount);
        assert.equal(0, reader.onerror.callCount);

        var contact = contacts[0];

        assert.equal('Forrest Gump', contact.name[0]);
        assert.equal('Forrest Gump', contact.givenName[0]);
        assert.equal('Bubba Gump Shrimp Co.', contact.org[0]);
        assert.equal('Shrimp Man', contact.jobTitle[0]);
        assert.equal('http://www.example.com/dir_photos/my_photo.gif',
          contact.photo[0]);

        assert.equal('WORK', contact.tel[0].type);
        assert.equal('(111) 555-1212', contact.tel[0].value);
        assert.equal('HOME', contact.tel[1].type);
        assert.equal('(404) 555-1212', contact.tel[1].value);

        assert.equal('WORK', contact.adr[0].type);
        assert.equal('100 Waters Edge', contact.adr[0].streetAddress);
        assert.equal('Baytown', contact.adr[0].locality);
        assert.equal('LA', contact.adr[0].region);
        assert.equal('30314', contact.adr[0].postalCode);
        assert.equal('United States of America', contact.adr[0].countryName);

        assert.equal('HOME', contact.adr[1].type);
        assert.equal('42 Plantation St.', contact.adr[1].streetAddress);
        assert.equal('Baytown', contact.adr[1].locality);
        assert.equal('LA', contact.adr[1].region);
        assert.equal('30314', contact.adr[1].postalCode);
        assert.equal('United States of America', contact.adr[1].countryName);

        assert.equal('forrestgump@example.com', contact.email[0].value);
        assert.equal('PREF', contact.email[0].type);
        done();
      });
    });

    test('- should return a single entry', function(done) {
      var reader = new VCFReader(vcfwrong1);

      reader.onread = stub();
      reader.onimported = stub();
      reader.onerror = stub();

      var p = reader.process(function import_finish(contacts) {
        assert.equal(1, contacts.length);
        done();
      });
    });
  });
});
