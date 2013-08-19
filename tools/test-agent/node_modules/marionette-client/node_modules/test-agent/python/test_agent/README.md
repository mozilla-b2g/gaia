Hack for python test-agent server.

````sh
pip install autobahn
# note that paths are not related to the actual file system in this case
python main.py test/test-agent/inspect-test.js
```

Gaia runner example:

````sh
# cd into your local gaia copy ( which I assume you have )
cd gaia
# link to js-test-agent python runner (which I assume you have downloaded to ~/workspace/js-test-agent/)
ln -s ~/workspace/js-test-agent/python .

# the path logic in gaia is (app)(realpath to test)
python python/test_agent/main.py browser/test/unit/date_helper_test.js calendar/test/unit/calc_test.js
````