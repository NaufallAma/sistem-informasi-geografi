// 1️⃣ Inisialisasi peta
const map = L.map("map").setView([-6.43, 110.85], 12);

// 2️⃣ Basemap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

// 3️⃣ Layer Desa
fetch("http://localhost:3000/desa")
  .then(res => res.json())
  .then(data => {
    const desaLayer = L.geoJSON(data, {
  style: {
    color: "blue",
    weight: 2,
    fillColor: "skyblue",
    fillOpacity: 0.4
  },
  onEachFeature: (feature, layer) => {
    layer.bindPopup("Wilayah Desa");

    // Tangkap klik di polygon agar bisa menambahkan titik
    layer.on("click", (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      const nama = prompt("Nama lokasi:");
      if (!nama) return alert("Nama wajib diisi");

      const keterangan = prompt("Keterangan (opsional):") || "";

      fetch("http://localhost:3000/titik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama,
          keterangan,
          latitude: lat,
          longitude: lng
        })
      })
      .then(() => loadTitik())
      .then(() => alert("Titik berhasil disimpan"))
      .catch(console.error);
    });
  }
}).addTo(map);

    map.fitBounds(desaLayer.getBounds());
  });

// 4️⃣ Layer Titik Lokasi
let titikLayer = L.geoJSON(null).addTo(map);

// Fungsi load titik dari backend
function loadTitik() {
  fetch("http://localhost:3000/titik")
    .then(res => res.json())
    .then(data => {
      titikLayer.clearLayers();
      L.geoJSON(data, {
        onEachFeature: (feature, layer) => {
          layer.bindPopup(`<b>${feature.properties.nama}</b><br>${feature.properties.keterangan}`);

          // ✅ Double klik untuk update/delete
          layer.on("dblclick", () => {
            const pilihan = prompt("Ketik 'U' untuk Update, 'D' untuk Delete").toUpperCase();
            if (pilihan === "U") {
              const nama = prompt("Nama baru:", feature.properties.nama);
              const keterangan = prompt("Keterangan baru:", feature.properties.keterangan);
              if (!nama) return alert("Nama wajib diisi");

              fetch(`http://localhost:3000/titik/${feature.properties.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  nama,
                  keterangan,
                  latitude: layer.getLatLng().lat,
                  longitude: layer.getLatLng().lng
                })
              })
              .then(() => {
                alert("Titik berhasil diupdate");
                loadTitik();
              })
              .catch(console.error);

            } else if (pilihan === "D") {
              if (!confirm("Yakin ingin menghapus titik ini?")) return;
              fetch(`http://localhost:3000/titik/${feature.properties.id}`, { method: "DELETE" })
                .then(() => {
                  alert("Titik berhasil dihapus");
                  loadTitik();
                })
                .catch(console.error);
            }
          });
        }
      }).addTo(titikLayer);
    });
}


// Load titik awal
loadTitik();

// 5️⃣ Tambah titik dengan klik peta
map.on("click", e => {
  const nama = prompt("Nama lokasi:");
  if (!nama) return alert("Nama wajib diisi");

  const keterangan = prompt("Keterangan (opsional):") || "";

  fetch("http://localhost:3000/titik", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nama,
      keterangan,
      latitude: e.latlng.lat,
      longitude: e.latlng.lng
    })
  })
  .then(res => res.json())
  .then(() => {
    alert("Titik berhasil disimpan!");
    loadTitik();
  })
  .catch(err => {
    console.error(err);
    alert("Gagal menyimpan titik");
  });
});
