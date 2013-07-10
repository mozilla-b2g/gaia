Building Blocks
===============

Overview
---------
You must follow the CSS guidelines for Gaia project in order to get approved your contributions: https://wiki.mozilla.org/Gaia/CSS_Guidelines
The IRC channel (#buildingBlocks) under irc.mozilla.org provides support and technical guidance

The people that currently maintain this project are:
* **Arnau March**
  * E-mail: arnau@tid.es
  * GitHub: @rnowm
* **Pavel Ivanov**
  * E-mail: pivanov@mozilla.com
  * GitHub: @pivanov
* **Fabien Cazenave**
  * E-mail: kaze@mozilla.com
  * GitHub: @fabi1cazenave
* **Ismael González**
  * E-mail: ismael@basiclines.com
  * GitHub: @basiclines

Goals
-------
The Building Blocks aims to create a suite of components that could work each other without collisions and must able to coexist with custom application styles and components.
For this reason we need to define a way to work with classes inside the components.

Creating/Using classes
--------------------
* **Always use classes** with dash-case, the ID’s are not allowed.
* **Components must define a namespace** and must be in singular (.bb-header)
* In order to avoid verbosing cases in the html (<header class="bb-header">) you may provide a markup-closed namespace alternative for your component (header.bb)
* All **classes must be prefixed by the namespace** to avoid collisions (.bb-header .my-class)
* New class names should be based on the UI element defined (action, icon, item, media) + content if needed (.bb-header .action-back)
* In case of multiples types of elements that need to use a **generic class you should use a single-word** class (.icon) then all the variants must be prefixed with the previous word (.icon-add)
* **You may use tags in the selectors** if the element is specific enough (there aren't more tags of the same type at the same level or deeper)

Do's & Dont's
--------------
**Do** (create a component namespace with the bb- prefix):

`
.bb-header …
`

**Don't** (use generic tags by defining a closed markup):

`
section[role="region"] > header:first-child ...
`


**Do** (use the namespace and a generic class to style generic parts inside the BB):

`
.bb-header .action ...
`

**Don't** (use tag selector for multiples tags that can be selected by a classname):

`
.bb-header a,
.bb-header button …
`


**Do** ( you may use tag selector if it is specific enough):

`
.bb-header h1 ...
`

`
.bb-header .action span ...
`

**Don't** (use tags selector for a too generic selector):

`
.bb-header span ...
`


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
* `drawer.css`: hidden menu that appears by sliding the main content
* `lists.css`: used to create list based structures
* `progress_activity.css`: spinners and progress bars
* `seekbars.css`: range inputs to determine a value between a max/min
* `tabs.css`: controls navigation
* `toolbars.css`: set of actions related with the content


Ideas
----------------
* Use `[data-icon="name"]` instead of `.icon.icon-name`
* Use CSS3 gradients instead of images
* SVG icons
