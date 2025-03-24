/* Declare a variable that will hold the Leaflet map object
 if we're using a map */


var map = L.map('leaflet_map', {
    zoomControl: false,
    boxZoom: false,
    doubleClickZoom: false,
    dragging: true,
    scrollWheelZoom: false
  }).setView([37.8, -96], 3);

// Call the render function passing the SVG ref,
// the map object, and the useMap flag
RenderChart(map);

var show_output_or_employment = "output";

/* Track whether the program checkboxes
   are expanded and visible */
var program_expanded = false;

/* Track whether the project checkboxes are
   expanded and visible */
var project_expanded = false;

var selected_programs = [];
var selected_projects = [];

// Set the current zoom to "United States"
var current_geography = "United States";

var full_data;

// Define ordinal scale for the colors in the map
var color;

var geojson;

// Toggle the program checkboxes visibility
function showProgramCheckboxes() {
  var checkboxes = document.getElementById("program_checkboxes");
  if (!program_expanded) {
    checkboxes.style.display = "flex";
    program_expanded = true;
  } else {
    checkboxes.style.display = "none";
    program_expanded = false;
  }
}

// Toggle the project checkboxes visibility
function showProjectCheckboxes() {
  var checkboxes = document.getElementById("project_checkboxes");
  if (!project_expanded) {
    checkboxes.style.display = "flex";
    project_expanded = true;
  } else {
    checkboxes.style.display = "none";
    project_expanded = false;
  }
}

function getProgramSelectedValues() {
  selected_programs = [];
  var checkboxes = document.querySelectorAll('#program_checkboxes input[type="checkbox"]:checked');
  checkboxes.forEach(function(checkbox) {
    selected_programs.push(checkbox.value);
  });

  updateTableData();
  update_table();
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
  addMapLegend(max_value);

  
  geojson.setStyle(style);

  d3.select(".industry_breakdown_table div:nth-child(3)").text("For programs " + selected_programs);
  return selected_programs;
}

function getProjectSelectedValues() {
  selected_projects = [];
  var checkboxes = document.querySelectorAll('#project_checkboxes input[type="checkbox"]:checked');
  checkboxes.forEach(function(checkbox) {
    selected_projects.push(checkbox.value);
  });
  updateTableData();
  update_table();
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
  addMapLegend(max_value);

  
  geojson.setStyle(style);

  d3.select(".industry_breakdown_table div:nth-child(4)").text("For projects " + selected_projects);
  return selected_projects;
}


let tableData;
function updateTableData() {
  let filtered_data;
  if(current_geography == "United States") {
    filtered_data = full_data;
  }
  else {
    filtered_data = full_data.filter(d => d.region === current_geography);
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
  
  tableData = new_table_data;
}

function update_table() {

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
  new_row.append("td").text(d => d.output);
  new_row.append("td").text(d => d.employment);


}


function setColorScale(max_value) {
  if (show_output_or_employment == "output") {  
    color = d3.scaleSequential([0, max_value], d3.interpolateBlues);
  }
  else {
    color = d3.scaleSequential([0, max_value], d3.interpolateOranges);
  }
}

var mapData;
function updateMapData() {
  mapData = full_data;

  // Filter based on selected programs if any are selected
  if (selected_programs.length > 0) {
      mapData = mapData.filter(d => selected_programs.includes(d.program));
  }
    
  // Filter based on selected projects if any are selected
  if (selected_projects.length > 0) {
      mapData = mapData.filter(d => selected_projects.includes(d.project));
  }

  let state_list = mapData.map(d => d.region);
  state_list = [...new Set(state_list)];

  let new_map_data = [];
  let output_total;
  let employment_total;
  for(curr_state of state_list) {

    let curr_state_data = mapData.filter(d => d.region === curr_state);

    output_total = 0;
    employment_total = 0;
    for(curr_record of curr_state_data) {
      output_total += parseFloat(curr_record.output);
      employment_total += parseFloat(curr_record.employment);
    }

    new_map_data.push({"region": curr_state,
                       "output": Number(output_total.toFixed(4)),
                       "employment": Number(employment_total.toFixed(4))});
  }

  mapData = new_map_data;

}

function addMapLegend(max_value) {
  d3.select(".legend").remove();

  var legend = L.control({position: 'bottomright'});

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
    
    // Add min and max labels
    labelsDiv.innerHTML = `
      <span>$0</span>
      <span>$${max_value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
    `;
    
    // Add elements to legend
    div.appendChild(gradientDiv);
    div.appendChild(labelsDiv);

    return div;
  };

  legend.addTo(map);
}

function style(feature) {

  // Extract the data for this state
  let state_data = mapData.filter(d => d.region === feature.properties.NAME);

  let state_total = 0;
  if (state_data.length > 0) {
    state_total = state_data[0][show_output_or_employment];
  }

  return {
      fillColor: color(state_total),
      weight: 1,
      opacity: 1,
      color: '#aaa',
      fillOpacity: 0.7
  };
}

function RenderChart(map) {



  function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 2,
        color: '#555',
        fillOpacity: 0.8
    });

    layer.bringToFront();
  }

  function resetHighlight(e) {
    geojson.resetStyle(e.target);
  }

  function zoomToFeature(e) {
    var layer = e.target;
    var geography_name = layer.feature.properties.NAME;

    if(geography_name === current_geography) {
      current_geography = "United States";
      map.setView([37.8, -96], 3);
      info.update();
      updateTableData();
      update_table();
      d3.select(".industry_breakdown_table div:nth-child(2)").text("For the United States");
    }
    else {
      current_geography = geography_name;
      map.fitBounds(e.target.getBounds());
      info.update(geography_name);
      updateTableData();
      update_table();
      d3.select(".industry_breakdown_table div:nth-child(2)").text("For " + geography_name);
    }

  }

  function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
  }

  
  var info;

  d3.csv("./economic_impact_data.csv").then(function(loaded_data) {
      
      full_data = loaded_data;

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
      addMapLegend(max_value);

      
      // Get unique program names
      let program_names = full_data.map(d => d.program);
      program_names = [...new Set(program_names)];
      

      
      let checkboxes_group = d3.select("#program_checkboxes");

      let checkboxes = checkboxes_group.selectAll("input")
        .data(program_names)
        .join("input")
            .attr("class", "program_checkbox")
            .attr("type", "checkbox")
            .attr("id", (d,i) => i)
            .attr("value", (d,i) => d)
            .attr("checked", "");
      let labels = checkboxes_group.selectAll("label")
        .data(program_names)
        .join("label")
          .attr("for", (d,i) => i)
          .text((d,i) => d);

      document.querySelectorAll('#program_checkboxes input[type="checkbox"]').forEach(function(checkbox) {
          checkbox.addEventListener('change', function() {
              var selectedValues = getProgramSelectedValues();
              console.log("Program selected values:", selectedValues);
          });
      });

      // Get unique project names
      let project_names = full_data.map(d => d.project);
      project_names = [...new Set(project_names)];
      

      let project_checkboxes_group = d3.select("#project_checkboxes");

      let joined_divs = project_checkboxes_group.selectAll("input")
        .data(project_names)
        .join("div");

      joined_divs.append("input")
            .attr("class", "project_checkbox")
            .attr("type", "checkbox")
            .attr("id", (d,i) => "project" + i)
            .attr("value", (d,i) => d)
            .attr("checked", "");
      joined_divs.append("label")
          .attr("for", (d,i) => "project" + i)
          .text((d,i) => d);

      document.querySelectorAll('#project_checkboxes input[type="checkbox"]').forEach(function(checkbox) {
          checkbox.addEventListener('change', function() {
              var selectedValues = getProjectSelectedValues();
              console.log("Project selected values:", selectedValues);
          });
      });


      document.getElementById('radio_output').addEventListener('change', function() {
        show_output_or_employment = "output";

        updateMapData();

        let curr_values;
        curr_values = mapData.map(d => d.output);
        let max_value = Math.max(...curr_values);

        setColorScale(max_value);
        d3.select(".legend").remove();
        addMapLegend(max_value);
        geojson.setStyle(style);
        
      });

      document.getElementById('radio_employment').addEventListener('change', function() {
        show_output_or_employment = "employment";

        updateMapData();

        let curr_values;
        curr_values = mapData.map(d => d.employment);
        let max_value = Math.max(...curr_values);

        setColorScale(max_value);
        d3.select(".legend").remove();
        addMapLegend(max_value);
        geojson.setStyle(style);
      });

      updateTableData();
      update_table();
  });


  d3.json("./states_outlines.json").then(function(loaded_data) {
      draw_leaflet_map(loaded_data);
  });




  function draw_leaflet_map(statesOutlines) {
    // Load background tiles from OpenStreetMap
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    geojson = L.geoJson(statesOutlines, {
      style: style,
      interactive: true,
      onEachFeature: onEachFeature,
      attribution: '&copy; <a href="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html">U.S. Census Bureau</a>'
    }).addTo(map);

    // Create the control
    info = L.control();

    // Set function to create label
    info.onAdd = function (map) {
      this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
      this.update();
      return this._div;
    };

    // Set function to use in updating label
    info.update = function (props) {
        this._div.innerHTML = '<div>State Focus</div>' +  (props ?
            '<b>' + props + '</b>' : '[Select a state]');
    };

    // Add control to map
    info.addTo(map);


  }



}

