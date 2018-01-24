var closestID;



function sendAjax(){
	// calls an AJAX query to the file ajax_dbquery
	$.ajax({url: "ajax_dbquery.php", success: function(result){
		//passes result to handleAjax function
		handleAjax(result);
	}});
}

// handles the result of the db ajax query
function handleAjax(result){
	//console.log(result);
	var newResult = JSON.parse(result); // convert string to json object
	var coordArray = newResult.coordinates; // set coordinates to array
	//console.log(coordArray[0][0]); // lon of a single coord
	//console.log(coordArray[0][1]); // lat of a single coord
}

function panelDisplay(){
	// shows and hides the panel
	var panel = $('#panel');
	if(panelDisp == 0){
		panel.show();
		panelDisp = 1
	} else {
		panel.hide();
		panelDisp = 0;
	}
	
}
//adds a feature to the panel when a new feature is created
function panel_addNogo(leaflet_id){

	nogoCount += 1;
	//string containing the HTML to be appended when a nogo is added
	addPoly = '<div class="row nogoitem" id="nogoitem'+leaflet_id+'" \
	onmouseover="highlightNogoPoly('+leaflet_id+')" onmouseout="removeAllNogoHighlights()">\
				<div class="col-xs-2" style="padding-left: 0px; padding-top: 5px;">\
					<span class="glyphicon glyphicon-stop" style="font-size: 2.0em;"></span>\
				</div>\
				<div class="col-xs-9" >\
					<div class="row">\
						<p class="objTitle" onclick="testfunc('+leaflet_id+')">\
							<b>Polygon '+leaflet_id+'</b>\
						</p>\
					</div>\
					<div class="row">\
						<input id="desc'+leaflet_id+'" type="text" class="form-control" placeholder="Add description"\
						style="margin-bottom: 5px;" onfocus="toggleSave(0,'+leaflet_id+')"></input>\
					</div>\
				</div>\
				<div class="col-xs-1" style="padding:0px; padding-top: 10px;">\
					<span class="glyphicon glyphicon-trash" title="Delete feature" onclick="removeNogoPoly('+leaflet_id+')"></span>\
					<span id="saveglyph'+leaflet_id+'" class="glyphicon glyphicon-ok" \
					title="Save description" onclick="saveDesc('+leaflet_id+')"></span>\
				</div>\
			</div>';
	//prepends the nogo area to the nogo HTML list
	$("#managenogo").prepend(addPoly);
}

/**
* Removes the nogo item from the panel given the leaflet id
* 
* @param {number} leaflet_id  -  leaflet id of the nogo area
*/
function panel_delNogo(leaflet_id){
	//removes html element from the nogo list				
	$('#nogoitem'+leaflet_id).remove();
}

function toggleSave(ind,leaflet_id){
	//toggles the save glyphicon depending on the ind val,
	//for the specific icon indivated by the id
	if (ind == 0){
		$('#saveglyph'+leaflet_id).show();	
	} else {
		$('#saveglyph'+leaflet_id).hide();	
	}	
}
//saves the description entered in the panel
function saveDesc(leaflet_id){	
	desc = $('#desc'+leaflet_id).val(); //get the text description
	toggleSave(1,leaflet_id);
	//changes from input element to <p> element with the same value
	$('#desc'+leaflet_id).replaceWith('<p id="desc'+leaflet_id+'" onclick="editDesc('+leaflet_id+')">'+desc+'</p>');
	//get the index of the nogo_poly array item with the specified layer id
	var index = nogo_Poly.map(function(el) {
	  return el.id;
	}).indexOf(leaflet_id);
	//append to the description to the item in the nogo_Poly array 
	nogo_Poly[index]['desc'] = desc;
	//console.log(nogo_Poly[index]);
}
// allows for editing of a NoGo polygon's description
function editDesc(leaflet_id){
	desc = $('#desc'+leaflet_id).html(); // get current desc
	//html to replace old html
	html = '<input id="desc'+leaflet_id+'" type="text" class="form-control" placeholder="Add description"\
			style="margin-bottom: 5px;" onfocus="toggleSave(0,'+leaflet_id+')" value="'+desc+'"></input>';
	$('#desc'+leaflet_id).replaceWith(html);
}
//calls an ajax function which returns the id of the
//closest node to the point clicked on the map
function getClosestNode(x,y, callback) {
	ajax_url = "php/ajax_closestNodes.php?x="+x+"&y="+y;
	$.ajax({ url: ajax_url, 
		success: function(data, status, xhr){  
       		callback(data);
     	}
	});
}
//executes the ajax function to generate the route
function nogoDijkstra(){

	$('#NoGoLoader').show(); //show the loader

	var nogos = getAllNogoAreas().polygon; //get all nogo areas
	var nodeIds = getFromToPoints(); // get all node ids

    if (nodeIds.length > 1) {
		$.ajax({url: "php/ajax_nogoDijkstra.php",
			type: "POST",
			data: {data: JSON.stringify(nogo_Poly),
				nodes: JSON.stringify(nodeIds) },
			success: function(result){
				//passes result to handle_nogo function
				handle_nogo(result);
				//console.log(result);

			}
		});
    }
}

function handle_nogo(result){	
	$('#NoGoLoader').hide(); //hide the loader
	route = JSON.parse(result); //set result to the 'route' variable
	renderRoute(route);
}

/* 
* upload shapefile
*/

function upload(){

    var form_data = new FormData();
	for (var i = 0, len = document.getElementById('fileInput').files.length; i < len; i++) {
        form_data.append("file" + i, document.getElementById('fileInput').files[i]);
    }

    
   	$.ajax({
		url: "php/upload.php", // Url to which the request is send
		type: "POST",             // Type of request to be send, called as method
		data: form_data, // Data sent to server, a set of key/value pairs (i.e. form fields and values)
		contentType: false,       // The content type used when sending data to the server.
		cache: false,             // To unable request pages to be cached
		processData:false,        // To send DOMDocument or non processed data file it is set to false
		success: function(result){
			//shp2json(result);
			if (result == 1){
				shp2json();
			} else if (result == 2){
				readJson();
			} else {
				alert("Please select all associated files as well (.dbf .shx etc),\n"+
				"or a zip file containing these files");
			}
			//console.log(result);
		}
	});
}
function shp2json(){
	//console.log(name);
	//console.log(ajax_url);
	//console.log("shp2json");
	$.ajax({
		url: 'php/shp2json.php',
		dataType: 'json',
		success: function(result){
			//console.log(JSON.parse(result));
			var shp = JSON.parse(result)
			//console.log(shp);

			stageJSONFile(shp);
			//L.geoJSON(shp).addTo(map);

		}
	});
}
function readJson(){
	//console.log("readJson");
	$.ajax({
		url: 'php/readJson.php',
		dataType: 'json',
		success: function(result){
			//console.log(JSON.parse(result));
			var obj = JSON.parse(result)
			
			//var features = [];
			//for(var i = 0; i = obj.length; i++) {
			//	features.push(obj[i]);
			//}
			//var fc = turf.featurecollection(features);

			//L.geoJSON(obj).addTo(map);
			//console.log(fc);
			//stageJSONFile(fc);
			var features = [];
			for(var i = 0; i < obj.length; i++) {
				//console.log(obj[i]);
				features.push(obj[i]);
			}
			var fc = turf.featureCollection(features);
			//console.log(fc);
			stageJSONFile(fc);

		}
	});
}

function downloadJson() {
	
	var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(nogo_Poly));
	$('<a id="dlClick" href="data:' + data + '" download="NoGo_Polygons.json">download JSON</a>').appendTo('#downloadContainer');
	
	document.getElementById('dlClick').click(); 
}



