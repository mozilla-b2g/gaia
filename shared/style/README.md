Building Blocks
===============

Taxonomy
--------

* `action_menu.css`: context menus
* `buttons.css`: common buttons
* `confirm.css`: dialog boxes with message + accept/dismiss buttons
* `edit_mode.css`: edition panels with a dialog-like button toolbar
* `headers.css`: common header bars (title + navigation buttons)
* `input_areas.css`: common input areas (e.g. search bars)
* `status.css`: notification toasters
* `switches.css`: checkboxes, radio buttons, ON/OFF switches


Specific Attributes
-------------------

A `data-type` attribute is used when the `type` and `role` attributes are not specific enough. Here’s the list of its possible values.

* `action`: used in `action_menu.css`, title + action selection + accept/dismiss buttons
* `confirm`: used in `confirm.css`, message + accept/dismiss buttons
* `edit`: used in `edit_mode.css`, edition panel with dialog-like button toolbar
* `object`: used in `action_menu.css`, action selection + accept/dismiss buttons
* `switch`: used in `switches.css`, turns a checkbox into an ON/OFF switch


Class Name Usage
----------------

We try to avoid arbitrary class names as much as possible, but sometimes we have to use some — here’s the list.

### Common Class Names

**Icons**

* `.icon`
* `.icon-add`
* `.icon-back`
* `.icon-close`
* `.icon-dialog`
* `.icon-edit`
* `.icon-menu`
* `.icon-user`
* `.icon-view`

**Skins**

* `.skin-dark`
* `.skin-organic`

**Buttons**

* `.danger`: dangerous choice, e.g. delete something
* `.recommend`: default/recommended choice, should be safe

**Other**

* `.action`: applies to fieldset elements (explanation needed)
* `.bottom`: bottom-positioned element, applies to search forms
* `.compact`: compact list, applies to button lists
* `.full`: full-width element, applies to buttons or search forms

### Usage by Block

**action_menu.css**

None

**buttons.css**

* `.compact`
* `.danger`
* `.icon-dialog`
* `.icon-view`
* `.recommend`

**confirm.css**

* `.full`

**edit_mode.css**

* `.danger`
* `.full`
* `.icon`
* `.recommend`

**headers.css**

* `.icon`
* `.icon-add`
* `.icon-edit`
* `.icon-close`
* `.icon-back`
* `.icon-menu`
* `.icon-user`
* `.skin-dark`
* `.skin-organic`

**input_areas.css**

* `.action` (explanation needed)
* `.bottom`
* `.full`

**status.css**

None

**switches.css**

* `.danger`

Future improves
----------------
* Use `[data-icon="name"]` instead of `.icon.icon-name`