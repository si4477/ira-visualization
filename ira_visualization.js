/* This file contains the code to create the IRA
   viusalization, including generating the map,
   the table, and the controls, as well as
   implementing all filtering logic and the
   ability to dynamically download the table
   data. */

// Initialize the Leaflet map
var map = L.map('leaflet_map', {
    zoomControl: false,
    boxZoom: false,
    doubleClickZoom: false,
    dragging: false,
    scrollWheelZoom: false,
    zoomSnap: 0.1,
    touchZoom: false,
    attributionControl: false
  }).setView([35.8, -96], 4.3);

// Call the function to render the visualization
drawVisualization();

// Show the employment values on the map by default
var show_output_or_employment = "employment";

/* Track whether the program, project,
   state, and district drop-down menus
   are expanded and visible */
var agency_expanded = false;
var program_expanded = false;
var project_expanded = false;
var state_expanded = false;
var district_expanded = false;

/* Track the currently selected programs
   and projects */
var selected_programs = [];
var selected_projects = [];

// Set the current zoom to "United States"
var current_geography = "United States";
var current_geography_code = "US";
var current_zoom_level = "national";
var current_state = "none";

// Define a variable to store the full dataset
var full_data;

// Define a variable to store the IMPLAN industry codes
var implan_industry_codes;

// Define a variable to store the color scale for the map
var color;

var geojson;

// Track whether the table has been filtered
var table_is_filtered = false;

function hideProgramCheckboxes() {
  document.getElementById("program_checkboxes_filter").style.display = "none";
  document.getElementById("program_checkboxes_filter").value = "";
  document.getElementById("program_checkboxes").style.display = "none";
  document.querySelectorAll('#program_checkboxes label').forEach(function(label) { 
    label.style.display = "block";
  });
  program_expanded = false;
}

function hideProjectCheckboxes() {
  document.getElementById("project_checkboxes_filter").style.display = "none";
  document.getElementById("project_checkboxes_filter").value = "";
  document.getElementById("project_checkboxes").style.display = "none";
  document.querySelectorAll('#project_checkboxes label').forEach(function(label) { 
    label.style.display = "block";
  });
  project_expanded = false;
}

function hideStateCheckboxes() {
  document.getElementById("state_checkboxes_filter").style.display = "none";
  document.getElementById("state_checkboxes_filter").value = "";
  document.getElementById("state_checkboxes").style.display = "none";
  document.querySelectorAll('#state_checkboxes label').forEach(function(label) { 
    label.style.display = "block";
  });
  state_expanded = false;
}

function hideDistrictCheckboxes() {
  document.getElementById("district_checkboxes_filter").style.display = "none";
  document.getElementById("district_checkboxes_filter").value = "";
  document.getElementById("district_checkboxes").style.display = "none";
  document.querySelectorAll('#district_checkboxes label').forEach(function(label) { 
    label.style.display = "block";
  });
  district_expanded = false;
}

function hideAllCheckboxes() {
  hideProgramCheckboxes();
  hideProjectCheckboxes();
  hideStateCheckboxes();
  hideDistrictCheckboxes();
}

// Toggle the program checkboxes visibility
function showAgencyCheckboxes() {

}

// Toggle the program checkboxes visibility
function showProgramCheckboxes() {
  hideProjectCheckboxes();
  hideStateCheckboxes();
  hideDistrictCheckboxes();

  var checkboxes_filter = document.getElementById("program_checkboxes_filter");
  var checkboxes = document.getElementById("program_checkboxes");
  if (!program_expanded) {
    checkboxes_filter.style.display = "block";
    checkboxes_filter.focus();
    checkboxes.style.display = "flex";
    program_expanded = true;
  } else {
    hideProgramCheckboxes();
  }
}

// Toggle the project checkboxes visibility
function showProjectCheckboxes() {
  /* Only toggle the project checkboxes open or closed
     if programs other than REAP are selected (because
     REAP was not modeled at the project level) */
  if(!(selected_programs.length == 1 && selected_programs[0] == "reap")) {

    hideProgramCheckboxes();
    hideStateCheckboxes();
    hideDistrictCheckboxes();

    var checkboxes_filter = document.getElementById("project_checkboxes_filter");
    var checkboxes = document.getElementById("project_checkboxes");
    if (!project_expanded) {
      checkboxes_filter.style.display = "block";
      checkboxes_filter.focus();
      checkboxes.style.display = "flex";
      project_expanded = true;
    } else {
      hideProjectCheckboxes();
    }

  }
}

function showStateCheckboxes() {
  hideProgramCheckboxes();
  hideProjectCheckboxes();
  hideDistrictCheckboxes();

  var checkboxes_filter = document.getElementById("state_checkboxes_filter");
  var checkboxes = document.getElementById("state_checkboxes");
  if (!state_expanded) {
    checkboxes_filter.style.display = "block";
    checkboxes_filter.focus();
    checkboxes.style.display = "flex";
    state_expanded = true;
  } else {
    hideStateCheckboxes();
  }
}

function showDistrictCheckboxes() {
  hideProgramCheckboxes();
  hideProjectCheckboxes();
  hideStateCheckboxes();

  var checkboxes_filter = document.getElementById("district_checkboxes_filter");
  var checkboxes = document.getElementById("district_checkboxes");
  if (!district_expanded) {
    checkboxes_filter.style.display = "block";
    checkboxes_filter.focus();
    checkboxes.style.display = "flex";
    district_expanded = true;
  } else {
    hideDistrictCheckboxes();
  }
}

function updateProgramSelectedValues() {
  selected_programs = [];
  var checkboxes = document.querySelectorAll('#program_checkboxes input[type="checkbox"]:checked');
  checkboxes.forEach(function(checkbox) {
    selected_programs.push(checkbox.value);
  });

  updateTableData();
  updateTable();
  updateMapData();
  info.update();

  let max_value;
  if(current_zoom_level === "national") {
    let curr_values;
    curr_values = mapData.map(d => d[show_output_or_employment]);
    max_value = Math.max(...curr_values);
  }
  else if (current_zoom_level === "state") {
    max_value = Math.max(...mapDistrictsData.map(d => parseFloat(d[show_output_or_employment])));
  }
  else {
    let filtered_data = mapDistrictsData.filter(d => d.district === current_geography);
    max_value = filtered_data[0][show_output_or_employment];
  }

  setColorScale(max_value);
  addMapLegend(max_value);

  geojson.setStyle(style_states);
  geojson_districts.setStyle(style_districts);

  let selected_labels = [];
  document.querySelectorAll('.program_checkbox:checked + label').forEach(label => selected_labels.push(label.textContent));

  if (selected_programs.length > 0) {
    d3.select(".industry_breakdown_table div:nth-child(2) div:nth-child(2)").text("For selected programs: " + selected_labels);
  }
  else {
    d3.select(".industry_breakdown_table div:nth-child(2) div:nth-child(2)").text("For all programs");
  }

  updateProjectCheckboxes();
  updateStateCheckboxes();
  updateDistrictCheckboxes();
  
}

function updateProjectSelectedValues() {
  selected_projects = [];
  var checkboxes = document.querySelectorAll('#project_checkboxes input[type="checkbox"]:checked');
  checkboxes.forEach(function(checkbox) {
    selected_projects.push(checkbox.value);
  });
  updateTableData();
  updateTable();
  updateMapData();
  info.update();

  let max_value;
  if(current_zoom_level === "national") {
    let curr_values;
    curr_values = mapData.map(d => d[show_output_or_employment]);
    max_value = Math.max(...curr_values);
  }
  else if(current_zoom_level === "state") {
    max_value = Math.max(...mapDistrictsData.map(d => parseFloat(d[show_output_or_employment])));
  }
  else {
    let filtered_data = mapDistrictsData.filter(d => d.district === current_geography);
    max_value = filtered_data[0][show_output_or_employment];
  }

  setColorScale(max_value);
  addMapLegend(max_value);

  
  geojson.setStyle(style_states);
  geojson_districts.setStyle(style_districts);

  if (selected_projects.length > 0) {
    d3.select(".industry_breakdown_table div:nth-child(2) div:nth-child(3)").text("For selected projects: " + selected_projects);
  }
  else {
    d3.select(".industry_breakdown_table div:nth-child(2) div:nth-child(3)").text("For all projects");
  }

  updateProgramCheckboxes();
  updateStateCheckboxes();
  updateDistrictCheckboxes();
  
}

function updateStateSelectedValues() {
  selected_states = [];
  var checkboxes = document.querySelectorAll('#state_checkboxes input[type="checkbox"]:checked');
  checkboxes.forEach(function(checkbox) {
    selected_states.push(checkbox.value);
  });

  if(selected_states.length > 0) {
    zoomToState(selected_states[0]);
  }
  else {
    zoomToNational();
  }
}

function updateDistrictSelectedValues() {
  selected_districts = [];
  var checkboxes = document.querySelectorAll('#district_checkboxes input[type="checkbox"]:checked');
  checkboxes.forEach(function(checkbox) {
    selected_districts.push(checkbox.value);
  });

  if(selected_districts.length > 0) {
    let selected_district_words = selected_districts[0].split(" - ");
    if(current_zoom_level === "national") {
      current_state = selected_district_words[0];
      current_geography_code = geojson.getLayers().find(layer => layer.feature.properties.NAME === current_state).feature.properties.STATE;
    }

    zoomToDistrict(selected_district_words[0], selected_district_words[1]);
  }
  else {
    zoomToState(current_state);
  }
}


let tableData;
let tableSortVariable = "employment";
let tableSortDirection = "descending";
function updateTableData() {
  let filtered_data;
  if(current_zoom_level === "national") {
    filtered_data = full_data;
  }
  else if(current_zoom_level === "state") {
    filtered_data = full_data.filter(d => d.state === current_geography);
  }
  else if(current_zoom_level === "district") {
    filtered_data = full_data.filter(d => (d.state === current_state) && (d.district === current_geography));
  }

  // Filter based on selected programs
  if (selected_programs.length > 0) {
    filtered_data = filtered_data.filter(d => selected_programs.includes(d.program));
  }

  // Filter based on selected projects
  if (selected_projects.length > 0) {
    filtered_data = filtered_data.filter(d => selected_projects.includes(d.project));
  }

  
  let industry_list = filtered_data.map(d => d.industry_code);
  industry_list = [...new Set(industry_list)];
  


  let new_table_data = [];
  let output_total;
  let employment_total;
  for(industry of industry_list) {

    let curr_ind_data = filtered_data.filter(d => d.industry_code === industry);

    output_total = 0;
    employment_total = 0;
    for(curr_record of curr_ind_data) {
      output_total += curr_record.output;
      employment_total += curr_record.employment;
    }

    new_table_data.push({"industry_desc": implan_industry_codes.filter(d => d.industry_code === industry)[0]["industry_desc"],
                         "output": Number(output_total.toFixed(4)),
                         "employment": Number(employment_total.toFixed(4))});
  }
  
  // Sort the table data based on the current table sort
  if(tableSortVariable === "industry") {
    if(tableSortDirection === "descending") {
      new_table_data.sort((a, b) => b.industry_desc.localeCompare(a.industry_desc));
    }
    else {
      new_table_data.sort((a, b) => a.industry_desc.localeCompare(b.industry_desc));
    }
  }
  else if(tableSortVariable === "employment") {
    if(tableSortDirection === "descending") {
      new_table_data.sort((a, b) => b.employment - a.employment);
    }
    else {
      new_table_data.sort((a, b) => a.employment - b.employment);
    }
  }
  else {
    if(tableSortDirection === "descending") {
      new_table_data.sort((a, b) => b.output - a.output);
    }
    else {
      new_table_data.sort((a, b) => a.output - b.output);
    }
  }

  // Update the table data
  tableData = new_table_data;

}

function updateTable() {

  // Select the table body
  let table_selection = d3.select(".industry_breakdown_table tbody");

  // Clear out any pre-existing table rows
  table_selection.selectAll("tr").remove();

  // Create a new tr element for each item in the dataset
  let new_row = table_selection.selectAll("tr")
    .data(tableData)
    .join("tr");

  /* Within each row, append four td elements to hold the
     industry description, industry code, output, and
     employment values */
  new_row.append("td").text(d => d.industry_desc);
  new_row.append("td").text(d => d.employment.toLocaleString('en-US', { maximumFractionDigits: 0 }));
  new_row.append("td").text(d => d.output.toLocaleString('en-US', { maximumFractionDigits: 0 }));

  let output_total = tableData.reduce((acc, curr) => acc + curr.output, 0);
  let employment_total = tableData.reduce((acc, curr) => acc + curr.employment, 0);

  d3.select("#total_employment_impacts").text("Total Employment Impacts: " + employment_total.toLocaleString('en-US', { maximumFractionDigits: 0 }) + " jobs");
  d3.select("#total_output_impacts").text("Total Output Impacts: $" + output_total.toLocaleString('en-US', { maximumFractionDigits: 0 }));

}


function setColorScale(max_value) {
  let some_impact = Number.isFinite(max_value) && max_value > 0;
  if(some_impact) {
    if (show_output_or_employment == "output") {  
      color = d3.scaleSequential([0, max_value], ["#fafafa", "#faa635"]);
    }
    else {
      color = d3.scaleSequential([0, max_value], ["#fafafa", "#1d468d"]);
    }
  }
  else {
    color = d3.scaleSequential([0, 0], ["#fafafa", "#fafafa"]);
  }
}

var mapData;
var mapDistrictsData;
function updateMapData() {
  mapData = full_data;
  mapDistrictsData = full_data;

  // Filter based on selected programs if any are selected
  if (selected_programs.length > 0) {
      mapData = mapData.filter(d => selected_programs.includes(d.program));
      mapDistrictsData = mapDistrictsData.filter(d => selected_programs.includes(d.program));
  }
    
  // Filter based on selected projects if any are selected
  if (selected_projects.length > 0) {
      mapData = mapData.filter(d => selected_projects.includes(d.project));
      mapDistrictsData = mapDistrictsData.filter(d => selected_projects.includes(d.project));
  }

  let state_list = mapData.map(d => d.state);
  state_list = [...new Set(state_list)];

  let new_map_data = [];
  let output_total;
  let employment_total;
  for(curr_state of state_list) {

    let curr_state_data = mapData.filter(d => d.state === curr_state);

    output_total = 0;
    employment_total = 0;
    for(curr_record of curr_state_data) {
      output_total += curr_record.output;
      employment_total += curr_record.employment;
    }

    new_map_data.push({"state": curr_state,
                       "output": output_total,
                       "employment": employment_total});
  }

  mapData = new_map_data;
  
  if(current_geography != "United States") {
    mapDistrictsData = mapDistrictsData.filter(d => d.state === current_state);

    let district_list = mapDistrictsData.map(d => d.district);
    district_list = [...new Set(district_list)];

    let new_map_district_data = [];
    let output_total;
    let employment_total;
    for(curr_district of district_list) {
      let curr_district_data = mapDistrictsData.filter(d => d.district === curr_district);

      output_total = 0;
      employment_total = 0;
      for(curr_record of curr_district_data) {
        output_total += curr_record.output;
        employment_total += curr_record.employment;
      }

      new_map_district_data.push({"district": curr_district,
                                  "output": output_total,
                                  "employment": employment_total});

    }

    mapDistrictsData = new_map_district_data;
  }
  else {
    mapDistrictsData = [];
  }

}

function addMapLegend(max_value) {
  
  d3.select(".legend").remove();

  let some_impact = Number.isFinite(max_value) && max_value > 0;

  var legend = L.control({position: 'bottomleft'});

  legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend');
    
    // Create a container for the gradient
    var gradientDiv = document.createElement('div');
    gradientDiv.className = 'gradient';
    
    // Set the gradient colors as CSS variables
    gradientDiv.style.setProperty('--start-color', some_impact ? color(0) : color(0));
    gradientDiv.style.setProperty('--end-color', some_impact ? color(max_value) : color(0));
    
    // Create labels container
    var labelsDiv = document.createElement('div');
    labelsDiv.className = 'labels';
    
    /* Add min and max labels to the legend, including dollar
       signs if output is selected */
    if(show_output_or_employment == "output") {
      labelsDiv.innerHTML = `
        <span>${some_impact ? '$0' : '-'}</span>
        <span>${some_impact ? '$' + max_value.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '-'}</span>
      `;
    }
    else {
      labelsDiv.innerHTML = `
        <span>${some_impact ? '0 jobs' : '-'}</span>
        <span>${some_impact ? max_value.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' jobs' : '-'}</span>
      `;
    }
    
    // Add elements to legend
    div.appendChild(gradientDiv);
    div.appendChild(labelsDiv);

    return div;
  };

  legend.addTo(map);
}

function style_states(feature) {
  if(current_zoom_level === "national") {

    // Extract the data for this state
    let state_data = mapData.filter(d => d.state === feature.properties.NAME);

    let state_total = 0;
    if (state_data.length > 0) {
      state_total = state_data[0][show_output_or_employment];
    }

    return {
        fillColor: color(state_total),
        weight: 1,
        opacity: 1,
        color: '#dadada',
        fillOpacity: 1
    };

  }
  else {

    return {
      fillColor: 'rgba(0,0,0,0)',
      weight: 0,
      opacity: 0,
      color: 'rgba(0,0,0,0)',
      fillOpacity: 0
    };

  }
}

function style_districts(feature) {

  /* If the zoom level is national, or if the zoom level is state and
     the current feature is not within that state, then return a style
     that makes the district invisible */
  if(current_zoom_level === "national" || (current_zoom_level === "state" && current_geography_code != feature.properties.STATE)) {

    return {
        fillColor: 'rgba(0,0,0,0)',
        weight: 0,
        opacity: 0,
        color: 'rgba(0,0,0,0)',
        fillOpacity: 0
    };

  }
  /* If the zoom level is state, color each district within the state based
     on the range of values for the state */
  else if (current_zoom_level === "state") {

    let district_data = mapDistrictsData.filter(d => d.district === feature.properties.CD);

    return {
      fillColor: (district_data.length > 0 && district_data[0][show_output_or_employment] > 0) ? color(district_data[0][show_output_or_employment]) : color(0),
      weight: 1,
      opacity: 1,
      color: '#dadada',
      fillOpacity: 1
    };

  }
  else if (current_zoom_level === "district") {
    
    if(feature.properties.CD === current_geography && feature.properties.STATE === current_geography_code) {
      let district_data = mapDistrictsData.filter(d => d.district === current_geography);

      return {
        fillColor: (district_data.length > 0 && district_data[0][show_output_or_employment] > 0) ? color(district_data[0][show_output_or_employment]) : color(0),
        weight: 1,
        opacity: 1,
        color: '#dadada',
        fillOpacity: 1
      };
    }
    else {
      return {
        fillColor: 'rgba(0,0,0,0)',
        weight: 0,
        opacity: 0,
        color: 'rgba(0,0,0,0)',
        fillOpacity: 0
      };
    }

  }

}

function zoomToNational() {
  current_geography = "United States";
  current_geography_code = "US";
  current_zoom_level = "national";
  current_state = "none";


  
  updateTableData();
  updateTable();
  updateMapData();
  info.update();
  d3.select(".industry_breakdown_table div:nth-child(2) div:first-child").text("For the United States");

  let max_value = Math.max(...mapData.map(d => parseFloat(d[show_output_or_employment])));
  setColorScale(max_value);
  addMapLegend(max_value);
  updateProgramCheckboxes();
  updateProjectCheckboxes();
  updateStateCheckboxes();
  updateDistrictCheckboxes();

  map.setView([35.8, -96], 4.3);

  geojson.resetStyle();
  geojson_districts.resetStyle();

  geojson.bringToFront();
  geojson_districts.bringToBack();

  geojson.setStyle(style_states);
  geojson_districts.setStyle(style_districts);
  
}

function zoomToState(state_name) {
  
  let layers = geojson.getLayers();
  let state_layer = layers.find(layer => layer.feature.properties.NAME === state_name);
  
  geojson.bringToBack();

  current_geography = state_name;
  current_geography_code = state_layer.feature.properties.STATE;
  current_zoom_level = "state";
  current_state = state_name;
  map.fitBounds(state_layer.getBounds(), { padding: [20, 20] });
  
  updateTableData();
  updateTable();
  updateMapData();
  d3.select(".industry_breakdown_table div:nth-child(2) div:first-child").text("For " + state_name);
  info.update(state_name, mapDistrictsData.length);

  let max_value = Math.max(...mapDistrictsData.map(d => parseFloat(d[show_output_or_employment])));
  setColorScale(max_value);
  addMapLegend(max_value);
  geojson.setStyle(style_states);
  geojson_districts.setStyle(style_districts);
  updateProgramCheckboxes();
  updateProjectCheckboxes();
  updateStateCheckboxes();
  updateDistrictCheckboxes();
}

function zoomToDistrict(state_name, district_number) {
  
  current_geography = district_number;
  current_zoom_level = "district";

  let district_layer = geojson_districts.getLayers().find(layer => (layer.feature.properties.STATE === current_geography_code) && (layer.feature.properties.CD === district_number));
  
  

  map.fitBounds(district_layer.getBounds(), { padding: [20, 20] });
  
  updateTableData();
  updateTable();
  updateMapData();
  d3.select(".industry_breakdown_table div:nth-child(2) div:first-child").text("For " + current_state + " - District " + current_geography);
  info.update(state_name, mapDistrictsData.length);

  // Extract the data for the district that was clicked
  let filtered_data = mapDistrictsData.filter(d => d.district === current_geography);

  /* Get the output or employment value for the district, which represents
     the maximum value because this is the only district being shown */
  let max_value;
  if(filtered_data.length > 0) {
    max_value = filtered_data[0][show_output_or_employment];
  }
  else {
    max_value = 0;
  }

  // Update the color scale and legend
  setColorScale(max_value);
  addMapLegend(max_value);

  // Update the map styles
  geojson.setStyle(style_states);
  geojson_districts.setStyle(style_districts);

  updateProgramCheckboxes();
  updateProjectCheckboxes();
  updateStateCheckboxes();
  updateDistrictCheckboxes();
}

var info;
function draw_leaflet_map(statesOutlines, congressionalDistrictsOutlines) {

  let zoom_national_button = L.control({position: 'bottomright'});
  zoom_national_button.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'national_button_div');
    div.innerHTML = '<div id="zoom_national">Zoom Out to National</div>';
    return div;
  };
  zoom_national_button.addTo(map);

  document.getElementById('zoom_national').onclick = function(e) {
    L.DomEvent.stopPropagation(e);
    hideAllCheckboxes();
    zoomToNational();
  }

  var popup = L.popup({autoPan: false,
                       keepInView: true,
                       closeButton: false});


  function highlightFeature(e) {
    
    if(current_zoom_level === "national") {
      var layer = e.target;
      layer.setStyle({
          weight: 2,
          color: '#666',
          fillOpacity: 0.7
      });

      layer.bringToFront();
    }

  }

  function resetHighlight(e) {
      geojson.resetStyle(e.target);
  }

  function highlightDistrictFeature(e) {

    if(current_zoom_level === "state") {
      var layer = e.target;

      layer.setStyle({
        weight: 2,
        color: '#666',
        fillOpacity: 0.7
      });

      layer.bringToFront();
    }
  }

  function resetDistrictHighlight(e) {
      geojson_districts.resetStyle(e.target);
  }

  function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight
    });
  }

  function onEachDistrictFeature(feature, layer) {
    layer.on({
        mouseover: highlightDistrictFeature,
        mouseout: resetDistrictHighlight
    });
  }

  geojson_districts = L.geoJson(congressionalDistrictsOutlines, {
    style: style_districts,
    onEachFeature: onEachDistrictFeature,
    attribution: '&copy; <a href="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html">U.S. Census Bureau</a>'
  }).addTo(map);

  geojson = L.geoJson(statesOutlines, {
    style: style_states,
    onEachFeature: onEachFeature,
    attribution: '&copy; <a href="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html">U.S. Census Bureau</a>'
  }).addTo(map);

  map.setView([35.8, -96], 4.3);

  map.on('click', function(e) {

    // Find state polygons containing the point
    const statesAtPoint = leafletPip.pointInLayer(e.latlng, geojson);
    
    // Find district polygons containing the point
    const districtsAtPoint = leafletPip.pointInLayer(e.latlng, geojson_districts);

    if(statesAtPoint.length > 0) {
      // Extract the name of the state that was clicked
      let geography_name = statesAtPoint[0].feature.properties.NAME;

      if(current_zoom_level === "district") {
        zoomToNational();
      }
      else if (current_zoom_level === "national") {
        zoomToState(geography_name);
      }
      else if (current_zoom_level === "state" && districtsAtPoint[0].feature.properties.STATE === current_geography_code) {
        zoomToDistrict(geography_name, districtsAtPoint[0].feature.properties.CD);
      }
    }

  });

  map.on('mousemove', function(e) {
    // Find state polygons containing the point
    const statesAtPoint = leafletPip.pointInLayer(e.latlng, geojson);
    
    // Find district polygons containing the point
    const districtsAtPoint = leafletPip.pointInLayer(e.latlng, geojson_districts);

    //
    let popup_latlng;
    let tooltipText = "";

    if (statesAtPoint.length > 0 && districtsAtPoint.length > 0) {
      const stateName = statesAtPoint[0].feature.properties.NAME;
      
      
      const districtState = districtsAtPoint[0].feature.properties.STATE;
      const districtNumber = districtsAtPoint[0].feature.properties.CD;
      
      
      if(current_zoom_level === "national") {
        tooltipText = `<b>${stateName}</b>`;
        // Extract the data for this state
        let state_data = mapData.filter(d => d.state === stateName);

        let state_total = 0;
        if (state_data.length > 0) {
          state_total = state_data[0][show_output_or_employment];
        }

        if(show_output_or_employment == "output") { 
          tooltipText += `<br>Output Impact: $${state_total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        }
        else {
          tooltipText += `<br>Employment Impact: ${state_total.toLocaleString('en-US', { maximumFractionDigits: 0 })} jobs`;
        }
        
        //popup_latlng = statesAtPoint[0].getBounds().getCenter();
        popup_latlng = e.latlng;
      }
      else {
        if((current_zoom_level === "state" && stateName === current_state) ||
           (current_zoom_level === "district" && districtNumber === current_geography)) {

          tooltipText = `<b>${stateName} - District ${districtNumber}</b>`;
          let district_data = mapDistrictsData.filter(d => d.district === districtNumber);
          if(show_output_or_employment === "output") {
            if(district_data.length > 0) {
              tooltipText += `<br>Output Impact: $${district_data[0].output.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
            }
            else {  
              tooltipText += `<br>Output Impact: $0`;
            }
          }
          else {
            if(district_data.length > 0) {
              let jobs_number = district_data[0].employment.toLocaleString('en-US', { maximumFractionDigits: 0 });
              tooltipText += `<br>Employment Impact: ${jobs_number} job${jobs_number === '1' ? '' : 's'}`;
            }
            else {
              tooltipText += `<br>Employment Impact: 0 jobs`;
            }
          }

          popup_latlng = e.latlng;
        }
        else {
          tooltipText = '<div>Impact Details</div>[Hover over a location]';
        }
        
      }
    }
    else {
      tooltipText = "";
    }

    
    if (tooltipText != "" && popup_latlng != undefined) {
      popup
        .setLatLng(popup_latlng)
        .setContent(tooltipText)
        .openOn(map);
    }
    else {
      popup.close();
    }

  });

  map.on('mouseout', function(e) {
    popup.close();
  });

  // Create the control
  info = L.control({position: 'bottomright'});

  // Set function to create label
  info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
    this.update();
    return this._div;
  };

  // Set function to use in updating label
  info.update = function (props, num_districts) {
      this._div.innerHTML = '<div>Geographic Focus</div>';
      if(current_zoom_level === "national") {
        this._div.innerHTML += 'United States' + '<br>States Impacted: ' + mapData.length;
      }
      else if(current_zoom_level === "state") {
        this._div.innerHTML += props + '<br>Districts Impacted: ' + num_districts;
      }
      else if(current_zoom_level === "district") {
        this._div.innerHTML += current_state + ' - District ' + current_geography;
      }
  };

  // Add control to map
  info.addTo(map);
}

function updateProgramCheckboxes() {
      // Get unique program names
      let program_names = full_data;
      
      if(selected_projects.length > 0) {
        program_names = program_names.filter(d => selected_projects.includes(d.project));
      }

      if(current_zoom_level === "national") {
        program_names= program_names.map(d => d.program);
      }
      else if(current_zoom_level === "state") {
        program_names = program_names.filter(d => d.state === current_geography).map(d => d.program);
      }
      else {
        program_names = program_names.filter(d => d.state === current_state && d.district === current_geography).map(d => d.program);
      }
      program_names = [...new Set(program_names)];
      program_names.sort();

      let program_objects = [{program_acronym: "idp", program_name: "Industrial Demonstrations Program"},
                             {program_acronym: "dv", program_name: "Domestic Vehicles Grant Program"},
                             {program_acronym: "ldes", program_name: "Long-Duration Energy Storage Demonstrations"},
                             {program_acronym: "ced", program_name: "Clean Energy Demonstration on Current and Former Mine Land"},
                             {program_acronym: "cm", program_name: "Carbon Management"},
                             {program_acronym: "reap", program_name: "Rural Energy for America Program"}];

      program_objects = program_objects.filter(d => program_names.includes(d.program_acronym));
      

      let program_checkboxes_group = d3.select("#program_checkboxes");
      program_checkboxes_group.selectAll("div").remove();

      let joined_divs = program_checkboxes_group.selectAll("input")
        .data(program_objects)
        .join("div");

      joined_divs.append("input")
        .attr("class", "program_checkbox")
        .attr("type", "checkbox")
        .attr("id", (d,i) => "program" + i)
        .attr("value", (d,i) => d.program_acronym)
        .attr("checked", (d,i) => selected_programs.includes(d.program_acronym) ? "checked" : null);
      joined_divs.append("label")
        .attr("for", (d,i) => "program" + i)
        .text((d,i) => d.program_name);

      document.querySelectorAll('#program_checkboxes input[type="checkbox"]').forEach(function(checkbox) {
          checkbox.addEventListener('change', function() {
              updateProgramSelectedValues();
          });
      });
}

function updateProjectCheckboxes() {
      /* Start by setting project_names to be the full dataset
         with REAP excluded (because REAP is not modeled at
         the project level and all of its project values are
         blank) */
      let project_names = full_data.filter(d => d.program != "reap");
      
      if(selected_programs.length > 0) {
        project_names = project_names.filter(d => selected_programs.includes(d.program));
      }

      if(current_zoom_level === "national") {
        project_names = project_names.map(d => d.project);
      }
      else if(current_zoom_level === "state") {
        project_names = project_names.filter(d => d.state === current_geography).map(d => d.project);
      }
      else {
        project_names = project_names.filter(d => d.state === current_state && d.district === current_geography).map(d => d.project);
      }
      project_names = [...new Set(project_names)];
      project_names.sort();
      

      let project_checkboxes_group = d3.select("#project_checkboxes");
      project_checkboxes_group.selectAll("div").remove();
      
      let joined_divs = project_checkboxes_group.selectAll("input")
        .data(project_names)
        .join("div");

      joined_divs.append("input")
            .attr("class", "project_checkbox")
            .attr("type", "checkbox")
            .attr("id", (d,i) => "project" + i)
            .attr("value", (d,i) => d)
            .attr("checked", (d,i) => selected_projects.includes(d) ? "checked" : null);
      joined_divs.append("label")
          .attr("for", (d,i) => "project" + i)
          .text((d,i) => d);

      document.querySelectorAll('#project_checkboxes input[type="checkbox"]').forEach(function(checkbox) {
          checkbox.addEventListener('change', function() {
              updateProjectSelectedValues();
          });
      });
}

function updateStateCheckboxes() {

  let state_names = full_data;

  if(selected_programs.length > 0) {
    state_names = state_names.filter(d => selected_programs.includes(d.program));
  }

  if(selected_projects.length > 0) {
    state_names = state_names.filter(d => selected_projects.includes(d.project));
  }

  if(current_zoom_level === "national") {
    state_names = state_names.map(d => d.state);
  }
  else {
    state_names = [current_state];
  }

  state_names = [...new Set(state_names)];
  state_names.sort();

  let state_checkboxes_group = d3.select("#state_checkboxes");
  state_checkboxes_group.selectAll("div").remove();
  
  let joined_divs = state_checkboxes_group.selectAll("input")
    .data(state_names)
    .join("div");

  joined_divs.append("input")
    .attr("class", "state_checkbox")
    .attr("type", "checkbox")
    .attr("id", (d,i) => "state" + i)
    .attr("value", (d,i) => d)
    .attr("checked", (d,i) => current_zoom_level != "national" ? "checked" : null);
  joined_divs.append("label")
    .attr("for", (d,i) => "state" + i)
    .text((d,i) => d);

  document.querySelectorAll('#state_checkboxes input[type="checkbox"]').forEach(function(checkbox) {
      checkbox.addEventListener('change', function() {
          updateStateSelectedValues();
      });
  });

}

function updateDistrictCheckboxes() {
  let district_names = full_data;

  if(selected_programs.length > 0) {
    district_names = district_names.filter(d => selected_programs.includes(d.program));
  }

  if(selected_projects.length > 0) {
    district_names = district_names.filter(d => selected_projects.includes(d.project));
  }

  if(current_zoom_level === "national") {
    district_names = district_names.map(d => (d.state + " - " + d.district));
  }
  else if(current_zoom_level === "state") {
    district_names = district_names.filter(d => d.state === current_state).map(d => (d.state + " - " + d.district));
  }
  else {
    district_names = [current_state + " - " + current_geography];
  }
  district_names = [...new Set(district_names)];
  district_names.sort();

  if(current_zoom_level === "state") {
    info.update(current_state, district_names.length);
  }

  let district_checkboxes_group = d3.select("#district_checkboxes");
  district_checkboxes_group.selectAll("div").remove();

  let joined_divs = district_checkboxes_group.selectAll("input")
    .data(district_names)
    .join("div");
  
  joined_divs.append("input")
    .attr("class", "district_checkbox")
    .attr("type", "checkbox")
    .attr("id", (d,i) => "district" + i)
    .attr("value", (d,i) => d)
    .attr("checked", (d,i) => current_zoom_level === "district" ? "checked" : null);
  joined_divs.append("label")
    .attr("for", (d,i) => "district" + i)
    .text((d,i) => d);

  document.querySelectorAll('#district_checkboxes input[type="checkbox"]').forEach(function(checkbox) {
      checkbox.addEventListener('change', function() {
          updateDistrictSelectedValues();
      });
  });

}



function drawVisualization() {

  // Load the economic impact data
  d3.csv("./economic_impact_data.csv", (d) => {
    return {
      program: d.program,
      project: d.project,
      state: d.state,
      district: d.district,
      industry_code: d.industry_code,
      employment: +d.employment,
      output: +d.output
    };
  }).then(function(loaded_data) {

    // Store the full dataset
    full_data = loaded_data;
    
    d3.csv("./implan_industry_codes.csv").then(function(loaded_codes_data) {
    
      // Store the IMPLAN industry codes
      implan_industry_codes = loaded_codes_data;

      // Update the map data
      updateMapData();

      let curr_values;
      if (show_output_or_employment == "output") {
        curr_values = mapData.map(d => d.output);
      }
      else {
        curr_values = mapData.map(d => d.employment);
      }
      
      let max_value = Math.max(...curr_values);

      setColorScale(max_value);
      //addMapLegend(max_value);

      updateProgramCheckboxes();
      updateProjectCheckboxes();
      updateStateCheckboxes();
      updateDistrictCheckboxes();

      document.getElementById('radio_output').addEventListener('change', function() {
          show_output_or_employment = "output";

          updateMapData();

          let max_value;
          if(current_zoom_level === "national") {
            let curr_values;
            curr_values = mapData.map(d => d.output);
            max_value = Math.max(...curr_values);
          }
          else if(current_zoom_level === "state") {
            max_value = Math.max(...mapDistrictsData.map(d => parseFloat(d[show_output_or_employment])));
          }
          else {
            let filtered_data = mapDistrictsData.filter(d => d.district === current_geography);
            max_value = filtered_data[0][show_output_or_employment];
          }

          setColorScale(max_value);
          d3.select(".legend").remove();
          addMapLegend(max_value);
          geojson.setStyle(style_states);
          geojson_districts.setStyle(style_districts);
      });

      document.getElementById('radio_employment').addEventListener('change', function() {
          show_output_or_employment = "employment";

          updateMapData();

          let max_value;
          if(current_zoom_level === "national") {
            let curr_values;
            curr_values = mapData.map(d => d.employment);
            max_value = Math.max(...curr_values);
          }
          else if(current_zoom_level === "state") {
            max_value = Math.max(...mapDistrictsData.map(d => parseFloat(d[show_output_or_employment])));
          }
          else {
            let filtered_data = mapDistrictsData.filter(d => d.district === current_geography);
            max_value = filtered_data[0][show_output_or_employment];
          }

          setColorScale(max_value);
          d3.select(".legend").remove();
          addMapLegend(max_value);
          geojson.setStyle(style_states);
          geojson_districts.setStyle(style_districts);
      });

      document.getElementById('program_checkboxes_filter').addEventListener('input', function() {
        let search_text = this.value.toUpperCase();
        document.querySelectorAll('#program_checkboxes label').forEach(function(label) { 
          label.style.display = label.innerText.toUpperCase().includes(search_text) ? "block" : "none";
        });
      });

      document.getElementById('project_checkboxes_filter').addEventListener('input', function() {
        let search_text = this.value.toUpperCase();
        document.querySelectorAll('#project_checkboxes label').forEach(function(label) { 
          label.style.display = label.innerText.toUpperCase().includes(search_text) ? "block" : "none";
        });
      });

      document.getElementById('state_checkboxes_filter').addEventListener('input', function() {
        let search_text = this.value.toUpperCase();
        document.querySelectorAll('#state_checkboxes label').forEach(function(label) { 
          label.style.display = label.innerText.toUpperCase().includes(search_text) ? "block" : "none";
        });
      });

      document.getElementById('district_checkboxes_filter').addEventListener('input', function() {
        let search_text = this.value.toUpperCase();
        document.querySelectorAll('#district_checkboxes label').forEach(function(label) { 
          label.style.display = label.innerText.toUpperCase().includes(search_text) ? "block" : "none";
        });
      });

      updateTableData();
      updateTable();

      // Add click handler for download button
      document.getElementById('downloadCSV').onclick = function() {
        // Create CSV content
        const headers = ['Industry', 'Employment', 'Output'];
        const csvContent = [
          headers.join(','),
          ...tableData.map(row => [
            `"${row.industry_desc}"`,
            row.employment,
            row.output
          ].join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const geography_string = current_zoom_level === "district" ? current_state.toLowerCase().replace(/\s+/g, '_') + '-' + current_geography.toLowerCase().replace(/\s+/g, '_') : current_geography.toLowerCase().replace(/\s+/g, '_');
        link.setAttribute('download', `economic_impact_${geography_string}_${selected_programs.length > 0 ? "selectedprograms" : "allprograms"}_${selected_projects.length > 0 ? "selectedprojects" : "allprojects"}_${table_is_filtered ? "selectedindustries" : "allindustries"}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      // Add click handler for the clear filters button
      document.getElementById('clear_button').onclick = function() {
        hideAllCheckboxes();

        selected_programs = [];
        selected_projects = [];

        d3.select(".industry_breakdown_table div:nth-child(2) div:nth-child(2)").text("For all programs");
        d3.select(".industry_breakdown_table div:nth-child(2) div:nth-child(3)").text("For all projects");

        zoomToNational();

        updateProgramCheckboxes();
        updateProjectCheckboxes();
        updateStateCheckboxes();
        updateDistrictCheckboxes();
      }

      // Add handler for pressing enter within the filter text input
      document.getElementById('table_filter_phrase').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
          table_is_filtered = true;
          let filterPhrase = document.getElementById('table_filter_phrase').value.toUpperCase();
          updateTableData();
          tableData = tableData.filter(d => d.industry_desc.toUpperCase().includes(filterPhrase));
          updateTable();
        }
      });

      // Add click handler for filter table button
      document.getElementById('filterTable').onclick = function() {
        table_is_filtered = true;
        let filterPhrase = document.getElementById('table_filter_phrase').value.toUpperCase();
        updateTableData();
        tableData = tableData.filter(d => d.industry_desc.toUpperCase().includes(filterPhrase));
        updateTable();
      };

      // Add click handler for clear table filter button
      document.getElementById('clearTableFilter').onclick = function() {
        table_is_filtered = false;
        document.getElementById('table_filter_phrase').value = "";
        updateTableData();
        updateTable();
      };

      // Add a click handler for the employment header in the table
      document.getElementById('industry_header').onclick = function() {
        document.getElementById('employment_header').classList.remove("ascending");
        document.getElementById('employment_header').classList.remove("descending");
        document.getElementById('output_header').classList.remove("ascending");
        document.getElementById('output_header').classList.remove("descending");

        if(tableSortVariable === "industry" && tableSortDirection === "ascending") {
          // Sort the table data by industry in ascending order
          tableData.sort((a, b) => (b.industry_desc.localeCompare(a.industry_desc) === 0 ? b.employment - a.employment : b.industry_desc.localeCompare(a.industry_desc)));
          tableSortDirection = "descending";
          document.getElementById('industry_header').classList.remove("ascending");
          d3.select("#industry_header").classed("descending", "true");
        }
        else {
          tableData.sort((a, b) => (a.industry_desc.localeCompare(b.industry_desc) === 0 ? a.employment - b.employment : a.industry_desc.localeCompare(b.industry_desc)));
          tableSortDirection = "ascending";
          document.getElementById('industry_header').classList.remove("descending");
          d3.select("#industry_header").classed("ascending", "true");
        }
        tableSortVariable = "industry";
        updateTable();
      }

      // Add a click handler for the employment header in the table
      document.getElementById('employment_header').onclick = function() {
        document.getElementById('industry_header').classList.remove("ascending");
        document.getElementById('industry_header').classList.remove("descending");
        document.getElementById('output_header').classList.remove("ascending");
        document.getElementById('output_header').classList.remove("descending");

        if(tableSortVariable === "employment" && tableSortDirection === "descending") {
          // Sort the table data by employment in ascending order
          tableData.sort((a, b) => (a.employment - b.employment === 0 ? a.output - b.output : a.employment - b.employment));
          tableSortDirection = "ascending";
          document.getElementById('employment_header').classList.remove("descending");
          d3.select("#employment_header").classed("ascending", "true");
        }
        else {
          tableData.sort((a, b) => (b.employment - a.employment === 0 ? b.output - a.output : b.employment - a.employment));
          tableSortDirection = "descending";
          document.getElementById('employment_header').classList.remove("ascending");
          d3.select("#employment_header").classed("descending", "true");
        }
        tableSortVariable = "employment";
        updateTable();
      }

      // Add a click handler for the output header in the table
      document.getElementById('output_header').onclick = function() {
        document.getElementById('industry_header').classList.remove("ascending");
        document.getElementById('industry_header').classList.remove("descending");
        document.getElementById('employment_header').classList.remove("ascending");
        document.getElementById('employment_header').classList.remove("descending");

        if(tableSortVariable === "output" && tableSortDirection === "descending") {
          // Sort the table data by output in ascending order
          tableData.sort((a, b) => (a.output - b.output === 0 ? a.employment - b.employment : a.output - b.output));
          tableSortDirection = "ascending";
          document.getElementById('output_header').classList.remove("descending");
          d3.select("#output_header").classed("ascending", "true");
        }
        else {
          tableData.sort((a, b) => (b.output - a.output === 0 ? b.employment - a.employment : b.output - a.output));
          tableSortDirection = "descending";
          document.getElementById('output_header').classList.remove("ascending");
          d3.select("#output_header").classed("descending", "true");
        }
        tableSortVariable = "output";
        updateTable();
      }

      document.body.addEventListener('click', function(e) {
        if (!(e.target.classList.contains('overSelect') ||
              e.target.nodeName === "LABEL" ||
              e.target.classList.contains('program_checkbox') ||
              e.target.classList.contains('project_checkbox') ||
              e.target.classList.contains('filter_for_filter'))) {
          hideAllCheckboxes();
        }
      });

      // Load the state outlines
      d3.json("./states_outlines.json").then(function(statesOutlines) {

        // Load the congressional district outlines
        d3.json("./congressional_districts_outlines.json").then(function(congressionalDistrictsOutlines) {

          // Hide the "Loading..." message
          document.getElementById("loading_message").style.display = "none";

          // Draw the map
          draw_leaflet_map(statesOutlines, congressionalDistrictsOutlines);

          // Draw the legend
          addMapLegend(max_value);

        });

      });

    });

  });

}
