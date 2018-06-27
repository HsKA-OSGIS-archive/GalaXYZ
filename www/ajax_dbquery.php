<?php
	//session_start();
	//ini_set('display_errors', 1); // Dispalys errors


	require("functions.php");
	// creates db connection from functions page
	$conn = dbconn();
	$geometry = "";
	$sql = "SELECT ST_AsGeoJson(geom) AS geom FROM ways";

	$result = pg_query( $sql ) or die('Query Failed: ' .pg_last_error());
	$count = 0;
	while( $row = pg_fetch_array( $result, null, PGSQL_ASSOC ) ) {
		$geometry = $row['geom'];

	}
	pg_free_result( $result );

	echo $geometry;

?>
