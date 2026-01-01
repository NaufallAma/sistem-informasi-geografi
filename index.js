const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ======= CONFIG POSTGRESQL =======
const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "654321",   // ganti sesuai password kamu
  database: "postgres", // database yang berisi PostGIS
  port: 5432,
});

// ======= GET DATA DESA (GeoJSON) =======
app.get("/desa", async (req, res) => {
  try {
    const q = `
      SELECT jsonb_build_object(
        'type','FeatureCollection',
        'features', jsonb_agg(
          jsonb_build_object(
            'type','Feature',
            'geometry', ST_AsGeoJSON(geom)::jsonb,
            'properties', to_jsonb(d) - 'geom'
          )
        )
      ) AS geojson
      FROM desa_bumiharjo d;
    `;
    const { rows } = await pool.query(q);
    res.json(rows[0].geojson);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// ======= GET SEMUA TITIK LOKASI (GeoJSON) =======
app.get("/titik", async (req, res) => {
  try {
    const q = `
      SELECT jsonb_build_object(
        'type','FeatureCollection',
        'features', COALESCE(jsonb_agg(
          jsonb_build_object(
            'type','Feature',
            'geometry', ST_AsGeoJSON(geom)::jsonb,
            'properties', jsonb_build_object(
              'id', id,
              'nama', nama,
              'keterangan', keterangan
            )
          )
        ), '[]'::jsonb)
      ) AS geojson
      FROM public.titik_lokasi;
    `;
    const { rows } = await pool.query(q);
    res.json(rows[0].geojson);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Query gagal" });
  }
});

// ======= CREATE TITIK LOKASI =======
app.post("/titik", async (req, res) => {
  try {
    const { nama, keterangan, latitude, longitude } = req.body;

    if (!nama || !latitude || !longitude) {
      return res.status(400).json({ error: "Data tidak lengkap" });
    }

    const q = `
      INSERT INTO public.titik_lokasi (nama, keterangan, geom)
      VALUES ($1, $2, ST_SetSRID(ST_Point($3, $4), 4326))
      RETURNING *;
    `;

    const { rows } = await pool.query(q, [nama, keterangan, longitude, latitude]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Insert gagal" });
  }
});

// ======= UPDATE TITIK =======
app.put("/titik/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, keterangan, latitude, longitude } = req.body;

    const q = `
      UPDATE public.titik_lokasi
      SET nama = $1,
          keterangan = $2,
          geom = ST_SetSRID(ST_Point($3, $4), 4326)
      WHERE id = $5
      RETURNING *;
    `;

    const { rows } = await pool.query(q, [nama, keterangan, longitude, latitude, id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update gagal" });
  }
});

// ======= DELETE TITIK =======
app.delete("/titik/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM public.titik_lokasi WHERE id = $1", [id]);
    res.json({ message: "Titik berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete gagal" });
  }
});


// ======= START SERVER =======
app.listen(3000, () =>
  console.log("✅ API jalan di http://localhost:3000")
);
