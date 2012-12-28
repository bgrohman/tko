/*globals QUnit:true, test:true, asyncTest:true, start:true, expect:true, ok:true, deepEqual:true, equal:true */
(function(globals) {
	"use strict";

	var $ = globals.$, 
		_ = globals._,
		ko = globals.ko,
		tko = globals.tko,
		idCount = 1,
		postCount = 0,
		putCount = {},
		deleteCount = {},
		Person,
		People,
		SortedPeople,
		personList,
		rawPersonList;

	$.ajax = function(options) {
		var deferred = $.Deferred(),
			id;

		if (options.url.substring(0, 7) === '/person') {
			if (options.type === 'POST') {
				options.data.id = idCount;
				idCount += 1;
				postCount += 1;
				
				_.defer(function() {
					deferred.resolve(options.data);
				});
			} else if (options.type === 'PUT') {
				id = options.url.substr(8);

				if (_.isUndefined(putCount[id])) {
					putCount[id] = 0;
				}
				putCount[id] += 1;

				_.defer(function() {
					deferred.resolve(options.data);
				});
			} else if (options.type === 'DELETE') {
				id = options.url.substr(8);

				if (_.isUndefined(deleteCount[id])) {
					deleteCount[id] = 0;
				}
				deleteCount[id] += 1;

				_.defer(function() {
					deferred.resolve(options.data);
				});
			} else if (options.type === 'GET') {
				id = options.url.substr(8);
				_.defer(function() {
					deferred.resolve({
						first: 'John' + id,
						last: 'Doe' + id
					});
				});
			}
		}

		return deferred;
	};

	module('tko.app');
	asyncTest('initialization', function() {
		var app = new tko.App({
			test1: ko.observable('foo')
		});

		app.subscribe('app.initialized', function() {
			equal(app.test1(), 'foo');
			start();
		});
	});

	asyncTest('notifications', function() {
		var app = new tko.App({
			foo: function(x) {
				this.notify('info', x);
			},
			bar: function(x) {
				this.notify('success', x, 3000);
			}
		});

		app.foo('foo');
		equal(app.notifications.info(), 'foo', 'notification without timeout');
		app.foo('bar');
		equal(app.notifications.info(), 'bar', 'notification without timeout');

		app.bar('test');
		equal(app.notifications.success(), 'test', 'notification with timeout');
		setTimeout(function() {
			equal(app.notifications.success(), null, 'notification after timeout');
			start();
		}, 3500);
	});

	test('settings', function() {
		var app = new tko.App({});

		app.saveSetting('foo', 'bar');
		equal(app.retrieveSetting('foo'), 'bar', 'retrieve saved setting');

		app.saveSetting('foo', 'baz');
		equal(app.retrieveSetting('foo'), 'baz', 'overwrite saved setting');
	});

	asyncTest('pub/sub', function() {
		var fooCount = 0,
			initSub,
			sub,
			app;

		app = new tko.App({});
	
		sub = app.subscribe('foo', function() {
			fooCount += 1;
			equal(fooCount, 1, 'subscription received');
		});
		app.publish('foo');

		app.unsubscribe('foo', sub);
		app.publish('foo');
		setTimeout(function() {
			equal(fooCount, 1, 'unsubscribe works');
			start();
		}, 2000);

		app.subscribe('bar', function(msg) {
			equal(msg.foo, 'baz', 'subscription receives messages');
		});
		app.publish('bar', {foo: 'baz'});

		initSub = app.subscribe('app.initialized', function() {
			ok(true, 'initialized message received');
			app.unsubscribe('app.initialized', initSub);
		});

		sub = app.subscribe('app.initialized', function() {
			ok(true, 'initialized message delivered after the fact');
			app.unsubscribe('app.initialized', sub);
		});
	});

	asyncTest('routing', function() {
		function VM1(app) {
			this.foo = ko.observable('foo');
			this.view = '<p id="vm1" data-bind="text: foo"></p>';
		}

		function VM2(app) {
			this.foo = ko.observable('bar');
			this.view = '<p id="vm2" data-bind="text: foo"></p>';
		}

		var app = new tko.App({
			$root: $('#routing-root'),
			pages: [
				{name: 'hello', route: 'hello', ViewModel: VM1, isDefault: true},
				{name: 'world', route: 'world', ViewModel: VM2}
			],
			routes: {
				'foo': function() {
					ok(true, 'basic route works');
				},
				'bar/:baz': function(baz) {
					ok(true, 'route with param works');
					equal(baz, 'baz', 'route with param has correct param value');
					start();
					this.navigate('');
				}
			}
		});

		equal($('#vm1').text(), 'foo', 'page view model data binding works');
		equal($('#vm2').text(), 'bar', 'page view model data binding works');

		app.navigate('hello');
		setTimeout(function() {
			ok(app.getPage('hello').visible(), 'correct page is visible');
			ok(!app.getPage('world').visible(), 'other pages are not visible');

			app.navigate('world');
			setTimeout(function() {
				ok(app.getPage('world').visible(), 'correct page is visible');
				ok(!app.getPage('hello').visible(), 'other pages are not visible');

				setTimeout(function() {
					app.navigate('foo');

					setTimeout(function() {
						app.navigate('bar/baz');
					}, 250);
				}, 250);
			}, 250);
		}, 250);
	});

	module('tko.Model');

	Person = tko.Model.extend({
		urlRoot: '/person',
		first: ko.observable(),
		last: ko.observable(),
		full: function() {
			return this.first() + ' ' + this.last();
		}
	});

	test('basics', function() {
		var obj = new Person(),
			obj2;

		ok(obj.first, 'new model instances have correct observables');
		ok(obj.last, 'new model instances have correct observables');
		equal(obj.urlRoot, '/person', 'new model instances have correct properties');
		ok(_.isFunction(obj.full), 'new model instances have correct functions');
		ok(!obj.id, 'new models do not have an id');

		obj = new Person({
			first: 'Bryan',
			last: 'G'
		});
		equal(obj.first(), 'Bryan', 'constructing a model with properties');
		equal(obj.last(), 'G', 'constructing a model with properties');
		equal(obj.full(), 'Bryan G', 'model functions work');

		obj2 = new Person({
			first: 'John',
			last: 'Doe'
		});
		equal(obj.first(), 'Bryan', 'constructing a model with properties');
		equal(obj2.first(), 'John', 'constructing a model with properties');
		equal(obj.full(), 'Bryan G', 'model functions work');
		equal(obj2.full(), 'John Doe', 'model functions work');
	});

	test('setting properties', function() {
		var person = new Person(),
			otherPerson = new Person(),
			obj = {first: 'foo', last: 'bar'};

		person.setProperties(obj);
		equal(person.first(), 'foo', 'existing properties are set');
		equal(person.last(), 'bar', 'existing properties are set');

		person.setProperties({first: 'baz'});
		equal(person.first(), 'baz', 'setting a subset of properties');
		equal(person.last(), 'bar', 'setting a subset of properties');

		person.setProperties({foobar: 'foobar'});
		equal(person.first(), 'baz', 'setting missing properties');
		equal(person.last(), 'bar', 'setting missing properties');
		ok(!person.foobar, 'missing properties are not set');

		otherPerson.setProperties({first: 'John', last: 'Doe'});
		person.setProperties(otherPerson);
		equal(person.first(), 'John', 'copying properties from another model');
		equal(person.last(), 'Doe', 'copying properties from another model');
	});

	test('converting to JS', function() {
		var person,
			result;
		
		person = new Person({
			first: 'John',
			last: 'Doe'
		});
		result = person.toJS();
		deepEqual(result, {first: 'John', last: 'Doe'}, 'converting model to JS');
	});

	asyncTest('saving a new model', function() {
		var person = new Person({
			first: 'John',
			last: 'Doe'
		});

		person.save().done(function() {
			equal(postCount, 1, 'saving a new model generates a post');
			equal(person.id(), 1, 'saved models have an id');
			deepEqual(person.toJS(), {id: 1, first: 'John', last: 'Doe'}, 'saved models are not altered');
			start();
		});
	});

	asyncTest('saving an existing model', function() {
		var posts = postCount, 
			person = new Person({
				id: 10,
				first: 'Jane',
				last: 'Doe'
			});

		person.save().done(function() {
			equal(postCount, posts, 'saving an existing model generates a put');
			equal(putCount['10'], 1, 'saving an existing model generates a put');
			equal(person.id(), 10, 'saving an existing model does not change the id');
			start();
		});
	});

	asyncTest('deleting a model', function() {
		var posts = postCount, 
			person = new Person({
				id: 20,
				first: 'Jane',
				last: 'Doe'
			});

		person.destroy().then(function() {
			equal(postCount, posts, 'deleting an existing model generates a delete');
			ok(_.isUndefined(putCount['20']), 'deleting an existing model generates a delete');
			equal(deleteCount['20'], 1, 'deleting an existing model generates a delete');
			start();
		});
	});

	asyncTest('fetching a model', function() {
		var person = new Person({
			id: 999
		});

		person.fetch().done(function() {
			equal(person.first(), 'John999', 'fetching a model');
			equal(person.last(), 'Doe999', 'fetching a model');
			equal(person.id(), 999, 'fetching a model does not change the id');
			start();
		});
	});

	module('tko.Collection');

	personList = [
		new Person({id: 11, first: 'John', last: 'Doe'}),
		new Person({id: 22, first: 'Jane', last: 'Doe'}),
		new Person({id: 33, first: 'Bryan', last: 'G'})
	];

	rawPersonList = [
		{id: 11, first: 'John', last: 'Doe'},
		{id: 22, first: 'Jane', last: 'Doe'},
		{id: 33, first: 'Bryan', last: 'G'}
	];

	People = tko.Collection.extend({
		model: Person,
		url: '/people'
	});

	SortedPeople = tko.Collection.extend({
		model: Person,
		url: '/people',
		foo: 'bar',
		length: 999,
		sortBy: 'first'
	});

	test('basics', function() {
		var people = new People(),
			people2,
			sortedPeople;

		equal(people.model, Person, 'new collections have the correct Model');
		equal(people.url, '/people', 'new collections have the correct url');
		equal(people.values().length, 0, 'new collections are empty');
		equal(people.length(), 0, 'new collections are empty');

		people2 = new People(personList);
		equal(people.length(), 0, 'new collections do not affect existing Collections');
		equal(people2.values().length, 3, 'collection initialized with values has correct length');
		equal(people2.length(), 3, 'collection initialized with values has correct length');

		deepEqual(people2.at(0), personList[0], 'collection members can be retrieved by index');
		deepEqual(people2.at(1), personList[1], 'collection members can be retrieved by index');
		deepEqual(people2.at(2), personList[2], 'collection members can be retrieved by index');

		ok(_.isUndefined(people2.at(3)), 'collection members can be retrieved by index');
		deepEqual(people2.get(11), personList[0], 'collection members can be retrieved by id');
		deepEqual(people2.get(22), personList[1], 'collection members can be retrieved by id');
		deepEqual(people2.get(33), personList[2], 'collection members can be retrieved by id');
		ok(_.isUndefined(people2.get(0)), 'collection members can be retrieved by id');

		deepEqual(people2.toJS(), rawPersonList, 'collections can be converted to plain objects');
	});

	test('sorting', function() {
		var sortedPeople = new SortedPeople(personList),
			newPerson;

		ok(_.isUndefined(sortedPeople.foo), 'only certain properties can be set');
		equal(sortedPeople.length(), 3, 'collection initialized with values has correct length');
		deepEqual(sortedPeople.at(0), personList[2], 'collections can be sorted initially');
		deepEqual(sortedPeople.at(1), personList[0], 'collections can be sorted initially');
		deepEqual(sortedPeople.at(2), personList[1], 'collections can be sorted initially');

		sortedPeople.sortBy('last');
		deepEqual(sortedPeople.at(0), personList[0], 'collections can be re-sorted');
		deepEqual(sortedPeople.at(1), personList[1], 'collections can be re-sorted');
		deepEqual(sortedPeople.at(2), personList[2], 'collections can be re-sorted');

		sortedPeople.sortBy(function(a, b) {
			var av = a.full(),
				bv = b.full();
			
			return av === bv ? 0 : (av < bv ? -1 : 1);
		});
		deepEqual(sortedPeople.at(0), personList[2], 'collections can be sorted using custom comparators');
		deepEqual(sortedPeople.at(1), personList[0], 'collections can be sorted using custom comparators');
		deepEqual(sortedPeople.at(2), personList[1], 'collections can be sorted using custom comparators');
		
		newPerson = new Person({id: 44, first: 'John', last: 'Aaa'});
		sortedPeople.values.push(newPerson);
		deepEqual(sortedPeople.at(0), newPerson, 'collections maintain sort order when models are added');
		deepEqual(sortedPeople.at(1), personList[2], 'collections maintain sort order when models are added');
		deepEqual(sortedPeople.at(2), personList[0], 'collections maintain sort order when models are added');
		deepEqual(sortedPeople.at(3), personList[1], 'collections maintain sort order when models are added');
	});
}(window));
