package controllers;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.*;

import javax.persistence.*;
import javax.xml.transform.stream.StreamSource;

import play.*;
import play.mvc.*;
import play.libs.Json;

import org.codehaus.jackson.JsonNode;
import org.codehaus.jackson.node.ObjectNode;
import org.milyn.Smooks;
import org.milyn.SmooksException;
import org.milyn.container.ExecutionContext;
import org.milyn.payload.StringResult;
import org.xml.sax.SAXException;

import com.avaje.ebean.Ebean;

import views.html.*;
import models.Mapping;

public class CodePlayground extends Controller {
  
    /**
     * Takes an EDI flat file and returns the Smooks-generated XML.
     * 
     * @return
     * @throws IOException
     * @throws SAXException
     * @throws SmooksException
     */
    @BodyParser.Of(BodyParser.Json.class)
    public static Result convertEdiToXmlString() throws IOException, SAXException, SmooksException {
    	Locale defaultLocale = Locale.getDefault();
        Locale.setDefault(defaultLocale);
        
    	// The XML string to return to the UI
    	String result = new String();
    	
    	// Get the EDI flat-file data from the POST 
    	JsonNode json = request().body().asJson();
    	String edi_string = json.findPath("edi_string").getTextValue();
        
    	// Instantiate Smooks with the config from conf/smooks-config.xml
    	Smooks smooks = new Smooks("smooks-config.xml");
        
    	try {
    		// Create an exec context - no profiles....
            ExecutionContext executionContext = smooks.createExecutionContext();
            StringResult string_result = new StringResult();
            
            // Filter the input message to the outputWriter, using the execution context...
            byte[] messageIn = edi_string.getBytes();
            smooks.filterSource(executionContext, new StreamSource(new ByteArrayInputStream(messageIn)), string_result);
            result = string_result.getResult();
    	}
    	finally {
    		smooks.close();
    	}
    	// Return the XML, setting content-type to text/xml so the UI
    	// will handle it correctly
    	return ok(result).as("text/xml");
    }
    
}