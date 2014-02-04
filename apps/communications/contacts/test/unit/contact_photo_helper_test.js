'use strict';

/* global ContactPhotoHelper */

require('/shared/js/contact_photo_helper.js');

suite('shared/ContactPhotoHelper >', function() {
  var contactWithoutPhoto, contactWithString, contactWithoutThumbnail,
      contactWithThumbnail, cntactWithExtra;

  var dataURL, fullResolution, thumbnail, extra;
  var subject;

  setup(function() {
    dataURL = 'data:image/png;base64,';
    fullResolution = new Blob(['1234567890'], {type: 'image/png'});
    thumbnail = new Blob(['123'], {type: 'image/png'});
    extra = new Blob(['12345'], {type: 'image/png'});

    contactWithoutPhoto = {
      photo: []
    };

    contactWithString = {
      photo: [dataURL]
    };

    contactWithoutThumbnail = {
      photo: [fullResolution]
    };

    contactWithThumbnail = {
      photo: [fullResolution, thumbnail]
    };

    cntactWithExtra = {
      photo: [thumbnail, extra, fullResolution]
    };

    subject = ContactPhotoHelper;
  });

  suite('getThumbnail >', function() {
    test('should return null with the contact has no photo', function() {
      assert.isNull(subject.getThumbnail(contactWithoutPhoto));
    });

    test('should not choke on old dataURL photos', function() {
      assert.equal(subject.getThumbnail(contactWithString),
                   dataURL);
    });

    test('should return the only photo if the contact has no thumbnail',
    function() {
      assert.equal(subject.getThumbnail(contactWithoutThumbnail),
                   fullResolution);
    });

    test('should return the smallest blob if the contact has a thumbnail',
    function() {
      assert.equal(subject.getThumbnail(contactWithThumbnail),
                   thumbnail);
    });

    test('should return the smallest blob if the contact multiple photos',
    function() {
      assert.equal(subject.getThumbnail(cntactWithExtra),
                   thumbnail);
    });
  });

  suite('getFullResolution >', function() {
    test('should return null with the contact has no photo', function() {
      assert.isNull(subject.getFullResolution(contactWithoutPhoto));
    });

    test('should not choke on old dataURL photos', function() {
      assert.equal(subject.getFullResolution(contactWithString),
                   dataURL);
    });

    test('should return the only photo if the contact has no thumbnail',
    function() {
      assert.equal(subject.getFullResolution(contactWithoutThumbnail),
                   fullResolution);
    });

    test('should return the biggest blob if the contact has a thumbnail',
    function() {
      assert.equal(subject.getFullResolution(contactWithThumbnail),
                   fullResolution);
    });

    test('should return the biggest blob if the contact multiple photos',
    function() {
      assert.equal(subject.getFullResolution(cntactWithExtra),
                   fullResolution);
    });
  });
});
