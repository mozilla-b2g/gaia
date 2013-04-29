/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

requireApp('sms/js/utils.js');
requireApp('sms/test/unit/mock_utils.js');
requireApp('sms/js/smil.js');

var mocksHelperForSMIL = new MocksHelper([
  'Utils'
]);

mocksHelperForSMIL.init();

suite('SMIL', function() {
  var testImageBlob;
  suiteSetup(function smil_suiteSetup(done) {
    mocksHelperForSMIL.suiteSetup();
    var req = new XMLHttpRequest();
    req.open('GET', '/test/unit/media/kitten-450.jpg', true);
    req.responseType = 'blob';
    req.onload = function() {
      testImageBlob = req.response;
      done();
    };
    req.send();
  });
  suiteTeardown(function() {
    mocksHelperForSMIL.suiteTeardown();
  });
  setup(function() {
    mocksHelperForSMIL.setup();
  });
  teardown(function() {
    mocksHelperForSMIL.teardown();
  });
  suite('SMIL.parse', function() {
    test('Text only message without smil', function(done) {
      var text = ['Test text', 'omg!'];
      // minimal fake data for text only message without smil
      var messageData = {
        attachments: [
          {content: new Blob([text[0]], {type: 'text/plain'})},
          {content: new Blob([text[1]], {type: 'text/plain'})}
        ]
      };
      SMIL.parse(messageData, function(output) {
        // one slide returned
        assert.equal(output.length, 1);
        // the text should be joined on the one slide
        assert.equal(output[0].text, text.join(' '));
        done();
      });
    });
    test('Text and image message without smil', function(done) {
      var text = 'Test text';
      // minimal fake data for text only message without smil
      var messageData = {
        attachments: [
          {content: new Blob([text], {type: 'text/plain'})},
          {content: testImageBlob, location: 'example.jpg'}
        ]
      };
      SMIL.parse(messageData, function(output) {
        // one slide returned
        assert.equal(output.length, 1);
        // the text should be put on the same slide as the image
        assert.equal(output[0].text, text);
        assert.equal(output[0].blob, testImageBlob);
        assert.equal(output[0].name, 'example.jpg');
        done();
      });
    });
    test('Minimal SMIL doc', function(done) {
      var testText = 'Testing 1 2 3';
      var message = {
        smil: '<smil><body><par><img src="example.jpg"/>' +
              '<text src="text1"/></par></body></smil>',
        attachments: [{
          location: 'text1',
          content: new Blob([testText], {type: 'text/plain'})
        },{
          location: 'example.jpg',
          content: testImageBlob
        }]
      };
      SMIL.parse(message, function(output) {
        assert.equal(output[0].text, testText);
        assert.equal(output[0].blob, testImageBlob);
        assert.equal(output[0].name, 'example.jpg');
        done();
      });
    });
    test('SMIL doc with cid: prefixes on src', function(done) {
      var testText = 'Testing 1 2 3';
      var message = {
        smil: '<smil><body><par><img src="cid:example.jpg"/>' +
              '<text src="cid:text1"/></par></body></smil>',
        attachments: [{
          location: 'text1',
          content: new Blob([testText], {type: 'text/plain'})
        },{
          location: 'example.jpg',
          content: testImageBlob
        }]
      };
      SMIL.parse(message, function(output) {
        assert.equal(output[0].text, testText);
        assert.equal(output[0].blob, testImageBlob);
        assert.equal(output[0].name, 'example.jpg');
        done();
      });
    });
    test('SMIL doc with cid: prefixes on src pointing to ids', function(done) {
      var testText = 'Testing 1 2 3';
      var message = {
        smil: '<smil><body><par><img src="cid:2"/>' +
              '<text src="cid:1"/></par></body></smil>',
        attachments: [{
          id: '<1>',
          location: 'text1',
          content: new Blob([testText], {type: 'text/plain'})
        },{
          id: '<2>',
          location: 'example.jpg',
          content: testImageBlob
        }]
      };
      SMIL.parse(message, function(output) {
        assert.equal(output[0].text, testText);
        assert.equal(output[0].blob, testImageBlob);
        assert.equal(output[0].name, 'example.jpg');
        done();
      });
    });
  });
  suite('SMIL.generate', function() {
    test('Text only message', function(done) {
      var smilTest = [{
        text: 'This is a test of the SMIL generate method'
      }];
      var output = SMIL.generate(smilTest);
      var doc = (new DOMParser())
                .parseFromString(output.smil, 'application/xml')
                .documentElement;

      // only one attachment
      assert.equal(output.attachments.length, 1);

      // only one <par> tag in the smil output
      assert.equal(doc.getElementsByTagName('par').length, 1);

      // check that the content of the text blob is what we said it should be
      var textReader = new FileReader();
      textReader.onload = function(event) {
        assert.equal(event.target.result, smilTest[0].text);
        done();
      };
      textReader.readAsText(output.attachments[0].content);

    });

    test('Message with image and text', function() {
      var smilTest = [{
        text: 'Testing a caption',
        name: 'kitten-450.jpg',
        blob: testImageBlob
      }];
      var output = SMIL.generate(smilTest);
      var doc = (new DOMParser())
                .parseFromString(output.smil, 'application/xml')
                .documentElement;

      // two attachments (text and image)
      assert.equal(output.attachments.length, 2);

      // only one <par> tag
      assert.equal(doc.querySelectorAll('par').length, 1);

      // the img is before the text
      assert.equal(doc.querySelectorAll('img + text').length, 1);

      assert.equal(doc.querySelector('text').getAttribute('region'), 'Text');
      assert.equal(doc.querySelector('img').getAttribute('region'), 'Image');
    });
    test('Message with duplicate filename', function() {
      var smilTest = [{
        text: 'Testing a caption',
        name: 'kitten-450.jpg',
        blob: testImageBlob
      },{
        text: 'Testing a caption',
        name: 'kitten-450.jpg',
        blob: testImageBlob
      }];
      var output = SMIL.generate(smilTest);
      var doc = (new DOMParser())
                .parseFromString(output.smil, 'application/xml')
                .documentElement;

      // two attachments (text and image)
      assert.equal(output.attachments.length, 4);

      // only one <par> tag
      assert.equal(doc.querySelectorAll('par').length, 2);

      // the img is before the text
      assert.equal(doc.querySelectorAll('img + text').length, 2);

      var ids = {};
      // ensure all the ID's are unique
      output.attachments.forEach(function(attachment) {
        assert.equal(ids[attachment.location], undefined);
        ids[attachment.location] = true;
      });
    });
  });

});
