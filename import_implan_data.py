import pandas as pd

# Import the IMPLAN modeling outputs
data = pd.read_csv('idp_implan_outputs.csv')

# Rename the region, event, industry code, industry description,
# output, and employment columns in-place
data.rename(columns={"DestinationRegion": "region",
                     "ProjectName": "program_project",
                     "IndustryCode": "industry_code",
                     "IndustryDescription": "industry_desc",
                     "Output": "output",
                     "Employment": "employment"},
            inplace=True)

# Split the program_project column into two new columns based
# on the underscore separator
data[["program",
      "project"]] = data["program_project"].str.split('_', n=1, expand=True)

# Extract the state name from region column
data['state'] = data['region'].str.extract(r'\((.+)\s')
data['state'] = data['state'].str.split().str[0]

# Extract the congressional district number from the region column
data['district'] = data['region'].str.extract(r'-(.*)\s')
data['district'] = data['district'].str.split().str[0]

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
