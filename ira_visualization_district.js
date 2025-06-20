/* This file contains the code to create the IRA
   district-level funding freeze viusalization,
   including generating the map, the table, and
   the controls, as well as implementing all
   filtering logic and the ability to
   dynamically download the table data. */



/*
 *  Define global variables
 */

/* Initialize the Leaflet map and disable
   various zooming/dragging functionalities */
var map = L.map('leaflet_map', {
    zoomControl: false,
    boxZoom: false,
    doubleClickZoom: false,
    dragging: false,
    scrollWheelZoom: false,
    zoomSnap: 0.1,
    touchZoom: false,
    attributionControl: false
  }).setView([36.8, -96], window.innerWidth >= 1000 ? 4.2 : 4.2 - ((1000-window.innerWidth)*0.0022));

/* Define a variable to track whether the map is
   showing employment or output; show the employment
   values on the map by default */
var show_output_or_employment = "employment";

/* Track whether the agency, program, project,
   state, and district drop-down menus are
   expanded or collapsed */
var agency_expanded = false;
var program_expanded = false;
var project_expanded = false;
var state_expanded = false;
var district_expanded = false;

/* Track the currently selected agencies, programs
   and projects (more than one option can be
   selected within each of these categories) */
var selected_agencies = [];
var selected_programs = [];
var selected_projects = [];

/* Define a variable to track the current zoom
   level of the map, which can be one of
   "national", "state", or "district"; set
   the default to national zoom */
var current_zoom_level = "national";

/* Define variables to hold information about
   the currently selected geography */
var current_geography = "United States";
var current_geography_code = "US";
var current_state = "none";

/* Define a variable to store the full dataset
   of modeling results */
var full_data;

/* Define a variable to store the IMPLAN industry codes
   and industry descriptions */
var implan_industry_codes;

// Define a variable to store the agency-program crosswalk
var agency_program_crosswalk;

// Define a variable to store the color scale for the map
var color;

// Define variables to hold the GeoJSON layers in the map
var geojson;
var geojson_districts;

// Define variables to hold the current map data
var mapData;
var mapDistrictsData;

/* Define a variable to hold a reference to the information
   box in the lower-right corner of the map */
var info;

// Define variable to hold the current table data
let tableData;

/* Define variables to track which variable is being used
   to sort the table and whether the table is sorted in
   ascending or descending order */
let tableSortVariable = "employment";
let tableSortDirection = "descending";

// Track whether the table has been filtered
var table_is_filtered = false;



/*
 *  Draw the visualization
 */

// Call the function to render the visualization
drawVisualization();



/*
 *  Define filter-related functions
 */

// Hide the agency checkboxes
function hideAgencyCheckboxes() {
  document.getElementById("agency_checkboxes_filter").style.display = "none";
  document.getElementById("agency_checkboxes_filter").value = "";
  document.getElementById("agency_checkboxes").style.display = "none";
  document.querySelectorAll('#agency_checkboxes label').forEach(function(label) { 
    label.style.display = "block";
  });
  agency_expanded = false;
}

// Hide the program checkboxes
function hideProgramCheckboxes() {
  document.getElementById("program_checkboxes_filter").style.display = "none";
  document.getElementById("program_checkboxes_filter").value = "";
  document.getElementById("program_checkboxes").style.display = "none";
  document.querySelectorAll('#program_checkboxes label').forEach(function(label) { 
    label.style.display = "block";
  });
  program_expanded = false;
}

// Hide the project checkboxes
function hideProjectCheckboxes() {
  document.getElementById("project_checkboxes_filter").style.display = "none";
  document.getElementById("project_checkboxes_filter").value = "";
  document.getElementById("project_checkboxes").style.display = "none";
  document.querySelectorAll('#project_checkboxes label').forEach(function(label) { 
    label.style.display = "block";
  });
  project_expanded = false;
}

// Hide the state checkboxes
function hideStateCheckboxes() {
  document.getElementById("state_checkboxes_filter").style.display = "none";
  document.getElementById("state_checkboxes_filter").value = "";
  document.getElementById("state_checkboxes").style.display = "none";
  document.querySelectorAll('#state_checkboxes label').forEach(function(label) { 
    label.style.display = "block";
  });
  state_expanded = false;
}

// Hide the district checkboxes
function hideDistrictCheckboxes() {
  document.getElementById("district_checkboxes_filter").style.display = "none";
  document.getElementById("district_checkboxes_filter").value = "";
  document.getElementById("district_checkboxes").style.display = "none";
  document.querySelectorAll('#district_checkboxes label').forEach(function(label) { 
    label.style.display = "block";
  });
  district_expanded = false;
}

// Hide all checkboxes
function hideAllCheckboxes() {
  hideAgencyCheckboxes();
  hideProgramCheckboxes();
  hideProjectCheckboxes();
  hideStateCheckboxes();
  hideDistrictCheckboxes();
}

// Toggle the agency checkboxes visibility
function toggleAgencyCheckboxes() {
  // Hide the other checkboxes
  hideProgramCheckboxes();
  hideProjectCheckboxes();
  hideStateCheckboxes();
  hideDistrictCheckboxes();

  // Show or hide the agency checkboxes
  var checkboxes_filter = document.getElementById("agency_checkboxes_filter");
  var checkboxes = document.getElementById("agency_checkboxes");
  if (!agency_expanded) {
    checkboxes_filter.style.display = "block";
    checkboxes_filter.focus();
    checkboxes.style.display = "flex";
    agency_expanded = true;
  } else {
    hideAgencyCheckboxes();
  }
}

// Toggle the program checkboxes visibility
function toggleProgramCheckboxes() {
  // Hide the other checkboxes
  hideAgencyCheckboxes();
  hideProjectCheckboxes();
  hideStateCheckboxes();
  hideDistrictCheckboxes();

  // Show or hide the program checkboxes
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
function toggleProjectCheckboxes() {

  /* This variable will track whether REAP is the only
     visible program; first set it to false */
  let only_reap = false;

  /* If USDA is the only selected agency, or if REAP is the
     only selected program, then set only_reap to true */
  if((selected_agencies.length == 1 && selected_agencies[0] == "U.S. Department of Agriculture") ||
     (selected_programs.length == 1 && selected_programs[0] == "reap")) {
    only_reap = true;
  }
  
  // If the map is zoomed to the state or district levels
  if (current_zoom_level != "national") {

    /* Based on the currently selected geography, determine which
       programs are represented */
    let program_names = full_data;
    if(current_zoom_level === "state") {
      program_names = program_names.filter(d => d.state === current_geography).map(d => d.program);
    }
    else if(current_zoom_level === "district") {
      program_names = program_names.filter(d => d.state === current_state && d.district === current_geography).map(d => d.program);
    }
    program_names = [...new Set(program_names)];

    /* If the only program that is represented is REAP, set
       only_reap to true */
    if(program_names.length == 1 && program_names[0] == "reap") {
      only_reap = true;
    }
  }

  /* Only toggle the project checkboxes open or closed
     if programs other than REAP are selected (because
     REAP was not modeled at the project level) */
  if(!only_reap) {

    // Hide the other checkboxes
    hideAgencyCheckboxes();
    hideProgramCheckboxes();
    hideStateCheckboxes();
    hideDistrictCheckboxes();

    // Show or hide the project checkboxes
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

// Toggle the state checkboxes visibility
function toggleStateCheckboxes() {
  // Hide the other checkboxes
  hideAgencyCheckboxes();
  hideProgramCheckboxes();
  hideProjectCheckboxes();
  hideDistrictCheckboxes();

  // Show or hide the state checkboxes
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

// Toggle the district checkboxes visibility
function toggleDistrictCheckboxes() {
  // Hide the other checkboxes
  hideAgencyCheckboxes();
  hideProgramCheckboxes();
  hideProjectCheckboxes();
  hideStateCheckboxes();

  // Show or hide the district checkboxes
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

// Update which agencies are shown within the agency drop-down filter
function updateAgencyCheckboxes() {

  // Start by setting agency_names equal to the full agency-program crosswalk
  let agency_names = agency_program_crosswalk;

  /* Filter agency_names based on any programs that are currently
     selected within the program drop-down filter */
  if(selected_programs.length > 0) {
    agency_names = agency_names.filter(d => selected_programs.includes(d.program));
  }

  /* Determine which programs are implicitly selected given filtering by
     project or by geography selection; start by setting program_names
     to the full dataset */
  let program_names = full_data;
      
  /* Filter program_names based on any projects that are currently
     selected within the project drop-down filter */
  if(selected_projects.length > 0) {
    program_names = program_names.filter(d => selected_projects.includes(d.project));
  }

  /* Further filter program_names based on which programs are
     being shown within the current zoom level */
  if(current_zoom_level === "national") {
    program_names = program_names.map(d => d.program);
  }
  else if(current_zoom_level === "state") {
    program_names = program_names.filter(d => d.state === current_geography).map(d => d.program);
  }
  else {
    program_names = program_names.filter(d => d.state === current_state && d.district === current_geography).map(d => d.program);
  }

  // Filter agency_names based on the implicitly selected programs
  agency_names = agency_names.filter(d => program_names.includes(d.program));

  /* Extract the agency names from what is remaining in the crosswalk,
     remove duplicates, and sort */
  agency_names = [...new Set(agency_names.map(d => d.agency))];
  agency_names.sort();

  // Remove any existing checkboxes in the agency drop-down filter
  let agency_checkboxes_group = d3.select("#agency_checkboxes");
  agency_checkboxes_group.selectAll("div").remove();

  // Add a div for each agency
  let joined_divs = agency_checkboxes_group.selectAll("div")
    .data(agency_names)
    .join("div");

  // Within the div, append an input element
  joined_divs.append("input")
    .attr("class", "agency_checkbox")
    .attr("type", "checkbox")
    .attr("id", (d, i) => "agency" + i)
    .attr("value", (d) => d)
    .attr("checked", (d) => selected_agencies.includes(d) ? "checked" : null);

  // Within the div, append a label element
  joined_divs.append("label")
    .attr("for", (d, i) => "agency" + i)
    .text((d) => d);

  // Add an event listener to each checkbox
  document.querySelectorAll('#agency_checkboxes input[type="checkbox"]').forEach(function(checkbox) {
    checkbox.addEventListener('change', function() {
        updateAgencySelectedValues();
    });
  });
}

// Update which programs are shown within the program drop-down filter
function updateProgramCheckboxes() {
  // Start by setting program_names equal to the full dataset
  let program_names = full_data;
  
  // Filter based on selected agencies
  if (selected_agencies.length > 0) {
    let induced_programs = agency_program_crosswalk.filter(d => selected_agencies.includes(d.agency)).map(d => d.program);
    program_names = program_names.filter(d => induced_programs.includes(d.program));
  }

  // Further filter based on selected projects
  if(selected_projects.length > 0) {
    program_names = program_names.filter(d => selected_projects.includes(d.project));
  }

  /* Further filter program_names based on which programs are
     being shown within the current zoom level */
  if(current_zoom_level === "national") {
    program_names = program_names.map(d => d.program);
  }
  else if(current_zoom_level === "state") {
    program_names = program_names.filter(d => d.state === current_geography).map(d => d.program);
  }
  else {
    program_names = program_names.filter(d => d.state === current_state && d.district === current_geography).map(d => d.program);
  }

  // From the remaining programs, remove duplicates and sort
  program_names = [...new Set(program_names)];
  program_names.sort();

  /* Create a crosswalk between the program acronyms and the
     full program names */
  let program_objects = [{program_acronym: "cm", program_name: "Carbon Management"},
                         {program_acronym: "ced", program_name: "Clean Energy Demonstration on Current and Former Mine Land"},
                         {program_acronym: "dv", program_name: "Domestic Vehicles Grant Program"},
                         {program_acronym: "idp", program_name: "Industrial Demonstrations Program"},
                         {program_acronym: "ldes", program_name: "Long-Duration Energy Storage Demonstrations"},
                         {program_acronym: "reap", program_name: "Rural Energy for America Program"}];
  
  // Filter the objects given the programs determined above
  program_objects = program_objects.filter(d => program_names.includes(d.program_acronym));    

  // Remove any existing checkboxes in the program drop-down filter
  let program_checkboxes_group = d3.select("#program_checkboxes");
  program_checkboxes_group.selectAll("div").remove();

  // Add a div for each program
  let joined_divs = program_checkboxes_group.selectAll("div")
    .data(program_objects)
    .join("div");

  /* Within the div, append an input element (note that the
     value is set to the acronym rather than the full name) */
  joined_divs.append("input")
    .attr("class", "program_checkbox")
    .attr("type", "checkbox")
    .attr("id", (d, i) => "program" + i)
    .attr("value", (d) => d.program_acronym)
    .attr("checked", (d) => selected_programs.includes(d.program_acronym) ? "checked" : null);

  /* Within the div, append a label element (note that the
     label text is set to the full name rather than the acronym) */
  joined_divs.append("label")
    .attr("for", (d, i) => "program" + i)
    .text((d) => d.program_name);

  // Add an event listener to each checkbox
  document.querySelectorAll('#program_checkboxes input[type="checkbox"]').forEach(function(checkbox) {
    checkbox.addEventListener('change', function() {
        updateProgramSelectedValues();
    });
  });
}

// Update which projects are shown within the project drop-down filter
function updateProjectCheckboxes() {
  /* Start by setting project_names to be the full dataset
     with REAP excluded (because REAP is not modeled at
     the project level and all of its project values are
     blank) */
  let project_names = full_data.filter(d => d.program != "reap");
      
  // Filter based on selected agencies
  if (selected_agencies.length > 0) {
    let induced_programs = agency_program_crosswalk.filter(d => selected_agencies.includes(d.agency)).map(d => d.program);
    project_names = project_names.filter(d => induced_programs.includes(d.program));
  }

  // Further filter based on the selected programs
  if(selected_programs.length > 0) {
    project_names = project_names.filter(d => selected_programs.includes(d.program));
  }

  /* Further filter project_names based on which projects are
     being shown within the current zoom level */
  if(current_zoom_level === "national") {
    project_names = project_names.map(d => d.project);
  }
  else if(current_zoom_level === "state") {
    project_names = project_names.filter(d => d.state === current_geography).map(d => d.project);
  }
  else {
    project_names = project_names.filter(d => d.state === current_state && d.district === current_geography).map(d => d.project);
  }

  // From the remaining projects, remove duplicates and sort
  project_names = [...new Set(project_names)];
  project_names.sort();
      
  // Remove any existing checkboxes in the project drop-down filter
  let project_checkboxes_group = d3.select("#project_checkboxes");
  project_checkboxes_group.selectAll("div").remove();
  
  // Add a div for each project
  let joined_divs = project_checkboxes_group.selectAll("div")
    .data(project_names)
    .join("div");

  // Within the div, append an input element
  joined_divs.append("input")
    .attr("class", "project_checkbox")
    .attr("type", "checkbox")
    .attr("id", (d, i) => "project" + i)
    .attr("value", (d) => d)
    .attr("checked", (d) => selected_projects.includes(d) ? "checked" : null);

  // Within the div, append a label element
  joined_divs.append("label")
    .attr("for", (d, i) => "project" + i)
    .text((d) => d);

  // Add an event listener to each checkbox
  document.querySelectorAll('#project_checkboxes input[type="checkbox"]').forEach(function(checkbox) {
    checkbox.addEventListener('change', function() {
      updateProjectSelectedValues();
    });
  });
}

// Update which states are shown within the state drop-down filter
function updateStateCheckboxes() {
  // Start by setting state_names equal to the full dataset
  let state_names = full_data;

  // Filter based on selected agencies
  if (selected_agencies.length > 0) {
    let induced_programs = agency_program_crosswalk.filter(d => selected_agencies.includes(d.agency)).map(d => d.program);
    state_names = state_names.filter(d => induced_programs.includes(d.program));
  }

  // Further filter based on selected programs
  if(selected_programs.length > 0) {
    state_names = state_names.filter(d => selected_programs.includes(d.program));
  }

  // Further filter based on selected projects
  if(selected_projects.length > 0) {
    state_names = state_names.filter(d => selected_projects.includes(d.project));
  }

  /* If the map is currently zoomed to the national level, extract
     the state names from the remaining data; if the map is zoomed
     to the state or district levels, simply set state_names equal
     to the current state */
  if(current_zoom_level === "national") {
    state_names = state_names.map(d => d.state);
  }
  else {
    state_names = [current_state];
  }

  // Remove duplicates and sort
  state_names = [...new Set(state_names)];
  state_names.sort();

  // Remove any existing checkboxes in the state drop-down filter
  let state_checkboxes_group = d3.select("#state_checkboxes");
  state_checkboxes_group.selectAll("div").remove();
  
  // Add a div for each state
  let joined_divs = state_checkboxes_group.selectAll("div")
    .data(state_names)
    .join("div");

  // Within the div, append an input element
  joined_divs.append("input")
    .attr("class", "state_checkbox")
    .attr("type", "checkbox")
    .attr("id", (d, i) => "state" + i)
    .attr("value", (d) => d)
    .attr("checked", () => current_zoom_level != "national" ? "checked" : null);

  // Within the div, append a label element
  joined_divs.append("label")
    .attr("for", (d, i) => "state" + i)
    .text((d) => d);

  // Add an event listener to each checkbox
  document.querySelectorAll('#state_checkboxes input[type="checkbox"]').forEach(function(checkbox) {
    checkbox.addEventListener('change', function() {
      updateStateSelectedValues();
    });
  });
}

// Update which districts are shown within the district drop-down filter
function updateDistrictCheckboxes() {
  // Start by setting district_names equal to the full dataset
  let district_names = full_data;

  // Filter based on selected agencies
  if (selected_agencies.length > 0) {
    let induced_programs = agency_program_crosswalk.filter(d => selected_agencies.includes(d.agency)).map(d => d.program);
    district_names = district_names.filter(d => induced_programs.includes(d.program));
  }

  // Further filter based on selected programs
  if(selected_programs.length > 0) {
    district_names = district_names.filter(d => selected_programs.includes(d.program));
  }

  // Further filter based on selected projects
  if(selected_projects.length > 0) {
    district_names = district_names.filter(d => selected_projects.includes(d.project));
  }

  /* Further filter district_names based on which districts are
     being shown within the current zoom level */
  if(current_zoom_level === "national") {
    district_names = district_names.map(d => (d.state + " - " + d.district));
  }
  else if(current_zoom_level === "state") {
    district_names = district_names.filter(d => d.state === current_state).map(d => (d.state + " - " + d.district));
  }
  else {
    district_names = [current_state + " - " + current_geography];
  }

  // Remove duplicates and sort
  district_names = [...new Set(district_names)];
  district_names.sort();

  /* If the map is currently zoomed to the state level, update the
     information box on the map to reflect the number of districts
     that are impacted */
  if(current_zoom_level === "state") {
    info.update(current_state, district_names.length);
  }

  // Remove any existing checkboxes in the district drop-down filter
  let district_checkboxes_group = d3.select("#district_checkboxes");
  district_checkboxes_group.selectAll("div").remove();

  // Add a div for each district
  let joined_divs = district_checkboxes_group.selectAll("div")
    .data(district_names)
    .join("div");
  
  // Within the div, append an input element
  joined_divs.append("input")
    .attr("class", "district_checkbox")
    .attr("type", "checkbox")
    .attr("id", (d,i) => "district" + i)
    .attr("value", (d,i) => d)
    .attr("checked", (d,i) => current_zoom_level === "district" ? "checked" : null);
  
  // Within the div, append a label element
  joined_divs.append("label")
    .attr("for", (d,i) => "district" + i)
    .text((d,i) => d);

  // Add an event listener to each checkbox
  document.querySelectorAll('#district_checkboxes input[type="checkbox"]').forEach(function(checkbox) {
    checkbox.addEventListener('change', function() {
      updateDistrictSelectedValues();
    });
  });
}

/* Define a helper function that determines the largest
   value currently shown on the map */
function getMapMaxValue() {

  // Define a variable to hold the maximum value
  let max_value;

  // If the map is currently at the national level
  if(current_zoom_level === "national") {
    // Find the maximum value across all states
    max_value = Math.max(...mapData.map(d => d[show_output_or_employment]));
  }
  // If the map is currently at the state level
  else if(current_zoom_level === "state") {
    /* Find the maximum value across all of the districts
       within the currently selected state */
    max_value = Math.max(...mapDistrictsData.map(d => d[show_output_or_employment]));
  }
  // If the map is currently at the district level
  else {
    // Filter the district data down to the currently selected district
    let filtered_data = mapDistrictsData.filter(d => d.district === current_geography);

    // The max value is just the value for this district
    max_value = filtered_data[0][show_output_or_employment];
  }

  // Return the maximum value
  return max_value;
}

// Handle a change to which agencies are selected
function updateAgencySelectedValues() {
  // Determine which agencies are selected
  selected_agencies = [];
  var checkboxes = document.querySelectorAll('#agency_checkboxes input[type="checkbox"]:checked');
  checkboxes.forEach(function(checkbox) {
    selected_agencies.push(checkbox.value);
  });

  // Update the table data and the table itself
  updateTableData();
  updateTable();

  // Update the map data
  updateMapData();

  // Update the info box on the map
  info.update();

  // Update the legend in the map
  addMapLegend(getMapMaxValue());

  // Update the coloring for the states and districts
  geojson.setStyle(style_states);
  geojson_districts.setStyle(style_districts);

  /* Update the label above the table that lists which
     agencies are selected */
  if (selected_agencies.length > 0) {
    d3.select(".industry_breakdown_table #table_agencies_label").text("For selected agencies: " + selected_agencies.join(", "));
  }
  else {
    d3.select(".industry_breakdown_table #table_agencies_label").text("For all agencies");
  }
  
  // Update the program, project, state, and district checkboxes
  updateProgramCheckboxes();
  updateProjectCheckboxes();
  updateStateCheckboxes();
  updateDistrictCheckboxes();
}

// Handle a change to which programs are selected
function updateProgramSelectedValues() {
  // Determine which programs are selected
  selected_programs = [];
  var checkboxes = document.querySelectorAll('#program_checkboxes input[type="checkbox"]:checked');
  checkboxes.forEach(function(checkbox) {
    selected_programs.push(checkbox.value);
  });

  // Update the table data and the table itself
  updateTableData();
  updateTable();

  // Update the map data
  updateMapData();

  // Update the info box on the map
  info.update();

  // Update the legend in the map
  addMapLegend(getMapMaxValue());

  // Update the coloring for the states and districts
  geojson.setStyle(style_states);
  geojson_districts.setStyle(style_districts);

  /* Get the values of all of the labels for the selected
     programs (the values in the selected_programs array
     above are just the program acronyms) */
  let selected_labels = [];
  document.querySelectorAll('.program_checkbox:checked + label').forEach(label => selected_labels.push(label.textContent));

  /* Update the label above the table that lists which
     programs are selected */
  if (selected_programs.length > 0) {
    let truncated_programs = selected_labels.map(str => str.length > 20 ? str.substring(0, 20) + "..." : str);
    d3.select(".industry_breakdown_table #table_programs_label").text("For selected programs: " + truncated_programs.join(", "));
  }
  else {
    d3.select(".industry_breakdown_table #table_programs_label").text("For all programs");
  }

  // Update the agency, project, state, and district checkboxes
  updateAgencyCheckboxes();
  updateProjectCheckboxes();
  updateStateCheckboxes();
  updateDistrictCheckboxes();
}

// Handle a change to which projects are selected
function updateProjectSelectedValues() {
  // Determine which projects are selected
  selected_projects = [];
  var checkboxes = document.querySelectorAll('#project_checkboxes input[type="checkbox"]:checked');
  checkboxes.forEach(function(checkbox) {
    selected_projects.push(checkbox.value);
  });

  // Update the table data and the table itself
  updateTableData();
  updateTable();

  // Update the map data
  updateMapData();

  // Update the info box on the map
  info.update();

  // Update the legend in the map
  addMapLegend(getMapMaxValue());

  // Update the coloring for the states and districts
  geojson.setStyle(style_states);
  geojson_districts.setStyle(style_districts);

  /* Update the label above the table that lists which
     projects are selected */
  if (selected_projects.length > 0) {
    let truncated_projects = selected_projects.map(str => str.length > 20 ? str.substring(0, 20) + "..." : str);
    d3.select(".industry_breakdown_table #table_projects_label").text("For selected projects: " + truncated_projects.join(", "));
  }
  else {
    d3.select(".industry_breakdown_table #table_projects_label").text("For all projects");
  }

  // Update the agency, program, state, and district checkboxes
  updateAgencyCheckboxes();
  updateProgramCheckboxes();
  updateStateCheckboxes();
  updateDistrictCheckboxes();
}

// Handle a change to which state is selected
function updateStateSelectedValues() {
  // Determine which state is selected
  selected_state = [];
  var checkboxes = document.querySelectorAll('#state_checkboxes input[type="checkbox"]:checked');
  checkboxes.forEach(function(checkbox) {
    selected_state.push(checkbox.value);
  });

  // If a state has been selected, zoom to that state
  if(selected_state.length > 0) {
    zoomToState(selected_state[0]);
  }
  /* If the currently selected state was unselected,
     zoom back out to the national level */
  else {
    zoomToNational();
  }
}

// Handle a change to which district is selected
function updateDistrictSelectedValues() {
  // Determine which district is selected
  selected_district = [];
  var checkboxes = document.querySelectorAll('#district_checkboxes input[type="checkbox"]:checked');
  checkboxes.forEach(function(checkbox) {
    selected_district.push(checkbox.value);
  });

  // If a district has been selected, zoom to that district
  if(selected_district.length > 0) {
    /* The selected district is the state name followed by a dash followed
       by the district number; split out the state name and district number */
    let selected_district_words = selected_district[0].split(" - ");

    /* If the map is currently zoomed to the national level, update
       the current_state and current_geography_code variables, which
       would already have been updated if the map were zoomed to the
       state level prior to zooming to the district level */
    if(current_zoom_level === "national") {
      current_state = selected_district_words[0];
      current_geography_code = geojson.getLayers().find(layer => layer.feature.properties.NAME === current_state).feature.properties.STATE;
    }

    // Zoom to the district level
    zoomToDistrict(selected_district_words[0], selected_district_words[1]);
  }
  /* If the currently selected district was unselected,
     zoom back out to the state level */
  else {
    zoomToState(current_state);
  }
}



/*
 *  Define table-related functions
 */

// Update the underlying table data
function updateTableData() {
  /* Depending on the current zoom level, set filtered_data equal to
     the full dataset, the dataset filtered just to a single state, or
     the dataset filtered just to a single district */
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

  // Further filter based on selected agencies
  if (selected_agencies.length > 0) {
    let induced_programs = agency_program_crosswalk.filter(d => selected_agencies.includes(d.agency)).map(d => d.program);
    filtered_data = filtered_data.filter(d => induced_programs.includes(d.program));
  }

  // Further filter based on selected programs
  if (selected_programs.length > 0) {
    filtered_data = filtered_data.filter(d => selected_programs.includes(d.program));
  }

  // Further filter based on selected projects
  if (selected_projects.length > 0) {
    filtered_data = filtered_data.filter(d => selected_projects.includes(d.project));
  }

  /* Extract whichever industry codes are now remaining and
     remove duplicates */
  let industry_list = filtered_data.map(d => d.industry_code);
  industry_list = [...new Set(industry_list)];
  
  // Construct a new set of underlying data for the table
  let new_table_data = [];
  let output_total;
  let employment_total;
  for(industry of industry_list) {
    // Extract the data for the current industry
    let curr_ind_data = filtered_data.filter(d => d.industry_code === industry);

    // Create totals for employment and output
    output_total = 0;
    employment_total = 0;
    for(curr_record of curr_ind_data) {
      output_total += curr_record.output;
      employment_total += curr_record.employment;
    }

    // Add a new object to the table data
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

// Update what is shown in the table, including the totals above it
function updateTable() {
  // Select the table body
  let table_selection = d3.select(".industry_breakdown_table tbody");

  // Clear out any pre-existing table rows
  table_selection.selectAll("tr").remove();

  // Create a new tr element for each item in the dataset
  let new_row = table_selection.selectAll("tr")
    .data(tableData)
    .join("tr");

  /* Within each row, append three td elements to hold the
     industry description, employment, and output values */
  new_row.append("td").text(d => d.industry_desc);
  new_row.append("td").text(d => d.employment.toLocaleString('en-US', { maximumFractionDigits: 0 }));
  new_row.append("td").text(d => d.output.toLocaleString('en-US', { maximumFractionDigits: 0 }));

  // Create totals for employment and output
  let employment_total = tableData.reduce((acc, curr) => acc + curr.employment, 0);
  let output_total = tableData.reduce((acc, curr) => acc + curr.output, 0);

  // Update the totals shown above the table
  d3.select("#total_employment_impacts").text("Total Employment Impacts: " + employment_total.toLocaleString('en-US', { maximumFractionDigits: 0 }) + " jobs");
  d3.select("#total_output_impacts").text("Total Output Impacts: $" + output_total.toLocaleString('en-US', { maximumFractionDigits: 0 }));
}



/*
 *  Define map-related functions
 */

// Set the color scale for the map and legend
function setColorScale(max_value) {

  /* Determine if the given max_value is both finite and
     greater than zero; if so, there is some impact within
     the currently selected zoom level */
  let some_impact = Number.isFinite(max_value) && max_value > 0;

  /* If there is some impact, set the color scale to range from
     light grey to either blue or orange depending on whether
     employment or output has been selected, respectively */
  if(some_impact) {
    if (show_output_or_employment == "output") {  
      color = d3.scaleSequential([0, max_value], ["#fafafa", "#faa635"]);
    }
    else {
      color = d3.scaleSequential([0, max_value], ["#fafafa", "#1d468d"]);
    }
  }
  /* If there is no impact within the currently selected zoom level,
     set the color scale to range from grey to grey */
  else {
    color = d3.scaleSequential([0, 0], ["#fafafa", "#fafafa"]);
  }
}

// Update the underlying map data
function updateMapData() {
  /* Initialize both mapData and mapDistrictsData to be equal to
     the full dataset */
  mapData = full_data;
  mapDistrictsData = full_data;

  // Filter based on selected agencies
  if (selected_agencies.length > 0) {
    let induced_programs = agency_program_crosswalk.filter(d => selected_agencies.includes(d.agency)).map(d => d.program);
    mapData = mapData.filter(d => induced_programs.includes(d.program));
    mapDistrictsData = mapDistrictsData.filter(d => induced_programs.includes(d.program));
  }

  // Further filter based on selected programs
  if (selected_programs.length > 0) {
      mapData = mapData.filter(d => selected_programs.includes(d.program));
      mapDistrictsData = mapDistrictsData.filter(d => selected_programs.includes(d.program));
  }
    
  // Further filter based on selected projects
  if (selected_projects.length > 0) {
      mapData = mapData.filter(d => selected_projects.includes(d.project));
      mapDistrictsData = mapDistrictsData.filter(d => selected_projects.includes(d.project));
  }

  /* For the remaining data, extract the state names and
     remove duplicates */
  let state_list = mapData.map(d => d.state);
  state_list = [...new Set(state_list)];

  /* Create an array of objects that contains, for each state,
     the state name, the total output, and the total employment */
  let new_map_data = [];
  let output_total;
  let employment_total;
  for(curr_state of state_list) {
    // Extract the data for the current state
    let curr_state_data = mapData.filter(d => d.state === curr_state);

    // Create totals for employment and output
    output_total = 0;
    employment_total = 0;
    for(curr_record of curr_state_data) {
      output_total += curr_record.output;
      employment_total += curr_record.employment;
    }

    // Add a new object to the map data
    new_map_data.push({"state": curr_state,
                       "output": output_total,
                       "employment": employment_total});
  }

  // Store the new array
  mapData = new_map_data;
  
  /* If the map is currently zoomed to the state or district
     levels, also create a district-level dataset */
  if(current_geography != "United States") {
    // Start by filtering the full dataset down to the current state
    mapDistrictsData = mapDistrictsData.filter(d => d.state === current_state);

    // Extract the district numbers and remove duplicates
    let district_list = mapDistrictsData.map(d => d.district);
    district_list = [...new Set(district_list)];

    /* Create an array of objects that contains, for each district,
       the district number, the total output, and the total employment */
    let new_map_district_data = [];
    let output_total;
    let employment_total;
    for(curr_district of district_list) {
      // Extract the data for the current district
      let curr_district_data = mapDistrictsData.filter(d => d.district === curr_district);

      // Create totals from employment and output
      output_total = 0;
      employment_total = 0;
      for(curr_record of curr_district_data) {
        output_total += curr_record.output;
        employment_total += curr_record.employment;
      }

      // Add a new object to the map district data
      new_map_district_data.push({"district": curr_district,
                                  "output": output_total,
                                  "employment": employment_total});

    }

    // Store the new array
    mapDistrictsData = new_map_district_data;
  }
  /* If the map is currently zoomed to the national level,
     set the district-level dataset to be an empty array */
  else {
    mapDistrictsData = [];
  }
}

// Add or update the legend on the map
function addMapLegend(max_value) {
  
  // Update the color scale based on the given max value
  setColorScale(max_value);

  // Remove the existing legend (if one exists)
  d3.select(".legend").remove();

  /* Determine if the given max_value is both finite and
     greater than zero; if so, there is some impact within
     the currently selected zoom level */
  let some_impact = Number.isFinite(max_value) && max_value > 0;

  // Create the legend control and set its position
  let legend = L.control({position: 'bottomleft'});

  // Set the function that will create the legend
  legend.onAdd = function(map) {
    // Create a div to hold the legend
    let div = L.DomUtil.create('div', 'info legend');
    
    // Create a container for the gradient
    let gradientDiv = document.createElement('div');
    gradientDiv.className = 'gradient';
    
    // Set the gradient colors
    gradientDiv.style.setProperty('--start-color', some_impact ? color(0) : color(0));
    gradientDiv.style.setProperty('--end-color', some_impact ? color(max_value) : color(0));
    
    // Create labels container
    let labelsDiv = document.createElement('div');
    labelsDiv.className = 'labels';
    
    /* Add min and max labels to the legend, including dollar
       signs if output is selected or the text "jobs" if
       employment is selected; if there is no impact within
       the currently selected geography, the min and max labels
       will be set to dashes */
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
    
    // Add elements to legend container
    div.appendChild(gradientDiv);
    div.appendChild(labelsDiv);

    // Return the div
    return div;
  };

  // Add the legend to the map
  legend.addTo(map);
}

// Define a function to color each state
function style_states(feature) {
  /* If the map is currently zoomed to the national level,
     color the state based on its value */
  if(current_zoom_level === "national") {
    // Extract the data for this state
    let state_data = mapData.filter(d => d.state === feature.properties.NAME);

    /* Color the state based on its employment or output value; if the
       state does not appear in mapData, then it has no impact given the
       currently selected filters and will be colored grey */
    return {
        fillColor: color(state_data.length > 0 ? state_data[0][show_output_or_employment] : 0),
        weight: 1,
        opacity: 1,
        color: '#dadada',
        fillOpacity: 1
    };
  }
  /* If the map is currently zoomed to the state or district
     levels, make the state outline invisible */
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

// Define a function to color each district
function style_districts(feature) {
  /* If the zoom level is national, or if the zoom level is state and
     the current feature is not within that state, return a style
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
    // Extract the data for this district
    let district_data = mapDistrictsData.filter(d => d.district === feature.properties.CD);

    /* Color the district based on its employment or output value; if the
       district does not appear in mapDistrictsData, then it has no impact
       given the currently selected filters and will be colored grey */
    return {
      fillColor: color(district_data.length > 0 ? district_data[0][show_output_or_employment] : 0),
      weight: 1,
      opacity: 1,
      color: '#dadada',
      fillOpacity: 1
    };

  }
  /* If the zoom level is district, color the single district based
     on its own value */
  else if (current_zoom_level === "district") {
    /* Only color the district if it is the currently selected district and is
       within the currently selected state */
    if(feature.properties.CD === current_geography && feature.properties.STATE === current_geography_code) {
      // Extract the data for this district
      let district_data = mapDistrictsData.filter(d => d.district === current_geography);

      /* Color the district based on its employment or output value; if the
         district does not appear in mapDistrictsData, then it has no impact
         given the currently selected filters and will be colored grey */
      return {
        fillColor: color(district_data.length > 0 ? district_data[0][show_output_or_employment] : 0),
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

// Zoom the map to the national level
function zoomToNational() {
  // Update the current zoom level and other variables tracking geography
  current_zoom_level = "national";
  current_geography = "United States";
  current_geography_code = "US";
  current_state = "none";
  
  // Update the table data and the table
  updateTableData();
  updateTable();

  // Update the geography label above the table
  d3.select(".industry_breakdown_table #table_geography_label").text("For the United States");

  // Update the map data and the info box on the map
  updateMapData();
  info.update();

  // Update the legend
  let max_value = Math.max(...mapData.map(d => parseFloat(d[show_output_or_employment])));
  addMapLegend(max_value);

  // Update the checkboxes
  updateAgencyCheckboxes();
  updateProgramCheckboxes();
  updateProjectCheckboxes();
  updateStateCheckboxes();
  updateDistrictCheckboxes();

  // Set the map view to the United States
  map.setView([36.8, -96], window.innerWidth >= 1000 ? 4.2 : 4.2 - ((1000-window.innerWidth)*0.0022));

  // Reset the map styles
  geojson.resetStyle();
  geojson_districts.resetStyle();

  // Bring the state layer to the front and send the district layer to the back
  geojson.bringToFront();
  geojson_districts.bringToBack();

  // Update the state and district coloring
  geojson.setStyle(style_states);
  geojson_districts.setStyle(style_districts);
  
}

// Zoom the map to the state level
function zoomToState(state_name) {
  // Extract the given state's layer from the map
  let layers = geojson.getLayers();
  let state_layer = layers.find(layer => layer.feature.properties.NAME === state_name);
  
  // Update the current zoom level and other variables tracking geography
  current_zoom_level = "state";
  current_geography = state_name;
  current_geography_code = state_layer.feature.properties.STATE;
  current_state = state_name;

  // Send the state layer to the back of the map
  geojson.bringToBack();

  // Fit the map to the state layer
  map.fitBounds(state_layer.getBounds(), { padding: [20, 20] });
  
  // Update the table data and the table
  updateTableData();
  updateTable();

  // Update the map data and the info box on the map
  updateMapData();
  info.update(state_name, mapDistrictsData.length);

  // Update the geography label above the table
  d3.select(".industry_breakdown_table #table_geography_label").text("For " + state_name);
  
  // Update the legend
  let max_value = Math.max(...mapDistrictsData.map(d => parseFloat(d[show_output_or_employment])));
  addMapLegend(max_value);

  // Update the state and district coloring
  geojson.setStyle(style_states);
  geojson_districts.setStyle(style_districts);

  // Update the checkboxes
  updateAgencyCheckboxes();
  updateProgramCheckboxes();
  updateProjectCheckboxes();
  updateStateCheckboxes();
  updateDistrictCheckboxes();
}

// Zoom the map to the district level
function zoomToDistrict(state_name, district_number) {
  /* Update the current zoom level and the current geography; the
     geography code and current state are left as they are from
     when the map was zoomed to the state level (or are populated
     when the user chooses a district from the drop-down when the
     map is at the national level */
  current_zoom_level = "district";
  current_geography = district_number;
  
  // Extract the given district's layer from the map
  let district_layer = geojson_districts.getLayers().find(layer => (layer.feature.properties.STATE === current_geography_code) && (layer.feature.properties.CD === district_number));
  
  // Fit the map to the district layer
  map.fitBounds(district_layer.getBounds(), { padding: [20, 20] });

  // Update the table data and the table
  updateTableData();
  updateTable();

  // Update the map data and the info box on the map
  updateMapData();
  info.update(state_name, mapDistrictsData.length);

  // Update the geography label above the table
  d3.select(".industry_breakdown_table #table_geography_label").text("For " + current_state + " - District " + current_geography);
  
  // Extract the data for the given district
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

  // Update the legend
  addMapLegend(max_value);

  // Update the state and district coloring
  geojson.setStyle(style_states);
  geojson_districts.setStyle(style_districts);

  // Update the checkboxes
  updateAgencyCheckboxes();
  updateProgramCheckboxes();
  updateProjectCheckboxes();
  updateStateCheckboxes();
  updateDistrictCheckboxes();
}

// Handle when the employment radio button is clicked
function handRadioEmploymentClick(e) {
  // Update the selected variable to be employment
  show_output_or_employment = "employment";
  
  // Update the legend
  addMapLegend(getMapMaxValue());

  // Update the state and district coloring
  geojson.setStyle(style_states);
  geojson_districts.setStyle(style_districts);
};

// Handle when the output radio button is clicked
function handleRadioOutputClick(e) {
  // Update the selected variable to be output
  show_output_or_employment = "output";
  
  // Update the legend
  addMapLegend(getMapMaxValue());

  // Update the state and district coloring
  geojson.setStyle(style_states);
  geojson_districts.setStyle(style_districts);
};

/* Define a function to draw the map; it takes the state and
   congressional district outline data as parameters */
function drawMap(statesOutlines, congressionalDistrictsOutlines) {
  // Add the "Zoom Out to National" button to the map
  let zoom_national_button = L.control({position: 'bottomright'});
  zoom_national_button.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'national_button_div');
    div.innerHTML = '<div id="zoom_national">Zoom Out to National</div>';
    return div;
  };
  zoom_national_button.addTo(map);

  // Add the event listener for the zoom-to-national button
  document.getElementById('zoom_national').onclick = function(e) {
    /* Stop event propagation so that the map itself does not
       register a click event */
    L.DomEvent.stopPropagation(e);

    // Hide all checkboxes
    hideAllCheckboxes();

    // Zoom to the national level
    zoomToNational();
  }

  // Add the employment-output radio buttons control
  let measure_control = L.control({position: 'topright'});
  measure_control.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'measure_controls');
    var label_employment = L.DomUtil.create('label', '', div);
    label_employment.innerHTML = '<input type="radio" id="radio_employment" value="Employment" name="economic_measure" checked/>Employment';
    var label_output = L.DomUtil.create('label', '', div);
    label_output.innerHTML = '<input type="radio" id="radio_output" value="Output" name="economic_measure"/>Economic Output';
    return div;
  };
  measure_control.addTo(map);

  // Add an event listener for the measure_controls div
  document.getElementsByClassName('measure_controls')[0].onclick = function(e) {
    /* Stop event propagation if the user has clicked within the
       measure_controls div so that the map itself does not
       register a click event */
    L.DomEvent.stopPropagation(e);
  }

  // Add an event listener for the output radio button
  document.getElementById('radio_output').addEventListener('change', function(e) {
    handleRadioOutputClick(e);
  });

  // Add an event listener for the employment radio button
  document.getElementById('radio_employment').addEventListener('change', function(e) {
    handRadioEmploymentClick(e);
  });

  // Create the popup
  var popup = L.popup({autoPan: false,
                       keepInView: true,
                       closeButton: false});

  
  // Define a function that handles feature highlighting for states
  function highlightFeature(e) {
    /* Only highlight the feature if the map is zoomed
       to the national level */
    if(current_zoom_level === "national") {
      // Get the layer
      let layer = e.target;

      // Update the style
      layer.setStyle({
          weight: 2,
          color: '#666',
          fillOpacity: 0.7
      });

      // Bring to front
      layer.bringToFront();
    }
  }

  // Define a function that resets the feature for states
  function resetHighlight(e) {
    // Put the style back to the default
    geojson.resetStyle(e.target);
  }

  // Define a function that handles feature highlighting for districts
  function highlightDistrictFeature(e) {
    /* Only highlight the feature if the map is zoomed
       to the state level */
    if(current_zoom_level === "state") {
      // Get the layer
      var layer = e.target;

      // Update the style
      layer.setStyle({
        weight: 2,
        color: '#666',
        fillOpacity: 0.7
      });

      // Bring to front
      layer.bringToFront();
    }
  }

  // Define a function that resets the feature for districts
  function resetDistrictHighlight(e) {
    // Put the style back to the default
    geojson_districts.resetStyle(e.target);
  }

  // Set the highlighting/reset functions for states
  function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight
    });
  }

  // Set the highlighting/reset functions for districts
  function onEachDistrictFeature(feature, layer) {
    layer.on({
        mouseover: highlightDistrictFeature,
        mouseout: resetDistrictHighlight
    });
  }

  // Create the districts geoJSON layer
  geojson_districts = L.geoJson(congressionalDistrictsOutlines, {
    style: style_districts,
    onEachFeature: onEachDistrictFeature,
    smoothFactor: 0,
    attribution: '&copy; <a href="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html">U.S. Census Bureau</a>'
  }).addTo(map);

  // Create the states geoJSON layer
  geojson = L.geoJson(statesOutlines, {
    style: style_states,
    onEachFeature: onEachFeature,
    smoothFactor: 0,
    attribution: '&copy; <a href="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html">U.S. Census Bureau</a>'
  }).addTo(map);

  // Add a click event listener to the map
  map.on('click', function(e) {
    // Find state polygons containing the point
    const statesAtPoint = leafletPip.pointInLayer(e.latlng, geojson);
    
    // Find district polygons containing the point
    const districtsAtPoint = leafletPip.pointInLayer(e.latlng, geojson_districts);

    // Do the following only if a state (rather than nothing) was clicked
    if(statesAtPoint.length > 0) {
      // Extract the name of the state that was clicked
      let geography_name = statesAtPoint[0].feature.properties.NAME;
      
      /* If the map is currently at the district level, zoom to
         the national level */
      if(current_zoom_level === "district" && districtsAtPoint[0].feature.properties.CD === current_geography) {
        zoomToNational();
      }
      /* If the map is currently at the national level, zoom to
         the state level */
      else if (current_zoom_level === "national") {
        zoomToState(geography_name);
      }
      /* If the map is at the state level, and the district that was
         clicked is within the current state, zoom to the district
         level (ignore clicks on districts that are not within the
         current state) */
      else if (current_zoom_level === "state" && districtsAtPoint[0].feature.properties.STATE === current_geography_code) {
        zoomToDistrict(geography_name, districtsAtPoint[0].feature.properties.CD);
      }
    }
  });

  // Add a mouse movement event listener to the map
  map.on('mousemove', function(e) {
    // Find state polygons containing the point
    const statesAtPoint = leafletPip.pointInLayer(e.latlng, geojson);
    
    // Find district polygons containing the point
    const districtsAtPoint = leafletPip.pointInLayer(e.latlng, geojson_districts);

    // Create a variable to hold the lat-long
    let popup_latlng;

    // Initially set the popup text to be empty
    let tooltipText = "";

    // If the user is hovering over a state/district
    if (statesAtPoint.length > 0 && districtsAtPoint.length > 0) {
      // Extract the name of the state
      const stateName = statesAtPoint[0].feature.properties.NAME;
      
      // Extract the district number
      const districtNumber = districtsAtPoint[0].feature.properties.CD;
      
      /* If the map is zoomed to the national level, the popup
         will show information about the hovered state */
      if(current_zoom_level === "national") {
        // Set the first line to be the state name in bold
        tooltipText = `<b>${stateName}</b>`;

        // Extract the data for this state
        let state_data = mapData.filter(d => d.state === stateName);

        /* If there is data for the state, extract the output or
           employment value depending on which radio button is
           selected; otherwise, set the value to zero */
        let state_total = 0;
        if (state_data.length > 0) {
          state_total = state_data[0][show_output_or_employment];
        }

        // Set the second line to be the value with a label
        if(show_output_or_employment == "output") { 
          tooltipText += `<br>Output Impact: $${state_total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        }
        else {
          tooltipText += `<br>Employment Impact: ${state_total.toLocaleString('en-US', { maximumFractionDigits: 0 })} jobs`;
        }
        
        // Update the lat-long
        popup_latlng = e.latlng;
      }
      /* If the map is zoomed to the state or district levels,
         the popup will show information about the hovered district */
      else {
        /* If the map is at the state level, check that the user is hovering
           over a district in the current state; if the map is at the district
           level, check that the user is hovering over the current district */
        if((current_zoom_level === "state" && stateName === current_state) ||
           (current_zoom_level === "district" && stateName === current_state && districtNumber === current_geography)) {

          // Set the first line to be the state name and district number in bold
          tooltipText = `<b>${stateName} - District ${districtNumber}</b>`;

          // Extract the data for this district
          let district_data = mapDistrictsData.filter(d => d.district === districtNumber);

          // Set the second line to be the value with a label
          if(show_output_or_employment === "output") {
            // Extract the value if there is data and set to zero otherwise
            if(district_data.length > 0) {
              tooltipText += `<br>Output Impact: $${district_data[0].output.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
            }
            else {  
              tooltipText += `<br>Output Impact: $0`;
            }
          }
          else {
            // Extract the value if there is data and set to zero otherwise
            if(district_data.length > 0) {
              let jobs_number = district_data[0].employment.toLocaleString('en-US', { maximumFractionDigits: 0 });
              tooltipText += `<br>Employment Impact: ${jobs_number} job${jobs_number === '1' ? '' : 's'}`;
            }
            else {
              tooltipText += `<br>Employment Impact: 0 jobs`;
            }
          }

          // Update the lat-long
          popup_latlng = e.latlng;
        }
      }
    }

    /* If the popup text has been set and there is a
       defined lat-long location, update the position
       and content of the popup and show it */
    if (tooltipText != "" && popup_latlng != undefined) {
      popup
        .setLatLng(popup_latlng)
        .setContent(tooltipText)
        .openOn(map);
    }
    // Otherwise, hide the popup
    else {
      popup.close();
    }
  });

  // Add a mouse out event listener to the map
  map.on('mouseout', function(e) {
    // Close the popup
    popup.close();
  });

  // Create the info control
  info = L.control({position: 'bottomright'});

  // Set function to create label
  info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info');
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

  // Add the info control to the map
  info.addTo(map);
}



/*
 *  Define the overall function to create the visualization
 */

// Draw the visualization
function drawVisualization() {

  /* Load the economic impact data, converting the
     employment and output values to numbers */
  d3.csv("./economic_impact_district_data.csv", (d) => {
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
    
    /* Load the IMPLAN industry codes data, which contains the
       industry code number and the industry text description */
    d3.csv("./implan_industry_codes.csv").then(function(loaded_codes_data) {
    
      // Store the IMPLAN industry codes data
      implan_industry_codes = loaded_codes_data;

      // Load the agency-program crosswalk
      d3.csv("./agency_program_crosswalk.csv").then(function(loaded_agency_crosswalk_data) {

        // Store the agency-program crosswalk
        agency_program_crosswalk = loaded_agency_crosswalk_data;

        // Update the map data
        updateMapData();

        // Set the color scale based on the values shown on the map
        let curr_values;
        if (show_output_or_employment == "output") {
          curr_values = mapData.map(d => d.output);
        }
        else {
          curr_values = mapData.map(d => d.employment);
        }
        let max_value = Math.max(...curr_values);
        setColorScale(max_value);
        
        // Update the checkboxes
        updateAgencyCheckboxes();
        updateProgramCheckboxes();
        updateProjectCheckboxes();
        updateStateCheckboxes();
        updateDistrictCheckboxes();

        // Add event listener for agency checkboxes filter text box
        document.getElementById('agency_checkboxes_filter').addEventListener('input', function() {
          let search_text = this.value.toUpperCase();
          document.querySelectorAll('#agency_checkboxes label').forEach(function(label) { 
            label.style.display = label.innerText.toUpperCase().includes(search_text) ? "block" : "none";
          });
        });

        // Add event listener for program checkboxes filter text box
        document.getElementById('program_checkboxes_filter').addEventListener('input', function() {
          let search_text = this.value.toUpperCase();
          document.querySelectorAll('#program_checkboxes label').forEach(function(label) { 
            label.style.display = label.innerText.toUpperCase().includes(search_text) ? "block" : "none";
          });
        });

        // Add event listener for project checkboxes filter text box
        document.getElementById('project_checkboxes_filter').addEventListener('input', function() {
          let search_text = this.value.toUpperCase();
          document.querySelectorAll('#project_checkboxes label').forEach(function(label) { 
            label.style.display = label.innerText.toUpperCase().includes(search_text) ? "block" : "none";
          });
        });

        // Add event listener for state checkboxes filter text box
        document.getElementById('state_checkboxes_filter').addEventListener('input', function() {
          let search_text = this.value.toUpperCase();
          document.querySelectorAll('#state_checkboxes label').forEach(function(label) { 
            label.style.display = label.innerText.toUpperCase().includes(search_text) ? "block" : "none";
          });
        });

        // Add event listener for district checkboxes filter text box
        document.getElementById('district_checkboxes_filter').addEventListener('input', function() {
          let search_text = this.value.toUpperCase();
          document.querySelectorAll('#district_checkboxes label').forEach(function(label) { 
            label.style.display = label.innerText.toUpperCase().includes(search_text) ? "block" : "none";
          });
        });

        // Update the table data and the table
        updateTableData();
        updateTable();

        // Add a click handler for the "Download Table Data" button
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

          // Create the blob and download it
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          const geography_string = current_zoom_level === "district" ? current_state.toLowerCase().replace(/\s+/g, '_') + '-' + current_geography.toLowerCase().replace(/\s+/g, '_') : current_geography.toLowerCase().replace(/\s+/g, '_');
          link.setAttribute('download', `economic_impact_${geography_string}_${selected_agencies.length > 0 ? "selectedagencies" : "allagencies"}_${selected_programs.length > 0 ? "selectedprograms" : "allprograms"}_${selected_projects.length > 0 ? "selectedprojects" : "allprojects"}_${table_is_filtered ? "selectedindustries" : "allindustries"}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        // Add a click handler for the "Clear Filters" button
        document.getElementById('clear_button').onclick = function() {
          // Hide all checkboxes
          hideAllCheckboxes();

          // Clear any selected agencies, programs, and/or projects
          selected_agencies = [];
          selected_programs = [];
          selected_projects = [];

          // Reset the labels above the table
          d3.select(".industry_breakdown_table #table_agencies_label").text("For all agencies");
          d3.select(".industry_breakdown_table #table_programs_label").text("For all programs");
          d3.select(".industry_breakdown_table #table_projects_label").text("For all projects");

          // Zoom the map to the national level
          zoomToNational();

          // Update all of the checkboxes
          updateAgencyCheckboxes();
          updateProgramCheckboxes();
          updateProjectCheckboxes();
          updateStateCheckboxes();
          updateDistrictCheckboxes();
        }

        /* Define a function to filter the table data based on the
           text in the table_filter_phrase input */
        function filterTableData() {
          // Mark that the table has been filtered
          table_is_filtered = true;

          // Retrieve the filter text
          let filterPhrase = document.getElementById('table_filter_phrase').value.toUpperCase();

          /* Refresh the table data from scratch (in case the user
             performs multiple filters in a row, where the new
             filter is not a subset of the previous filter) */
          updateTableData();

          // Filter the table data based on the filter text
          tableData = tableData.filter(d => d.industry_desc.toUpperCase().includes(filterPhrase));

          // Update the table
          updateTable();
        }

        // Add a handler for pressing enter within the "Filter by Industry" text box
        document.getElementById('table_filter_phrase').addEventListener('keydown', function(event) {
          if (event.key === 'Enter') {
            filterTableData();
          }
        });

        // Add a click handler for the "Filter Table" button
        document.getElementById('filterTable').onclick = function() {
          filterTableData();
        };

        // Add a click handler for the "Clear Filter" button
        document.getElementById('clearTableFilter').onclick = function() {
          table_is_filtered = false;
          document.getElementById('table_filter_phrase').value = "";
          updateTableData();
          updateTable();
        };

        // Add a click handler for the industry header in the table
        document.getElementById('industry_header').onclick = function() {
          /* Remove the ascending or descending classes from the
             other table headers */
          document.getElementById('employment_header').classList.remove("ascending");
          document.getElementById('employment_header').classList.remove("descending");
          document.getElementById('output_header').classList.remove("ascending");
          document.getElementById('output_header').classList.remove("descending");

          // Sort the table data by industry in descending order
          if(tableSortVariable === "industry" && tableSortDirection === "ascending") {
            tableData.sort((a, b) => (b.industry_desc.localeCompare(a.industry_desc) === 0 ? b.employment - a.employment : b.industry_desc.localeCompare(a.industry_desc)));
            tableSortDirection = "descending";
            document.getElementById('industry_header').classList.remove("ascending");
            d3.select("#industry_header").classed("descending", "true");
          }
          // Sort the table data by industry in ascending order
          else {
            tableData.sort((a, b) => (a.industry_desc.localeCompare(b.industry_desc) === 0 ? a.employment - b.employment : a.industry_desc.localeCompare(b.industry_desc)));
            tableSortDirection = "ascending";
            document.getElementById('industry_header').classList.remove("descending");
            d3.select("#industry_header").classed("ascending", "true");
          }

          // Mark that the table is sorted by industry
          tableSortVariable = "industry";

          // Update the table
          updateTable();
        }

        // Add a click handler for the employment header in the table
        document.getElementById('employment_header').onclick = function() {
          /* Remove the ascending or descending classes from the
             other table headers */
          document.getElementById('industry_header').classList.remove("ascending");
          document.getElementById('industry_header').classList.remove("descending");
          document.getElementById('output_header').classList.remove("ascending");
          document.getElementById('output_header').classList.remove("descending");

          // Sort the table data by employment in ascending order
          if(tableSortVariable === "employment" && tableSortDirection === "descending") {
            tableData.sort((a, b) => (a.employment - b.employment === 0 ? a.output - b.output : a.employment - b.employment));
            tableSortDirection = "ascending";
            document.getElementById('employment_header').classList.remove("descending");
            d3.select("#employment_header").classed("ascending", "true");
          }
          // Sort the table data by employment in descending order
          else {
            tableData.sort((a, b) => (b.employment - a.employment === 0 ? b.output - a.output : b.employment - a.employment));
            tableSortDirection = "descending";
            document.getElementById('employment_header').classList.remove("ascending");
            d3.select("#employment_header").classed("descending", "true");
          }

          // Mark that the table is sorted by employment
          tableSortVariable = "employment";

          // Update the table
          updateTable();
        }

        // Add a click handler for the output header in the table
        document.getElementById('output_header').onclick = function() {
          /* Remove the ascending or descending classes from the
             other table headers */
          document.getElementById('industry_header').classList.remove("ascending");
          document.getElementById('industry_header').classList.remove("descending");
          document.getElementById('employment_header').classList.remove("ascending");
          document.getElementById('employment_header').classList.remove("descending");

          // Sort the table data by output in ascending order
          if(tableSortVariable === "output" && tableSortDirection === "descending") {
            tableData.sort((a, b) => (a.output - b.output === 0 ? a.employment - b.employment : a.output - b.output));
            tableSortDirection = "ascending";
            document.getElementById('output_header').classList.remove("descending");
            d3.select("#output_header").classed("ascending", "true");
          }
          // Sort the table data by output in descending order
          else {
            tableData.sort((a, b) => (b.output - a.output === 0 ? b.employment - a.employment : b.output - a.output));
            tableSortDirection = "descending";
            document.getElementById('output_header').classList.remove("ascending");
            d3.select("#output_header").classed("descending", "true");
          }

          // Mark that the table is sorted by output
          tableSortVariable = "output";

          // Update the table
          updateTable();
        }

        /* Add a click event listener to the entire visualization, which will close
           all checkboxes if the user clicks outside of the checkboxes (note that
           clicking on a state or district within their respective drop-downs will
           close the checkboxes because only one state and/or district can be
           selected at a time) */
        document.body.addEventListener('click', function(e) {
          if (!(e.target.classList.contains('overSelect') ||
                e.target.nodeName === "LABEL" ||
                e.target.classList.contains('agency_checkbox') ||
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
            drawMap(statesOutlines, congressionalDistrictsOutlines);

            // Draw the legend
            addMapLegend(max_value);

          });

        });

      });

    });

  });

}
