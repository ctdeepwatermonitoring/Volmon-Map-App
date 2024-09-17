library(sf)
library(dplyr)
library(mapview)

setwd("C:/Users/edwardsch/Documents/GitHub/Volmon-Map-App/data")

ct_boundary <- read_sf(dsn = ".", layer = "cb_2022_us_state_500k")
ct_boundary <- subset(ct_boundary, ct_boundary $STATEFP == "09") 

mapview(ct_boundary)

st_write(ct_boundary, "ct_boundary.geojson", driver = "GeoJSON") # export as geojson!
