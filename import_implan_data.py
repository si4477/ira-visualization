# Import pandas
import pandas as pd

# Specify thresholds for employment and output; rows in the
# final dataset that have values less than these will be
# collapsed into an "Other" industry (see below)
employment_threshold = 10
output_threshold = 100

# Define a helper function to determine if a floating point
# number is within a small tolerance of zero
def is_zero(x, tolerance=1e-8):
    return abs(x) < tolerance



#
# Create the district-level dataset
#

# Import the IMPLAN IDP modeling outputs
idp_data = pd.read_csv('idp_implan_outputs.csv')

# Import the IMPLAN DV modeling outputs
dv_data = pd.read_csv('dv_implan_outputs.csv')

# Import the IMPLAN OCED modeling outputs (which contains data for
# three different programs; see below)
oced_data = pd.read_csv('oced_implan_outputs.csv')

# Import the IMPLAN REAP modeling outputs
reap_data = pd.read_csv('reap_implan_outputs.csv')

# Delete any rows in the REAP data that have "Wisconsin (2023)"
# in the DestinationRegion column
reap_data = reap_data[reap_data['DestinationRegion'] != "Wisconsin (2023)"]

# Change all values in the ProjectName column in the REAP data
# to be "REAP_", which will result in the program name being
# "REAP" and all project names being blank (the project name
# will be ignored in the visualization)
reap_data.loc[:, "ProjectName"] = "REAP_"

# Create a composite dataset by concatenating the IDP, DV,
# OCED, and REAP modeling outputs together
data = pd.concat([idp_data, dv_data, oced_data, reap_data], ignore_index = True)

# Delete the idp_data, dv_data, oced_data, and reap_data
# variables because they are no longer needed
del idp_data, dv_data, oced_data, reap_data

# Rename the region, program/project, industry code,
# output, and employment columns in-place
data.rename(columns={"DestinationRegion": "region",
                     "ProjectName": "program_project",
                     "IndustryCode": "industry_code",
                     "Output": "output",
                     "Employment": "employment"},
            inplace=True)

# Split the program_project column into two new columns based
# on the underscore separator (call the project column
# "project_truncated" because these are truncated project
# names; the full project names for some programs will
# be merged in below)
data[["program",
      "project_truncated"]] = data["program_project"].str.split('_', n=1, expand=True)

# For the OCED programs ('Long-DurationEnergy', 'CleanEnergy', and
# 'CarbonManagement'), modify the "project_truncated" column to ignore
# the leading text "Assembly_" and anything after (and including) the
# next underscore character
data.loc[data['program'].isin(['Long-DurationEnergy', 'CleanEnergy', 'CarbonManagement']), 'project_truncated'] = data['project_truncated'].str.extract(r'(Assembly_)([^_]+)(_)')[1]

# Replace the existing program acronyms or program names with
# consistent, lowercase acronyms to reduce the data file size;
# the program names will be listed out in full in the visualization
data.loc[data['program'] == "IDP", 'program'] = "idp"
data.loc[data['program'] == "dv", 'program'] = "dv"
data.loc[data['program'] == "Long-DurationEnergy", 'program'] = "ldes"
data.loc[data['program'] == "CleanEnergy", 'program'] = "ced"
data.loc[data['program'] == "CarbonManagement", 'program'] = "cm"
data.loc[data['program'] == "REAP", 'program'] = "reap"

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
# merged or has the truncated name otherwise
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

# For the six states that have only one congressional district,
# replace the district number "01" with "00" to match the
# district-level geojson data
one_district_states = ['Alaska',
                       'Delaware',
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
             "employment",
             "output"]]

# Round the employment and output columns to 4 decimal places (remove any
# commas prior to rounding, and before that, convert to string in case
# any program's modeling output had no commas, in which case the values
# will be numeric)
data['employment'] = pd.to_numeric(data['employment'].astype(str).str.replace(',','')).round(4)
data['output'] = pd.to_numeric(data['output'].astype(str).str.replace(',','')).round(4)

# Delete any rows where both the employment value and the output
# value are zero (to avoid issues related to floating point numbers,
# the calculation checks if the values are within a tolerance
# of zero)
data = data[~(data['employment'].apply(is_zero) & data['output'].apply(is_zero))]

# Extract any rows where the employment value is less than
# the threshold and the output value is also less than the
# threshold; remove these rows from the original dataset
data_threshold = data[(data['employment'] < employment_threshold) & (data['output'] < output_threshold)].copy()
data = data[(data['employment'] >= employment_threshold) | (data['output'] >= output_threshold)]

# Group the extracted rows by the combination of program,
# project, state, and district, and then sum the employment
# and output columns within those groups
data_threshold = data_threshold.groupby(["program",
                                         "project",
                                         "state",
                                         "district",]).agg({'output':'sum',
                                                            'employment':'sum'}).reset_index()

# These aggregated rows represent a newly created "Other"
# industry, which has code 999; add a column with that code
data_threshold['industry_code'] = "999"

# Concatenate the new rows with the original dataset
data = pd.concat([data, data_threshold], ignore_index=True)

# Delete the data_threshold variable because it is
# no longer needed
del data_threshold

# Sort by program, project, state, district, and industry code
data = data.sort_values(by=['program', 'project', 'state', 'district', 'industry_code'])

# Again round the employment and output columns to 4 decimal places
data['employment'] = data['employment'].round(4)
data['output'] = data['output'].round(4)

# Write the results to a .csv file
data.to_csv("economic_impact_district_data.csv", index=False)



#
# Create the state-level dataset
#

# Group the rows by the combination of program, project,
# state, and industry code, and then sum the employment
# and output columns within those groups
data = data.groupby(["program",
                     "project",
                     "state",
                     "industry_code"]).agg({'output':'sum',
                                            'employment':'sum'}).reset_index()

# Import the IMPLAN LCTM modeling outputs
lctm_data = pd.read_csv('lctm_implan_outputs.csv')

# Change all values in the ProjectName column in the LCTM data
# to be "lctm_", which will result in the program name being
# "lctm" and all project names being blank (the project name
# will be ignored in the visualization)
lctm_data.loc[:, "ProjectName"] = "lctm_"

# Rename the region, project, industry code,
# output, and employment columns in-place
lctm_data.rename(columns={"DestinationRegion": "state",
                          "ProjectName": "program_project",
                          "IndustryCode": "industry_code",
                          "Output": "output",
                          "Employment": "employment"},
                 inplace=True)

# Split the program_project column into two new columns based
# on the underscore separator
lctm_data[["program",
           "project"]] = lctm_data["program_project"].str.split('_', n=1, expand=True)

# Remove the text " (2023)" from the end of the state values
lctm_data.loc[:, 'state'] = lctm_data['state'].str[:-7]

# Rename the state "District of Columbia, DC" to
# "District of Columbia" so that it matches the
# state outlines data
lctm_data.loc[lctm_data['state'] == "District of Columbia, DC", 'state'] = "District of Columbia"

# Keep only the columns needed for the visualization
lctm_data = lctm_data[["program",
                       "project",
                       "state",
                       "industry_code",
                       "employment",
                       "output"]]

# Round the employment and output columns to 4 decimal places (remove any
# commas prior to rounding, and before that, convert to string in case
# any program's modeling output had no commas, in which case the values
# will be numeric)
lctm_data['employment'] = pd.to_numeric(lctm_data['employment'].astype(str).str.replace(',','')).round(4)
lctm_data['output'] = pd.to_numeric(lctm_data['output'].astype(str).str.replace(',','')).round(4)

# Delete any rows where both the employment value and the output
# value are zero (to avoid issues related to floating point numbers,
# the calculation checks if the values are within a tolerance
# of zero)
lctm_data = lctm_data[~(lctm_data['employment'].apply(is_zero) & lctm_data['output'].apply(is_zero))]

# Extract any rows where the employment value is less than
# the threshold and the output value is also less than the
# threshold; remove these rows from the original dataset
data_threshold = lctm_data[(lctm_data['employment'] < employment_threshold) & (lctm_data['output'] < output_threshold)].copy()
lctm_data = lctm_data[(lctm_data['employment'] >= employment_threshold) | (lctm_data['output'] >= output_threshold)]

# Group the extracted rows by the combination of program,
# project, and state, and then sum the employment
# and output columns within those groups
data_threshold = data_threshold.groupby(["program",
                                         "project",
                                         "state"]).agg({'output':'sum',
                                                        'employment':'sum'}).reset_index()

# These aggregated rows represent a newly created "Other"
# industry, which has code 999; add a column with that code
data_threshold['industry_code'] = "999"

# Concatenate the new rows with the original dataset
lctm_data = pd.concat([lctm_data, data_threshold], ignore_index=True)

# Delete the data_threshold variable because it is
# no longer needed
del data_threshold

# Concatenate the LCTM data with the original dataset
data = pd.concat([data, lctm_data], ignore_index=True)

# Delete the lctm_data variable because it is no longer needed
del lctm_data

# Sort by program, project, state, and industry code
data = data.sort_values(by=['program', 'project', 'state', 'industry_code'])

# Again round the employment and output columns to 4 decimal places
data['employment'] = data['employment'].round(4)
data['output'] = data['output'].round(4)

# Write the results to a .csv file
data.to_csv("economic_impact_state_data.csv", index=False)
