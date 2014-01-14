CONCAT_FILES=./node_modules/eventemitter2/lib/eventemitter2.js \
						 ./lib/index.js

TARGET=json-wire-protocol.js

.PHONY: build
build:
	cat $(CONCAT_FILES) > $(TARGET)

.PHONY: test
test: test-node test-browser

.PHONY: test-node
test-node:
	./node_modules/mocha/bin/mocha --ui tdd test/setup.js test/*-test.js

.PHONY: test-server
test-browser:
	./node_modules/test-agent/bin/js-test-agent test

.PHONY: test-server
test-server:
	./node_modules/test-agent/bin/js-test-agent server --growl

