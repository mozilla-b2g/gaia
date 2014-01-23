default: lint test

node_modules:
	npm install

.PHONY: test
test: node_modules
	./node_modules/.bin/mocha $(shell find . -name '*_test.js')

.PHONY: lint
lint:
	gjslint  --recurse . \
		--disable "210,217,220,225,0212" \
		--exclude_directories "b2g,examples,node_modules"
