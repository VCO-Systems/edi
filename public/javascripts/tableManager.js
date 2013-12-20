var tableManager =  function(){
   
   // public vars
   var tableData = [];
   var relationshipData = [];
   var mappingData = [];
   
   // private vars
   var lastTableSelected;
   var newFieldName;
   var tempRecordId = 1000;
   
   // Layout defaults
   var defaults = {};
   defaults["auto_table_spacing_horizontal"] = 40;
   
   var lineManager; // instance of jsPlumb for line drawing
   
   var selectionMode = "normal"; 
   
   // Initialization
   var init = function() {
      /*
      jqxhr = $.getJSON( "sample-data.json", function() {
         //console.log( "success" );
      })
      .done(dataLoaded);
      */
     
      // Set up jsPlumb defaults for line handling
      jsPlumb.importDefaults({
          Container:$(".dbCanvas")
      });
      
      // When the user drags from one field to another field, they are
      // requesting that a new mapping be created.  Here we listen for
      // that event from jsPlumb, and call the function to establish the
      // new mapping. 
      jsPlumb.bind("connection", function(connectionInfo) {
         requestFieldMappingFromUIEvent(connectionInfo);
         
         // Also register a click event on the connection, which will
         // be a quick way to delete the connection
         connectionInfo.connection.bind("click", function(clickedConnection) {
            jsPlumb.detach(clickedConnection);
            //console.debug(clickedConnection);
            // Delete the mapping associated with this connection line
            var sourceDomEl = $('#' + clickedConnection.sourceId);
            var targetDomEl = $('#' + clickedConnection.targetId);
            removeMapping(sourceDomEl[0], targetDomEl[0]);
         });
      });
      
      // Set up the "add field" dialog
      $( "#frmAddField" ).dialog({
            autoOpen: false,
            height: 225,
            width: 260,
            modal: true,
            draggable: false,
            buttons: {
               "add_field": {
                  text: "Add Field",
                  click: addField
               },
               "cancel": {
                  text: "Cancel",
                  click: function() {
                     $( this ).dialog( "close" );
                  }
               }
            },
            open: function() {
               // Clear out any previous values from the "field name" field
               newFieldName.val('').text('');
            }
            
         });  // end dialog definition
         
      // Set up the "delete table" dialog
      $( "#frmDeleteTable" ).dialog({
            autoOpen: false,
            height: 225,
            width: 225,
            modal: true,
            draggable: false,
            buttons: {
               "Delete": deleteTable
            },
            Cancel: function() {
               $( this ).dialog( "close" );
            },
            close: function() {
               //allFields.val( "" ).removeClass( "ui-state-error" );
            }
         });  // end dialog definition
         
         newFieldName = $('#newFieldName');
         newFieldName.keypress(function(event) {
             if(event.which == 13) { // 13 is the 'Enter' key
                 // Todo: make enter here submit and close the dialog
                 //  attempt 1: $("#frmAddField").next()   div:contains('Add field')").click();
            }
         });
         // Initialize lineManager
         lineManager = {};
         
         // When user double-clicks on the canvas, create a new table at that position
         $('.dbCanvas').dblclick(function(event){
            console.debug(event);
            var newTbl = {
               "node_id": 999,
               "title": "New Table",
               "x": event.offsetX,
               "y": event.offsetY,
               "nodeType": "table",
               "fields": []
            };
            var newTableCollection = new Array(newTbl);
            addTables(newTableCollection);
         });
   };
   
   
   var dataLoaded = function(data) {
      //tableData = data;
      // Find the data describing the tables/fields
      $(data).each(function(index) {
         // Find the "table" collection
         if (data[index].type == "table") {
            addTables(data[index].data);
         }
      });
      
   };
   
   /** The user has requested a new mapping between fields from the UI.
    *  jsPlumb has already handled displaying the connecting line in the
    *  UI, now we have to use the source/target UI elements to look up
    *  the corresponding data objects, and pass those to the method that
    *  will create a new "mapping entry" to later be persisted to the db. 
    */
   
   var requestFieldMappingFromUIEvent = function(jsPlumbConnectionInfo) {
      // Look up the data objects for this mapping from 
      // the dom elements from jsPlumb
      var sourceDataObject = findObjectByDomElement(tableData, jsPlumbConnectionInfo.source, "fields");
      var targetDataObject = findObjectByDomElement(tableData, jsPlumbConnectionInfo.target, "fields");
      
      requestMapping(sourceDataObject, targetDataObject, "fields");
   };
   
   /**
    *  Add 1+ tables.
    * 
    *  - accepts a JSON description of the tables
    *  - adds them to tableData for management
    *  - adds a new Table Renderer to the screen
    *  - if the data describe position/size, applies those
    *  - applies proper drag/drop behavior
    *  
    */
   var addTables = function (tablesToAdd, autoLayout) {
      var dbCanvas = $('.dbCanvas');
      // If we need to auto-layout these new tables,
      // set the starting x and y position
      var autoLayoutX = 0;
      var autoLayoutY = 15;
      
      // Iterate over the tables to be added
      $(tablesToAdd).each(function(index) {
         
         // Add this table to tableData
         var tableObject = tablesToAdd[index];
         tableData.push(tableObject);
         
         // Create the dom el for table
         var newTable = $('<div>',{
            class: "dbRenderer nodeType_" + tableObject.nodeType + " tableRenderer_" + tableObject.title
         });
         // Link the dom el for table to its object
         tableObject['domElement'] = newTable; 
         
         // Configure the rest of the table renderer
         var tableHeader = $('<div>', {class: "dbRendererHeader"}).appendTo(newTable);
         var tableDragHandle = $('<img>', 
            {class: "dbRendererDragHandle", src: "../assets/images/drag-handle.png"})
            .appendTo(tableHeader);
         
         var tableTitle = $('<a data-type="text" data-title="Edit table name:">',
            {
               class: "dbRendererTitle tip-yellow", 
               text: this.title,
               id: "table_" + tableObject.title + "_title",
            })
            .append(this.title)
            .appendTo(tableHeader)
            .dblclick(function(e) { // prevent dblclick from bubbling up to canvas
               e.stopPropagation();
            })
            .editable({
               toggle: "dblclick"
            })
            // When the user changes the table name in the popup, we need to push
            // that change back into the model
            .on('save', function(e, params) {
               var tableObjectToUpdate = findObjectByDomElement(tableData,newTable, "fields");
               var newValue = params.newValue;
               tableObjectToUpdate.title = newValue;
               console.debug(tableObjectToUpdate);
            });
            
            
            
         /*
         tableTitle.editable({
            title: "Enter name of table:"
         });
         */
         
         var tableControls = $('<span>', {class: "dbControls"}).appendTo(tableHeader);
         // Show the "Add Field" control in the db header
         var addFieldControl = $('<span >').appendTo(tableControls);
         var tableDropdownIcon = $('<img>', {src: "../assets/images/dropdown_caret.png"}).appendTo(addFieldControl);
         
         // Clicking this icon should open the dropdown of "Table actions"
         var dropdownHtml = $('#dropdown-menu-for-tables').html();
         addFieldControl.html(dropdownHtml);
         addFieldControl.find('.table_add_field_command').on('click', {table: newTable},openFieldAddDialog);
         addFieldControl.find('.table_delete_table_command').on('click', {table: newTable},openDeleteTableDialog);
         addFieldControl.find('.table_delete_field_command').on('click', {table: newTable},requestFieldDeletion);
         
         // The area where database fields appear
         var tableFields = $('<div>',{class: "slaveBody"});
         tableObject['fieldContainer'] =tableFields;
         // Allow the user to re-order fields by dragging them up/down
         var is_dragging = false;
         tableFields.sortable({
            start: function(event, ui) {
                is_dragging = true;
            },
            stop: function(event, ui) {
                is_dragging = false;
                jsPlumb.repaintEverything();
            }
          });
          
          tableFields.on('mousemove', function(e) {
            if (is_dragging) {
               jsPlumb.repaintEverything();
            }
          });
         
         // Render the fields for this table
         if (this.fields && this.fields.length) {
            $(this.fields).each(function(index){
               addFieldToTable(tableObject, this);
            });
         }
         
            
         // If the table has stored position info,
         // move the table to that position within
         // the dbCanvas
         if (this.x || this.y) {
            newTable.css("left", this.x);
            newTable.css("top", this.y);   
         }
         
         
         newTable.append(tableHeader);
         newTable.append(tableFields);
         
         
         // Use jsPlumb to make the table draggable
         // (rather than plain jQuery), so that
         // the jsPlumb lines will automatically update
         // when the table is moved
         jsPlumb.draggable(newTable, {
              containment: '.dbCanvas', 
             handle: tableDragHandle,
             drag: function() { 
               // Fix bug where lines don't always
               // update properly when dragging table
               jsPlumb.repaintEverything();
             }
         });  // end table draggable
         
         
         // Make the table resizeable
         // (currently has bugs which remove it from container)
         //newTable.resizable({containment: '.dbCanvas'});
         
         /*
         tableFields.sortable({
            connectWith: '.slaveBody',
            receive: function(event,ui) {
               console.log('dropped');
            }
         });
         */
        
         
         
         // Append the table to the table canvas
         dbCanvas.append(newTable);
         
         // If autoLayout is true, we also need to automatically position
         // these tables, so they don't all get placed on top of each other
         // (such as when we import table schemas from a db and there's no
         // x/y set)
         if (autoLayout) {
            var myWidth = newTable.width();
            var myHeight = newTable.height();
            var horizontalSpace = dbCanvas.width() - autoLayoutX;
            var verticalSpace   = dbCanvas.height() - autoLayoutY;
            // console.log("Width of this table: " + newTable.width());
            // console.log("Remaining hor space: " + horizontalSpace);
            
            // If there's enough horizontal space left in this row for the table,
            // then display it in this "row" 
            if ( (horizontalSpace - myWidth - (defaults["auto_table_spacing_horizontal"]*2) ) > 0) {
               autoLayoutX += defaults["auto_table_spacing_horizontal"];
               newTable.css("left", autoLayoutX);
               newTable.css("top", autoLayoutY);
               autoLayoutX += myWidth;
               autoLayoutLowestPoint = Math.max(autoLayoutY, autoLayoutY + myHeight);
            }
            // The table didn't fit horizontally, so move it down 
            else {
               autoLayoutY = autoLayoutLowestPoint;  // move down to the next row
               autoLayoutY += 15; // Add the default vertical spacing
               autoLayoutX = defaults["auto_table_spacing_horizontal"];  // move back to the left edge
               // place the table
               newTable.css("left", autoLayoutX);           
               newTable.css("top", autoLayoutY);
               // Update the pointers for the next table
               autoLayoutX += myWidth;
               autoLayoutLowestPoint = Math.max(autoLayoutY, autoLayoutY + myHeight);
            }
            
            // Position the new table
            
            
            
         }
         
         
      });
      
      $('.menu').dropit();
      
   };
   
   var addFieldToTable = function (tableObj, fieldObj) {
      // Create the field
      var newField = $('<div title="Double-click to edit">', {
         class: "dbField nodeType_" + fieldObj.nodeType + " allowedDrop tip-yellow",
         id: "dbField_" + fieldObj.title,
         //text: fieldObj.title
      });
      
      // Add left/right gutters to act as the drag source/target
      // for users when adding relationships between fields.
      var leftGutter = $('<span>', {
         class: "dbField-gutter dbField-gutter-left"
      });
      var rightGutter = $('<span>', {
         class: "dbField-gutter dbField-gutter-right"
      });
      newField.append(leftGutter);
      
      // We just need this container so that we can float things like 'FK' or 'type' right
      var fieldBody = $('<table >', {
          class: "fieldBody"         
      })
      .appendTo(newField);
      var tbody = $('<tbody>').appendTo(fieldBody);
      var fieldBodyTR = $('<tr>').appendTo(tbody);
      var fieldBodyTD1 = $('<td>').appendTo(fieldBodyTR);
      var fieldTitle = $('<span >', {
         class: 'fieldTitle',
         text: fieldObj.title
      })
      // On hover, let the user know they can edit this field name
      // by double-clicking
      .poshytip()
      // When user dblclicks field title, popup a dialog to let them
      // change the title
      .editable({
         title: "Edit field name:",
         toggle: "dblclick",
         send: "never", // don't send data to server after edit
         
      })
      // When the user updates the table name in the popup, we need to push
      // that change back into the model
      .on('save', function(e, params) {
         var fieldObjectToUpdate = findObjectByDomElement(tableData,newField, "fields");
         var newValue = params.newValue;
         fieldObjectToUpdate.title = newValue;
      })
      // Prevent the dblclick event from bubbling up
      // to dbCanvas and triggering the "Add a table" action
      .dblclick(function(e) {
         e.stopPropagation();
      })
      // Add this title to the field display
      .appendTo(fieldBodyTD1);
      
      var fieldBodyTD2 = $('<td>').appendTo(fieldBodyTR);
      // Insert the "field type" indicator
      var fieldType = $('<span >', {
         class: 'fieldType',
         text: fieldObj.data_type
      })
      .appendTo(fieldBodyTD2);
      
      newField.append(rightGutter);
      
      
      
      // Configure the field as a source/target for line drawing
      jsPlumb.makeSource(newField, {
          anchor: ["RightMiddle", "LeftMiddle"],
          endpoint:["Blank", { }],
          connector:[ "Flowchart", { }],
          connectorStyle: {lineWidth: 4, strokeStyle: "#838383"},
          filter:function(event, element) {
             return $(event.target).hasClass('dbField-gutter');  //event.target.tagName !== "BUTTON";
          },
          connectorOverlays: [
                 ["Arrow", {
                     width: 10,
                     length: 10,
                     foldback: 1,
                     location: 1,
                     id: "arrow"
                 }]
             ]
      });
      
      jsPlumb.makeTarget(newField, {
          anchor:["RightMiddle", "LeftMiddle"],
          endpoint:["Blank", { radius: 2 }]
      });
      
      
      
      
      
      //  Link the domElement for this field to its
      //  entry in tableData, so later we can look up an item
      //  using its dom element.
      findObjectById(tableData, fieldObj.node_id, "fields")['domElement'] = newField;
      tableObj.fieldContainer.append(newField);
      newField.addClass("dbField");
      
   };
   
   /** 
    *  User has clicked the "Add Field" button
    *  for a table.
    *  
    */
   
   var openFieldAddDialog = function(event) {
       lastTableSelected = event.data.table;
       // Open the "add field" dialog at the mouse's current location
       $( "#frmAddField" )
         //.dialog('option','position',{my: "left top", at: "left top", of: event.target})
         .dialog('option','position',{my: "left-25 top-25", at: "left top",of: event.target})
         .dialog( "open" )
         // Support ENTER and ESC to commit or cancel this dialog
         .find('#newFieldName').keypress(function(event) {
             if (event.keyCode == $.ui.keyCode.ENTER) {
                var buttons = $('#frmAddField').dialog("option", "buttons");
                buttons['add_field'].click.apply();
             }
             if (event.keyCode == $.ui.keyCode.ESC) {
                var buttons = $('#frmAddField').dialog("option", "buttons");
                buttons['cancel'].click.apply();
                
             }
         });
       // Simulate a click on the dialog we just displayed, to force the dropdown menu 
       // behind it to close, since it's default is to stay open until
       // it hears a mouse click outside itself
       $("#frmAddField").trigger("click");
   };
      
   
   // The user has provided a field name, and 
   // pressed the button to add the field to 
   // a table.
   
   var addField = function() {
       // newFieldName contains the requested field name
       // lastTableSelected is the data for the table
       
       // If the user provided one or more fieldnames
       if (newFieldName.val()) {
          var fieldNames = newFieldName.val().split(',');
          var tableObject = findObjectByDomElement(tableData, lastTableSelected, "fields");
          
          if (fieldNames.length == 1) {
             // Look up the table's data object by its dom element
             var newFieldObject = {node_id: tempRecordId, title: newFieldName.val().trim(), nodeType: "tableField"};
             tableObject.fields.push(newFieldObject);
             tempRecordId += 1;
             addFieldToTable(tableObject, newFieldObject, $(lastTableSelected).find('.slaveBody'));
             
             
          }
          else if (fieldNames.length > 1 ) {
             $.each(fieldNames, function(fieldNameIdx, fieldName) {
                var newFieldObject = {node_id: tempRecordId, title: fieldName.trim(), nodeType: "tableField"};
                tableObject.fields.push(newFieldObject);
                tempRecordId += 1;
                addFieldToTable(tableObject, newFieldObject);
             });
          }
          // Close the "add field" dialog
          $( "#frmAddField" ).dialog( "close" );
          newFieldName.val('');
          
       }
       else {
          alert('Field Name cannot be blank.');
       }
       
       
   };
   
      /** 
    *  User has clicked the "Delete Table" button
    *  for a table.
    *  
    */
   
   var openDeleteTableDialog = function(event) {
       lastTableSelected = event.data.table;
       var matchingDataObject = findObjectByDomElement(tableData,lastTableSelected,"fields");
       // Open the "add field" dialog at the mouse's current location
       $( "#frmDeleteTable" )
         //.dialog('option','position',{my: "left top", at: "left top", of: event.target})
         .dialog('option','position',{my: "left-25 top-25", at: "left top",of: event.target})
         .data('tableName', matchingDataObject.title)
         .dialog( "open" )
         .find('#table-name-to-delete').text(matchingDataObject.title);
         
       // Simulate a click on the body of the dialog we just displayed, 
       // to force the dropdown menu 
       // behind it to close, since it's default is to stay open until
       // it hears a mouse click outside itself
       $("#frmDeleteTable").trigger("click");
       
   };
   
   /** The user has confirmed that they want to delete a table.
    *
    *    - delete all fields (which will also delete mappings, visual lines, etc)
    *    - delete the tableData for this table
    *    - remove the dom element for this table from the UI
    *  
    */
   
   var deleteTable = function() {
      
      // Todo: delete all the fields from this table
      var tableToDelete = findObjectByDomElement(tableData, lastTableSelected, "fields");
      
      // Delete all the fields from this table
      // Note:  using $.each here won't work, since we're deleting array elements
      //        which confuses $.each.  So keep the while loop, even though 
      //        it's unusual.
      while( tableToDelete.fields.length > 0) {
         deleteField(tableToDelete.fields[0]);
      }
      // Todo: delete the data object for this table
      $.each(tableData, function(lTableIdx, lTable) {
         if (lTable == tableToDelete) {
            tableData.splice(lTableIdx, 1);
            return false;
         }
      });
      
      // Delete the dom element
      lastTableSelected.remove();
      
      // Clear and close the "delete table" dialog
      $("#table-name-to-delete").text("");
      $("#frmDeleteTable").dialog("close");
       
   };
   
   // Delete any mapping to/from the requested field.
   
   var deleteRelatedMappings = function(field) {
       
   };
   
   /**  
    *   The user has requested to delete a field.
    * 
    *     - change the cursor to a crosshair
    *     - set tableManager.selectionMode to "deleteField"
    *     - listen for a  click on a field and call deleteField 
    */
   
   var requestFieldDeletion = function(event) {
       
       // All dbFields are currently set as jsPlumb sources
       // and targets.  But this prevents those dome elements
       // from receiving click events, which are how we'll 
       // signal which field we want to delete.  So temporarily
       // unmakeSource all .dbField elements so we'll receive the 
       // click event.
       jsPlumb.unmakeEverySource();
       jsPlumb.unmakeEveryTarget();
       
       // Todo:  delete any mappings to/from this field
       // Todo:  delete the data object for this field
       // Todo:  delete the dom element       
       // Delete the dom element for this table
       
       enterFieldDeletionMode();
       
       
       
   };
   
   var enterFieldDeletionMode = function() {
      // Set selectionMode to fieldDelete, so that the user 
      // has a way to leave deletion mode by pressing ESC
      selectionMode = "deleteField";
      
      $('.dbField')
         .css('cursor', 'crosshair')
         .hover(
            function(event) {
            $(this).css('border', '1px solid #ff0000');
         },
            function(event) {
               $(this).css('border', '');
            }
         )
         .on('click', function(event) {
            deleteFieldByDomEl($(this));
         });
   };
   
   var exitFieldDeletionMode = function() {
      // Set selectionMode for the UI back to "normal"
      selectionMode = "normal";
      
      // Remove the click handler and hover effects that were
      // in place during selectionMode = "deleteField"    
      $('.dbField')
         .css('cursor', 'default')  // go back to normal cursor
         .css('border', 'none')     // remove the red border
         .unbind();  // remove click and hover handlers from fields
         
      // Re-enable the dbField dom elements to act as jsPlumb 
      // sources and targets.
      jsPlumb.makeSource($('.dbField'), {
          anchor: ["RightMiddle", "LeftMiddle"],
          endpoint:["Blank", { }],
          connector:[ "Flowchart", { }],
          connectorStyle: {lineWidth: 4, strokeStyle: "#838383"},
          filter:function(event, element) {
             return $(event.target).hasClass('dbField-gutter');  //event.target.tagName !== "BUTTON";
          },
          connectorOverlays: [
                 ["Arrow", {
                     width: 10,
                     length: 10,
                     foldback: 1,
                     location: 1,
                     id: "arrow"
                 }]
             ]
      });
      
      jsPlumb.makeTarget($('.dbField'), {
          anchor:["RightMiddle", "LeftMiddle"],
          endpoint:["Blank", { radius: 2 }]
      });
      
   };
   
   var deleteFieldByDomEl = function(fieldDomEl) {
      
      var fieldObject = findObjectByDomElement(tableData, fieldDomEl, "fields"); 
      deleteField(fieldObject);
      
   };
   
   /**
    *  Delete a field from a table
    *  
    *  Parameters: 
    *    - field : data object (not domEl) for the field to be deleted
    *  
    */
   var deleteField = function(field) {
       // Set the UI back to normal mouse interaction mode
       exitFieldDeletionMode();
       
       // Remove all jsPlumb connections, endpoints, etc
      if (field.domElement) {
          jsPlumb.detachAllConnections(field.domElement);
          jsPlumb.unmakeSource(field.domElement, false);
          jsPlumb.unmakeTarget(field.domElement, false);
          
          // Remove any mappings to/from this field
          removeMapping(field.domElement[0]);
          
       }
       
          
       
       
       // Remove the data object
       // Find the "parent table" this field belongs to
       $.each(tableData,function(srchTableIdx, srchTable) {
          var tbl = tableData[srchTableIdx];
          $.each(tbl.fields,function(srchFieldIdx, srchField) {
             var thisFld = tbl.fields[srchFieldIdx];
             if (thisFld == field) {
                tbl.fields.splice(srchFieldIdx,1);
                return false;
             }
          });
       });
       
       // Remove the dom element
       field.domElement.remove();
       jsPlumb.repaintEverything();
       
   };
   
   /**
    *  Recursively search a JSON array by id for an element. 
    */
   
   var findObjectById = function(coll, id, propertyToTraverse) {
      var result = null;
      var prop = propertyToTraverse || "children";
      //console.log('collection.length: ' + coll.length);
      for (var idx = 0; idx < coll.length; idx++) {
         //console.log('looking for match: ', id, coll[idx].id);  
         
         var el = coll[idx];
         var elId = coll[idx].node_id;
         if (elId == id) {
            //console.debug('found match: ' , el);
            return el;
         }
         
         // Search children
         if (el[prop] && el[prop].length > 0) {
            var itemInChildren=false;
            itemInChildren = findObjectById(el[prop], id, prop);
            if (itemInChildren) {
               return itemInChildren;
            }
            
          }
      }
      return result; 
   };
   
   var findObjectByDomElement = function(coll, domElement, propertyToTraverse) {
      var result = null;
      var prop = propertyToTraverse || "children";
      // if domElement is a jQuery object, extract the bare
      // dom element from inside that jQuery object
      var requestedDomElement = domElement;
      if (domElement instanceof jQuery) {
         requestedDomElement = domElement.get(0);
      }
      
      // 
      var targetDomElement;
      for (var idx = 0; idx < coll.length; idx++) {
         var currentObject = coll[idx];
         console.debug(currentObject);
         targetDomElement = currentObject.domElement.get(0);
         
         if (targetDomElement == requestedDomElement) {
            return currentObject;
         }
         
         // Search children
         if (currentObject[prop] && currentObject[prop].length > 0) {
            var itemInChildren=false;
            itemInChildren = findObjectByDomElement(currentObject[prop], domElement, prop);
            if (itemInChildren != null) {
               return itemInChildren;
            }
            
          }
      }
      return result; 
   };
   
   /**  
    * Find the parent of a JSON object in an object 
    */
   
   var findParentObject = function (coll, childToFind) {
      var matchedItem=null;
      $.each(coll, function(i, item) {
         $.each(item.children, function (i_child, item_child) {
            if (item_child == childToFind) {
               matchedItem = item;
            }
         });
      });
      return matchedItem;
   };
   
   /**
    * Receives the definitions of a set of db relationships,
    * and draws them on the screen.
    */
   
   var requestMappingsByNodeId = function(relationships) {
      // Loop over each relationship we got from the server
      $.each(relationships, function(idx, relationship) {
         var rel = relationships[idx];
         var sourceDomEl = findObjectById(tableData, rel["source_node_id"], "fields");
         var targetDomEl = findObjectById(tableData, rel["target_node_id"], "fields");
         console.debug(sourceDomEl);
         // Tell jsPlumb to connect these fields
         jsPlumb.connect({ source:sourceDomEl.domElement, target:targetDomEl.domElement });
         
      });
   };
   
   /**
    * Create a mapping between two objects. 
    */
   var requestMapping = function (sourceObject, targetObject, mappingType) {
      var newMapping = {source: sourceObject, target: targetObject};
      
      // Mapping between two fields in a table
      if (mappingType=="fields" ) {
         newMapping.type = "fields";
      // add the successful mapping to mappingData
      mappingData.push(newMapping);
      }
   };
   
   /**
    *  Delete a mapping object from mappingData.
    * 
    *  You can either pass the source/target data objects, 
    *  or the corresponding dom elements (which is useful
    *  when we're calling this from the UI).
    * 
    *  Either sourceObject or targetObject can also be null, 
    *  which is useful when a field is being deleted, and
    *  we want to delete all mappings from/to that field. 
    */
   
   var removeMapping = function(mappingSourceObject, mappingTargetObject) {
      
      // If the bare dom objects were passed in, replace them with the
      // actual data element for source/target
      if (mappingSourceObject && mappingSourceObject.nodeType) {  // this is a bare dom element
         mappingSourceObject = findObjectByDomElement(tableData, mappingSourceObject, "fields");
         mappingTargetObject = findObjectByDomElement(tableData, mappingTargetObject, "fields");
      }
      // Find the mapping with this source and target, and delete it
      $.each(mappingData, function(mappingIdx, mappingItem) {
         var lookupSourceObject = mappingData[mappingIdx].source;
         var lookupTargetObject = mappingData[mappingIdx].target;
         
         // If we received a source and target, look for both
         if (mappingSourceObject && mappingTargetObject) {
            if (mappingSourceObject==lookupSourceObject && mappingTargetObject==lookupTargetObject) {
               mappingData.splice(mappingIdx, 1);
               return false;  // We found the mapping to be deleted, so break out of this iterator
            }
         }
         else if (mappingSourceObject || mappingTargetObject) {
            console.debug('removeMapping(): ',mappingSourceObject,lookupSourceObject);
            
            if ((mappingSourceObject == lookupSourceObject) || (mappingSourceObject == lookupTargetObject)) {
               
               mappingData.splice(mappingIdx, 1);
               return false;  // We found the mapping to be deleted, so break out of this iterator
            }
         }
            
      });
   };
   
   /**
    * The public api of tableManager  
    */
   
   
   return {
      init: init,
      addTables: addTables,
      requestMappingsByNodeId: requestMappingsByNodeId,
   };

   
};