<?php  
$string = base64_decode($argv[1]); 
// ini_set('display_errors', 1);
// ini_set('display_startup_errors', 1);
// error_reporting(E_ALL);
         
          // echo "<pre>";print_r($_GET);
          // foreach ($_GET as $key => $value) {
          // 	 // if($x < $length){  
          // 	    if($key=='pattern'){        	   
          // 	       $value = str_replace(" ","%20",$value);
          // 	    } 
          // 	    elseif($key=="root"){
                    $value = str_replace("#","%23",$string); 
                   
          // 	    }  	   
          // 	 	$string .= $key."=".$value."&";
          // 	 // }
          // 	 // else{
          // 	 // 	$string .= $key."=".$value;
          // 	 // }
          //   //    $x++;
          // }
            
         $ulr = "https://live.realtimeaudio.com:3000/guitar-scale-page/".$value.".html";      
         $data = file_get_contents($ulr);
  
         	echo  $data;exit;
         	// echo "http://www.scalerator.com/?optionsDisp=none&selLeft=102&menuTab=instructions&root=F%23&pattern=augmented&tuning=EADGBE&size=30&";
?>