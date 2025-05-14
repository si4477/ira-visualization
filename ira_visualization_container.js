// Initialize a variable to track which visualization is being shown
var visualization_level = "district"

/* Set the color and background color of the "District Level" button
   as it is initially selected by default */
document.getElementById('selector_district').style.color = "white";
document.getElementById('selector_district').style.backgroundColor = "#1176b2";

// Add an event listener to the "District Level" button
document.getElementById('selector_district').onclick = function() {
  if(visualization_level != "district") {
    visualization_level = "district";
    document.getElementById('selector_district').style.color = "white";
    document.getElementById('selector_district').style.backgroundColor = "#1176b2";
    document.getElementById('selector_state').style.color = "#444";
    document.getElementById('selector_state').style.backgroundColor = "white";
    document.getElementById('ira_visualization_iframe').src = "ira_visualization.html";
  }
}

// Add an event listener to the "State Level" button
document.getElementById('selector_state').addEventListener('click', function() {
  if(visualization_level != "state") {
    visualization_level = "state";
    document.getElementById('selector_district').style.color = "#444";
    document.getElementById('selector_district').style.backgroundColor = "white";
    document.getElementById('selector_state').style.color = "white";
    document.getElementById('selector_state').style.backgroundColor = "#1176b2";
    document.getElementById('ira_visualization_iframe').src = "ira_visualization_state.html";
  }
});
