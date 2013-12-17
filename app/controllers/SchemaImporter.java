package controllers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import org.codehaus.jackson.node.ArrayNode;
import org.codehaus.jackson.node.ObjectNode;

import play.libs.Json;
import play.mvc.Result;

public class SchemaImporter {

	 /**
     * Returns the tables/fields for a given database,
     * so the user can import an existing database into
     * the UI.
     * @param result 
     * @return result  
     */
    public static ObjectNode getSchema(String database_name, ObjectNode result) {
    	// Setup
    	ArrayNode data = result.putArray("data");
    	// STUB:  simulate node_ids for these nodes, as well as
    	// the 'order' field, so the UI will render properly.
    	// This is temporary, until proper "temp node id" handling
    	// is added by the UI until new data is persisted and the 
    	// real ids can be assigned.
    	int nextNodeId = 90000;
    	// The "table" section of a mapping document has its own
    	// structure we must re-create before passing data to UI.
    	ObjectNode tableWrapper = Json.newObject();
    	tableWrapper.put("type", "table");
    	ArrayNode tableData = tableWrapper.putArray("data");
    	
    	Connection con = null;
        PreparedStatement pst = null;
        ResultSet rs = null;

        String url = "jdbc:postgresql://localhost/";
        if (database_name.length() > 0 ) {
        	url += database_name;
        }
        else {
        	 // Todo:  let the user know they didn't supply a db name
        }
        String user = "postgres";
        String password = "postgres";
 
        try {

            con = DriverManager.getConnection(url, user, password);
            String query = "SELECT table_name FROM information_schema.tables "
                    + "WHERE table_schema = 'public'";
            pst = con.prepareStatement(query);

            rs = pst.executeQuery();
            
            // Iterate over the fields in this postgres table
            while (rs.next()) {
            	ObjectNode tbl = Json.newObject(); 
            	tbl.put("nodeType", "table");
            	tbl.put("title", rs.getString(1));
            	tbl.put("node_id", nextNodeId);
            	nextNodeId++;
            	
            	// Look up the fields for this table
            	ArrayNode fields = tbl.putArray("children");
            	ObjectNode parsedFields = getTableFields(con, rs.getString(1), nextNodeId);
            	nextNodeId = parsedFields.get("nextNodeId").asInt();
            	fields.addAll((ArrayNode)parsedFields.get("return_value"));
            	System.out.println("fields object :   " + fields.toString());
            	data.add(tbl);
            	
            	// Now that we have all the tables/fields, we can 
            	// look up foreign keys and add them to the 
            	// the appropriate tables
            	
            }

        } catch (SQLException ex) {
        	  System.out.println(ex.getMessage());
        	  result.put("Error", ex.getMessage());
        } finally {

            try {
                if (rs != null) {
                    rs.close();
                }
                if (pst != null) {
                    pst.close();
                }
                if (con != null) {
                    con.close();
                }

            } catch (SQLException ex) {
                
            	System.out.println(ex.getMessage());
            }
        }
    	return result;
    }
    
    public static ObjectNode getTableFields(Connection con, String table_name, int nextNodeId) {
    	ObjectNode t = Json.newObject();  // dummy, just to hold the ArrayNode
    	ArrayNode retval = t.putArray("return_value");
    	ResultSet result = null;
    	PreparedStatement pst = null;
    	
    	// Prepare to make the query
    	String query = "SELECT c.column_name, c.data_type, e.data_type AS element_type "
    			+ " FROM information_schema.columns c LEFT JOIN information_schema.element_types e "
    		    + "ON ((c.table_catalog, c.table_schema, c.table_name, 'TABLE', c.dtd_identifier) "
    		    + "= (e.object_catalog, e.object_schema, e.object_name, e.object_type, e.collection_type_identifier)) "
    		    + "WHERE c.table_schema = 'public' AND c.table_name = '" + table_name + "' "
    		    + "ORDER BY c.ordinal_position;";
    	System.out.println("About to look up fields for " + table_name);
    	try {
    		pst = con.prepareStatement(query);
        	result = pst.executeQuery();
        	// Loop over the fields for this table, and add them to retval
        	while (result.next()) {
        		ObjectNode field = Json.newObject();
        		field.put("nodeType", "field");
        		field.put("title", result.getString(1));
        		field.put("node_id", nextNodeId++);
        		t.put("nextNodeId", nextNodeId);
        		retval.add(field);
        	}
        	
    	} catch (SQLException ex) {
    		System.out.println(ex.getMessage());
    		//result.put("Error", ex.getMessage());
    	
	    } finally {
	
	        try {
	            if (result != null) {
	                result.close();
	            }
	            if (pst != null) {
	                pst.close();
	            }
	            if (con != null) {
	                //con.close();
	            }
	
	        } catch (SQLException ex) {
	            
	        	System.out.println(ex.getMessage());
	        }
	    }
    	
    	
    	
    	
    		return t;
    	}
    
    /**
     * Returns the foreign key relationship whose source/target
     * are included in the tables described in result.
     * 
     * @param result 
     * @return result  
     */
    public static ObjectNode getRelationships(ObjectNode result) {
    	
    	return result;
    }
}
