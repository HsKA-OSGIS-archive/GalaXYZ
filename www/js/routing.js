/**
* Handles the routing request and rendering protocol
* *
* @author: enocholumide
*/
//------------------------------------------------------------------------------

var directionPoints = [];
var reroute = false;
var routingCapability = false;

var node_id;


function initRouting(){

	directions = new L.FeatureGroup();
	routingCapability = true;

	map.addLayer(directions);
}

/**
* Add a direction point
* 
* @param {number} x - lon
* @param {number} y  -lat
*  
*/
function addDirectionPoint(x,y){

	if(routingCapability){

		console.log("Processing route!");

		var point = turf.point([x,y]);

		// Find the closest node_id in the network and proces the new point
		
		getClosestNode(x,y, node_id => processNewPoint(node_id, point));


	} // if routing capabilty is enabled

	else
		console.log("%Something went wrong, routing capability for this program might not have been enabled, ensure the initRouting function is properly configured",  "background: red; color: white; font-size: large");

} // Add direction point

/**
* Process a new point on the map with its closest node ID
* Serves as a callback funtion from the ajax _ php request
* Nothing happens if the node_id is null or undefined
*
* @param {number} node_id  -  Closest node id of the point
* @param {Geojson} point - Point clicked on the map 
*/
function processNewPoint(node_id, point){

	// Check if the node ID is valid
	if(node_id === undefined || node_id === null) {

		console.log("%cClosest node cannot be found on the network, cannot proccess point!", "background: red; color: white; font-size: large");

	} 

	else {

		// Attach the closest node ID to the point
		point.node_id = node_id;

		// Create Leaflet latlng
		point.latlng = [point.geometry.coordinates[1], point.geometry.coordinates[0]];

		// Add point to list
		directionPoints.push(point);
		renderDirectionPoint(node_id, point);

		// How many points have been added ?
		var length = directionPoints.length;

		// Find route if the point is greater than or equal to 2
		if(length >= 2) {

			// Take the last two items on the list
			var fromNodeID = directionPoints[length - 2].node_id;
			var toNodeID = directionPoints[length - 1].node_id;

			// Find the route with the nodeIDs
			findRoute(fromNodeID, toNodeID);
		}
	}
}


/**
* Handles the general rendering of the point on the map
* 
* To be worked on later by adding more listeners and bind popup

* @param {number} node_id  -  Closest node id of the point
* @param {Geojson} point - Point clicked on the map
*/
function renderDirectionPoint(node_id, point){

	// Create marker from Geojson
	marker = new L.marker([point.geometry.coordinates[1], point.geometry.coordinates[0]], {draggable:'true'});

	//----------------------------------------

	// Add ondrag event. 
	// TODO: Reroute!
  	marker
  	.on('drag', function(event){

	    var newMarker = event.target;
	    var position = newMarker.getLatLng();
	    marker.setLatLng(position);
	    map.panTo(position);
	    
	})

	// Simple tooltip
	.bindTooltip("Node ID: " + node_id, {direction: 'top', permanent: true});

	//----------------------------------------

  	directions.addLayer(marker);

  	//----------------------------------------

}

/**
* Finds route between two points within the db network
*/
function findRoute(from_node_id, to_node_id){

	console.log("%cFinding route..................................", "background: green; color: white; font-size: large");
	console.log("From node ID: " + from_node_id + " ;\nTo node ID: ", to_node_id);

	console.log("%cAvailable nogo areas............................", "background: red; color: white; font-size: large");
	console.log(getAllNogoAreas());
}

/**
* Refreshes the route if the nogo areas have been updated
*/
function refreshRoute(){

	console.log("%Refreshing route..................................", "background: green; color: white; font-size: large");

	console.log("%cAvailable nogo areas............................", "background: red; color: white; font-size: large");
	console.log(getAllNogoAreas());
}

/**
* Renders the found route on the map
*/
function renderRoute(routeArray){

}


function setRoutingCapability(toggle){
	routingCapability = toggle;
}

function getAllNogoAreas(){

	var allnogoareas = [];
	allnogoareas["polygon"] = turf.feature(getWKT(nogo_Poly, "polygon"));
	allnogoareas["linestring"] = turf.feature(getWKT(nogo_Line, "linestring"));

	return allnogoareas;
}

function getFromToPoints(){

	var dirPoints = [];
	dirPoints["from"] = directionPoints[0].node_id; 
	dirPoints["to"] = directionPoints[1].node_id; 
	return dirPoints;

}

/**
* Returns an animated polyline from the last point in the direction point list.
* @param {L.LatLng} latlng - point to draw the polyline to
*/

function getAntLineForLastDirPoint(to_latlng){

	try {

		var lastPoint = directionPoints[directionPoints.length -1 ];
	    var latlngs = [ lastPoint.latlng, to_latlng ];

		var options = {delay: 300, dashArray: [10,20], weight: 5, color: "darkblue", pulseColor: "#FFFFFF"};
		var path =  L.polyline.antPath(latlngs, options);

		return path;

	} catch (error) {
		console.log(error);
	}
}