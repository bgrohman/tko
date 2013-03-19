(function(globals) {
    "use strict";

    globals.App.requireConfig();

    require(
        [
            'tko', 
            'knockout', 
            'viewModels/HelloWorld', 
            'viewModels/Home', 
            'viewModels/Todos'
        ], 
        
        function(tko, ko, HelloWorld, Home, Todos) {
            var app = new tko.App({
                tko: {
                    useSimpleNavigation: true
                },
                pages: [
                    {name: 'Home', route: 'home', ViewModel: Home, isDefault: true},
                    {name: 'Hello', route: 'hello', ViewModel: HelloWorld},
                    {name: 'Todos', route: 'todos', ViewModel: Todos}
                ],
                routes: {
                    'foo/:bar': function(bar) {
                        console.log('foo', bar);
                    }
                }
            });

            app.subscribe('app.initialized', function() {
                console.log('initialized');
            });
        }
    );
}(this));
