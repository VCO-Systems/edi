angular.module('ediApp', ['ngRoute','ngGrid']).
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
   $scope.pageTitle = "Home Screen";
   $scope.tableData = mappingModel.tableData;
   
   // Configure the grid that displays the mapping documents
   $scope.mappingDocuments = mappingModel.mappingDocuments;
   $scope.selectedMappingDocuments = [];
   $scope.gridOptions = { 
      data: 'mappingDocuments',
      columnDefs: [
         {field:'name', displayName:'Name'}, 
         {field:'create_ts', displayName:'Created On'},
         {field:'mod_ts', displayName:'Last Edited On'},
         {field:'create_user', displayName:'Created By'},
      ],
      multiSelect: false,
      enableColumnResize: true,
      selectedItems: $scope.selectedMappingDocuments
   };
   
   init();
   
   function init() {
      if (!mappingModel.mappingDocuments) {
          loadMappings();
       }   
   }
   
   function loadMappings() {
      mappingModel.loadMappings('assets/data/sample-mappings.json')
         .success(function (dt) {
             mappingModel.mappingDocuments=dt;
             $scope.mappingDocuments = mappingModel.mappingDocuments;
         })
         .error(function (error) {
             $scope.status = 'Unable to load mappingDocuments: ' + error.message;
         });
   }
   
   $scope.loadMapping = function() {
      if ($scope.selectedMappingDocuments.length > 0) {
         console.debug($scope.selectedMappingDocuments[0].node_id);   
      }
      
   };
}])

.controller("DatabaseEditorCtrl", ['$scope', 'mappingModel', function($scope, mappingModel) {
   //$scope.list = mappingModel.list;
   $scope.title = mappingModel.title;
   $scope.tm = tableManager();
   $scope.tableData;
   //console.debug(mappingModel.sampleData);
   
   init();

   function init() {
       if (!mappingModel.tableData) {
          getSampleData();
       }   
   };
   
    function getSampleData() {
        mappingModel.getCustomers()
            .success(function (dt) {
                mappingModel.tableData=dt;
                $scope.tableData = mappingModel.tableData;
                console.debug($scope.tableData);
            })
            .error(function (error) {
                $scope.status = 'Unable to load sample table data: ' + error.message;
            });
    }
}])

.factory('mappingModel', ['$http', function($http) {
    var urlBase = 'assets/data/sample-data.json';
    var mappingModel = {};
    
    mappingModel.tableData;
    mappingModel.mappingDocuments;
    
    mappingModel.getCustomers = function () {
        return $http.get(urlBase);
    };
    
    mappingModel.loadMappings = function (requestURL) {
        return $http.get(requestURL);
    };

    

    return mappingModel;
}]);
