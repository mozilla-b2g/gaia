'use strict';
/*global requireApp, suite, setup, testConfig, test, assert, suiteSetup,
         suiteTeardown */

requireApp('email/js/alameda.js');
requireApp('email/test/config.js');

suite('compose', function() {
  var subject, Compose;
  var mockAttachments = [{
    name: 'attachment1.jpg',
    blob: { size: 10000, type: 'type1' }
  }, {
    name: 'attachment2.jpg',
    blob: { size: 20000, type: 'type2' }
  }];

  function MockComposer() {
    this.attachments = [];
    this.addAttachment = function(attachmentDef) {
      this.attachments.push({
        name: attachmentDef.name,
        blob: {
          size: attachmentDef.blob.size,
          type: attachmentDef.blob.type
        }
      });
    };
  }

  function testUpdateAttachmentsAriaLabel(expectedTotalSizeInKb) {
    subject.updateAttachmentsAriaLabel();
    assert.equal(subject.attachmentsContainer.getAttribute('data-l10n-id'),
      'compose-attachments-container');
    var args = subject.attachmentsContainer.getAttribute('data-l10n-args');
    assert.deepEqual(JSON.parse(args), {kilobytes: expectedTotalSizeInKb || 0});
  }

  suiteSetup(function(done) {
    testConfig({
      suiteTeardown: suiteTeardown,
      done: done
    }, ['element!cards/compose'], function(c) {
      Compose = c;
    });
  });

  setup(function() {
    subject = new Compose();
    subject.onArgs({ composer: new MockComposer() });
  });

  suite('zero attachments', function() {
    test('calculateTotalAttachmentsSize', function() {
      assert.equal(subject.calculateTotalAttachmentsSize(), 0);
    });

    test('updateAttachmentsAriaLabel', function() {
      testUpdateAttachmentsAriaLabel();
    });
  });

  suite('one attachment', function() {
    setup(function() {
      subject.composer.addAttachment(mockAttachments[0]);
    });

    test('calculateTotalAttachmentsSize', function() {
      assert.equal(subject.calculateTotalAttachmentsSize(), 10000);
    });

    test('updateAttachmentsAriaLabel', function() {
      testUpdateAttachmentsAriaLabel();
    });
  });

  suite('more than one attachment', function() {
    setup(function() {
      subject.composer.addAttachment(mockAttachments[0]);
      subject.composer.addAttachment(mockAttachments[1]);
    });

    test('calculateTotalAttachmentsSize', function() {
      assert.equal(subject.calculateTotalAttachmentsSize(), 30000);
    });

    test('updateAttachmentsAriaLabel', function() {
      testUpdateAttachmentsAriaLabel(Math.ceil(30000 / 1024));
    });
  });
});
