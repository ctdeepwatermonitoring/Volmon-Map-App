library(sf)
library(dplyr)
library(lubridate)
library(tidyr)
library(mapview)

setwd("C:/Users/edwardsch/Documents/GitHub/Volmon-Map-App/data") #work
setwd("C:/Users/flizo/Documents/nmp/map673/Volmon-Map-App/data") #personal

#boundary portion

ct_boundary <- read_sf(dsn = ".", layer = "cb_2022_us_state_500k") # can now delete the shapefiles
ct_boundary <- subset(ct_boundary, ct_boundary $STATEFP == "09") 

mapview(ct_boundary) #check it looks right

st_write(ct_boundary, "ct_boundary.geojson", driver = "GeoJSON") # export as geojson!

############RBV data############################################################

RBV <- read.csv("https://www.waterqualitydata.us/data/ActivityMetric/search?project=CT-VOLMON-RBV&mimeType=csv&zip=no&providers=NWIS&providers=STORET")
RBVstations <- read.csv("https://www.waterqualitydata.us/data/Station/search?project=CT-VOLMON-RBV&mimeType=csv&zip=no&providers=NWIS&providers=STORET")
RBVactivity <- read.csv("https://www.waterqualitydata.us/data/Activity/search?project=CT-VOLMON-RBV&mimeType=csv&zip=no&dataProfile=activityAll&providers=NWIS&providers=STORET")
RBV <- merge(RBV, RBVstations, by = "MonitoringLocationIdentifier") #add geospatial info
RBV <- merge(RBV, RBVactivity, by = "ActivityIdentifier")
RBV$ActivityStartDate <- as.Date(RBV$ActivityStartDate)
RBV$Year <- year(RBV$ActivityStartDate)
colnames(RBV)
RBV_formatted <- RBV[c("MonitoringLocationIdentifier.x", "MonitoringLocationName", "LatitudeMeasure", 
             "LongitudeMeasure", "MetricValueMeasure.MetricScoreNumeric", "Year")]

RBV_location <- RBV[c("MonitoringLocationIdentifier.x", "MonitoringLocationName", "LatitudeMeasure", 
                      "LongitudeMeasure")]
RBV_location <- RBV_location[!duplicated(RBV_location[c("MonitoringLocationIdentifier.x")]), ]


# max score and year
RBV_max <- RBV_formatted %>%
  group_by(MonitoringLocationIdentifier.x) %>%
  summarize(MaxScore = max(MetricValueMeasure.MetricScoreNumeric, na.rm = TRUE), .groups = 'drop') %>%
  inner_join(RBV_formatted, by = c("MonitoringLocationIdentifier.x", "MaxScore" = "MetricValueMeasure.MetricScoreNumeric")) %>%
  select(MonitoringLocationIdentifier.x, Year, MaxScore) %>%
  arrange(MonitoringLocationIdentifier.x, Year)

RBV_max <- RBV_max[!duplicated(RBV_max[c("MonitoringLocationIdentifier.x", "MaxScore")]), ] # same max score across multiple years

# most recent score and year
RBV_recent <- RBV_formatted %>%
  group_by(MonitoringLocationIdentifier.x) %>%
  summarize(RecentYear = max(Year, na.rm = TRUE), .groups = 'drop') %>%
  inner_join(RBV_formatted, by = c("MonitoringLocationIdentifier.x", "RecentYear" = "Year")) %>%
  select(MonitoringLocationIdentifier.x, RecentYear, MetricValueMeasure.MetricScoreNumeric) %>%
  rename(RecentScore = MetricValueMeasure.MetricScoreNumeric) %>%
  arrange(MonitoringLocationIdentifier.x, RecentYear)

RBV_recent <- RBV_recent[!duplicated(RBV_recent[c("MonitoringLocationIdentifier.x", "RecentYear")]), ] #  same site in same year

#merging for final df
RBV_merged <- merge(RBV_max, RBV_recent, by = "MonitoringLocationIdentifier.x")
RBV_merged <- merge(RBV_merged, RBV_location, by = "MonitoringLocationIdentifier.x")

#renaming and formatting
colnames(RBV_merged)[colnames(RBV_merged) == 'MonitoringLocationIdentifier.x'] <- 'MonitoringLocationIdentifier'
RBV_merged$MonitoringLocationIdentifier <- gsub("CTVOLMON-", "", RBV_merged$MonitoringLocationIdentifier) #wqp adds that in
colnames(RBV_merged)[colnames(RBV_merged) == 'Year'] <- 'MaxScoreYear'
RBV_merged <- RBV_merged[c("MonitoringLocationIdentifier", "MonitoringLocationName", "LatitudeMeasure", 
                       "LongitudeMeasure", "MaxScore", "MaxScoreYear", "RecentScore", "RecentYear")]



# RBV_recent <- RBV_formatted %>%
#   group_by(MonitoringLocationIdentifier.x) %>%
#   filter(Year == max(Year)) %>%
#   summarize(RecentScore = MetricValueMeasure.MetricScoreNumeric,
#             RecentScoreYear = Year,
#             .groups = 'drop')
# 
# RBV_pre_pivot <- RBV_formatted %>%
#   group_by(MonitoringLocationIdentifier.x, Year) %>%
#   summarize(MaxMetricScore = max(MetricValueMeasure.MetricScoreNumeric, na.rm = TRUE), .groups = 'drop') # drop non unique combos
# 
# RBV_pre_pivot <- RBV_pre_pivot[c("MonitoringLocationIdentifier.x", "Year", "MaxMetricScore")]
# 
# RBV_pivot <- RBV_pre_pivot %>%
#   pivot_wider(
#     names_from = Year,    
#     names_prefix = "Year_", #to make identifying them easier
#     values_from = MaxMetricScore)
# 
# RBV_pivot <- RBV_pivot %>%
#   rowwise() %>%
#   mutate(
#     MaxScore = max(c_across(starts_with("Year_")), na.rm = TRUE),
#     MaxScoreYear = names(.)[which.max(c_across(starts_with("Year_")))]
#   ) %>%
#   ungroup() # max score used for symbology
# 
# 
# colnames(RBV_pivot)
# 
# colnames(RBV_pivot)[colnames(RBV_pivot) == 'MonitoringLocationIdentifier.x'] <- 'MonitoringLocationIdentifier'
# 
# RBV_pivot <- merge(RBV_pivot, RBVstations, by = "MonitoringLocationIdentifier")
# 
# RBV_pivot <- RBV_pivot[c("MonitoringLocationIdentifier", "MonitoringLocationName", "LatitudeMeasure", "LongitudeMeasure", 
#                          "Year_1999", "Year_2000",
#                          "Year_2001", "Year_2002", "Year_2003", "Year_2004",
#                          "Year_2005", "Year_2006", "Year_2007", "Year_2008", 
#                          "Year_2009", "Year_2010", "Year_2011", "Year_2012",
#                          "Year_2013", "Year_2014", "Year_2015", "Year_2016",
#                          "Year_2017", "Year_2018", "Year_2019", "Year_2020",
                         # "Year_2021", "Year_2022", "Year_2023", "MaxScore")]

RBV_sf <- RBV_merged %>%
  st_as_sf(coords = c("LongitudeMeasure", "LatitudeMeasure"), crs = 4326)
st_write(RBV_sf, "RBVmetrics.geojson", driver = "GeoJSON") # export as geojson!

#rbv high priority watersheds layer
rbv_watersheds <- read_sf(dsn = ".", layer = "NHDCatchments_ModMMI_75andHigher") # this is whats on the current arcgis map
st_write(rbv_watersheds, "rbv_watersheds.geojson", driver = "GeoJSON") # export as geojson!

#assessed river/stream layer
assessed_river <- read_sf(dsn = ".", layer = "CT_305b_Assessed_River_2022") # can now delete shapefile
mapview(assessed_river)
st_write(assessed_river, "assessed_river.geojson", driver = "GeoJSON") # export as geojson!

rivers <- st_read("assessed_river.geojson")

############vstem data##########################################################

vstem <- read.csv("https://www.waterqualitydata.us/data/Result/search?project=CT-VOLMON-VSTEM&mimeType=csv&zip=no&dataProfile=resultPhysChem&providers=NWIS&providers=STORET")
colnames(vstem)

vstem$numericclass <- NA
vstem$numericclass <- ifelse(vstem$ResultCommentText == "Summer Class = COLD", 1, vstem$numericclass)
vstem$numericclass <- ifelse(vstem$ResultCommentText == "COLD", 1, vstem$numericclass)
vstem$numericclass <- ifelse(vstem$ResultCommentText == "Summer Class = Cool", 2, vstem$numericclass)
vstem$numericclass <- ifelse(vstem$ResultCommentText == "Cool (Transitional)", 2, vstem$numericclass)
vstem$numericclass <- ifelse(vstem$ResultCommentText == "Summer Class = Cool", 2, vstem$numericclass)
vstem$numericclass <- ifelse(vstem$ResultCommentText == "Summer Class = WARM", 3, vstem$numericclass)
vstem$numericclass <- ifelse(vstem$ResultCommentText == "WARM", 3, vstem$numericclass)
vstem$numericclass <- as.numeric(vstem$numericclass)

vstem_classes <- vstem %>%
  group_by(MonitoringLocationIdentifier) %>%
  summarize(MinClassScore = min(numericclass, na.rm = TRUE)) #I want to have unique sites and keep the coolest class result

vstem_sites <- vstem[!duplicated(vstem[c("MonitoringLocationIdentifier")]), ]

vstem <- merge(vstem_sites, vstem_classes, by = "MonitoringLocationIdentifier")
vstem <- vstem[c("MonitoringLocationIdentifier", "MonitoringLocationName", 
                 "ActivityLocation.LatitudeMeasure",  "ActivityLocation.LongitudeMeasure", "MinClassScore")]
vstem$MonitoringLocationIdentifier <- gsub("CTVOLMON-", "", vstem$MonitoringLocationIdentifier) #wqp adds that in

vstem_sf <- vstem %>%
  st_as_sf(coords = c("ActivityLocation.LongitudeMeasure", "ActivityLocation.LatitudeMeasure"), crs = 4326)
st_write(vstem_sf , "VSTeMclasses.geojson", driver = "GeoJSON") # export as geojson!

############ct lake watch data##########################################################

ctlw <- read.csv("https://www.waterqualitydata.us/data/Station/search?project=CTLakeWatch&project=Connecticut%20Lake%20Watch&mimeType=csv&zip=no&providers=NWIS&providers=STORET")
ctlw <- ctlw[!duplicated(ctlw[c("MonitoringLocationName")]), ] # different data source so this is the important identifier
ctlw <- ctlw[c("MonitoringLocationName", "MonitoringLocationIdentifier", "LatitudeMeasure",
               "LongitudeMeasure")] # no result info/site category (for now!)
ctlw_sf <- ctlw %>%
  st_as_sf(coords = c("LongitudeMeasure", "LatitudeMeasure"), crs = 4326)
st_write(ctlw_sf , "CTLWsites.geojson", driver = "GeoJSON") # export as geojson!
  
  
  