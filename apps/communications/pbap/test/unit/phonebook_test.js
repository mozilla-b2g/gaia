/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* global
  assert,
  MockMozContacts,
  PbapPhonebook,
  requireApp,
  setup,
  suite,
  teardown,
  test
*/

requireApp('communications/pbap/test/unit/mock_mozContacts.js');

requireApp('communications/pbap/js/phonebook.js');

suite('PBAP >', () => {
  var realMozContacts;

  setup(() => {
    realMozContacts = navigator.mozContacts;
    navigator.mozContacts = MockMozContacts;
  });

  teardown(() => {
    navigator.mozContacts = realMozContacts;
  });

  function generateXml(count) {
    const XML_HEADER = '<?xml version="1.0"?>\n' +
    '<!DOCTYPE vcard-listing SYSTEM "vcard-listing.dtd">\n' +
    '<vCard-listing version="1.0">\n';
    const XML_FOOTER = '</vCard-listing>\n';
    if (count === 0) {
      return XML_HEADER + '\n' + XML_FOOTER;
    }
    var ret = XML_HEADER;
    for (var i = 0; i < count; i++) {
      ret +=
        `<card handle = "${i}.vcf" name = "familyName ${i};givenName ${i}"/>\n`;
    }
    ret += XML_FOOTER;
    return ret;
  }

  function verifyContacts(list) {
    for (var i = 0; i < list.length; i++) {
      assert.equal('givenName ' + i, list[i].givenName[0]);
      assert.equal('familyName ' + i, list[i].familyName[0]);
    }
  }

  test('pullVcardListing - empty contacts', done => {
    var pb = new PbapPhonebook();
    navigator.mozContacts.limit = 0;
    pb.pullVcardListing().then((e) => {
      assert.equal(e.size, 0);
      assert.equal(e.xml, generateXml(0));
      done();
    });
  });

  test('pullVcardListing - 20 contacts', done => {
    var pb = new PbapPhonebook();
    navigator.mozContacts.limit = 20;
    pb.pullVcardListing().then(e => {
      assert.equal(e.size, 20);
      assert.equal(e.xml, generateXml(20));
      done();
    });
  });

  test('pullVcardEntry - get 10th contact', done => {
    function createContacts(count) {
      return {
        id: count,
        givenName: ['givenName ' + count],
        familyName: ['familyName ' + count]
      };
    }
    var pb = new PbapPhonebook();
    navigator.mozContacts.limit = 20;
    pb.pullVcardListing().then(e => {
      assert.equal(e.size, 20);
      assert.equal(e.xml, generateXml(20));
      return Promise.resolve();
    }).then(() => {
      return pb.pullVcardEntry({name: '10.vcf'});
    }).then(result => {
      assert.deepEqual(result, createContacts(10));
      done();
    });
  });

  test('pullVcardEntry - out of contacts', done => {
    var pb = new PbapPhonebook();
    navigator.mozContacts.limit = 20;
    pb.pullVcardListing().then(e => {
      assert.equal(e.size, 20);
      assert.equal(e.xml, generateXml(20));
      return Promise.resolve();
    }).then(() => {
      return pb.pullVcardEntry({name: '30.vcf'});
    }).then(result => {
      assert.equal(result, null);
      done();
    });
  });

  test('sortAllContacts - 20 contacts', done => {
    var pb = new PbapPhonebook();
    navigator.mozContacts.limit = 20;
    pb.sortAllContacts().then(e => {
      assert.equal(e.length, 20);
      verifyContacts(e);
      done();
    });
  });
});
