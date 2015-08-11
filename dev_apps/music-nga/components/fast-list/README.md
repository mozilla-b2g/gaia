# Fast List
[![](https://travis-ci.org/gaia-components/fast-list.svg)](https://travis-ci.org/gaia-components/fast-list)

The FastList is a virtual-list implementation based on the DomScheduler.

The content of the list comes from a `DataSource` that needs to implement the API described
below. When the content is edited from the list "Edit mode", the list will trigger calls to the source itself.

But there's no observation going on, so if the content changes for other reasons the list needs to be made aware of that.

## List API
### Constructor

```js
var myList = new FastList({
  container: document.querySelector('.my-container'),

  /**
   * A template that will be used for each
   * list item. A real element will be passed
   * to populateItem() function to fill.
   * @type {String}
   */
  listTemplate: '<li><h3> </h3><p> </p></li>',

  /**
   * A template that will be used for each
   * section. A real element will be passed
   * to populateSection() function to fill.
   * @type {String}
   */
  sectionTemplate: '<section><h2> </h2></section>',

  /**
   * Called each time a list item needs rendering.
   * @param  {HTMLElement} el Your listTemplate
   * @param  {Number} index
   */
  populateItem: function(el, index) { ... },

  /**
   * Called each time a section needs rendering.
   * @param  {HTMLElement} el Your sectionTemplate
   * @param  {Section} section
   * @param  {Number} index
   */
  populateSection: function(el, section, index) { ... }

  /**
   * Should return a list of sections.
   * Return empty array if not using sections.
   * @return {Array}
   */
  getSections() { ... },

  /**
   * Should return the height of the section header.
   * Can return 0 is not using sections.
   * @return {Number}
   */
  sectionHeaderHeight() { ... },

  /**
   * Should return the height of all
   * the items in a section.
   * @return {Number}
   */
  fullSectionHeight() { ... },

  /**
   * Should return the total number of sections.
   * @return {Number}
   */
  fullSectionLength() { ... },

  /**
   * Should return the section data for the item.
   * @return {*}
   */
  getSectionFor(index) { ... },

  /**
   * Should return the item at index.
   * @param  {Number} index
   * @return {Object}
   */
  getRecordAt: function(index) { ... },

  /**
   * Should return the item index at
   * the given y-offset position.

   * @param  {Number} pos
   * @return {Index}
   */
  indexAtPosition: function(pos) { ... },

  /**
   * Should return the y-offset of
   * the given item index.
   * @param  {Number} index
   * @return {Number}
   */
  positionForIndex: function(index) { ... },

  /**
   * Should return the full list length.
   * @return {Number}
   */
  fullLength: function() { ... },

  /**
   * Should return the item px height.
   * @return {Number}
   */
  itemHeight: function() { ... },

  /**
   * Should return the full height of the list
   * including all items and section headers.
   * @return {Number}
   */
  fullHeight: function() { ... },

  /**
   * SHould insert the given record into the your
   * source data list at the given index.
   * @param  {Number} index
   * @param  {Object} record
   * @param  {*} toSection
   */
  insertAtIndex: function(index, record, toSection) { ... },

  /**
   * Should replace a record in the source data
   * list at the given index.
   * @param  {Number} index
   * @param  {Object} record
   */
  replaceAtIndex: function(index, record) { ... }
});
```

## API

### Edit mode

```js
list.toggleEditMode()
```

This method returns a promise, fulfilled once the transition is done.

### Notifying of new content insertion

```js
list.insertedAtIndex(0);
```

To insert with a nice transition.

```js
list.reloadData()
```

For bigger, instantaneous changes.

### Scrolling

```js
list.scrollTop
```

Will give you the *cached* scroll top position (not causing a reflow).

```js
list.scrollInstantly(by)
```

Will do as it says.

```js
list.updateListHeight()
```

Can be called if the number of items in the list has changed, it'll return a scheduler promise fulfilled after the mutation is executed. This will also cause the scrollbar to flash.
