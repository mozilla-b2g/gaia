TESTS?=$(shell find test -name *_test.js)
REPORTER?=spec
MOCHA_OPTS=--reporter $(REPORTER) \
					 $(TESTS)

.PHONY: default
default: lint test

b2g:
	./node_modules/.bin/mozilla-download --verbose --product b2g $@

.PHONY: lint
lint:
	gjslint  --recurse . \
		--disable "210,217,220,225,0212" \
		--exclude_directories "b2g,examples,node_modules"	

.PHONY: test
test: b2g
	SYNC=true ./node_modules/.bin/marionette-mocha $(MOCHA_OPTS)
