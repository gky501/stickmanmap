const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRT3JGBij77BOpqbD-TL_4kQ14EU3ohZPJ-U1b0F1ZIt6_w4JFga58GAhse25tdaFEq6s1LGBtKdLK2/pub?gid=926950107&single=true&output=csv";

    const STATION_1 = {
      name: "Station 1",
      lat: 34.74355136625181,
      lng: -92.2843560208963
    };

    const map = L.map("photoMap", {
      scrollWheelZoom: true
    }).setView([34.7465, -92.2896], 10);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 20,
      attribution: "© OpenStreetMap © CARTO"
    }).addTo(map);

    const markerLayer = L.layerGroup().addTo(map);
    const markers = [];

    const photoList = document.getElementById("photoList");
    const photoCount = document.getElementById("photoCount");
    const lastUpdated = document.getElementById("lastUpdated");
    const farthestPhoto = document.getElementById("farthestPhoto");

    photoList.innerHTML = `<div class="loading-message">Loading approved photo submissions...</div>`;

    function clean(value) {
      return value ? String(value).trim() : "";
    }

    function escapeHtml(value) {
      return clean(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function getField(row, fieldName) {
      const key = Object.keys(row).find(
        k => k.trim().toLowerCase() === fieldName.toLowerCase()
      );
      return key ? row[key] : "";
    }

    function firstPhotoUrl(url) {
      return clean(url).split(",")[0].trim();
    }

    function getDriveImageUrl(url) {
      const raw = firstPhotoUrl(url);

      if (!raw) return "";

      const fileMatch = raw.match(/\/file\/d\/([^/]+)/);
      const idMatch = raw.match(/[?&]id=([^&]+)/);
      const fileId = fileMatch ? fileMatch[1] : idMatch ? idMatch[1] : "";

      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
      }

      return raw;
    }

    function nauticalMilesBetween(lat1, lng1, lat2, lng2) {
      const earthRadiusNm = 3440.065;
      const toRad = degrees => degrees * Math.PI / 180;

      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return earthRadiusNm * c;
    }

    function parseDateValue(value) {
      const raw = clean(value);
      if (!raw) return 0;

      const parsed = new Date(raw);
      return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    }

    function formatDate(value) {
      const raw = clean(value);
      if (!raw) return "Date not listed";

      const parsed = new Date(raw);
      if (isNaN(parsed.getTime())) return raw;

      return parsed.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    }

    function photoImg(url, title) {
      const image = getDriveImageUrl(url);

      if (!image) return "";

      return `
        <img
          src="${image}"
          alt="${escapeHtml(title)}"
          loading="lazy"
          onerror="this.style.display='none'; this.insertAdjacentHTML('afterend', '<div class=&quot;photo-error&quot;>Photo could not load. Check Google Drive sharing permissions.</div>');"
        >
      `;
    }

    function stationIconHtml() {
      return L.divIcon({
        className: "station-one-icon",
        html: `
          <div style="
            width: 16px;
            height: 16px;
            background: #101828;
            border: 3px solid #ffffff;
            border-radius: 999px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          "></div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
    }

    function orangeIcon() {
      return new L.Icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
    }

    function blueIcon() {
      return new L.Icon.Default();
    }

    const farthestMarkerIcon = orangeIcon();

    L.marker([STATION_1.lat, STATION_1.lng], {
      icon: stationIconHtml()
    })
      .addTo(map)
      .bindPopup(`<strong>Station 1</strong><br>Distance calculated from here.`);

    function buildPopup(item) {
      const title = escapeHtml(item.title || "Submitted Photo");
      const date = escapeHtml(formatDate(item.date_taken));
      const submittedBy = escapeHtml(item.submitted_by);
      const miles = Number(item.distance_nm).toFixed(1);

      const metaParts = [];
      metaParts.push(date);
      if (submittedBy) metaParts.push(`Submitted by ${submittedBy}`);
      metaParts.push(`${miles} nautical miles from Station 1`);

      return `
        <div class="popup-photo">
          ${photoImg(item.photo_url, title)}
          <div class="popup-photo-title">${title}</div>
          <div class="popup-photo-meta">${metaParts.join(" • ")}</div>
        </div>
      `;
    }

    function buildCard(item, marker) {
      const title = escapeHtml(item.title || "Submitted Photo");
      const date = escapeHtml(formatDate(item.date_taken));
      const submittedBy = escapeHtml(item.submitted_by);
      const miles = Number(item.distance_nm).toFixed(1);

      const card = document.createElement("div");
      card.className = "photo-card";

      card.innerHTML = `
        ${photoImg(item.photo_url, title)}
        <div class="photo-card-body">
          <div class="photo-card-title">${title}</div>
          <div class="photo-card-meta">
            ${date}${submittedBy ? ` • ${submittedBy}` : ""}
          </div>
          <div class="photo-card-distance">${miles} nautical miles from Station 1</div>
        </div>
      `;

      card.addEventListener("click", () => {
        map.setView(marker.getLatLng(), 13, { animate: true });
        marker.openPopup();
      });

      return card;
    }

    function buildFarthestCard(item, marker) {
      if (!item) {
        farthestPhoto.innerHTML = `
          <span>—</span>
          <label>Farthest From Station 1</label>
        `;
        farthestPhoto.onclick = null;
        return;
      }

      const title = escapeHtml(item.title || "Submitted Photo");
      const date = escapeHtml(formatDate(item.date_taken));
      const submittedBy = escapeHtml(item.submitted_by);
      const miles = Number(item.distance_nm).toFixed(1);

      farthestPhoto.innerHTML = `
        <span>
          <span class="farthest-header-name">${title}</span>
          <span class="farthest-header-meta">
            ${submittedBy ? `${submittedBy} • ` : ""}${date}
          </span>
          <span class="farthest-header-miles">
            ${miles} nautical miles away
          </span>
        </span>
        <label>Farthest From Station 1</label>
      `;

      farthestPhoto.onclick = () => {
        if (!marker) return;
        map.setView(marker.getLatLng(), 10, { animate: true });
        marker.openPopup();
      };
    }

    function loadPhotos() {
      Papa.parse(SHEET_CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          markerLayer.clearLayers();
          markers.length = 0;
          photoList.innerHTML = "";

          const rows = results.data
            .map(row => {
              const lat = parseFloat(getField(row, "Latitude"));
              const lng = parseFloat(getField(row, "Longitude"));
              const dateTaken = getField(row, "Date Taken");
              const timestamp = getField(row, "Timestamp");
              const submittedSort = parseDateValue(timestamp) || parseDateValue(dateTaken);

              return {
                title: getField(row, "Location Name"),
                photo_url: getField(row, "Photo(s)"),
                lat: lat,
                lng: lng,
                deion: "",
                date_taken: dateTaken,
                timestamp,
                submitted_by: getField(row, "Your Name"),
                status: getField(row, "Status"),
                submitted_sort: submittedSort
              };
            })
            .filter(row => {
              const status = clean(row.status).toLowerCase();

              return (
                status !== "rejected" &&
                Number.isFinite(row.lat) &&
                Number.isFinite(row.lng)
              );
            })
            .map(row => ({
              ...row,
              distance_nm: nauticalMilesBetween(
                STATION_1.lat,
                STATION_1.lng,
                row.lat,
                row.lng
              )
            }));

          rows.sort((a, b) => b.submitted_sort - a.submitted_sort);

          photoCount.textContent = rows.length;
          lastUpdated.textContent = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          });

          if (!rows.length) {
            photoList.innerHTML = `<div class="empty-message">No approved photo locations found yet. Check Latitude, Longitude, and Status columns.</div>`;
            buildFarthestCard(null, null);
            return;
          }

          const farthest = rows.reduce((winner, item) => {
            return item.distance_nm > winner.distance_nm ? item : winner;
          }, rows[0]);

          let farthestMarker = null;

          rows.forEach(item => {
            const isFarthest = item === farthest;

            const marker = L.marker([item.lat, item.lng], {
              icon: isFarthest ? farthestMarkerIcon : blueIcon()
            }).addTo(markerLayer);

            marker.bindPopup(buildPopup(item), {
              maxWidth: 280
            });

            if (isFarthest) {
              farthestMarker = marker;
            }

            markers.push(marker);
            photoList.appendChild(buildCard(item, marker));
          });

          buildFarthestCard(farthest, farthestMarker);

          const group = L.featureGroup(markers);
          map.fitBounds(group.getBounds().pad(0.22));

          setTimeout(() => {
            map.invalidateSize();
          }, 250);
        },
        error: function(error) {
          console.error(error);
          photoList.innerHTML = `<div class="empty-message">Could not load the photo sheet. Check the published CSV link.</div>`;
          buildFarthestCard(null, null);
        }
      });
    }

    loadPhotos();
    setInterval(loadPhotos, 300000);

    window.addEventListener("resize", () => {
      setTimeout(() => map.invalidateSize(), 250);
    });
