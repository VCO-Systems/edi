package controllers;

import java.util.*;
import javax.persistence.*;
import play.*;
import play.mvc.*;
import play.libs.Json;
import org.codehaus.jackson.node.ObjectNode;

import views.html.*;
import models.Mapping;

public class Application extends Controller {
  
    public static Result index() {
        return ok(index.render(""));
    }
    
    @BodyParser.Of(BodyParser.Json.class)
    public static Result mappings() {
        //List<Mapping> mappings = Mapping.find.all();
        //renderJSON(mappings);
    	ObjectNode result = Json.newObject();
    	result.put("data", Json.toJson(Mapping.find.all()));
    	return ok(result);
    }
}