## CT DEEP Voluteer Monitoring Program Mapping Application

https://ctdeepwatermonitoring.github.io/Volmon-Map-App/

## Chloe's Mapping Development Overview

## Overview

In my role with the Connecticut Department of Energy and Environmental Protection, I coordinate our [Volunteer Water Monitorin Program](https://portal.ct.gov/deep/water/inland-water-monitoring/volunteer-water-monitoring-program).

For my final project, I will be re-creating an existing ArcGIS Online Map Series: [CT Volunteer Water Monitoring Program Map Series](https://ctdeep.maps.arcgis.com/apps/MapSeries/index.html?appid=9265f117579546678b70ff9dbd6d0854). The current map series serves as both a decision-making tool and a report of all the hard work that our volunteers do within this program. ArcGIS Online is pretty tedious to use and the current map series is difficult to update as it was built in a now-deprecated version of Story Maps. Coding the map series from scratch will largely future-proof the mapping application and allow me to streamline the data visualization process.

As my main programming background is with [Program R](https://www.r-project.org/), I will be doing most of my data processing/manipulation within R instead of Javascript. 

## Table of Contents
<!-- TOC -->

- [Lesson 06: Project proposal](#map-673-final-project-proposal)
    - [Overview](#overview)
    - [Table of Contents](#table-of-contents)
    - [Project proposal](#project-proposal)
        - [1. Data source](#1-data-source)
        - [2. Topic and geographic phenomena your map will explore](#2-topic-and-geographic-phenomena-your-map-will-explore)
        - [3. Map objectives and user needs](#3-map-objectives-and-user-needs)
        - [4. Anticipating your technology stack](#4-anticipating-your-technology-stack)
        - [5. First digital version of your mockup](#5-first-digital-version-of-your-mockup)
        - [Project README.md](#project-readmemd)
    - [Deliverable](#deliverable)

<!-- /TOC -->

## Project proposal 

The overall goal of this project is to:

1. Create an R script to retrieve almost all data programmatically from the [Water Quality Portal](https://www.waterqualitydata.us/) (WQP). You can do a direct `read.csv()` from WQP queries into R, and the structure of the query URL makes it easy to incorporate into loops and integrate into other data streamlining processes.

2. Within R, manipulate those tables into a format suitable for mapping, and export them as a GeoJSON. While I will have to run the separate R script to re-create my spatial layers when new data is available in the WQP, I am also the person responsible for updating said data, so it will be easy to incorporate into my overall data management flow.

3. Load a few additional shapefiles into R and export them as GeoJSONs - namely, the layer for regulatory stream/river assessments and some watershed layers based upon previous studies conducted by my group.

4. Create a mapping application that allows the user to seamlessly toggle between layers associated with the three primary volunteer water monitoring programs: the Riffle Bioassessment by Volunteers (RBV) Program, the Volunteer Stream Temperature Monitoring (V-STeM) Network, and CT Lake Watch.

5. Build out additional tools to enable users to locate waterbodies/sites and data associated with them - for example, being able to search on site ID/monitoring location name and zoom to that location, and including links to the direct WQP download or other data downloads in the tooltip. In addition to serving as a visual representation of the data we have received from these programs, I also want it to be a way for people to dig in deeper and get even more specific results not included on the map. 


### 1. Data source

The primary source of data is the [Water Quality Portal](https://www.waterqualitydata.us/). This is an online relational database created and supported by the US EPA. In my role, I have created many R scripts to streamline both the upload of data to the portal and building out tools/analysis from querying data out of the portal. As an example, [this](https://www.waterqualitydata.us/data/ActivityMetric/search?project=CT-VOLMON-RBV&mimeType=csv&zip=no&providers=NWIS&providers=STORET) query returns a CSV with some of the results associated with the RBV program (essentially, a count of benthic macroinvertebrate taxa that are highly sensitive to pollution found at a particular site). 

Since WQP data always has a spatial component, reading it into R and turning it into a GeoJSON is fairly straightforward with the use of some handy R packages (like Javascript libraries):

```R
library(dplyr) # for data manipulation
library(sf) # for working with spatial data

ctlw <- read.csv("https://www.waterqualitydata.us/data/Station/search?project=CTLakeWatch&project=Connecticut%20Lake%20Watch&mimeType=csv&zip=no&providers=NWIS&providers=STORET") # read in WQP data
ctlw <- ctlw[!duplicated(ctlw[c("MonitoringLocationName")]), ] # two different data sources (projects) so this is the important identifier
ctlw <- ctlw[c("MonitoringLocationName", "MonitoringLocationIdentifier", "LatitudeMeasure",
               "LongitudeMeasure")] # no result info/site category as i have the data stored in separate reports 
ctlw_sf <- ctlw %>%
  st_as_sf(coords = c("LongitudeMeasure", "LatitudeMeasure"), crs = 4326) # identify the spatial columns
st_write(ctlw_sf , "CTLWsites.geojson", driver = "GeoJSON") # export as geojson!
```

The GeoJSON can then be loaded into our Javascript code!

### 2. Topic and geographic phenomena your map will explore

This mapping application will explore the data associated with each of our three primary volunteer water monitoringr programs:

1. The Riffle Bioassessment by Volunteers (RBV) Program:

    * RBV sites, categorized by result (4 or more "most wanted" taxa found), or < 3 most wanted taxa found. The "4 or more" rule allows us to make regulatory assessments of stream quality at that site.
    * High priority watersheds for RBV - essentially, where we want people to sample.
    * The assessed streams layer, categorized by Aquatic Life Use Support (ALUS) - we don't want folks to sample on streams that have been assessed to be impaired (i.e. "Not Supporting Full Aquatic Life Use") and do want folks to either help us generate new assessments of full support or provide data to support the continuation of a full support assessment.

2. The Volunteer Stream Temperature Monitoring (V-STeM) Network:

    * VSTeM sites, categorized by result (confirmed coldwater site, or confirmed cool/warmwater site). The focus of this program is to support our coldwater habitat mapping efforts. 
    * The assessed streams layer, but not categorized as coldwater habitat is not a regulatory designation.
    * Predicted coldwater habitat - this helps volunteers target where to put a temperature probe.

3. CT Lake Watch

    * CT Lake Watch sites, but not categorized. This is our newest program and we haven't yet decided how we will fully present/categorize the sites. One thing I have already created is a few R scripts to generate HTML reports for each site that summarize some of the data people collect (e.g. Secchi disk depth), so I will link to those reports on the site popup so people can explore the data further. We are also in the process of building out a much larger mapping application for all of our lake data, so this layer can stay fairly lightweight and targeted exclusively towards volunteer results.


### 3. Map objectives and user needs

* Why does the map need to be made? Consider your position to the mapping project. Why are you the one to be designing it?

    This map needs to be made so that I don't have to wrestle with ArcGIS Online anymore! But more importantly, it's part of our continued efforts to automate every single data management/analysis/visualization/reporting process that we can. We are a very small group and collect a lot of data, so time is our most limited resource. Automating the management of everything allows us to continue to expand our monitoring capacity when we are unable to add new staff members.

* What type of user do you expect to use this map and what needs do you anticipate they will have? 

    We have two main types of volunteers: local professional (e.g. in watershed groups) who run their own programs and additionally give us data for free, and our "true" volunteers who are mainly citizen scientists, who may or may not have a strong science background. The RBV and vSTeM map components are mainly targeted towards our professional volunteers and are therefore more intensely data/jargon/science-heavy, but that is necessary so they can use the maps as a decision-making tool when they are planning out their own sampling. 
    
    The CT Lake Watch program has more "true" volunteers, and therefore that mapping component will mainly serve as a way to simply demonstrate where monitoring is or has been done, in addition to a way to navigate to [reports](https://ctdeepwatermonitoring.github.io/ctlakewatch/) built per-lake that hold data in a more digestible format. 

### 4. Anticipating your technology stack

* A description of the data and information processing tools used, e.g., QGIS, [MapShaper](http://www.mapshaper.org/), ArcGIS Pro, etc.

    I am using program R along with Javascript.

* The format you'll use to store your data, e.g., flat files such as CSV, GeoJSON, or dynamically from an API.

    Most data is read in from the WQP and turned into a GeoJSON in R. A handful of other layers are read in as shapefiles and exported as GeoJSONs. 

* The JS libraries you anticipate using or need like Leaflet, omnivore, Papa Parse, etc.

    I will be using Leaflet in my Javascript code. In R, I am using sf (simple features) for handling spatial data, dplyr for data manipulation, lubridate for handling datetimes easier, and mapview for quickly visualizing spatial data in R to confirm my GeoJSON exports look right.

### 5. First digital version of your mockup

Since this is a work project in addition to a school project, I have an [existing beta version](https://c-edwards-eco.github.io/Volmon-Map-App/) of my map that I am continuously refining/adding on to per my project goals.


