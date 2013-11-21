package controllers;

import java.util.*;
import javax.persistence.*;
import play.*;
import play.mvc.*;
import play.libs.Json;
import org.codehaus.jackson.node.ObjectNode;

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
    		Logger.debug(String.valueOf(matches.size()));
    	    // If we found a matching mappind document, return it
    		if (matches.size() > 0) {
    	    	result.put("data", Json.toJson(matches));
    		}
    		else {
    			result.put("error", "Mapping not found.");
    		}
    	}
    	else if (mappingNodeId == null) {
    		Logger.debug("Returning all mappings");
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
}