import type { School } from "@/types/school";

export const schools: School[] = [
  {
    id: "sunnyside-elementary",
    name: "Sunnyside Elementary School",
    type: "Elementary",
    lat: 37.7308,
    lng: -122.4472,
    description:
      "A neighborhood elementary school with strong family partnerships, literacy support, and arts enrichment.",
    distanceMiles: 0.8,
    commuteFit: 92,
    commute: {
      walkingMinutes: 14,
      drivingMinutes: 5,
      transitMinutes: 12
    },
    mapPosition: {
      x: 27,
      y: 36
    }
  },
  {
    id: "miraloma-elementary",
    name: "Miraloma Elementary School",
    type: "Elementary",
    lat: 37.7392,
    lng: -122.4509,
    description:
      "An elementary campus focused on inquiry, inclusive classrooms, and community-based learning.",
    distanceMiles: 1.2,
    commuteFit: 85,
    commute: {
      walkingMinutes: 22,
      drivingMinutes: 7,
      transitMinutes: 18
    },
    mapPosition: {
      x: 39,
      y: 24
    }
  },
  {
    id: "commodore-sloat-elementary",
    name: "Commodore Sloat Elementary School",
    type: "Elementary",
    lat: 37.7312,
    lng: -122.4657,
    description:
      "A welcoming elementary school with project-based instruction and robust after-school options.",
    distanceMiles: 1.6,
    commuteFit: 79,
    commute: {
      walkingMinutes: 29,
      drivingMinutes: 8,
      transitMinutes: 21
    },
    mapPosition: {
      x: 18,
      y: 59
    }
  },
  {
    id: "alvarado-elementary",
    name: "Alvarado Elementary School",
    type: "Elementary",
    lat: 37.7538,
    lng: -122.437,
    description:
      "A dual-language elementary school with collaborative classrooms and strong parent engagement.",
    distanceMiles: 2.4,
    commuteFit: 74,
    commute: {
      walkingMinutes: 43,
      drivingMinutes: 11,
      transitMinutes: 24
    },
    mapPosition: {
      x: 64,
      y: 43
    }
  },
  {
    id: "glen-park-elementary",
    name: "Glen Park Elementary School",
    type: "Elementary",
    lat: 37.7334,
    lng: -122.4333,
    description:
      "A small elementary community centered on foundational academics, belonging, and outdoor learning.",
    distanceMiles: 1.1,
    commuteFit: 88,
    commute: {
      walkingMinutes: 20,
      drivingMinutes: 6,
      transitMinutes: 14
    },
    mapPosition: {
      x: 53,
      y: 55
    }
  },
  {
    id: "james-lick-middle",
    name: "James Lick Middle School",
    type: "Middle",
    lat: 37.7481,
    lng: -122.4299,
    description:
      "A middle school supporting academic confidence through advisory, electives, and multilingual services.",
    distanceMiles: 2.1,
    commuteFit: 76,
    commute: {
      walkingMinutes: 38,
      drivingMinutes: 10,
      transitMinutes: 22
    },
    mapPosition: {
      x: 59,
      y: 31
    }
  },
  {
    id: "aptos-middle",
    name: "Aptos Middle School",
    type: "Middle",
    lat: 37.7296,
    lng: -122.4666,
    description:
      "A diverse middle school offering arts pathways, student leadership, and standards-aligned instruction.",
    distanceMiles: 1.8,
    commuteFit: 81,
    commute: {
      walkingMinutes: 34,
      drivingMinutes: 9,
      transitMinutes: 17
    },
    mapPosition: {
      x: 31,
      y: 67
    }
  },
  {
    id: "roosevelt-middle",
    name: "Roosevelt Middle School",
    type: "Middle",
    lat: 37.7826,
    lng: -122.4577,
    description:
      "A centrally located middle school with academic teams, enrichment clubs, and strong student supports.",
    distanceMiles: 4.4,
    commuteFit: 63,
    commute: {
      walkingMinutes: 78,
      drivingMinutes: 18,
      transitMinutes: 32
    },
    mapPosition: {
      x: 47,
      y: 14
    }
  },
  {
    id: "hoover-middle",
    name: "Herbert Hoover Middle School",
    type: "Middle",
    lat: 37.7455,
    lng: -122.4717,
    description:
      "A west-side middle school with academic acceleration, wellness supports, and active family communication.",
    distanceMiles: 2.7,
    commuteFit: 71,
    commute: {
      walkingMinutes: 50,
      drivingMinutes: 12,
      transitMinutes: 29
    },
    mapPosition: {
      x: 35,
      y: 82
    }
  },
  {
    id: "everett-middle",
    name: "Everett Middle School",
    type: "Middle",
    lat: 37.7638,
    lng: -122.4319,
    description:
      "A mission-area middle school offering arts, language support, and advisory structures for student growth.",
    distanceMiles: 3.5,
    commuteFit: 67,
    commute: {
      walkingMinutes: 64,
      drivingMinutes: 16,
      transitMinutes: 27
    },
    mapPosition: {
      x: 81,
      y: 38
    }
  },
  {
    id: "lowell-high",
    name: "Lowell High School",
    type: "High",
    lat: 37.7303,
    lng: -122.4839,
    description:
      "A comprehensive high school known for advanced coursework, student organizations, and college preparation.",
    distanceMiles: 2.9,
    commuteFit: 72,
    commute: {
      walkingMinutes: 53,
      drivingMinutes: 13,
      transitMinutes: 26
    },
    mapPosition: {
      x: 22,
      y: 78
    }
  },
  {
    id: "balboa-high",
    name: "Balboa High School",
    type: "High",
    lat: 37.7213,
    lng: -122.4416,
    description:
      "A high school emphasizing career pathways, college access, and a broad set of student activities.",
    distanceMiles: 1.4,
    commuteFit: 87,
    commute: {
      walkingMinutes: 26,
      drivingMinutes: 7,
      transitMinutes: 15
    },
    mapPosition: {
      x: 67,
      y: 66
    }
  },
  {
    id: "mission-high",
    name: "Mission High School",
    type: "High",
    lat: 37.7617,
    lng: -122.4271,
    description:
      "A historic high school with bilingual programs, college advising, and neighborhood partnerships.",
    distanceMiles: 3.2,
    commuteFit: 69,
    commute: {
      walkingMinutes: 59,
      drivingMinutes: 15,
      transitMinutes: 28
    },
    mapPosition: {
      x: 74,
      y: 22
    }
  },
  {
    id: "galileo-high",
    name: "Galileo Academy of Science and Technology",
    type: "High",
    lat: 37.8037,
    lng: -122.4249,
    description:
      "A high school with science and technology pathways, visual arts, athletics, and college readiness programs.",
    distanceMiles: 5.8,
    commuteFit: 58,
    commute: {
      walkingMinutes: 104,
      drivingMinutes: 24,
      transitMinutes: 41
    },
    mapPosition: {
      x: 82,
      y: 10
    }
  },
  {
    id: "washington-high",
    name: "George Washington High School",
    type: "High",
    lat: 37.7779,
    lng: -122.4929,
    description:
      "A large comprehensive high school with academic pathways, extracurricular breadth, and neighborhood access.",
    distanceMiles: 5.1,
    commuteFit: 61,
    commute: {
      walkingMinutes: 92,
      drivingMinutes: 22,
      transitMinutes: 39
    },
    mapPosition: {
      x: 14,
      y: 18
    }
  }
];
