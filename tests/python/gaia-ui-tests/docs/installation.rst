Installation
============

You will need a `Marionette enabled Firefox build <https://developer.mozilla.org/en-US/docs/Marionette/Builds>`_ that you can `successfully connect to <https://developer.mozilla.org/en-US/docs/Marionette/Connecting_to_B2G/>`_.

Before installing gaiatest you may want to consider creating a `virtual environment <https://virtualenv.pypa.io/en/latest/>`_::

    virtualenv env_name
    source env_name/bin/activate

If you only want to use gaiatest without making changes::

    pip install gaiatest

However, if you want to modify gaiatest, first clone the Gaia repository before running setup.py::

    git clone https://github.com/mozilla-b2g/gaia.git
    cd gaia/tests/python/gaia-ui-tests
    python setup.py develop