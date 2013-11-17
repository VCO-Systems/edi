package models;

import java.util.*;
import javax.persistence.*;

import play.db.ebean.*;
import play.data.format.*;
import play.data.validation.*;

@Entity 
public class Mapping extends Model { 

  @Id
  public Long id;
  
  @Constraints.Required
  public String name;
  
  @Constraints.Required
  public String description;
  
  public Integer ordering;
  
  public static Finder<Long,Mapping> find = new Finder<Long,Mapping>(
		    Long.class, Mapping.class
		  ); 
  
  
  //@Formats.DateTime(pattern="dd/MM/yyyy")
  public Date mod_ts = new Date();
  public Date create_ts = new Date();
  
  public Mapping() {
      this.mod_ts = new Date();
  }
  
  public Mapping(String name, String description) {
      this.name = name;
      this.description = description;
      this.mod_ts = new Date();
      this.create_ts = new Date();
  }

}