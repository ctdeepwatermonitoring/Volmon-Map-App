      // Add footer date
      setDate();

      // set global variables for header, map container, and footer
      const header = document.querySelector("header");
      const mapContainer = document.querySelector("#map");
      const footer = document.querySelector("footer");

      // set map height to fill window
      mapContainer.style.height =
        window.innerHeight - header.offsetHeight - footer.offsetHeight + "px";

      // initial Leaflet map options
      const options = {
        center: [41.53, -72.6736],
        zoom: 9.5,
        zoomSnap: 0.1,
        zoomControl: false,
        attributionControl: false,
      };

      // create Leaflet map and apply options
      const map = L.map("map", options);

      // request a basemap tile layer and add to the map
      const esriGray = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles © Esri — Esri, DeLorme, NAVTEQ",
          maxZoom: 16,
        }
      ).addTo(map);

      // add usgs topo base layer
      const usgsTopo = L.tileLayer(
        "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 16, // USGS Topo max zoom level
          attribution:
            'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>',
        }
      );

      // add base map layer control
      const baseLayers = {
        "Esri World Gray Canvas": esriGray,
        "USGS Topographic Map": usgsTopo,
      };

      L.control.layers(baseLayers, null, { position: "topleft" }).addTo(map);

      // add zoom control
      map.addControl(
        L.control.zoom({
          position: "bottomright",
        })
      );

      // fetch data.. data points from WQP, polys from internal data, river lines from integrated report
      // boundary first as it never changes
      fetch("data/ct_boundary.geojson") // if i add boundary last, it messes with the ability to mouse over RBV sites?
        .then(function (response) {
          // it just looks silly in the SE corner where the river line == the boundary
          return response.json(); // though there is an argument to be made that it should be easy to mouse over the river there still
        })
        .then(function (data) {
          setActiveTab("RBV"); // active by default
          drawRBVLegend(); // drawn by default
          drawBoundary(data); // function for each type of data
          // return a new fetch call and continue the chain
          return fetch("data/rbv_watersheds.geojson");
        })
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          RBVWS = drawRBVWS(data);
          RBVWS.addTo(map); // display by default
          // return a new fetch call and continue the chain
          return fetch("data/assessed_river.geojson");
        })
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          streams = drawStreams(data); // initial styling
          blueStreams = drawBlueStreams(data); // alt styling for vstem tab, not yet added to map
          streams.addTo(map);
          // return a new fetch call and continue the chain
          return fetch("data/RBVmetrics.geojson");
        })
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          RBVsites = drawRBV(data);
          RBVsites.addTo(map); // display by default
          // return a new fetch call and continue the chain
          return fetch("data/coldwatersites_us_drainage.geojson");
        })
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          CWWS = drawCWWS(data);
          // return a new fetch call and continue the chain
          return fetch("data/VSTeMclasses.geojson");
        })
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          VSTeMsites = drawVSTeM(data);
          // return a new fetch call and continue the chain
          return fetch("data/CTLWsites2.geojson");
        })
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          CTLWsites = drawCTLW(data);
        });

      // one function for each type of data since the structure is entirely different

      // boundary data - this never changes
      function drawBoundary(data) {
        const ctBoundary = L.geoJson(data, {
          style: function (feature) {
            return {
              color: "#000",
              weight: 2,
              fillOpacity: 0,
            };
          },
        }).addTo(map);
      }

      // rbv sites with color coding
      function drawRBV(data) {
        const RBVsites = L.geoJson(data, {
          pointToLayer: function (feature, latlng) {
            // either 4+ site or <4 site (ie assessment could be made, or no assessment decision)
            const maxScore = feature.properties.MaxScore;
            let color;
            let radius;
            if (maxScore >= 4) {
              color = "#FDB515";
              radius = 6;
            } else {
              color = "#0D2D6C";
              radius = 3.5;
            }

            return L.circleMarker(latlng, {
              radius: radius,
              fillColor: color,
              color: "black",
              weight: 1.5,
              opacity: 1,
              fillOpacity: 1,
            });
          },

          onEachFeature: function (feature, layer) {
            // tooltip params, refactored from the original format of each year being a column
            // i think this information drills down to what people actually reference
            // without forcing most data to be NA for most years
            const siteName = feature.properties.MonitoringLocationName;
            const siteID = feature.properties.MonitoringLocationIdentifier;
            const maxScore = feature.properties.MaxScore;
            const maxScoreYear = feature.properties.MaxScoreYear;
            const recentScore = feature.properties.RecentScore;
            const recentScoreYear = feature.properties.RecentYear;

            // info for decision-making (site selection).. now a popup so you can click the WQP link easier
            layer.bindPopup(
              `<b>Site Name:</b> ${siteName}<br>
            <b>Site ID:</b> ${siteID} <br>
          <b>Max result:</b> ${maxScore} most wanted in ${maxScoreYear}<br>
          <b>Most recent result:</b> ${recentScore} most wanted in ${recentScoreYear} <br>
          <a href = "https://www.waterqualitydata.us/data/ActivityMetric/search?siteid=CTVOLMON-${siteID}&project=CT-VOLMON-RBV&mimeType=csv&zip=no&providers=NWIS&providers=STORET">
            Download site data</a>`,
              {}
            );

            // mouse on/mouse off functionality to indicate something happens when you click
            const originalColor = layer.options.fillColor; // my original category dependent colors

            layer.on("mouseover", function () {
              // when you hover on a point
              let highlightColor;
              if (maxScore >= 4) {
                highlightColor = "#FFED46"; // lighter brand standard yellow
              } else {
                highlightColor = "#68CEF2"; // lighter brand standard blue
              }
              layer.setStyle({
                // change the fill color
                fillColor: highlightColor,
              });
            });

            layer.on("mouseout", function () {
              // put the fill color back to the original color
              layer.setStyle({
                fillColor: originalColor,
              });
            });
          },
        });
        return RBVsites; // return the RBVsites layer
      }

      //rbv high prio watersheds (watersheds with predicted MMI score >75, ie  predicted excellent water quality)
      function drawRBVWS(data) {
        const RBVWS = L.geoJson(data, {
          style: function (feature, latlng) {
            return (
              latlng,
              {
                fillColor: "#7eaf5d",
                color: "#7eaf5d",
                weight: 0,
                opacity: 0,
                fillOpacity: 0.8,
              }
            );
          },
        });
        return RBVWS; // return the RBVWS layer
      }

      function drawStreams(data) {
        const streams = L.geoJson(data, {
          style: function (feature) {
            let color;
            // for this layer, the color is dependent upon the assessment decision
            // i originally tried to have one drawStreams function work for both tabs with different styling for each tab but it got messy

            const assessment = feature.properties.CT2022_A_1; // ALUS (aquatic life use standard) assessment determination
            if (assessment === "Fully Supporting") {
              color = "#00AAE7"; // light blue for full support
            } else if (assessment === "Not Supporting") {
              color = "#c20d0d"; // red for not supporting (we don't want people to sample there)
            } else {
              color = "#595959"; // grey for non-assessed lines
            }
            return {
              color: color,
              weight: 2,
              opacity: 1,
            };
          },

          onEachFeature: function (feature, layer) {
            // tooltip params
            const segmentName = feature.properties.ASSESSME_1;
            const assessment = feature.properties.CT2022_A_1;

            // info for decision-making (site selection)
            // i hope the tooltip jargon (e.g. 'ALUS' is clearer with the updated legend)
            layer.bindTooltip(
              `<b>${segmentName}:</b> <br>
           ${assessment} Aquatic Life Use`,
              {}
            );
          },
        });
        return streams;
      }

      // arguably i could still try to find a way to make this one drawStreams function but this works fine
      function drawBlueStreams(data) {
        const blueStreams = L.geoJson(data, {
          style: function (feature) {
            return {
              color: "#0D2D6c",
              weight: 2,
              opacity: 1,
            };
          },
          onEachFeature: function (feature, layer) {
            // tooltip params
            const segmentName = feature.properties.ASSESSME_1;

            // info for decision-making (site selection)
            layer.bindTooltip(`<b>${segmentName}</b>`, {});
          },
        });
        return blueStreams;
      }

      // VSTeM sites with color coding
      function drawVSTeM(data) {
        const VSTeMsites = L.geoJson(data, {
          pointToLayer: function (feature, latlng) {
            // either cold or not cold site (we don't really care about cool vs warm distinction for this project)
            const minScore = feature.properties.MinClassScore;
            let color;
            let radius;
            if (minScore == 1) {
              // my coldwater site classification
              color = "#00AAE7";
              radius = 6;
            } else {
              // all other sites
              color = "black";
              radius = 3.5;
            }

            return L.circleMarker(latlng, {
              // trying to make this symbology distinct from RBV layer
              radius: radius,
              fillColor: color,
              color: "black",
              weight: 1.5,
              opacity: 1,
              fillOpacity: 1,
            });
          },

          onEachFeature: function (feature, layer) {
            // tooltip params
            const siteName = feature.properties.MonitoringLocationName;
            const siteID = feature.properties.MonitoringLocationIdentifier;
            const classScore = feature.properties.MinClassScore;

            // convert this to text (text names were normalized in R code)
            let classification;
            if (classScore === 1) {
              classification = "Cold";
            } else if (classScore === 2) {
              classification = "Cool";
            } else if (classScore === 3) {
              classification = "Warm";
            }

            // info for decision-making (site selection).. now also a popup for downloading data
            layer.bindPopup(
              `<b>Site Name:</b> ${siteName}<br>
            <b>Site ID:</b> ${siteID} <br>
          <b>Classification:</b> ${classification} <br>
          <a href = "https://www.waterqualitydata.us/data/Result/search?siteid=CTVOLMON-${siteID}&project=CT-VOLMON-VSTEM&mimeType=csv&zip=no&dataProfile=resultPhysChem&providers=NWIS&providers=STORET">
            Download site data</a>`,
              {}
            ); // you can see all classifications that have been made for a site here as some years will get different results
            // my R code "assesses" the site based upon their coolest result since that makes the most sense to me and it needs to make a decision as the year-by-year results could change
            // this is the same logic as RBV assessments (yellow circle/historically a star if it every got 4 or more MW taxa)

            const originalColor = layer.options.fillColor; // my original category dependent colors

            layer.on("mouseover", function () {
              // when you hover on a point
              let highlightColor;
              if (classScore === 1) {
                highlightColor = "#68CEF2"; // lighter brand standard blue
              } else {
                highlightColor = "#b0b0b0"; // grey
              }

              layer.setStyle({
                // change the fill color
                fillColor: highlightColor,
              });
            });

            layer.on("mouseout", function () {
              // put the fill color back to the original color
              layer.setStyle({
                fillColor: originalColor,
              });
            });
          },
        });
        return VSTeMsites;
      }

      // predicted coldwater habitat watersheds.. the vstem program seeks to confirm these as coldwater with actual logger data
      function drawCWWS(data) {
        const CWWS = L.geoJson(data, {
          style: function (feature, latlng) {
            return (
              latlng,
              {
                fillColor: "#68CEF2",
                color: "#68CEF2",
                weight: 0,
                opacity: 0,
                fillOpacity: 0.3,
              }
            );
          },
          onEachFeature: function (feature, layer) {
            layer.on("add", function () {
              layer.bringToBack();
            });
          },
        });
        return CWWS; // return the CWWS layer
      }

      // CTLW sites with static colors
      function drawCTLW(data) {
        const CTLWsites = L.geoJson(data, {
          pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
              // temp symbology to differentiate from rbv sites
              radius: 6,
              fillColor: "#23AE49",
              color: "black",
              weight: 2,
              opacity: 1,
              fillOpacity: 1,
            });
          },
          onEachFeature: function (feature, layer) {
            // tooltip params
            const siteName = feature.properties.MonitoringLocationName;
            const siteID   = feature.properties.ComID; // my R code now harmonizes this list of monitoring locations with the list
            // that i generated the lake watch reports from. it was semi manually created because the data was uploaded
            // sorta from two different databases that handle the relationship between site IDs and lakes differently
            // one of them is, in my opinion, objectively wrong in how it handles that so i have attempted to fix
            // that data relationship in a lookup table

            // these are popups so you can touch the link
            layer.bindPopup(
              `<b>${siteName}</b> <br>
          <a href = "https://ctdeepwatermonitoring.github.io/ctlakewatch/reports/${siteID}.html" target="_blank">View interactive report</a>`,
              {} // this is where the bulk of the information is stored/visualized, rather than via symbology or direct WQP download links
            ); // this program has more "true" volunteers ie citizen scientists instead of professionals, so we have tried to make the information digestible for them
            layer.on("mouseover", function () {
              this.setStyle({
                fillColor: "#9ECf7C", // trying to indicate something happens when you click on the point
                color: "black",
              });
            });

            layer.on("mouseout", function () {
              this.setStyle({
                fillColor: "#23AE49", // original color
                color: "black",
              });
            });
          },
        });
        return CTLWsites;
      }

      // reworking search feature to function with partial matches
      document.getElementById("search").addEventListener("input", function () {
        const searchValue = this.value.toLowerCase();
        const suggestions = document.getElementById("suggestions");

        suggestions.innerHTML = "";

        if (!searchValue) {
          suggestions.style.display = "none"; // hide if no input
          return;
        }

        // match sites based on active tab
        const filteredSites = filterSites(searchValue);
        if (filteredSites.length > 0) {
          suggestions.style.display = "block"; // show suggestions
          filteredSites.forEach(function (site) {
            const suggestionItem = document.createElement("div");
            suggestionItem.textContent = site.name; // display the original case name
            suggestionItem.onclick = function () {
              if (activeTab === "CTLW") {
                // for CTLW sites, zoom to the site using getLatLng()
                const latlng = site.layer.getLatLng();
                map.setView(latlng, 12); // 
                site.layer.openPopup(); // open the popup for the selected site
              } else {
                // for RBV or VSTeM sites, zoom to the layer bounds
                map.setView(site.layer.getBounds().getCenter(), 12);
                site.layer.openTooltip(); // open the tooltip 
              }

              suggestions.innerHTML = "";
              document.getElementById("search").value = site.name;
            };

            // change cursor on hover to show something happens
            suggestionItem.style.cursor = "pointer";

            suggestions.appendChild(suggestionItem);
          });
        } else {
          suggestions.style.display = "none"; // hide if no matching suggestions
        }
      });

      // filter sites based on active tab and search query
      function filterSites(query) {
        let relevantSites = []; // store sites

        if (activeTab === "RBV") {
          // filter only streams for RBV tab
          streams.eachLayer(function (layer) {
            const siteName = layer.feature.properties.ASSESSME_1 || "";
            const siteNameLower = siteName.toLowerCase();
            if (siteNameLower.includes(query)) {
              relevantSites.push({ name: siteName, layer: layer });
            }
          });
        } else if (activeTab === "VSTeM") {
          // filter only blueStreams for VSTeM tab
          blueStreams.eachLayer(function (layer) {
            const siteName = layer.feature.properties.ASSESSME_1 || "";
            const siteNameLower = siteName.toLowerCase();
            if (siteNameLower.includes(query)) {
              relevantSites.push({ name: siteName, layer: layer });
            }
          });
        } else if (activeTab === "CTLW") {
          // filter only CTLWsites for CTLW tab
          CTLWsites.eachLayer(function (layer) {
            const siteName =
              layer.feature.properties.MonitoringLocationName || "";
            const siteNameLower = siteName.toLowerCase();
            if (siteNameLower.includes(query)) {
              relevantSites.push({ name: siteName, layer: layer });
            }
          });
        }

        return relevantSites;
      }

      // creating legends

      function drawRBVLegend() {
        const legendDiv = document.getElementById("legend");
        legendDiv.innerHTML = `<h4>RBV Monitoring (1999 - 2024)</h4>
    <span style="color:#FDB515; font-size: 24px;">&#9679;</span> 4 or more most wanted<br>
    <span style="color:#0D2D6C; font-size: 24px;">&#9679;</span> 3 or less most wanted<br>
    <span style="color:#7eaf5d; font-size: 24px;">&#9632;</span> High priority watersheds<br>
    <br>
    <h4>2022 Assessed Rivers<br>(Aquatic Life Use)</h4>
    <span style="color:#00AAE7; font-size: 20px;"> ▬</span> Fully supporting aquatic life use<br>
    <span style="color:#c20d0d; font-size: 20px;"> ▬</span> Not supporting aquatic life use<br>
    <span style="color:#595959; font-size: 20px;"> ▬</span> Not assessed
    `;
      }

      function drawVSTeMLegend() {
        const legendDiv = document.getElementById("legend");
        legendDiv.innerHTML = `<h4>VSTeM Network</h4>
    <span style="color:#00AAE7; font-size: 24px;">&#9679;</span> Confirmed coldwater habitat<br>
    <span style="color:#000000; font-size: 24px;">&#9679;</span> Other monitored sites <br>
    <span style="color:#68CEF2; font-size: 24px;">&#9632;</span> Predicted coldwater habitat<br>
    <span style="color:#0D2D6C; font-size: 20px;">  ▬</span> Stream segment`;
      }

      function drawCTLWLegend() {
        const legendDiv = document.getElementById("legend");
        legendDiv.innerHTML = `<h4>CT Lake Watch Sites</h4>
    <span style="color:#23AE49; font-size: 24px;">&#9679;</span> Monitored lake/pond`;
      }

      // tab functionality, controlled separately for each tab
      // i am very interested in ways of making this more efficient, the way i wrote it is basically
      // just what makes sense in my brain

      // tab functionality: RBV
      document.querySelector("#RBV").addEventListener("click", function () {
        RBVWS.addTo(map);
        streams.addTo(map);
        RBVsites.addTo(map);
        drawRBVLegend();

        if (VSTeMsites) {
          map.removeLayer(VSTeMsites);
        }
        if (blueStreams) {
          map.removeLayer(blueStreams);
        }
        if (CWWS) {
          map.removeLayer(CWWS);
        }
        if (CTLWsites) {
          map.removeLayer(CTLWsites);
        }

        setActiveTab("RBV");
      });

      // tab functionality: VSTeM
      document.querySelector("#VSTeM").addEventListener("click", function () {
        CWWS.addTo(map);
        blueStreams.addTo(map);
        VSTeMsites.addTo(map);
        drawVSTeMLegend();

        if (RBVsites) {
          map.removeLayer(RBVsites);
        }
        if (RBVWS) {
          map.removeLayer(RBVWS);
        }
        if (streams) {
          map.removeLayer(streams);
        }
        if (CTLWsites) {
          map.removeLayer(CTLWsites);
        }

        setActiveTab("VSTeM");
      });

      // tab functionality: CTLW
      document.querySelector("#CTLW").addEventListener("click", function () {
        CTLWsites.addTo(map);
        drawCTLWLegend();

        if (RBVsites) {
          map.removeLayer(RBVsites);
        }
        if (RBVWS) {
          map.removeLayer(RBVWS);
        }
        if (streams) {
          map.removeLayer(streams);
        }
        if (VSTeMsites) {
          map.removeLayer(VSTeMsites);
        }
        if (blueStreams) {
          map.removeLayer(blueStreams);
        }
        if (CWWS) {
          map.removeLayer(CWWS);
        }
        setActiveTab("CTLW");
      });

      // Update active tab and trigger any necessary changes
      function setActiveTab(tabID) {
        // grab all tabs
        const tabs = document.querySelectorAll(".tab");
        // remove active class so only selected tab is active
        tabs.forEach((tab) => {
          tab.classList.remove("active");
        });
        // add active class
        const activeTabElement = document.querySelector(`#${tabID}`);
        if (activeTabElement) {
          activeTabElement.classList.add("active");
        }

        activeTab = tabID; // Store the active tab for reference in the search function
      }

      // footer content
      function setDate() {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.toLocaleString("default", {
          month: "long",
        });
        const footerText = document.querySelector("footer p");
        footerText.innerHTML = `<b>${month}, ${year} | CT DEEP Water Monitoring & Assessment</b>`;
      }