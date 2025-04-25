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
    zoomSnap: 0.3,
    attributionControl: false
  }).setView([35.8, -96], 4.5);

// Call the function to render the visualization
drawVisualization();

// Show the employment values on the map by default
var show_output_or_employment = "employment";

/* Track whether the program, project,
   state, and district drop-down menus
   are expanded and visible */
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

  if (selected_programs.length > 0) {
    d3.select(".industry_breakdown_table div:nth-child(2) div:nth-child(2)").text("For selected programs: " + selected_programs);
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

  
  let industry_list = filtered_data.map(d => d.industry_desc);
  industry_list = [...new Set(industry_list)];
  


  let new_table_data = [];
  let output_total;
  let employment_total;
  for(industry of industry_list) {

    let curr_ind_data = filtered_data.filter(d => d.industry_desc === industry);

    output_total = 0;
    employment_total = 0;
    for(curr_record of curr_ind_data) {
      output_total += parseFloat(curr_record.output);
      employment_total += parseFloat(curr_record.employment);
    }

    new_table_data.push({"industry_desc": industry,
                         "output": Number(output_total.toFixed(4)),
                         "employment": Number(employment_total.toFixed(4))});
  }
  
  // Sort the table data based on the current table sort
  if(tableSortVariable === "employment") {
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

  d3.select(".industry_breakdown_table >div:nth-child(4)").text("Total Employment Impacts: " + employment_total.toLocaleString('en-US', { maximumFractionDigits: 0 }) + " jobs");
  d3.select(".industry_breakdown_table > div:nth-child(5)").text("Total Output Impacts: $" + output_total.toLocaleString('en-US', { maximumFractionDigits: 0 }));

}


function setColorScale(max_value) {
  if (show_output_or_employment == "output") {  
    color = d3.scaleSequential([0, max_value], ["#ffe1bd", "#faa635"]);
  }
  else {
    color = d3.scaleSequential([0, max_value], ["#b1b3d4", "#1d468d"]);
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
      output_total += parseFloat(curr_record.output);
      employment_total += parseFloat(curr_record.employment);
    }

    new_map_data.push({"state": curr_state,
                       "output": Number(output_total.toFixed(4)),
                       "employment": Number(employment_total.toFixed(4))});
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
        output_total += parseFloat(curr_record.output);
        employment_total += parseFloat(curr_record.employment);
      }

      new_map_district_data.push({"district": curr_district,
                                  "output": Number(output_total.toFixed(4)),
                                  "employment": Number(employment_total.toFixed(4))});

    }

    mapDistrictsData = new_map_district_data;
  }
  else {
    mapDistrictsData = [];
  }

}

function addMapLegend(max_value) {
  d3.select(".legend").remove();

  var legend = L.control({position: 'bottomleft'});

  legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend');
    
    // Create a container for the gradient
    var gradientDiv = document.createElement('div');
    gradientDiv.className = 'gradient';
    
    // Set the gradient colors as CSS variables
    gradientDiv.style.setProperty('--start-color', color(0));
    gradientDiv.style.setProperty('--end-color', color(max_value));
    
    // Create labels container
    var labelsDiv = document.createElement('div');
    labelsDiv.className = 'labels';
    
    /* Add min and max labels to the legend, including dollar
       signs if output is selected */
    if(show_output_or_employment == "output") {
      labelsDiv.innerHTML = `
        <span>$0</span>
        <span>$${max_value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
      `;
    }
    else {
      labelsDiv.innerHTML = `
        <span>0</span>
        <span>${max_value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
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
        fillColor: state_total > 0 ? color(state_total) : "#fcfcfc",
        weight: 1,
        opacity: 1,
        color: '#ddd',
        fillOpacity: 0.7
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
      fillColor: (district_data.length > 0 && district_data[0][show_output_or_employment] > 0) ? color(district_data[0][show_output_or_employment]) : "#fcfcfc",
      weight: 1,
      opacity: 1,
      color: '#ddd',
      fillOpacity: 0.7
    };

  }
  else if (current_zoom_level === "district") {
    
    if(feature.properties.CD === current_geography && feature.properties.STATE === current_geography_code) {
      let district_data = mapDistrictsData.filter(d => d.district === current_geography);

      return {
        fillColor: (district_data.length > 0 && district_data[0][show_output_or_employment] > 0) ? color(district_data[0][show_output_or_employment]) : "#fcfcfc",
        weight: 1,
        opacity: 1,
        color: '#ddd',
        fillOpacity: 0.7
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

  info.update();
  updateTableData();
  updateTable();
  updateMapData();
  d3.select(".industry_breakdown_table div:nth-child(2) div:first-child").text("For the United States");

  let max_value = Math.max(...mapData.map(d => parseFloat(d[show_output_or_employment])));
  setColorScale(max_value);
  addMapLegend(max_value);
  updateProgramCheckboxes();
  updateProjectCheckboxes();
  updateStateCheckboxes();
  updateDistrictCheckboxes();

  map.setView([35.8, -96], 4.5);
  geojson.setStyle(style_states);
  geojson_districts.setStyle(style_districts);
  
}

function zoomToState(state_name) {
  
  let layers = geojson.getLayers();
  let state_layer = layers.find(layer => layer.feature.properties.NAME === state_name);
  

  current_geography = state_name;
  current_geography_code = state_layer.feature.properties.STATE;
  current_zoom_level = "state";
  current_state = state_name;
  map.fitBounds(state_layer.getBounds());
  
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
  
  map.fitBounds(district_layer.getBounds());
  
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

  // Create tooltip control
  var tooltip = L.control({position: 'bottomright'});
  var tooltipDiv;
  tooltip.onAdd = function (map) {
    tooltipDiv = L.DomUtil.create('div', 'info tooltip');
    tooltipDiv.innerHTML = '<div>Impact Details</div>[Hover over a location]';
    return tooltipDiv;
  };
  tooltip.addTo(map);

  geojson_districts = L.geoJson(congressionalDistrictsOutlines, {
    style: style_districts,
    attribution: '&copy; <a href="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html">U.S. Census Bureau</a>'
  }).addTo(map);

  geojson = L.geoJson(statesOutlines, {
    style: style_states,
    attribution: '&copy; <a href="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html">U.S. Census Bureau</a>'
  }).addTo(map);

  map.setView([35.8, -96], 4.5);

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

    if (statesAtPoint.length > 0 && districtsAtPoint.length > 0) {
      const stateName = statesAtPoint[0].feature.properties.NAME;
      let tooltipText;
      
      const districtState = districtsAtPoint[0].feature.properties.STATE;
      const districtNumber = districtsAtPoint[0].feature.properties.CD;
      
      
      if(current_zoom_level === "national") {
        tooltipText = '<div>Impact Details</div>' + stateName;
        // Extract the data for this state
        let state_data = mapData.filter(d => d.state === stateName);

        let state_total = 0;
        if (state_data.length > 0) {
          state_total = state_data[0][show_output_or_employment];
        }

        if(show_output_or_employment == "output") { 
          tooltipText += `<br>Output: $${state_total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        }
        else {
          tooltipText += `<br>Employment: ${state_total.toLocaleString('en-US', { maximumFractionDigits: 0 })} jobs`;
        }
        tooltipDiv.innerHTML = tooltipText;
      }
      else {
        if((current_zoom_level === "state" && stateName === current_state) ||
           (current_zoom_level === "district" && districtNumber === current_geography)) {

          tooltipText = '<div>Impact Details</div>' + stateName + ' - District ' + districtNumber;
          let district_data = mapDistrictsData.filter(d => d.district === districtNumber);
          if(show_output_or_employment === "output") {
            if(district_data.length > 0) {
              tooltipText += `<br>Output: $${district_data[0].output.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
            }
            else {  
              tooltipText += `<br>Output: $0`;
            }
          }
          else {
            if(district_data.length > 0) {
              let jobs_number = district_data[0].employment.toLocaleString('en-US', { maximumFractionDigits: 0 });
              tooltipText += `<br>Employment: ${jobs_number} job${jobs_number === '1' ? '' : 's'}`;
            }
            else {
              tooltipText += `<br>Employment: 0 jobs`;
            }
          }

        }
        else {
          tooltipText = '<div>Impact Details</div>[Hover over a location]';
        }
        tooltipDiv.innerHTML = tooltipText;
      }
    }
    else {
      tooltipDiv.innerHTML = '<div>Impact Details</div>[Hover over a location]';
    }
  });

  map.on('mouseout', function(e) {
    tooltipDiv.innerHTML = '<div>Impact Details</div>[Hover over a location]';
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
        this._div.innerHTML += '[Click on a state]';
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

      
      let program_checkboxes_group = d3.select("#program_checkboxes");
      program_checkboxes_group.selectAll("div").remove();

      let joined_divs = program_checkboxes_group.selectAll("input")
        .data(program_names)
        .join("div");

      joined_divs.append("input")
        .attr("class", "program_checkbox")
        .attr("type", "checkbox")
        .attr("id", (d,i) => "program" + i)
        .attr("value", (d,i) => d)
        .attr("checked", (d,i) => selected_programs.includes(d) ? "checked" : null);
      joined_divs.append("label")
        .attr("for", (d,i) => "program" + i)
        .text((d,i) => d);

      document.querySelectorAll('#program_checkboxes input[type="checkbox"]').forEach(function(checkbox) {
          checkbox.addEventListener('change', function() {
              updateProgramSelectedValues();
          });
      });
}

function updateProjectCheckboxes() {
      // Start by setting project_names to be the full dataset
      let project_names = full_data;
      
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
  d3.csv("./economic_impact_data.csv").then(function(loaded_data) {
      
    // Store the full dataset
    full_data = loaded_data;

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
    document.getElementById('employment_header').onclick = function() {
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

        // Draw the map
        draw_leaflet_map(statesOutlines, congressionalDistrictsOutlines);

        // Draw the legend
        addMapLegend(max_value);

      });

    });

  });

}
