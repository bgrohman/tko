define(
    [
        'underscore', 
        'knockout', 
        'tko', 
        'models/Todo', 
        'models/TodoList', 
        'text!views/todos.html'
    ], 
    function(_, ko, tko, Todo, TodoList, view) {
        "use strict";

        return function Todos(app) {
            var self = this,
                resorting = false;

            self.view = view;
            self.todos = new TodoList();
            self.todos.fetch();

            self.form = {
                label: ko.observable()
            };

            self.up = function(todo) {
                self.todos.incrementPriority(todo);
            };

            self.down = function(todo) {
                self.todos.decrementPriority(todo);
            };

            self.remove = function(todo) {
                self.todos.values.remove(todo);

                _.each(self.todos.values(), function(t, i) {
                    t.priority(i + 1);
                });

                todo.destroy();
            };

            self.add = function() {
                var t = new Todo({
                    label: self.form.label(),
                    priority: self.todos.getHighestPriority() + 1
                });
                self.todos.values.push(t);
                t.save().done(function() {
                    console.log('new todo', ko.toJS(t));
                });

                app.notify('success', '"' + t.label() + '" added.', 5000);
                self.form.label('');
            };

            self.cancel = function() {
                self.form.first('');
                self.form.last('');
            };
        };
    }
);
