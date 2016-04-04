(function(exports) {

  /* global TAG_OPTIONS, ContactsTag, MainNavigation, LazyLoader */
  /* exported TagSelector*/

  'use strict';

  var customTag, customTagReset, tagDone, tagHeader, lazyLoadedTagsDom = false;
  var contactTag;

  function handleCustomTagReset(ev) {
    ev.preventDefault();
    if (customTag) {
      customTag.value = '';
    }
  }

  function handleCustomTag(ev) {
    if (ev.keyCode === 13) {
      ev.preventDefault();
    }
    ContactsTag.touchCustomTag();
  }

  function handleBack(cb) {
    MainNavigation.back(cb);
  }

  function handleSelectTagDone() {
    var prevValue = contactTag.textContent;
    ContactsTag.clickDone(function() {
      var valueModifiedEvent = new CustomEvent('ValueModified', {
        bubbles: true,
        detail: {
          prevValue: prevValue,
          newValue: contactTag.textContent
        }
      });
      contactTag.dispatchEvent(valueModifiedEvent);
      handleBack();
    });
  }

  function showSelectTag() {
    var tagsList = document.getElementById('tags-list');
    var selectedTagType = contactTag.dataset.taglist;
    var options = TAG_OPTIONS[selectedTagType];

    var type = selectedTagType.split('-')[0];
    var isCustomTagVisible = (document.querySelector(
      '[data-template]' + '.' + type + '-' +
      'template').dataset.custom != 'false');

    options = ContactsTag.filterTags(type, contactTag, options);

    if (!customTag) {
      customTag = document.querySelector('#custom-tag');
      customTag.addEventListener('keydown', handleCustomTag);
      customTag.addEventListener('touchend', handleCustomTag);
    }
    if (!customTagReset) {
      customTagReset = document.getElementById('custom-tag-reset');
      customTagReset.addEventListener('touchstart', handleCustomTagReset);
    }
    if (!tagDone) {
      tagDone = document.querySelector('#settings-done');
      tagDone.addEventListener('click', handleSelectTagDone);
    }
    if (!tagHeader) {
      tagHeader = document.querySelector('#settings-header');
      tagHeader.addEventListener('action', handleBack);
    }

    ContactsTag.setCustomTag(customTag);
    // Set whether the custom tag is visible or not
    // This is needed for dates as we only support bday and anniversary
    // and not custom dates
    ContactsTag.setCustomTagVisibility(isCustomTagVisible);

    ContactsTag.fillTagOptions(tagsList, contactTag, options);

    MainNavigation.go('view-select-tag', 'right-left');
    if (document.activeElement) {
      document.activeElement.blur();
    }
  }

  var TagSelector = {

	  show: function goToSelectTag(pContactTag) {
	    contactTag = pContactTag;

	    var tagViewElement = document.getElementById('view-select-tag');
	    if (!lazyLoadedTagsDom) {
	      LazyLoader.load(tagViewElement, function() {
	        showSelectTag();
	        lazyLoadedTagsDom = true;
	       });
	    }
	    else {
	      showSelectTag();
	    }
	  }

  };

  exports.TagSelector = TagSelector;
}(window));
