package controllers;

import java.util.*;
import javax.persistence.*;
import play.*;
import play.mvc.*;
import play.libs.Json;

import org.codehaus.jackson.node.ArrayNode;
import org.codehaus.jackson.node.ObjectNode;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.logging.Level;
import java.util.logging.Logger;

import com.avaje.ebean.Ebean;

import views.html.*;
import models.Mapping;

public class Application extends Controller {
  
    public static Result index() {
        return ok(index.render(""));
    }
    
    @BodyParser.Of(BodyParser.Json.class)
    public static Result get_mappings() {
        // List<Mapping> mappings = Mapping.find.all();
        // renderJSON(mappings);
    	ObjectNode result = Json.newObject();
    	result.put("data", Json.toJson(Mapping.find.all()));
    	return ok(result);
    }
    
    public static Result loadMapping(Long mappingNodeId) {
    	ObjectNode result = Json.newObject();
    	if (mappingNodeId != null) {
    		List<Mapping> matches = Mapping.find.where()
    				.eq("id", mappingNodeId)
    				.findList();
    		//Logger.debug(String.valueOf(matches.size()));
    	    // If we found a matching mappind document, return it
    		if (matches.size() > 0) {
    	    	result.put("data", Json.toJson(matches));
    		}
    		else {
    			result.put("error", "Mapping not found.");
    		}
    	}
    	else if (mappingNodeId == null) {
    		//Logger.debug("Returning all mappings");
    	}
    	return ok(result);
    }
    
    public static Result deleteMapping(Long mappingNodeId) {
    	ObjectNode result = Json.newObject();
    	Mapping recordToDelete = Mapping.find.ref(mappingNodeId);
    	if (recordToDelete != null) {
    		Ebean.delete(recordToDelete);
    		result.put("status",  1);
    		result.put("message", "Record deleted.");
    	}
    	else {
    		result.put("status", 0);
    		result.put("message", "Deletion failed.  Record not found.");
    	}
    	return ok(result);
    }
    
    public static Result getSchema(String database_name) {
    	ObjectNode result = Json.newObject();
    	//List<Object> data = new ArrayList<Object>();
    	ArrayNode data = result.putArray("data");

    	Connection con = null;
        PreparedStatement pst = null;
        ResultSet rs = null;

        String url = "jdbc:postgresql://localhost/customer_db_1";
        String user = "postgres";
        String password = "postgres";
 
        try {

            con = DriverManager.getConnection(url, user, password);
            String query = "SELECT table_name FROM information_schema.tables "
                    + "WHERE table_schema = 'public'";
            pst = con.prepareStatement(query);

            rs = pst.executeQuery();

            while (rs.next()) {
                //System.out.println(rs.getString(1));
            	ObjectNode tbl = Json.newObject(); 
            	tbl.put("table_name", rs.getString(1));
            	data.add(tbl);
            }

        } catch (SQLException ex) {
//            Logger lgr = Logger.getLogger(ListTables.class.getName());
//            lgr.log(Level.SEVERE, ex.getMessage(), ex);
        	  System.out.println(ex.getMessage());

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
                
                //Logger lgr = Logger.getLogger(ListTables.class.getName());
                //lgr.log(Level.WARNING, ex.getMessage(), ex);
            	System.out.println(ex.getMessage());
            }
        }
    	return ok(result);
    }
}