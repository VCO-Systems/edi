package controllers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import javax.persistence.*;

import org.codehaus.jackson.node.ArrayNode;
import org.codehaus.jackson.node.ObjectNode;

import play.*;
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
            	
            	// STUB: list the fields
            	List<String> titles = parsedFields.findValuesAsText("title");
            	
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
    
    public static Result createSampleDatabase(String database_name) {
    	ObjectNode result = Json.newObject();
    	ArrayNode data = result.putArray("data");
    	//List<Object> data = new ArrayList<Object>();
    	
    	// The "table" section of a mapping document has its own
    	// structure we must re-create before passing data to UI.
    	ObjectNode tableWrapper = Json.newObject();
    	tableWrapper.put("type", "table");
    	ArrayNode tableData = tableWrapper.putArray("data");
    	
    	
    	
    	
    	Connection con = null;
    	Statement st = null;
        ResultSet rs = null;

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
            
            int counts[] = st.executeBatch();
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
