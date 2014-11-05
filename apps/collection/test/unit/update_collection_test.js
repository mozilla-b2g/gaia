'use strict';

/* global loadBodyHTML, CollectionEditor, Icon */
/* global require, suite, suiteTeardown, suiteSetup, test, assert, sinon */

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/js/homescreens/icon.js');

requireApp('collection/js/common.js');
requireApp('collection/js/objects.js');
requireApp('collection/js/update_collection.js');

suite('update_collection.js >', function() {

  var name = 'Enjoy', iconRenderStub;

  var collection = {
    id: 134,
    categoryId: 423,
    name: name
  };

  suiteSetup(function() {
    loadBodyHTML('/update.html');
    iconRenderStub = sinon.stub(Icon.prototype, 'render', noop);
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
    iconRenderStub.restore();
  });

  function noop() {
    // Do nothing
  }

  function dispatchInputEvent() {
    CollectionEditor.form.dispatchEvent(new CustomEvent('input'));
  }

  suite('UI initialized correctly >', function() {
    suiteSetup(function() {
      CollectionEditor.init({
        data: collection
      });
    });

    test('The title was defined accordingly >', function() {
      assert.equal(CollectionEditor.collectionTitle.value, name);
    });

    test('"done" button is disabled initially', function() {
      assert.isTrue(CollectionEditor.saveButton.disabled);
    });
  });

  suite('Checking "done" button >', function() {

    suiteSetup(function() {
      CollectionEditor.init({
        data: collection
      });
    });

    test('Typing collection name ', function() {
      CollectionEditor.collectionTitle.value = 'Telefonica';
      dispatchInputEvent();
      assert.isFalse(CollectionEditor.saveButton.disabled);

      CollectionEditor.collectionTitle.value = '';
      dispatchInputEvent();
      assert.isTrue(CollectionEditor.saveButton.disabled);

      CollectionEditor.collectionTitle.value = name;
      dispatchInputEvent();
      assert.isFalse(CollectionEditor.saveButton.disabled);
    });

  });

  suite('Checking "close" button >', function() {

    test('Cancelling after clicking "close" button ', function(done) {
      CollectionEditor.init({
        data: collection,
        oncancelled: function() {
          this.oncancelled = noop;
          done();
        }
      });

      CollectionEditor.header.dispatchEvent(new CustomEvent('action'));
    });

  });

  suite('Saving collection with another name >', function() {
    var expectedName = 'Games';

    test('Updated successfully ', function(done) {
      CollectionEditor.init({
        data: collection,
        onsaved: function() {
          this.onsaved = noop;
          done();
        }
      });

      sinon.stub(CollectionEditor.collection, 'rename', function(name) {
        assert.equal(name, expectedName);
        return {
          then: function(resolve) {
            resolve();
          }
        };
      });

      CollectionEditor.collectionTitle.value = expectedName;
      CollectionEditor.saveButton.click();
    });

  });

});
