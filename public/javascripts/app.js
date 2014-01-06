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
 */
.controller("HomeCtrl", ['$scope', 'mappingService', function($scope, mappingService) {
   $scope.pageTitle = "Mapping Definitions";
   $scope.tableData = mappingService.tableData;
   
   // Initialize the grid that displays the mapping documents
   $scope.mappingDocuments = mappingService.mappingDocuments;
   $scope.selectedMappingDocuments = [];
   $scope.gridOptions = { 
      data: 'mappingDocuments',
      columnDefs: [
         {field:'name', displayName:'Name'}, 
         {field:'create_ts', displayName:'Created On', width: 125},
         {field:'mod_ts', displayName:'Last Edited On', width: 125},
         {field:'create_user', displayName:'Created By', width: 175}
      ],
      multiSelect: false,
      enableColumnResize: true,
      selectedItems: $scope.selectedMappingDocuments
   };
   
   
   
   /**
    * Load the list of mappings to be displayed in the grid. 
    */
   
   $scope.loadMappings = function() {
      mappingService.getMappings()
         .success(function (dt) {
             mappingService.mappingDocuments=dt.data;
             $scope.mappingDocuments = mappingService.mappingDocuments;
             // A bug in ng-grid causes cols with width:auto to only resize
             // on domReady.  So we need to force the grid to redraw now that it has data
             
         })
         .error(function (error) {
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
         mappingService.deleteMapping(selectedMappingId)
            .success(function (dt) {
                if (dt.status == 1) {
                   // Record was deleted.  Reload mappings.
                   $scope.loadMappings();
                }
            })
            .error(function (error) {
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
      $scope.$on('ngGridEventData', function(e,gridId) {
         //$scope.gridOptions
      });
   };
}])

.controller("DatabaseEditorCtrl", ['$scope', 'mappingService', function($scope, mappingService) {
   //$scope.list = mappingService.list;
   $scope.title = mappingService.title;
   $scope.tm = tableManager();
   $scope.tableData;
   
   init();

   function init() {
       if (!mappingService.tableData) {
          getSampleData();
       }   
   };
   
    function getSampleData() {
        mappingService.getMappings()
            .success(function (dt) {
                mappingService.tableData=dt.data;
                $scope.tableData = mappingService.tableData;
                console.debug($scope.tableData);
            })
            .error(function (error) {
                $scope.status = 'Unable to load sample table data: ' + error.message;
            });
    }
}])

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
