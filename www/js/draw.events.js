/**
* Handles the draw events from the leaflet plugin
* If the plugin is not originally initialised, nothing happens
*
* @author: enocholumide
*/
//------------------------------------------------------------------------------

/**
* Registers draw events on the map from the leaflet draw control plugin
*  
*/

var nogo_Poly = [];
var nogo_Line = [];

var guides = new L.FeatureGroup();
var invalidNogos = new L.FeatureGroup();
var path;

var DEFAULT_COLOR = "red";

function registerDrawEvents(){

	// Check if a draw control have been added or not

	if(drawControl){

    // Add drawing guides
    map.addLayer(guides);

    // Add invalid nogos
    map.addLayer(invalidNogos);

		console.log("Registering draw events on the map");

		map.on(L.Draw.Event.CREATED, e => onDrawCreated(e));
		map.on(L.Draw.Event.EDITED, e => onDrawEdited(e));
		map.on(L.Draw.Event.DELETED, e => onDrawDeleted(e));
    map.on(L.Draw.Event.DRAWSTART, e => onDrawStart(e));

	}
  else
		console.error("Draw control might not have been initialised on the map");
}

/**
* Event for draw started
* @param {L.Draw.Event} e - Leaflet draw event layer
*/
function onDrawStart(e) {

  console.log("Draw start");

  // Clear all the guide lines on the map
  guides.clearLayers();

  // Draw Start for MARKERS
  //---------------------------------------
  if((e.layerType).toUpperCase() === "MARKER"){


      // Install mouse move listener on the map
      //---------------------------------------
      map.on("mousemove", function(e){
        
        // If there are more than one direction point ...
        if(!(directionPoints[directionPoints.length - 1 ] === undefined)) {

          // Clear previous guide layers  
          guides.clearLayers();

          // Create an antline
          path = getAntLineForLastDirPoint(e.latlng);

          // Add to the guide and show on map
          guides.addLayer(path);
        }

      });

      // If the drawing is stopped
      //-----------------------------------
      map.on('draw:drawstop', function () { 

        // Switch off map move event to stop the ant line showing on the map
        map.off("mousemove") ;

        // Clear all the guide lines on the map
        guides.removeLayer(path);

      });

   }
}


/**
* Event for draw created
* @param {L.Draw.Event} e - Leaflet draw event layer
*/
function onDrawCreated(e) {

	console.log("Draw created");

	var layer = e.layer;
  var type = e.layerType;

  console.log(layer);

  // Protocol if the user draws a polygon on the map

  if (type.toUpperCase() === 'POLYGON' || type.toUpperCase() === 'RECTANGLE') {

      var nogoIsOkay = !validateNogoPoly(layer.toGeoJSON());

      if(nogoIsOkay){
      	// Change color of nogo polygon drawn to red
        layer.setStyle({color:DEFAULT_COLOR});

        // Display drawn polygon on the map
      	// Note nogoAreas is a feature collection already attached to the map
       	nogoAreas.addLayer(layer);

        layer.on('click', e => nogoOnClick(e));

       	var coordsRefined = getFormatedCoords(layer);

       	// Create a turf polygn and add the leaflet layer id
       	var turfPoly = getTurfPolygon(coordsRefined, layer._leaflet_id);

        nogo_Poly.push(turfPoly);

        layer["ok"] = true;

       	// Add to nogo-areas list
       	//plotlayers.push(turfPoly);
        // VALIDATE POLY
        //console.log("Created");
        //console.log(validateNogoPoly(turfPoly));
      } 

      else {

        console.log("Cannot add nogo area(s) over a via point");
        //invalidNogos.clearLayers();
      }

      nogoDijkstra();

  } // End polygon protocol


  // Protocol if the user draws a polyline on the map

  if(type.toUpperCase() === 'POLYLINE'){

      // Display drawn polygon on the map
      // Note nogoAreas is a feature collection already attached to the map
      nogoAreas.addLayer(layer);

      // Create a turf linestring and add the leaflet layer id
      var turfLineString = getTurfLineString(layer, layer._leaflet_id);

      // Add to nogo-areas list
      nogo_Line.push(turfLineString);

      // Construct a WKT of all the lines
      console.log((getWKT(nogo_Line, "LineString")));

   } // End polyline protocol

   // Protocol for drawing points for routing
   // This protocol is transfered to the routing.js -> /js/routing.js

   if((e.layerType).toUpperCase() === "MARKER"){

      // Check if point is on nogo area
      addDirectionPoint(layer.getLatLng().lng, layer.getLatLng().lat);
      //console.log(directionPoints)
   }

}

/**
* Add uploaded geojson to the leaflet draw plugin to be further edited and inlcuded
* in the nogo areas list.
* @param {GeoJSON} geojson - uploaded geojson object
*/
function stageJSONFile(geojson) {

  if(geojson.type.toUpperCase() === "FEATURECOLLECTION") {

    // Loop through the feature collection
    for(var k = 0; k < geojson.features.length; k++) {

      // Get a feature
      var feature = turf.feature(geojson.features[k]);

      for(var p = 0; p < feature.geometry.geometry.coordinates.length; p++) {
        // Retrieve its coordinates 
        var coordinates = feature.geometry.geometry.coordinates[p];

        // Add to nogo poly array list
        // Construct a turf polygon with the original geojson coordinates format
        var turfPoly = turf.polygon([coordinates]);

        var nogoIsOkay = !validateNogoPoly(layer.toGeoJSON());

        // Validate the polygon
        if(nogoIsOkay){
          // Convert to leaflet lat lng format
          var latlngArray = [];
          for(var i = 0 ; i < coordinates.length; i++) {
            var latlng = new L.LatLng(parseFloat(coordinates[i][1]), parseFloat(coordinates[i][0]));
            latlngArray.push(latlng);
          }

          // Create a polygon from the array and set style
          var polygon = L.polygon(latlngArray);
          polygon.properties = feature.geometry.properties;
          polygon.setStyle({color:DEFAULT_COLOR});

          // Add to the feature group in the draw tool plugin
          nogoAreas.addLayer(polygon);
          polygon.on('click', e => nogoOnClick(e));

          // Add to the panel
          panel_addNogo(polygon._leaflet_id);

          

          // Add a tag to the new polygon, this is useful when the the user deletes a polygon
          turfPoly["id"] = polygon._leaflet_id;

          //var turfPoly = getTurfPolygon(latlngArray, polygon._leaflet_id);
          nogo_Poly.push(turfPoly);
        }

        else {
          console.log("Cannot add nogo area(s) over a via point");
        }
      }
    }
  }
}

/**
* Event for draw edited
* Will only treat item edited on the layer list
* Computes the new geometry and replaces it at the plotlayers array 
* @param {L.Draw.Event} e - Leaflet draw event layer
*/

function onDrawEdited(e){

	console.log("Draw edited");
	var layers = e.layers;
  

    layers.eachLayer(function (layer) {

      // Check if the edited item is a polygon item

      // Get the index of the item using its leaflet ID
      var index = nogo_Poly.map(function(e) { return e.id; }).indexOf(layer._leaflet_id);

      if(index >= 0){

        // Means Polygon
        var coordsRefined = getFormatedCoords(layer);

        // Re-create the polygn
        var turfPoly = getTurfPolygon(coordsRefined, layer._leaflet_id);

        var nogoIsOkay = validateNogoPoly(layer.toGeoJSON());

        console.log(nogoIsOkay);

        if(!nogoIsOkay) {

          // Replace the edited feature in the list
          nogo_Poly[index] = turfPoly;

        } else {
          nogoAreas.removeLayer(layer);
        }

      } else {

        // Means polyline

        // Get the index of the item using its leaflet ID
        index = nogo_Line.map(function(e) { return e.id; }).indexOf(layer._leaflet_id);

        // Re-confirm
        if(index >= 0) {

          // Re-create the line
          var turfLineString = getTurfLineString(layer, layer._leaflet_id);

          // Replace the edited feature in the list
          nogo_Line[index] = turfLineString;
          console.log("LineString replaced");

        } else {

          // It normally should not get to this stage, just doing this to keep track of things, in case!
          console.error("FATAL: An error has occured, cannot keep track of the just edited item");
        }

      }

  });

}

/**
* Changes maker's nodeid to new position and reroute
*
* @param {L.Event} e - marker event
* @param {number} node_id - new node id of the evet location
*/
function onMarkerDragEnd(event, node_id) {
    event.target.node_id = node_id;
    nogoDijkstra();
}

/**
* Event for draw edited
* Will only treat item edited on the layer list
* Computes the new geometry and replaces it at the plotlayers array 
* @param {L.Draw.Event} e - Leaflet draw event layer
*/

function onDrawDeleted(e){

	console.log("Draw deleted");

	var layers = e.layers;

	layers.eachLayer(function (layer) {

        // Check if the edited item is a polygon item

        // Get the index of the item using its leaflet ID
        var index = nogo_Poly.map(function(e) { return e.id; }).indexOf(layer._leaflet_id);

        if(index >= 0){

          // Means Polygon

          // Delete the edited feature in the list
          nogo_Poly.splice(index, 1);

          console.log("Polygon removed from the list");

        } // if

        else {

          // Means polyline

          // Get the index of the item using its leaflet ID
          index = nogo_Line.map(function(e) { return e.id; }).indexOf(layer._leaflet_id);

          // Re-confirm
          if(index >= 0) {

            // Delete the edited feature in the list
            nogo_Line.splice(index, 1);

            console.log("LineString removed from the list");

          } else {

            // It normally should not get to this stage, just doing this to keep track of things, in case!
            console.error("FATAL: An error has occured, cannot keep track of the just edited item");

          }
        } // else

        // Delete from side panel
        panel_delNogo(layer._leaflet_id);

    });

} // onDrawDeleted 


// ---------------------------------------------------------
//                      ASSISTING FUNCTIONS
// ---------------------------------------------------------

/**
* Refines the coordinates generated from the draw events and 
* gets it ready to be converted to polygon format
* @param {L.Layer} layer - Leaflet layer
* @return {Array} coordinates array in leaflet lat lng format 
*/
function getFormatedCoords(layer){


	var coords = layer.getLatLngs()[0];


    // Remove duplicates 
    var coordsRefined = coords;
    for(var ii = 0 ; ii < coords.length; ii++){

        for(var jj = 0 ; jj < coords.length; jj++){
            
            if(jj != ii){
                
                if(coords[jj].lat == coords[ii].lat && coords[jj].lng == coords[ii].lng){
                    coordsRefined.splice(jj, 1);
                }
            } 
        }
    }

   // Close the polygon by adding the first coords to the last index.
   coordsRefined.push(coordsRefined[0]);

   return coordsRefined;
}

/**
* Refines the coordinates generated from the draw events and 
* gets it ready to be converted to polygon format
* @param {L.Layer} layer - Leaflet layer
* @param {Number} id - leaflet id of the original layer
* @return {Feature} GeoJSON Feature: Polygon
*/
function getTurfPolygon(coordsRefined, leaflet_id){

	// Format coords to turf index
    var turfCoords = [];

   	for(var ii = 0; ii < coordsRefined.length; ii++){
        //Turf uses lng, lat
        turfCoords[ii] = [ coordsRefined[ii].lng, coordsRefined[ii].lat ];
   	}

   	// Construct a turf polygon <- geojson
   	var turfPoly = turf.polygon([turfCoords]);

   	// Add a tag to the new polygon, this is useful when the the user deletes a polygon
   	turfPoly["id"] = leaflet_id;

   	return turfPoly;
}

/**
* Creates a turf line string from a leaflet layer
* @param {L.Layer} layer - Leaflet layer
* @param {Number} id - leaflet id of the original layer
* @return {Feature} GeoJSON Feature: linestring
*/
function getTurfLineString(layer, leaflet_id){

  // Extract coordinates
  var coordsArray = [];
  for(var ii = 0; ii < layer.getLatLngs().length; ii++){
    // Turf coords starts from lng then lat
    coordsArray.push([layer.getLatLngs()[ii].lng, layer.getLatLngs()[ii].lat]);
  }

  // Create a turf line string from the coords array and add its leaflet id for referencing
  var turfLineString = turf.lineString(coordsArray);
  turfLineString["id"] = leaflet_id;

  return turfLineString;

}

/**
* Removes a polygon nogo area from the map and the list
* @param {Number} leaflet_id - leaflet id of the layer to remove
* @return {boolean} Returns true if the layer was removed
*/

function removeNogoPoly(leaflet_id) {

  // Get the index of the item using its leaflet ID
  var index = nogo_Poly.map(function(e) { return e.id; }).indexOf(leaflet_id);

  if(index >= 0) {

    // Remove from the list
    nogo_Poly.splice(index, 1);

    // Remove from the map (via the nogoAreas feature group)
    nogoAreas.removeLayer(leaflet_id);

    // Remove from panel
    panel_delNogo(leaflet_id);
    nogoDijkstra();
    return true;

  }

  // If no index found => log an error 

  else {

    var error = "FATAL: Item cannot be found in the existing list with the supplied ID, perhaps the item not a nogo polygon?";
    console.error(error);
    alert(error);

    return false
  } 

} // removeNogoPoly


function nogoOnClick(e) {
  L.DomEvent.stop(e);
  highlightNogoPoly(e.target._leaflet_id);
}

function highlightNogoPoly(leaflet_id) {
    
    removeAllNogoHighlights();

    nogoAreas.eachLayer(function (layer) {
      if(layer._leaflet_id == leaflet_id){
        layer.setStyle({color:"green"});
      }
    });
    
}

function removeAllNogoHighlights() {
    nogoAreas.eachLayer(function (layer) {
      layer.setStyle({color:DEFAULT_COLOR});
    });
}



