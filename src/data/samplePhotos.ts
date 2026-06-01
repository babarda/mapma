import type { Photo } from "@/lib/types";

// Seed data so the map is populated during development before any real
// uploads exist. Images use seeded picsum placeholders (grayscale) to evoke
// archival photos. Replace with real records from Supabase once wired.

function placeholder(seed: string, w = 1200, h = 800): string {
  return `https://picsum.photos/seed/${seed}/${w}/${h}?grayscale`;
}

const SEED: Omit<Photo, "yearApproximate" | "source" | "uploaderName">[] = [
  {
    id: "casa-1920-port",
    title: "Construction of the Port of Casablanca",
    description:
      "Early works expanding the artificial harbour that would make Casablanca Morocco's main commercial gateway.",
    imageUrl: placeholder("casa-port"),
    thumbnailUrl: placeholder("casa-port", 400, 300),
    lng: -7.6114,
    lat: 33.6065,
    city: "Casablanca",
    region: "Casablanca-Settat",
    year: 1920,
    decade: 1920,
    categories: ["Ports", "Colonial Era"],
    tags: ["port", "harbour", "construction"],
    aiConfidence: 0.82,
    status: "verified",
    uploader: "archive",
  },
  {
    id: "rabat-1930-kasbah",
    title: "Kasbah of the Udayas",
    description:
      "View over the Bou Regreg estuary from the fortified Kasbah des Oudayas in Rabat.",
    imageUrl: placeholder("rabat-kasbah"),
    thumbnailUrl: placeholder("rabat-kasbah", 400, 300),
    lng: -6.8361,
    lat: 34.0299,
    city: "Rabat",
    region: "Rabat-Salé-Kénitra",
    year: 1930,
    decade: 1930,
    categories: ["Architecture", "Colonial Era"],
    tags: ["kasbah", "fortress", "estuary"],
    aiConfidence: 0.74,
    status: "verified",
    uploader: "archive",
  },
  {
    id: "marrakech-1950-jemaa",
    title: "Jemaa el-Fnaa at Dusk",
    description:
      "Storytellers and food stalls fill the great square of Marrakech beneath the Koutoubia minaret.",
    imageUrl: placeholder("marrakech-jemaa"),
    thumbnailUrl: placeholder("marrakech-jemaa", 400, 300),
    lng: -7.9892,
    lat: 31.6258,
    city: "Marrakech",
    region: "Marrakech-Safi",
    year: 1950,
    decade: 1950,
    categories: ["Daily Life", "Markets"],
    tags: ["medina", "square", "koutoubia"],
    aiConfidence: 0.9,
    status: "verified",
    uploader: "archive",
  },
  {
    id: "tangier-1940-port",
    title: "Tangier International Zone Waterfront",
    description:
      "Steamers at the port of Tangier during the era of the International Zone.",
    imageUrl: placeholder("tangier-port"),
    thumbnailUrl: placeholder("tangier-port", 400, 300),
    lng: -5.8008,
    lat: 35.7806,
    city: "Tangier",
    region: "Tanger-Tétouan-Al Hoceïma",
    year: 1940,
    decade: 1940,
    categories: ["Ports", "Daily Life"],
    tags: ["international zone", "steamers", "waterfront"],
    aiConfidence: 0.68,
    status: "pending",
    uploader: "archive",
  },
  {
    id: "fes-1925-tannery",
    title: "Chouara Tannery, Fes el-Bali",
    description:
      "The historic dye pits of the Chouara tannery in the old medina of Fes.",
    imageUrl: placeholder("fes-tannery"),
    thumbnailUrl: placeholder("fes-tannery", 400, 300),
    lng: -4.9737,
    lat: 34.0654,
    city: "Fes",
    region: "Fès-Meknès",
    year: 1925,
    decade: 1920,
    categories: ["Daily Life", "Markets", "Architecture"],
    tags: ["tannery", "medina", "crafts"],
    aiConfidence: 0.79,
    status: "verified",
    uploader: "archive",
  },
  {
    id: "agadir-1960-rebuild",
    title: "Agadir After the 1960 Earthquake",
    description:
      "Reconstruction of Agadir following the devastating earthquake of February 1960.",
    imageUrl: placeholder("agadir-rebuild"),
    thumbnailUrl: placeholder("agadir-rebuild", 400, 300),
    lng: -9.5981,
    lat: 30.4278,
    city: "Agadir",
    region: "Souss-Massa",
    year: 1960,
    decade: 1960,
    categories: ["Architecture", "Independence Era"],
    tags: ["earthquake", "reconstruction", "modernist"],
    aiConfidence: 0.71,
    status: "verified",
    uploader: "archive",
  },
  {
    id: "oujda-1935-station",
    title: "Oujda Railway Station",
    description:
      "The railway station at Oujda, a key node linking eastern Morocco to the national network.",
    imageUrl: placeholder("oujda-station"),
    thumbnailUrl: placeholder("oujda-station", 400, 300),
    lng: -1.9086,
    lat: 34.6814,
    city: "Oujda",
    region: "Oriental",
    year: 1935,
    decade: 1930,
    categories: ["Railways", "Transportation"],
    tags: ["railway", "station", "east"],
    aiConfidence: 0.66,
    status: "pending",
    uploader: "archive",
  },
  {
    id: "casa-1955-tram",
    title: "Casablanca Tramway on Boulevard de la Gare",
    description:
      "An electric tram passes through the bustling commercial centre of Casablanca.",
    imageUrl: placeholder("casa-tram"),
    thumbnailUrl: placeholder("casa-tram", 400, 300),
    lng: -7.5898,
    lat: 33.5945,
    city: "Casablanca",
    region: "Casablanca-Settat",
    year: 1955,
    decade: 1950,
    categories: ["Transportation", "Daily Life"],
    tags: ["tramway", "boulevard", "city centre"],
    aiConfidence: 0.83,
    status: "verified",
    uploader: "archive",
  },
];

export const SAMPLE_PHOTOS: Photo[] = SEED.map((p) => ({
  ...p,
  yearApproximate: false,
  source: null,
  uploaderName: null,
}));

export const YEAR_MIN = 1900;
// MAPMA only archives photographs/paintings dating before 2000.
export const YEAR_MAX = 2000;
