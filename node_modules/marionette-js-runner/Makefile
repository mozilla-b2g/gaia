default: lint test

b2g:
	./node_modules/.bin/mozilla-download \
		--product b2g \
		--channel tinderbox \
		--branch mozilla-central $@

.PHONY: node_modules
node_modules:
	npm install

.PHONY: test
test: node_modules b2g test-unit test-integration

.PHONY: lint
lint:
	gjslint --recurse . \
		--disable "220,225" \
		--exclude_directories "examples,node_modules,b2g,api-design"

.PHONY: test-integration
test-integration:
	./bin/marionette-mocha $(shell find test/integration) -t 100s

.PHONY: test-logger
test-logger:
	./bin/marionette-mocha test/logger/console-proxy.js -t 100s --verbose

.PHONY: test-unit
test-unit:
	./node_modules/.bin/mocha -t 100s \
		test/mocha/parentrunner.js \
		test/childrunner.js \
		test/optsfileparser.js \
		test/profilebuilder.js \
		test/runtime.js \
		test/runtime/*.js \
		test/marionette.js \
		test/bin/marionette-mocha.js

.PHONY: ci
ci:
	Xvfb :99 &
	DISPLAY=:99 make
