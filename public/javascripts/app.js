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
       when('/smooks-ff-to-xml', {
           controller: 'SmooksFFToXMLCtrl',
           templateUrl: 'assets/partials/smooks-ff-to-xml.html'
       }).
       otherwise({
           redirectTo: '/'
       });
})
/**
 * The home screen provides create/load/delete functionality
 * for the mapping documents.
 *
 */.controller("HomeCtrl", ['$scope', 'mappingService',
function($scope, mappingService) {
   $scope.pageTitle = "Mapping Definitions";
   $scope.tableData = mappingService.tableData;

   // Initialize the grid that displays the mapping documents
   $scope.mappingDocuments = mappingService.mappingDocuments;
   $scope.selectedMappingDocuments = [];
   $scope.gridOptions = {
      data : 'mappingDocuments',
      columnDefs : [{
         field : 'name',
         displayName : 'Name'
      }, {
         field : 'create_ts',
         displayName : 'Created On',
         width : 125
      }, {
         field : 'mod_ts',
         displayName : 'Last Edited On',
         width : 125
      }, {
         field : 'create_user',
         displayName : 'Created By',
         width : 175
      }],
      multiSelect : false,
      enableColumnResize : true,
      selectedItems : $scope.selectedMappingDocuments
   };

   /**
    * Load the list of mappings to be displayed in the grid.
    */

   $scope.loadMappings = function() {
      mappingService.getMappings().success(function(dt) {
         mappingService.mappingDocuments = dt.data;
         $scope.mappingDocuments = mappingService.mappingDocuments;
         // A bug in ng-grid causes cols with width:auto to only resize
         // on domReady.  So we need to force the grid to redraw now that it has data

      }).error(function(error) {
         $scope.status = 'Unable to load mappingDocuments: ' + error.message;
      });
   };

   /**
    * Load all the data for a mapping.
    */
   $scope.loadMapping = function() {
      if ($scope.selectedMappingDocuments.length > 0) {
         var selectedMappingId = $scope.selectedMappingDocuments[0].id;
         mappingService.loadMappingData(selectedMappingId);
      }
   };

   $scope.deleteMapping = function() {
      if ($scope.selectedMappingDocuments.length > 0) {
         var selectedMappingId = $scope.selectedMappingDocuments[0].id;
         mappingService.deleteMapping(selectedMappingId).success(function(dt) {
            if (dt.status == 1) {
               // Record was deleted.  Reload mappings.
               $scope.loadMappings();
            }
         }).error(function(error) {
            $scope.status = 'Unable to delete mapping document: ' + error.message;
         });
      }
   };

   init();

   function init() {
      //  Request mapping documents from the server, if they've
      //  not yet been loaded.
      if (!mappingService.mappingDocuments) {
         $scope.loadMappings();
      }

      // Listen for the grid's dataprovider to change
      $scope.$on('ngGridEventData', function(e, gridId) {
         //$scope.gridOptions
      });
   };
}])

/**
 * Controller for the "Database Editor" screen.
 */.controller("DatabaseEditorCtrl", ['$scope', 'mappingService', '$http',
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

}]).factory('mappingService', ['$http',
function($http) {
   var urlGetMappings = 'mappings/get';
   // 'assets/data/sample-data.json';
   var urlMapping = 'load_mapping?id=';
   var urlDeleteMapping = 'delete_mapping?id=';
   var mappingService = {};

   mappingService.tableData;
   mappingService.mappingDocuments;

   // Request a list of all mapping documents
   mappingService.getMappings = function() {
      return $http.get(urlGetMappings);
   };

   // Load all the data for a mapping document
   mappingService.loadMappingData = function(mappingNodeId) {
      return $http.get(urlMapping + mappingNodeId);
   };

   mappingService.deleteMapping = function(mappingId) {
      return $http.get(urlDeleteMapping + mappingId);
   };
   
   // Load all the data for a mapping document
   mappingService.importDatabaseSchema = function(db_url) {
      return $http.get("schema/get?database_name=" + db_url);
   };
   
   

/**
 * The smooks-test screen is based on the Smooks xml-edi example, and verifies basic
 * ability to send EDI from browser to server, convert to XML using Smooks on back end,
 * and return XML to browser.
 *  
 */
.controller("SmooksFFToXMLCtrl", [ '$scope', 'mappingService', '$http', function($scope, mappingService, $http) {
		
	$scope.pageTitle = "Smooks Flat-file to XML conversion";
	$scope.status = ''; // Status message to display in the UI
	$scope.edi_length = mappingService.tableData;
	$scope.xml_string = '';
	$scope.edi_string = "HDR*1*0*59.97*64.92*4.95*Wed Nov 15 13:45:28 EST 2006\n" +
			"CUS*user1*Harry^Fletcher*SD\n" +
			"ORD*1*1*364*The 40-Year-Old Virgin*29.98\n" +
			"ORD*2*1*299*Pulp Fiction*29.99\n";
	
	$scope.sendEdi = function() {
		$http({
		    url: 'test/edi-to-xml',
		    method: "POST",
		    data: { 'edi_string' : $scope.edi_string }
		})
		.then(function(response) {
		        // pass the converted XML to the model
				console.debug(response);	
				$scope.xml_string = response.data;
		    }, 
		    function(response) { // optional
		        // failed
		    	alert('failure');
		    }
		);
	}
	
	$scope.sendEdi2 = function() {
		
		$http.get('test/edi-to-xml?edi_string=' + encodeURIComponent($scope.edi_string))
	         .success(function (dt) {
	             // mappingService.mappingDocuments=dt.data;
	             var raw_xml = dt;
	             $scope.xml_string = dt;
	             //$scope.converted_xml = dt.data
	             $scope.status = "EDI converted.";
	         })
	         .error(function (error) {
	             $scope.status = 'Error converting EDI to XML: ' + error.message;
	         });
	   };

} ])

.factory('mappingService', ['$http', function($http) {
    var urlGetMappings = 'mappings/get';  // 'assets/data/sample-data.json';
    var urlMapping = 'load_mapping?id=';
    var urlDeleteMapping = 'delete_mapping?id=';
    var mappingService = {};
    
    mappingService.tableData;
    mappingService.mappingDocuments;
    
    // Request a list of all mapping documents
    mappingService.getMappings = function () {
        return $http.get(urlGetMappings);
    };
    
    // Load all the data for a mapping document
    mappingService.loadMappingData = function (mappingNodeId) {
        return $http.get(urlMapping + mappingNodeId);
    };
    
    mappingService.deleteMapping = function(mappingId) {
        return $http.get(urlDeleteMapping + mappingId);
    };

    

    return mappingService;
}]);
