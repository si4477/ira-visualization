import pandas as pd

# Import the IMPLAN modeling outputs
data = pd.read_csv('IRA Funding Tracker - Test Run Outputs.csv')

# Rename the region, event, industry code, industry description,
# output, and employment columns in-place
data.rename(columns={"DestinationRegion": "region",
                     "EventName": "event",
                     "IndustryCode": "industry_code",
                     "IndustryDescription": "industry_desc",
                     "Output": "output",
                     "Employment": "employment"},
            inplace=True)

# Split the event column into three new columns based
# on the underscore separator
data[["program",
      "project",
      "implan_code"]] = data["event"].str.split('_', n=2, expand=True)

# Keep only the columns needed for the visualization
data = data[["program",
             "project",
             "region",
             "industry_code",
             "industry_desc",
             "output",
             "employment"]]

# Group rows by the combination of program, project, region,
# and industry, and then sum the output and employment columns
# within those groups (this sums over direct, indirect, and
# induced impacts as reflected by the ImpactType column; that
# column was deleted above)
data = data.groupby(["program",
                     "project",
                     "region",
                     "industry_code",
                     "industry_desc"]).agg({'output':'sum',
                                            'employment':'sum'}).reset_index()

# Round output and employment columns to 4 decimal places
data['output'] = data['output'].round(4)
data['employment'] = data['employment'].round(4)

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
