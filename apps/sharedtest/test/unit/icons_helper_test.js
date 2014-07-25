'use strict';
/* global IconsHelper */

require('/shared/js/icons_helper.js');

suite('Icons Helper', function() {

  var dprProperty;
  var dpr = 1;

  var fakeDevicePixelRatio = {
    get: function() {
      return dpr;
    }
  };

  suiteSetup(function(){
    // As we are selecting the icons based on devicepixelraio
    // let's mock the property
    dprProperty = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      get: fakeDevicePixelRatio.get
    });
  });

  suiteTeardown(function() {
    Object.defineProperty(window, 'devicePixelRatio', dprProperty);
  });

  suite('No size information', function() {
    test('> Single element with no size info', function() {
      var icons = {
        'uri1': {
          sizes: []
        }
      };

      var sizesSupported = IconsHelper.getSizes(icons);
      assert.deepEqual(sizesSupported, {});
    });

    test('> Several items one without size info', function() {
      var icons = {
        'uri1': {
          sizes: []
        },
        'uri2': {
          sizes: ['10x10']
        }
      };

      var sizesSupported = IconsHelper.getSizes(icons);
      assert.isNotNull(sizesSupported);
      var sizes = Object.keys(sizesSupported);
      assert.equal(sizes.length, 1);
      assert.equal(sizes[0], '10');
    });
  });

  suite('Correct size support', function() {
    test('> Check sizes detected', function() {
      var icons = {
        'uri1': {
          sizes: ['10x10', '20x20', '30x30']
        }
      };

      var sizesSupported = IconsHelper.getSizes(icons);
      assert.isNotNull(sizesSupported);
      var sizes = Object.keys(sizesSupported);
      assert.equal(sizes.length, 3);
      assert.equal(sizes[0], '10');
      assert.equal(sizes[1], '20');
      assert.equal(sizes[2], '30');
    });

    test('> Check with incorrecti file sizes', function() {
      var icons = {
        'uri1': {
          sizes: ['10', '', '30x30', 'x']
        }
      };

      var sizesSupported = IconsHelper.getSizes(icons);
      assert.isNotNull(sizesSupported);
      var sizes = Object.keys(sizesSupported);
      assert.equal(sizes.length, 1);
      assert.equal(sizes[0], '30');
    });
  });

  suite('Get best icon', function() {

    test('Get correct icon with no size support', function() {
      var icons = {
        'uri1': {
          sizes: []
        }
      };

      var candidate = IconsHelper.getBestIcon(icons);
      assert.isNotNull(candidate);
      assert.equal(candidate, 'uri1');
    });

    test('Get icon with size support', function() {
      var icons = {
        'uri1': {
          sizes: []
        },
        'uri2': {
          sizes: ['16x16']
        }
      };

      var candidate = IconsHelper.getBestIcon(icons);
      assert.isNotNull(candidate);
      assert.equal(candidate, 'uri2');
    });

    test('Get best icon which doesnt match specific size', function() {
      // With dpr = 1
      var icons = {
        'uri1': {
          sizes: ['90x90']
        },
        'uri2': {
          sizes: ['200x200']
        }
      };

      var candidate = IconsHelper.getBestIcon(icons);
      assert.isNotNull(candidate);
      assert.equal(candidate, 'uri1');
    });

    test('With higher dpi', function() {
      // With dpr = 1.5
      dpr = 1.5;
      var icons = {
        'uri1': {
          sizes: ['90x90']
        },
        'uri2': {
          sizes: ['200x200']
        },
        'uri3': {
          sizes: ['500x500']
        }
      };

      var candidate = IconsHelper.getBestIcon(icons);
      assert.isNotNull(candidate);
      assert.equal(candidate, 'uri2');
      dpr = 1;
    });

    test('Specific icon size', function() {
      // With dpr = 1.5
      dpr = 1.5;
      var icons = {
        'uri1': {
          sizes: ['90x90']
        },
        'uri2': {
          sizes: ['200x200']
        },
        'uri3': {
          sizes: ['500x500']
        }
      };

      // With dpr 1.5 we should get icon 'uri2'
      // Let's ask for a bigger size.

      var candidate = IconsHelper.getBestIcon(icons, 400);
      assert.isNotNull(candidate);
      assert.equal(candidate, 'uri3');
      dpr = 1;
    });

  });

});