.PHONY: default
default: lint test

node_modules:
	npm install

.PHONY: lint
lint:
	gjslint --recurse . \
		--disable "210,217,220,225" \
		--exclude_directories "examples,node_modules"

.PHONY: test
test: node_modules
	./node_modules/.bin/mocha test/index
