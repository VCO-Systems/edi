angular.module('database-schema-editor', ['$strap.directives'])

.config(['$routeProvider', function ($routeProvider) {
	  $routeProvider
		.when('/database', {
		    controller: 'DatabaseEditorCtrl',
		    templateUrl: 'assets/database-schema-editor/database-schema-editor.html'
		})
}])




/**
 * Controller for the "Database Editor" screen.
 */
.controller("DatabaseEditorCtrl", ['$scope', 'mappingService', '$http',
	function($scope, mappingService, $http) {
	   //$scope.list = mappingService.list;
	   
	   // Set up the "import db schema" wizard
	   $scope.steps = ['connect', 'filter', 'import'];
	   $scope.step = 0;
	   $scope.import_criteria = {db_name: ''};
	   $scope.defaults = { db_name: "customer_db_1"};
	   $scope.schema_to_import = {};
	   $scope.schema = {};
	   
	   //$scope.db_name =  "abc123";
	
	   $scope.isCurrentStep = function(step) {
	      return $scope.step === step;
	   };
	
	   $scope.setCurrentStep = function(step) {
	      $scope.step = step;
	   };
	
	   $scope.getCurrentStep = function() {
	      return $scope.steps[$scope.step];
	   };
	
	   $scope.isFirstStep = function() {
	      return $scope.step === 0;
	   };
	
	   $scope.isLastStep = function() {
	      return $scope.step === ($scope.steps.length - 1);
	   };
	
	   $scope.getNextLabel = function() {
	      return ($scope.isLastStep()) ? 'Submit' : 'Next';
	   };
	
	   $scope.handlePrevious = function() {
	      $scope.step -= ($scope.isFirstStep()) ? 0 : 1;
	   };
	
	   $scope.handleNext = function(dismiss) {
	      // If user pressed 'Next' on connect screen
	      if ($scope.getCurrentStep() == 'connect') {
	         // Todo:  send the request to server
	         $scope.importSchema();
	         $scope.step += 1;
	      }
	      else if ($scope.isLastStep()) {  // Submit
	         dismiss();  // close the wizard
	         // Start wizard next time it opens on first page
	         $scope.setCurrentStep(0); 
	         // Add this schema to the renderer
	         $scope.schema = $scope.schema_to_import;
	         $scope.tm.addTables($scope.schema, true);
	         $scope.tm.requestMappingsByNodeId($scope.relationships_to_import);
	      } else {
	         $scope.step += 1;
	      }
	      
	   };
	   
	   $scope.importSchema = function() {
	      mappingService.importDatabaseSchema($scope.import_criteria.db_name || $scope.defaults.db_name).success(function(result) {
	         //mappingService.mappingDocuments = dt.data;
	         if (result.Error) {
	            alert(result.Error);
	         }
	         else {  // We got results back
	            $scope.schema_to_import = result.data;
	            $scope.relationships_to_import = result.relationships;
	            
	         }
	
	      }).error(function(error) {
	         if (result.Error) {
	            alert(result.Error);
	         }
	      }); 
	   };
	   
	   // STUB:  hook this function to dummy UI buttons during development
	   $scope.test = function() {
	      var url = "schema/generateSampleData";
	      url += "?database_name=" + ($scope.import_criteria.db_name || $scope.defaults.db_name);
	      $http.get(url).success(function(result){
	         
	      });
	   };
	
	   $scope.title = mappingService.title;
	   $scope.tm = tableManager();
	   $scope.tableData;
	
	   init();
	
	   function init() {
	      if (!mappingService.tableData) {
	         getSampleData();
	      }
	      // initialize the jQuery tablemanger code
	      // TODO: rewrite this with angular directives
	      $scope.tm.init();
	   };
	
	   function getSampleData() {
	      mappingService.getMappings().success(function(dt) {
	         mappingService.tableData = dt.data;
	         $scope.tableData = mappingService.tableData;
	         console.debug($scope.tableData);
	      }).error(function(error) {
	         $scope.status = 'Unable to load sample table data: ' + error.message;
	      });
	   }
	
	}
])

;