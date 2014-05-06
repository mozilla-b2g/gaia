'use strict';

/* global ContactPhotoHelper */

require('/shared/js/contact_photo_helper.js');

suite('shared/ContactPhotoHelper >', function() {
  var contactWithoutPhoto, contactWithString, contactWithoutThumbnail,
      contactWithThumbnail, cntactWithExtra, cntactFbLinkedOnePhoto,
      cntactFbLinkedTwoPhotos, cntactFbLinkedAllPhotos;

  var dataURL, fullResolution, thumbnail, extra,
      thumbnailFb, fullResolutionFb;
  var subject;

  setup(function() {
    dataURL = 'data:image/png;base64,';
    fullResolution = new Blob(['1234567890'], {type: 'image/png'});
    thumbnail = new Blob(['123'], {type: 'image/png'});
    extra = new Blob(['12345'], {type: 'image/png'});

    fullResolutionFb = new Blob(['9876543210'], {type: 'image/png'});
    thumbnailFb = new Blob(['987'], {type: 'image/png'});

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

    // Legacy contact (linked / imported by a previous OS version)
    // with one photo
    cntactFbLinkedOnePhoto = {
      photo: [fullResolutionFb],
      category: ['fb_linked']
    };

    // Legacy contact (linked by a previous OS version)
    // with two photos (local and Facebook)
    cntactFbLinkedTwoPhotos = {
      photo: [fullResolution, fullResolutionFb],
      category: ['fb_linked']
    };

    // New contact
    cntactFbLinkedAllPhotos = {
      category: ['fb_linked'],
      photo: [fullResolution, thumbnail, fullResolutionFb, thumbnailFb]
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

  suite('getThumbnail > FB Linked >', function() {
    test('should return photo[0] for a legacy linked contact with one photo',
      function() {
        assert.equal(subject.getThumbnail(cntactFbLinkedOnePhoto),
                     fullResolutionFb);
    });

    test('should return photo[0] for a legacy linked contact with two photos',
      function() {
        assert.equal(subject.getThumbnail(cntactFbLinkedTwoPhotos),
                     fullResolution);
    });

    test('should return local photo when the linked contact has both photos',
      function() {
        assert.equal(subject.getThumbnail(cntactFbLinkedAllPhotos),
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

  suite('getFullResolution > FB Linked >', function() {
    test('should return photo[0] for a legacy linked contact with one photo',
      function() {
        assert.equal(subject.getFullResolution(cntactFbLinkedOnePhoto),
                     fullResolutionFb);
    });

    test('should return photo[0] for a legacy linked contact with two photos',
      function() {
        assert.equal(subject.getFullResolution(cntactFbLinkedTwoPhotos),
                     fullResolution);
    });

    test('should return the local photo if the contact has both photos',
      function() {
        assert.equal(subject.getFullResolution(cntactFbLinkedAllPhotos),
                   fullResolution);
    });
  });
});
