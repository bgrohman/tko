#tko
tko is a framework for writing modular JavaScript with models, collections, routing, pub/sub, notifications, and client-side storage. If you like Backbone's models and collections but don't want to give up Knockout's two-way data-binding, then tko is for you.

##Example
The included [example](https://github.com/bgrohman/tko/tree/master/example/example-app) shows tko's Application, Model, and Collection objects used to build a todo list application. Check out the [unit tests](https://github.com/bgrohman/tko/blob/master/test/tko-test.js) for more detail.

###Creating a Model
```javascript
var Person = tko.Model.extend({
    urlRoot: '/person',
    first: ko.observable(),
    last: ko.observable(),
    full: function() {
        return this.first() + ' ' + this.last();
    }
});

var neil = new Person({
    first: 'Neil',
    last: 'Stephenson'
});

neil.first('Bob');
console.log(neil.toJS());
```
###Creating a Collection
```javascript
var People = tko.Collection.extend({
    model: Person,
    url: '/people',
    sortBy: 'first'
});

var authors = new People([
    {id: 1, first: 'Neil', last: 'Stephenson'},
    {id: 2, first: 'J. R. R.', last: 'Tolkien'},
    {id: 3, first: 'Patrick', last: 'Rothfuss'}
]);

console.log(authors.at(0).full());
console.log(authors.get(3).full());
```

###Creating a Model with a Collection###
```javascript
var Group = tko.Model.extend({
    urlRoot: '/group',
    name: ko.observable(),
    members: People
});

var group = new Group({
    name: 'My Group',
    members: authors
});

console.log(group.members().at(0));
console.log(group.toJS());
```

##Dependencies
- [Knockout](http://knockoutjs.com/)
- [Underscore](http://underscorejs.org/)
- [jQuery](http://jquery.com/)
- [Amplify](http://amplifyjs.org/)
- [Routie](http://projects.jga.me/routie/)
- [Bootstrap](http://twitter.github.com/bootstrap/)
