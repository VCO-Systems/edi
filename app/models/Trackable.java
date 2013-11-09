package models;

import java.util.*;
import javax.persistence.*;

import play.db.ebean.*;
import play.data.format.*;
import play.data.validation.*;


import com.avaje.ebean.*;


/**
 * Trackable entity managed by Ebean
 */
@Entity 
public class Trackable extends Model {

    @Id
    public Long id;
    
    //  @Constraints.Required
    public String name;
    
    public String description;
    /**
     * Generic query helper for entity Trackable with id Long
     */
    public static Model.Finder<Long,Trackable> find = new Model.Finder<Long,Trackable>(Long.class, Trackable.class);

    public static Map<String,String> options() {
        LinkedHashMap<String,String> options = new LinkedHashMap<String,String>();
        for(Trackable c: Trackable.find.orderBy("name").findList()) {
            options.put(c.id.toString(), c.name);
        }
        return options;
    }

}

