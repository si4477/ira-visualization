# IRA Funding Freeze Map/Table Visualization

This repository contains the code for the [funding freeze map
visualization](https://www.c2es.org/funding-freeze/) on the C2ES website. The
visualization has three main parts: a container that allows the user to select
between a district-level version of the visualization and a state-level version
of the visualization; the district-level visualization itself; and the
state-level visualization itself.

In addition to the visualization files, this repository also includes a Python
script ([import_implan_data.py](/import_implan_data.py)) that processes the raw
IMPLAN output data files into a district-level file
([economic_impact_district_data.csv](/economic_impact_district_data.csv)) and a
state-level file
([economic_impact_state_data.csv](/economic_impact_state_data.csv)). The
district-level file is used directly by the district-level visualization, and
the state-level file is used directly by the state-level visualization.

<br/>
## Description of Data Processing

There are six files containing raw IMPLAN output data:
* [dv_implan_outputs.csv](/dv_implan_outputs.csv)
* [eir_implan_outputs.csv](/eir_implan_outputs.csv)
* [idp_implan_outputs.csv](/idp_implan_outputs.csv)
* [lctm_implan_outputs.csv](/lctm_implan_outputs.csv)
* [oced_implan_outputs.csv](/oced_implan_outputs.csv)
* [reap_implan_outputs.csv](/reap_implan_outputs.csv)

With the exception of [oced_implan_outputs.csv](/oced_implan_outputs.csv), each
of these files contains the data for one program on the map: dv contains the
data for the Domestic Vehicles Grant Program, eir contains the data for the
Energy Infrastructure Reinvestment Program, idp contains the data for the
Industrial Demonstrations Program, lctm contains the data for the Low Carbon
Transportation Materials Program, and reap contains the data for the Rural
Energy for America Program.

The file [oced_implan_outputs.csv](/oced_implan_outputs.csv) contains the data
for three Office of Clean Energy Demonstrations programs: Carbon Management,
Clean Energy Demonstration on Current and Former Mine Land, and Long-Duration
Energy Storage Demonstrations.

All of the programs have results at the district level (and are shown on the
district-level version of the map) with the exception of the Energy
Infrastructure Reinvestment Program and the Low Carbon Transportation Materials
Program, which only have state-level results (and are shown only on the
state-level version of the map).

In addition, all of the programs have results at the project level (which can be
filtered on the map) with the exception of the Low Carbon Transportation
Materials Program and the Rural Energy for America Program, which only have
results at the program level (and project filtering is disabled for these
programs on the map).

As described above, the Python script
[import_implan_data.py](/import_implan_data.py) processes the raw IMPLAN output
data files into a district-level file
[economic_impact_district_data.csv](/economic_impact_district_data.csv) and a
state-level file
[economic_impact_state_data.csv](/economic_impact_state_data.csv), which are
used directly by the district- and state-level visualizations, respectively.

As part of this processing, the Python script makes use of three supplementary
crosswalk files:
* [dv_project_names.csv](/dv_project_names.csv)
* [idp_project_names.csv](/idp_project_names.csv)
* [oced_project_names.csv](/idp_project_names.csv)

These files are used to expand the truncated project names in the raw IMPLAN
outputs into full project names for display in the visualization. There are
no project name crosswalk files for the Low Carbon Transportation Materials
Program and the Rural Energy for America Program because (as described above)
these programs do not have results at the project level. There is no project
name crosswalk file for the Energy Infrastructure Reinvestment Program because
the project names are not truncated in the raw IMPLAN output data for that
program.

<br/>
## Description of Visualization Files

As mentioned above, the map visualization has three main parts: the container,
the district-level visualization, and the state-level visualization. Each of
these three parts has three associated files: an HTML file, a CSS file, and a
JavaScript file.

The files for the container are:
* [ira_visualization.html](/ira_visualization.html)
* [ira_visualization.css](/ira_visualization.css)
* [ira_visualization.js](/ira_visualization.js)

The files for the district-level visualization are:
* [ira_visualization_district.html](/ira_visualization_district.html)
* [ira_visualization_district.css](/ira_visualization_district.css)
* [ira_visualization_district.js](/ira_visualization_district.js)

The files for the state-level visualization are:
* [ira_visualization_state.html](/ira_visualization_state.html)
* [ira_visualization_state.css](/ira_visualization_state.css)
* [ira_visualization_state.js](/ira_visualization_state.js)

The container HTML file is embedded using an iframe within the C2ES webpage. The
container itself holds an iframe with a src property set initially to the
district-level visualization. This src property is changed dynamically if the
user clicks on the buttons at the top of the container.

The district- and state-level visualizations make use of two GeoJSON files:
* [congressional_districts_outlines.json](/congressional_districts_outlines.json)
* [states_outlines.json](/states_outlines.json)

These contain the district outlines and the state outlines for the
district-level and state-level visualizations, respectively. These GeoJSON files
are modified versions of the [Cartographic Boundary
Files](https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html)
available from the U.S. Census Bureau, with Alaska and Hawaii repositioned to be
adjacent to the contiguous United States.

To reduce download times, the data files used by the map visualizations do not
contain the full IMPLAN industry descriptions. The full descriptions are instead
merged into the data dynamically in JavaScript using the
[implan_industry_codes.csv](/implan_industry_codes.csv) crosswalk file.

In addition, the data files used by the map visualizations do not contain the
name of the agency that administers each program. This information is instead
merged into the data dynamically in JavaScript using the
[agency_program_crosswalk.csv](/agency_program_crosswalk.csv) file.
