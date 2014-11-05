# Web Components in Gaia

This directory contains a set of the web components used around gaia.


## Component File Structure

All components typically share a similar file structure.

* script.js - The custom component logic. Currently also contains the component template which we are considering using HTML imports for.
* style.css - The scoped component stylesheet.
* images/ - Any image resouces that the component needs to use.
* examples/ - An example file that will load within Firefox Nightly.
* js/ - Any additional javascript logic that your components need to load. We have not yet figured out a module system, so you will need to load these files on your own.
* locales/ - Localized string files. Not all components need this.


## Implementation

Apps implement components by pulling in the custom element definition, currently a script file, then using the custom elements as desired. It may be helpful to view the source of the component examples within each folder to get an idea of the best way to leverage or create a component.

```
<!-- Element include within the app HTML -->
<script src="/shared/js/component_utils.js"></script>
<script src="/shared/elements/gaia_buttons/script.js"></script>

<!-- Using a web component -->
<gaia-buttons skin="dark">
	<button>Button 1</button>
	<button disabled>Button 2</button>
</gaia-buttons>
```


## ComponentUtils

ComponentUtils.js is a file in shared/ which is currently required due to a few platform bugs with Web Components. Once these bugs have been fixed this file will be removed.


## Localization

Some components may want to serve their own localized strings. These strings are located within the locales/ folder of each component, and specified like they normally are within each app. To prevent key collision, we prefix each key with the component name. E.g., ```gaia-grid-some-l10n-key```.


## Build System

Component files are bundled within each application when the HTML file is parsed at build time. If we detect any components being loaded, we automatically bundle css, image, and locale resources from the component folder.


## Tests

Currently most web components ship with a few unit tests located in apps/sharedtest/test/unit. Follow the standard gaia unit testing procedures to run these tests.
