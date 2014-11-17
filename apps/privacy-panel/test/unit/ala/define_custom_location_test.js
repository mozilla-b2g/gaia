'use strict';

var htmlHelper;
//var realMozSettings;

suite('ALA CustomLocation', function() {

  suiteSetup(function(done) {
    require(['html_helper'], function(html) {
      htmlHelper = html;
      done();
    });
  });

  setup(function(done) {
    require(['ala/define_custom_location'], ALADefineCustomLocation => {
      var section, test;

      this.subject = ALADefineCustomLocation;
      this.template = htmlHelper.get
      ('../../templates/ala/custom.html');

      test = document.getElementById('test');
      section = document.createElement('section');
      section.id = 'ala-custom';
      section.innerHTML = this.template;

      test.appendChild(section);

      done();
    });
  });

  test('should validate true coords: 0, 0', function() {
    this.subject.config = {
      latitude: '0',
      longitude: '0'
    };
    assert.isTrue(this.subject.validate());
  });

  test('should validate true coords: 0.1, 0.000001', function() {
    this.subject.config = {
      latitude: '0.1',
      longitude: '0.000001'
    };
    assert.isTrue(this.subject.validate());
  });

  test('should validate true coords: -90.000000, -180.000000', function() {
    this.subject.config = {
      latitude: '-90.000000',
      longitude: '-180.000000'
    };
    assert.isTrue(this.subject.validate());
  });

  test('should validate true coords: 52.229675, 21.012228', function() {
    this.subject.config = {
      latitude: '52.229675',
      longitude: '21.012228'
    };
    assert.isTrue(this.subject.validate());
  });

  test('should validate false coords: 90.4, 0', function() {
    this.subject.config = {
      latitude: '90.4',
      longitude: '0'
    };
    assert.isFalse(this.subject.validate());
  });

  test('should validate false coords: 0, -180.51', function() {
    this.subject.config = {
      latitude: '0',
      longitude: '-180.51'
    };
    assert.isFalse(this.subject.validate());
  });

  test('should validate false coords: 15., 0', function() {
    this.subject.config = {
      latitude: '15.',
      longitude: '0'
    };
    assert.isFalse(this.subject.validate());
  });

  test('should validate false coords: 0, 15.', function() {
    this.subject.config = {
      latitude: '0',
      longitude: '15.'
    };
    assert.isFalse(this.subject.validate());
  });

  test('should validate false coords: 5.2.3, 0', function() {
    this.subject.config = {
      latitude: '5.2.3',
      longitude: '0'
    };
    assert.isFalse(this.subject.validate());
  });

  test('should validate false coords: 0, 10.1.2', function() {
    this.subject.config = {
      latitude: '0',
      longitude: '10.1.2'
    };
    assert.isFalse(this.subject.validate());
  });

  test('should validate false coords: 90.0000000, 0', function() {
    this.subject.config = {
      latitude: '90.0000000',
      longitude: '0'
    };
    assert.isFalse(this.subject.validate());
  });

  test('should validate false coords: 0, -18.5100125', function() {
    this.subject.config = {
      latitude: '0',
      longitude: '-18.5100125'
    };
    assert.isFalse(this.subject.validate());
  });

  test('should validate false coords: 52.22d55, 0', function() {
    this.subject.config = {
      latitude: '52.22d55',
      longitude: '0'
    };
    assert.isFalse(this.subject.validate());
  });

  test('should validate false coords: 0, 11e', function() {
    this.subject.config = {
      latitude: '0',
      longitude: '11e'
    };
    assert.isFalse(this.subject.validate());
  });

  test('should validate false when latitude is empty', function() {
    this.subject.config = {
      latitude: '',
      longitude: '0'
    };
    assert.isFalse(this.subject.validate());
  });

  test('should validate false when longitude is empty', function() {
    this.subject.config = {
      latitude: '0',
      longitude: ''
    };
    assert.isFalse(this.subject.validate());
  });
});
