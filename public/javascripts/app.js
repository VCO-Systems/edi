angular.module('ediApp', ['ngRoute']).
   config(function ($routeProvider) {
    $routeProvider.
    when('/', {
        controller: 'HomeCtrl',
        templateUrl: 'assets/partials/home.html'
    }).
    when('/database', {
        controller: 'DatabaseEditorCtrl',
        templateUrl: 'assets/partials/database-editor.html'
    }).
    otherwise({
        redirectTo: '/'
    });
})

.controller("HomeCtrl", ['$scope', 'mappingModel', function($scope, mappingModel) {
   //$scope.list = mappingModel.list;
   $scope.title = mappingModel.title;   
}])

.controller("DatabaseEditorCtrl", ['$scope', 'mappingModel', function($scope, mappingModel) {
   //$scope.list = mappingModel.list;
   $scope.title = mappingModel.title;
}])

.service("mappingModel", ['$rootScope', function($rootScope) {
   this.title = "Title from service";
}]);