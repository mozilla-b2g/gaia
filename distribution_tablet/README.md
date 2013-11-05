`distribution_tablet` is the default customization folder for tablet version.
Developer could create your own tablet distribution based on this folder.

To build Gaia for tablet, just change current path to main gaia folder, then pass following parameter in build script:

    GAIA_DISTRIBUTION_DIR=distribution_tablet make

`GAIA_DISTRIBUTION_DIR` is used to specify target customization folder.

Please refer [Customization](https://wiki.mozilla.org/B2G/MarketCustomizations) document to understand how customization works.
