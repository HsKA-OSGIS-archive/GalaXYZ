<?php

	//includes the functions from 'functions.php' for the database connection
	require("functions.php");
	//creates the connection
	$conn = dbconn();

	$geoms1 = $_POST['data']; //geometry 'POST' data passed from ajax
	$all_nodes = json_decode($_POST['nodes']); //node id of the 'from' location, passed from ajax

	$geoms = json_decode($geoms1, true); //makes the geoms1 a php array

	$ret = "";

	for ($n_i = 1; $n_i < count($all_nodes); $n_i++) {

	    $nodes = array($all_nodes[$n_i-1], $all_nodes[$n_i]);

        // if no nogo area has been set
        if (empty($geoms)){
            // run the normal pgr function
            $sql = "SELECT json_build_object(
                    'type',		'FeatureCollection',
                    'features', 	jsonb_agg(feature)
                )
                FROM (
                    SELECT json_build_object(
                        'type',		'Feature',
                        'id', 		gid,
                        'geometry',	ST_AsGeoJSON(geom)::json,
                        'properties',	to_jsonb(row) - 'id' - 'geom'
                ) AS
                    feature
                FROM
                    (
                        SELECT
                            seq AS gid,
                            route_result.edge AS edge_id,
                            ways.name,
                            geom AS geom
                        FROM pgr_dijkstra(
                                'SELECT gid::INTEGER AS id, source::INTEGER, target::INTEGER, cost::FLOAT8, reverse_cost::FLOAT8 FROM ways',
                                $1::INTEGER,
                                $2::INTEGER,
                                TRUE
                            ) AS route_result
                        INNER JOIN
                            ways
                        ON
                            ways.gid = route_result.edge
                    )
                row) features;";

            //query the DB and pass necessary params
            $result = pg_query_params( $conn, $sql, $nodes ) or die('Query Failed: ' .pg_last_error());

            $finalvalue = pg_fetch_result($result, 0, 0);
            //echo $finalvalue; //send result back to web page*/

        } else {

            // Nogo areas have been specified
            // run the nogo sql function
            $FeatureCollection = ""; //declare the feature collection variable

            $count = 0;
            //for each geometry (NoGo polygon):
            for ($x = 0; $x < sizeof($geoms); $x++){
                //remove the leaflet id from the array
                unset($geoms[$x]["id"]);
                //for every geometry except the first one
                if ($count > 0){
                    //prepend a comma separator to separate the features
                    $FeatureCollection.= ", ";
                }
                //add the geometry to the feature collection
                $FeatureCollection.= json_encode($geoms[$x]);
                $count += 1;
            }

            //sql parameter containing the geom
            $jsonParam = "
                {
                    \"type\": \"FeatureCollection\",
                    \"crs\": { \"type\": \"name\", \"properties\": { \"name\": \"urn:ogc:def:crs:OGC:1.3:CRS84\" } },
                    \"features\": [".$FeatureCollection."]
                }
                ";

            //sql function calling the pgr_nogo_trspViaVertices function from the DB
            $sql = '
            SELECT json_build_object(
                \'type\',		\'FeatureCollection\',
                \'features\', 	jsonb_agg(feature)
            )
            FROM (
                SELECT json_build_object(
                    \'type\',		\'Feature\',
                    \'id\', 		gid,
                    \'geometry\',	ST_AsGeoJSON(geom)::json,
                    \'properties\',	to_jsonb(row) - \'id\' - \'geom\'
            ) AS
                feature
            FROM
                (
                    SELECT
                        seq AS gid,
                        route_result.edge AS edge_id,
                        ways.name,
                        geom
                    FROM pgr_nogo_dijkstra(
                            \'SELECT gid::INTEGER AS id, source::INTEGER, target::INTEGER, cost::FLOAT8, reverse_cost::FLOAT8, geom AS geom FROM ways\',
                            (
                                SELECT
                                    ST_SetSRID(ST_Union(ST_GeomFromGeoJSON(feat->>\'geometry\')), 4326)
                                FROM (
                                    SELECT json_array_elements($1::json->\'features\'
                                ) AS
                                    feat
                            ) AS
                                f
                            ),
                            $2::INTEGER, $3::INTEGER,
                            TRUE
                        ) AS route_result
                    INNER JOIN
                        ways
                    ON
                        ways.gid = route_result.edge
                )
            row) features;


            ';

            array_unshift($nodes , $jsonParam);

            // send the query and necessary params to the DB
            $result = pg_query_params( $conn, $sql, $nodes ) or die('Query Failed: ' .pg_last_error());

            $finalvalue = pg_fetch_result($result, 0, 0);
            //echo $finalvalue; //send result back to web page*/
	    }

	    $ret .= $finalvalue;

	}

	echo $ret;

?>
