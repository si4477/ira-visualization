# Import pandas
import pandas as pd

# Import the IMPLAN IDP modeling outputs
idp_data = pd.read_csv('idp_implan_outputs.csv')

# Import the IMPLAN DV modeling outputs
dv_data = pd.read_csv('dv_implan_outputs.csv')

# Import the IMPLAN OCED modeling outputs (which contains data for
# three different programs; see below)
oced_data = pd.read_csv('oced_implan_outputs.csv')

# Create the dataset by concatenating the IDP, DV, and OCED
# modeling outputs together
data = pd.concat([idp_data, dv_data, oced_data], ignore_index = True)

# Delete the idp_data, dv_data, and oced_data variables because
# they are no longer needed
del idp_data, dv_data, oced_data

# Rename the region, program/project, industry code, industry description,
# output, and employment columns in-place
data.rename(columns={"DestinationRegion": "region",
                     "ProjectName": "program_project",
                     "IndustryCode": "industry_code",
                     "IndustryDescription": "industry_desc",
                     "Output": "output",
                     "Employment": "employment"},
            inplace=True)

# Split the program_project column into two new columns based
# on the underscore separator (call the project column
# "project_truncated" because these are truncated project
# names; the full project names will be merged in below)
data[["program",
      "project_truncated"]] = data["program_project"].str.split('_', n=1, expand=True)

# For the OCED programs ('Long-DurationEnergy', 'CleanEnergy', and
# 'CarbonManagement'), modify the "project_truncated" column to ignore
# the leading text "Assembly_" and anything after (and including) the
# next underscore character
data.loc[data['program'].isin(['Long-DurationEnergy', 'CleanEnergy', 'CarbonManagement']), 'project_truncated'] = data['project_truncated'].str.extract(r'(Assembly_)([^_]+)(_)')[1]

# Replace the program acronyms with the full program names
data.loc[data['program'] == "IDP", 'program'] = "Industrial Demonstrations Program"
data.loc[data['program'] == "dv", 'program'] = "Domestic Vehicles Grant Program"
data.loc[data['program'] == "Long-DurationEnergy", 'program'] = "Long-Duration Energy Storage Demonstrations"
data.loc[data['program'] == "CleanEnergy", 'program'] = "Clean Energy Demonstration on Current and Former Mine Land"
data.loc[data['program'] == "CarbonManagement", 'program'] = "Carbon Management"

# Import the IDP project names crosswalk
idp_names = pd.read_csv('idp_project_names.csv')

# Import the DV project names crosswalk
dv_names = pd.read_csv('dv_project_names.csv')

# Create a full names crosswalk by concatenating
# the two crosswalks together
names_data = pd.concat([idp_names, dv_names], ignore_index = True)

# Delete the idp_names and dv_names variables because
# they are no longer needed
del idp_names, dv_names

# Merge the full project names into the dataset (projects that
# do not have a match in the crosswalk data will have values
# of NaN for the merged columns)
data = data.merge(names_data, how='left', left_on='project_truncated', right_on='truncated_name')

# Delete the full crosswalk because it is no longer needed
del names_data

# Create a "project" column that has the full name if one has been
# merged and has the truncated name otherwise
data['project'] = ""
data.loc[~data['full_name'].isna(), 'project'] = data['full_name']
data.loc[data['full_name'].isna(), 'project'] = data['project_truncated']

# Extract the state name from region column; do this by first taking
# the substring of the region column after the open parenthesis; if
# the first word of this substring is New, North, Rhode, South, or
# West, set the state name to be the first two words of the substring
# separated by a space; otherwise, set the state name to be the first
# word of the substring only
data['state'] = data['region'].str.extract(r'\((.+)\s')
values_to_match = ['New', 'North', 'Rhode', 'South', 'West']
data.loc[data['state'].str.split().str[0].isin(values_to_match), 'state'] = data['state'].str.split().str[0] + ' ' + data['state'].str.split().str[1]
data.loc[~data['state'].str.split().str[0].isin(values_to_match), 'state'] = data['state'].str.split().str[0]

# Delete the values_to_match variable because it is no longer needed
del values_to_match

# Extract the congressional district number from the region column
data['district'] = data['region'].str.extract(r'-(.*)\s')
data['district'] = data['district'].str.split().str[0]

# For the seven states that have only one congressional district,
# replace the district number "01" with "00" to match the
# district-level geojson data
one_district_states = ['Alaska',
                       'Delaware',
                       'Montana',
                       'North Dakota',
                       'South Dakota',
                       'Vermont',
                       'Wyoming']
data.loc[data['state'].isin(one_district_states), 'district'] = "00"
del one_district_states

# Keep only the columns needed for the visualization
data = data[["program",
             "project",
             "state",
             "district",
             "industry_code",
             "industry_desc",
             "output",
             "employment"]]

# Group rows by the combination of program, project, region,
# and industry, and then sum the output and employment columns
# within those groups (this sums over direct, indirect, and
# induced impacts as reflected by the ImpactType column; that
# column was deleted above)
# data = data.groupby(["program",
#                      "project",
#                      "region",
#                      "industry_code",
#                      "industry_desc"]).agg({'output':'sum',
#                                             'employment':'sum'}).reset_index()

# Round the output and employment columns to 4 decimal places
data['output'] = pd.to_numeric(data['output'].str.replace(',','')).round(4)
data['employment'] = pd.to_numeric(data['employment'].str.replace(',','')).round(4)

# Create a new set of rows with the output and employment columns
# summed by region; for these rows, set the program, project,
# industry code, and industry description to "All"
# state_sum = data.groupby(["region"]).agg({'output':'sum', 'employment':'sum'}).reset_index()
# state_sum["program"] = "All"
# state_sum["project"] = "All"
# state_sum["industry_code"] = "All"
# state_sum["industry_desc"] = "All"

# Concatenate the original data with the new rows
# data = pd.concat([data, state_sum])

# Write the results to a .csv file
data.to_csv("economic_impact_data.csv", index=False)
