'use strict';

var ContactsTag = (function() {
  var originalTag = null;
  var selectedTag = null;
  var customTag = null;

  var setCustomTag = function setCustomTag(element) {
    customTag = element;
  };

  var touchCustomTag = function touchCustomTag(callback) {
    if (selectedTag) {
      selectedTag.removeAttribute('class');
    }
    selectedTag = null;

    if (callback !== undefined && typeof callback === 'function') {
      callback();
    }
  };

  var fillTagOptions = function fillTagOptions(target, _originalTag, options) {
    utils.dom.removeChildNodes(target);
    originalTag = _originalTag;

    var selectedLink;
    for (var option in options) {
      var tagLink = document.createElement('button');
      tagLink.dataset.index = option;
      tagLink.textContent = options[option].value;
      tagLink.setAttribute('data-l10n-id', options[option].type);
      tagLink.setAttribute('data-value', options[option].type);

      tagLink.addEventListener('click', function(event) {
        var tag = event.target;
        selectTag(tag);
        event.preventDefault();
      });

      if (originalTag.dataset.value == options[option].type) {
        selectedLink = tagLink;
      }

      var tagItem = document.createElement('li');
      tagItem.appendChild(tagLink);
      target.appendChild(tagItem);
    }

    customTag.value = '';
    if (!selectedLink && originalTag.textContent) {
      customTag.value = originalTag.textContent;
    }
    selectTag(selectedLink);
  };

  var selectTag = function selectTag(tag) {
    if (tag == null) {
      return;
    }

    //Clean any trace of the custom tag
    customTag.value = '';

    if (selectedTag) {
      selectedTag.removeAttribute('class');
    }
    tag.className = 'icon icon-selected';
    selectedTag = tag;
  };

  var clickDone = function clickDone(callback) {
    if (selectedTag) {
      originalTag.textContent = selectedTag.textContent;
      originalTag.dataset.l10nId = selectedTag.dataset.l10nId;
      originalTag.dataset.value = selectedTag.dataset.value;
    } else if (customTag.value.length > 0) {
      originalTag.textContent = customTag.value;
      originalTag.dataset.value = customTag.value;
    }
    originalTag = null;

    if (callback !== undefined && typeof callback === 'function') {
      callback();
    }
  };

  return {
    'setCustomTag': setCustomTag,
    'touchCustomTag': touchCustomTag,
    'fillTagOptions': fillTagOptions,
    'clickDone': clickDone
  };
})();
