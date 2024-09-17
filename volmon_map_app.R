library(sf)
library(dplyr)
library(lubridate)
library(tidyr)
library(mapview)

setwd("C:/Users/edwardsch/Documents/GitHub/Volmon-Map-App/data")

#boundary portion

ct_boundary <- read_sf(dsn = ".", layer = "cb_2022_us_state_500k") # can now delete the shapefiles
ct_boundary <- subset(ct_boundary, ct_boundary $STATEFP == "09") 

mapview(ct_boundary) #check it looks right

st_write(ct_boundary, "ct_boundary.geojson", driver = "GeoJSON") # export as geojson!

#RBV results portion
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

RBV_pre_pivot <- RBV_formatted %>%
  group_by(MonitoringLocationIdentifier.x, Year) %>%
  summarize(MaxMetricScore = max(MetricValueMeasure.MetricScoreNumeric, na.rm = TRUE), .groups = 'drop') # drop non unique combos

RBV_pre_pivot <- RBV_pre_pivot[c("MonitoringLocationIdentifier.x", "Year", "MaxMetricScore")]

RBV_pivot <- RBV_pre_pivot %>%
  pivot_wider(
    names_from = Year,    
    names_prefix = "Year_", #to make identifying them easier
    values_from = MaxMetricScore)

RBV_pivot <- RBV_pivot %>%
  rowwise() %>%
  mutate(MaxScore = max(c_across(starts_with("Year_")), na.rm = TRUE)) %>%
  ungroup() # max score used for symbology

colnames(RBV_pivot)

colnames(RBV_pivot)[colnames(RBV_pivot) == 'MonitoringLocationIdentifier.x'] <- 'MonitoringLocationIdentifier'

RBV_pivot <- merge(RBV_pivot, RBVstations, by = "MonitoringLocationIdentifier")

RBV_pivot <- RBV_pivot[c("MonitoringLocationIdentifier", "MonitoringLocationName", "LatitudeMeasure", "LongitudeMeasure", 
                         "Year_1999", "Year_2000",
                         "Year_2001", "Year_2002", "Year_2003", "Year_2004",
                         "Year_2005", "Year_2006", "Year_2007", "Year_2008", 
                         "Year_2009", "Year_2010", "Year_2011", "Year_2012",
                         "Year_2013", "Year_2014", "Year_2015", "Year_2016",
                         "Year_2017", "Year_2018", "Year_2019", "Year_2020",
                         "Year_2021", "Year_2022", "Year_2023", "MaxScore")]

RBV_sf <- RBV_pivot %>%
  st_as_sf(coords = c("LongitudeMeasure", "LatitudeMeasure"), crs = 4326)
st_write(RBV_sf, "RBVmetrics.geojson", driver = "GeoJSON") # export as geojson!
