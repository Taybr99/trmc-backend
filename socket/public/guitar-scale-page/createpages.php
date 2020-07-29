<?php 
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
    $arr1 = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
    $arr2 = ["major", "pentatonic minor", "blues", "pentatonic major", "natural minor", "harmonic minor", "melodic minor (ascending)", "melodic minor (descending)", "dorian", "phrygian", "lydian", "mixolydian", "locrian", "arabic", "hungarian gypsy", "whole tone", "augmented", "phrygian dominant"];
    $x=1;
    foreach ($arr1 as $key => $value) {
		    	foreach ($arr2 as $key => $value2) {
		    		$x++;
		    		$pattern_with_space =str_replace(" ","+",$value2);
		    		$pattern_1 =str_replace("(","%28",$pattern_with_space);
		    		$pattern_2 =str_replace(")","%29",$pattern_1);
		    		$filename = $value.str_replace(" ","",$value2);
		    		echo $filename."<br>";
		    	    $url = "http://www.scalerator.com/?optionsDisp=none&tuning=EADGBE&size=30&root=".str_replace("#","%23",$value)."&pattern=".$pattern_2;
				    $filepath = $filename.".html";
					file_put_contents($filepath, file_get_contents($url));
		    }
    	

    }
    echo $x;
 ?>