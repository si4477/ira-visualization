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
var production_data;

// Define ordinal scale for the colors in the map
var color;

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
  update_table();
  // Refresh map styling
  geojson.setStyle(style);
  return selected_programs;
}

function getProjectSelectedValues() {
  selected_projects = [];
  var checkboxes = document.querySelectorAll('#project_checkboxes input[type="checkbox"]:checked');
  checkboxes.forEach(function(checkbox) {
    selected_projects.push(checkbox.value);
  });
  update_table();
  // Refresh map styling
  geojson.setStyle(style);
  return selected_projects;
}


function update_table() {

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

  console.log(filtered_data);

  let industry_list = filtered_data.map(d => d.industry_desc);
  industry_list = [...new Set(industry_list)];
  industry_list.splice(industry_list.indexOf("All"), 1);


  let table_data = [];
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

    table_data.push({"industry_desc": industry,
                     "output": Number(output_total.toFixed(4)),
                     "employment": Number(employment_total.toFixed(4))});
  }
  console.log(table_data);

  // Select the table body
  let table_selection = d3.select(".industry_breakdown_table tbody");

  // Clear out any pre-existing table rows
  table_selection.selectAll("tr").remove();

  // Create a new tr element for each item in the dataset
  let new_row = table_selection.selectAll("tr")
    .data(table_data)
    .join("tr");

  /* Within each row, append four td elements to hold the
     industry description, industry code, output, and
     employment values */
  new_row.append("td").text(d => d.industry_desc);
  new_row.append("td").text(0);
  new_row.append("td").text(d => d.output);
  new_row.append("td").text(d => d.employment);


}


function RenderChart(map) {

  function style(feature) {
      // Extract the data for this state
      let state_data = full_data.filter(d => d.region === feature.properties.NAME);
      
      // Filter based on selected programs if any are selected
      if (selected_programs.length > 0) {
          state_data = state_data.filter(d => selected_programs.includes(d.program) || d.program === "All");
      }
      
      // Filter based on selected projects if any are selected
      if (selected_projects.length > 0) {
          state_data = state_data.filter(d => selected_projects.includes(d.project) || d.project === "All");
      }

      // Map to output or employment values and sum
      let state_sum = 0;
      if(state_data.length > 0) {
          const value_type = show_output_or_employment === "output" ? "output" : "employment";
          state_sum = state_data.map(d => parseFloat(d[value_type])).reduce((a, b) => a + b);
      }

      return {
          fillColor: color(state_sum),
          weight: 1,
          opacity: 1,
          color: '#aaa',
          fillOpacity: 0.7
      };
  }

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
      update_table();
      d3.select(".industry_breakdown_table div:nth-child(2)").text("For the United States");
    }
    else {
      current_geography = geography_name;
      map.fitBounds(e.target.getBounds());
      info.update(geography_name);
      update_table();
      d3.select(".industry_breakdown_table div:nth-child(2)").text("For " + geography_name);
    }

    treemap_zoomed = false;


  }

  function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
  }

  var geojson;
  var info;


  var data_to_bind;
  var treemap_zoomed = false;

  
  function setColorScale(max_value) {
    if (show_output_or_employment == "output") {  
      color = d3.scaleSequential([0, max_value], d3.interpolateBlues);
    }
    else {
      color = d3.scaleSequential([0, max_value], d3.interpolateOranges);
    }
  }

  // Create the scales
  //const x = d3.scaleLinear().domain([0,width]).rangeRound([0, width]);
  //const y = d3.scaleLinear().domain([0,height]).rangeRound([0, height]);

  d3.csv("./economic_impact_data.csv").then(function(loaded_data) {
      console.log(loaded_data);
      productionData = loaded_data;

      full_data = productionData;

      const filtered_data = loaded_data.filter(d => d.industry_code === "All");

      const output_values = filtered_data.map(d => parseFloat(d.output));

      let max_value = Math.max(...output_values);
      setColorScale(max_value);
      addMapLegend(max_value);

      // Get unique program names
      let program_names = loaded_data.map(d => d.program);
      program_names = [...new Set(program_names)];
      program_names.splice(program_names.indexOf("All"), 1);

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
      let project_names = loaded_data.map(d => d.project);
      project_names = [...new Set(project_names)];
      project_names.splice(project_names.indexOf("All"), 1);

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
        const filtered_data = full_data.filter(d => d.industry_code === "All");

        const output_values = filtered_data.map(d => parseFloat(d.output));
  
        let max_value = Math.max(...output_values);
        setColorScale(max_value);
        d3.select(".legend").remove();
        addMapLegend(max_value);
        geojson.setStyle(style);
        
      });

      document.getElementById('radio_employment').addEventListener('change', function() {
        show_output_or_employment = "employment";
        const filtered_data = full_data.filter(d => d.industry_code === "All");

        const output_values = filtered_data.map(d => parseFloat(d.employment));
  
        let max_value = Math.max(...output_values);
        setColorScale(max_value);
        d3.select(".legend").remove();
        addMapLegend(max_value);
        geojson.setStyle(style);
      });

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

  function addMapLegend(max_value) {
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
        <span>0</span>
        <span>${max_value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
      `;
      
      // Add elements to legend
      div.appendChild(gradientDiv);
      div.appendChild(labelsDiv);

      return div;
    };

    legend.addTo(map);
  }

}

