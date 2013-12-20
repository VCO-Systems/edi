package controllers;

import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Iterator;

import org.codehaus.jackson.JsonNode;
import org.codehaus.jackson.JsonParseException;
import org.codehaus.jackson.map.JsonMappingException;
import org.codehaus.jackson.map.ObjectMapper;
import org.codehaus.jackson.node.ArrayNode;
import org.codehaus.jackson.node.ObjectNode;

import play.mvc.*;
import play.libs.Json;


public class SchemaImporter extends Controller {

	 /**
     * Returns the tables/fields for a given database,
     * so the user can import an existing database into
     * the UI.
     * @param result 
     * @return result  
     */
    public static ObjectNode getSchema(String database_name, ObjectNode result) {
    	// Since an imported schema replaces any existing schema in the UI editor,
    	// we first create a new data structure to represent the tables/fields/relationships
    	result.put("type", "database");
    	// Place table_name in metadata: "metadata": {"table_name": "..."}
    	ObjectNode jo = Json.newObject();
    	jo.put("db_name", database_name);
    	result.put("metadata", jo);
    	
    	// Create the "data":[] array which will hold the tables/fields
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
            
            // Iterate over the tables in this database
            while (rs.next()) {
            	ObjectNode tbl = Json.newObject(); 
            	tbl.put("nodeType", "table");
            	tbl.put("title", rs.getString(1));
            	tbl.put("node_id", nextNodeId);
            	nextNodeId++;
            	
            	// Look up the fields for this table
            	ArrayNode fields = tbl.putArray("fields");
            	ObjectNode parsedFields = getTableFields(con, rs.getString(1), nextNodeId);
            	nextNodeId = parsedFields.get("nextNodeId").asInt();
            	fields.addAll((ArrayNode)parsedFields.get("return_value"));
            	// Add this table to the return value
            	data.add(tbl);
            	
            }
        	// Now that we have all the tables/fields, we can 
        	// look up foreign keys and add them to the 
        	// the appropriate tables
        	result = getRelationships(con, result, nextNodeId);
        	// Since getRelationships() increment nextNodeId for
        	// each relationship, pull the new nextNodeId value
        	// out of the result JSON so it's correct for any later
        	// operations.
        	nextNodeId = result.get("nextNodeId").getIntValue();

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
    
    /**
     * Returns a list of fields in the given table, using the given connection.
     * 
     * Number each field, starting with nextNodeId, so that the unique UUIDs 
     * persist across the tables as well.
     * 
     * @param con
     * @param table_name
     * @param nextNodeId
     * @return
     */
    
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
    	try {
    		pst = con.prepareStatement(query);
        	result = pst.executeQuery();
        	// Loop over the fields for this table, and add them to retval
        	while (result.next()) {
        		ObjectNode field = Json.newObject();
        		field.put("nodeType", "field");
        		field.put("title", result.getString(1));
        		field.put("node_id", nextNodeId++);
        		field.put("data_type", result.getString(2));
        		t.put("nextNodeId", nextNodeId);
        		retval.add(field);
        	}
        	
    	} catch (SQLException ex) {
    		System.out.println(ex.getMessage());
    		//result.put("Error", ex.getMessage());
    	
	    } finally {
	    	// Don't close the connection here, because our connection was passed in
	    	// from another method, and closing it will be handled there (in case 
	    	// other methods need the same connection)
	    }
    		return t;
    }
    
    /**
     * Returns the foreign key relationship whose source/target
     * are included in the tables described in result.data
     * 
     * @param con
     * @param result 
     * @return result  
     */
    public static ObjectNode getRelationships(Connection con, ObjectNode result, int nextNodeId) {
    	try {
    		ObjectMapper mapper = new ObjectMapper();
    		JsonNode root = mapper.readValue(result, JsonNode.class);
    		result.put("nextNodeId", nextNodeId);
	    	
	    	// Create (or overwrite) the list of relationships we're about to populate
	    	ArrayNode relations = result.putArray("relationships");
	    	
	    	// the raw sql for all foreign key rels in a table
	    	String query = "SELECT tc.table_schema, tc.constraint_name, tc.table_name, kcu.column_name, ccu.table_name "
	    			+ " AS foreign_table_name, ccu.column_name AS foreign_column_name"
	    			+ " FROM information_schema.table_constraints tc"
	    			+ " JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name"
	    			+ " JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name"
	    			+ " WHERE constraint_type = 'FOREIGN KEY'";
	    			//+ " AND ccu.table_name='" + db_name + "'";
	    	// Execute the query
	        PreparedStatement pst = null;
	        ResultSet rs = null;
	        try {
	        	pst = con.prepareStatement(query);
	        	rs = pst.executeQuery();
	        	// Loop over the Foreign Key entries
	        	while (rs.next()) {
	        		ObjectNode fk = Json.newObject();
	        		relations.add(fk);
	        		fk.put("node_id", nextNodeId++);
	        		// Return the updated nextNodeId so others can pick up with the next number
	        		result.put("nextNodeId", nextNodeId);
	        		String fk_source_table_name = rs.getString("table_name");
	        		String fk_source_column_name = rs.getString("column_name");
	        		String fk_target_table_name = rs.getString("foreign_table_name");
	        		String fk_target_column_name = rs.getString("foreign_column_name");
	        		// Find the source table
	        		JsonNode tablesNode = root.path("data");
	        		Iterator<JsonNode> tableList = tablesNode.getElements();
	        		// Loop over tables in our imported schema
	        		while (tableList.hasNext()) {
	        			JsonNode tbl = tableList.next();
	        			String tbl_name = tbl.get("title").getTextValue();
	        			
	        			// If this is the source table
	        			if (fk_source_table_name.equals(tbl_name)){
	        				// Find the source field
	        				JsonNode fieldsNode = tbl.path("fields");
	        				Iterator<JsonNode> fieldList = fieldsNode.getElements();
	        				// Loop over the fields in the source table
	        				while (fieldList.hasNext()) {
	        					JsonNode fld = fieldList.next();
	        					String fld_name = fld.get("title").getTextValue();
	        					if (fk_source_column_name.equals(fld_name)) {
	        						// System.out.println("\tSource field id: " + fld.get("node_id"));
	        						fk.put("source_node_id", fld.get("node_id"));
	        					}
	        				}
	        			}  // end: if this is the source table
	        			
	        			// If this is the target table
	        			if (fk_target_table_name.equals(tbl_name)){
	        				// Find the target field
	        				JsonNode fieldsNode = tbl.path("children");
	        				Iterator<JsonNode> fieldList = fieldsNode.getElements();
	        				// Loop over the fields in the target table
	        				while (fieldList.hasNext()) {
	        					JsonNode fld = fieldList.next();
	        					String fld_name = fld.get("title").getTextValue();
	        					if (fk_target_column_name.equals(fld_name)) {
	        						// System.out.println("\tSource field id: " + fld.get("node_id"));
	        						fk.put("target_node_id", fld.get("node_id"));
	        					}
	        				}
	        			} // end:  if this is the target table
	        			
	        			
	        			
	        			
	        			
	        			
	        		}
	        	}
	        	
	        } catch (SQLException ex) {
	    		System.out.println(ex.getMessage());
		    }
	        
	        
    	}
    	catch (JsonParseException e) {
    		
    	}
    	catch (JsonMappingException e) {
    		
    	}
    	catch (IOException e) {
    		
    	}
	    	
    	return result;
    }
    
    public static Result createSampleDatabase(String database_name) {
    	ObjectNode result = Json.newObject();
    	
    	// The "table" section of a mapping document has its own
    	// structure we must re-create before passing data to UI.
    	ObjectNode tableWrapper = Json.newObject();
    	tableWrapper.put("type", "table");
    	
    	Connection con = null;
    	Statement st = null;

        String url = "jdbc:postgresql://localhost";
        if (database_name.length() > 0 ) {
        	//url += database_name;
        }
        else {
        	 // Todo:  let the user know they didn't supply a db name
        }
        String user = "postgres";
        String password = "postgres";
 
        try {

        	con = DriverManager.getConnection(url, user, password);
        	st = con.createStatement();
        	String sql = "DROP DATABASE if exists " + database_name + ";";
        	sql += "CREATE DATABASE " + database_name + ";";
        	//System.out.println("About to execute sql: " + sql);
        	st.executeUpdate(sql);
        	
        	
            // Connect to the database we jus recreated.
        	con = DriverManager.getConnection(url + "/" + database_name, user, password);
        	st = con.createStatement();
            
            con.setAutoCommit(false);
            
            // Create the Employees table
            st.addBatch("DROP TABLE IF EXISTS employee");
            st.addBatch("CREATE TABLE employee(id serial PRIMARY KEY, first_name VARCHAR(25), last_name VARCHAR(25))");
            st.addBatch("INSERT INTO employee(first_name) VALUES ('Jane')");
            st.addBatch("INSERT INTO employee(first_name) VALUES ('Tom')");
            st.addBatch("INSERT INTO employee(first_name) VALUES ('Rebecca')");
            st.addBatch("INSERT INTO employee(first_name) VALUES ('Jim')");
            st.addBatch("INSERT INTO employee(first_name) VALUES ('Robert')");                 
            
            // Create the purchase_orders table
            st.addBatch("DROP TABLE IF EXISTS purchase_order");
            st.addBatch("CREATE TABLE purchase_order(id serial PRIMARY KEY, po_nbr VARCHAR(50), po_date timestamp with time zone)");
            st.addBatch("INSERT INTO purchase_order(po_nbr) VALUES ('11111111')");
            st.addBatch("INSERT INTO purchase_order(po_nbr) VALUES ('22222222')");
            
            // Create the shipments table
            st.addBatch("DROP TABLE IF EXISTS shipment");
            st.addBatch("CREATE TABLE shipment(id serial PRIMARY KEY, shipment_nbr VARCHAR(50), "
            		+ "shipment_date timestamp with time zone"
            		+ ",purchase_order_id integer"
            		+ ", FOREIGN KEY (purchase_order_id) REFERENCES purchase_order(id) )");
            st.addBatch("INSERT INTO shipment(shipment_nbr) VALUES ('999999')");
            st.addBatch("INSERT INTO shipment(shipment_nbr, purchase_order_id) VALUES ('998888',1)");
            
            // Create the containers table
            st.addBatch("DROP TABLE IF EXISTS container");
            st.addBatch("CREATE TABLE container(id serial PRIMARY KEY, container_nbr integer"
            		+ ",shipment_date timestamp with time zone"
            		+ ",shipment_id integer"
            		+ ", FOREIGN KEY (shipment_id) REFERENCES shipment(id) )");
            st.addBatch("INSERT INTO container(container_nbr,shipment_id) VALUES ('12345',2)");
            
            // Create the item table
            st.addBatch("DROP TABLE IF EXISTS item");
            st.addBatch("CREATE TABLE item(id serial PRIMARY KEY, item_nbr integer"
            		+ ", container_id integer"
            		+ ", FOREIGN KEY (container_id) REFERENCES container(id) )");
            st.addBatch("INSERT INTO item(item_nbr,container_id) VALUES ('12345',1)");
            
            con.commit();
        } catch (SQLException ex) {

            System.out.println(ex.getNextException());
            
            if (con != null) {
                try {
                    con.rollback();
                } catch (SQLException ex1) {
//                    Logger lgr = Logger.getLogger(BatchUpdate.class.getName());
//                    lgr.log(Level.WARNING, ex1.getMessage(), ex1);
                	  System.out.println(ex1.getMessage());
                }
            }

//            Logger lgr = Logger.getLogger(BatchUpdate.class.getName());
//            lgr.log(Level.SEVERE, ex.getMessage(), ex);
            System.out.println(ex.getMessage());

        } finally {

            try {
 
                if (st != null) {
                    st.close();
                }
                if (con != null) {
                    con.close();
                }

            } catch (SQLException ex) {
//                Logger lgr = Logger.getLogger(BatchUpdate.class.getName());
//                lgr.log(Level.WARNING, ex.getMessage(), ex);
            	  System.out.println(ex.getMessage());
            }
        }
    	return ok(result);
    }
    
}
