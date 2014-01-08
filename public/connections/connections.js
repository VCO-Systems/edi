angular.module('connections', [])

.config(['$routeProvider', function ($routeProvider) {
	  $routeProvider
	  .when('/connections', {
          controller: 'ConnectionsCtrl',
          templateUrl: 'assets/connections/connections.html'
      });
}])
	
/**
 * This screen enables the user to draw connecting lines between a DB schema
 * and an EDI schema.
 *  
 */
.controller("ConnectionsCtrl", [ '$scope',  '$http', function($scope, $http) {
		
	$scope.pageTitle = "Connections";
	$scope.status = ''; // Status message to display in the UI
	
} ]);