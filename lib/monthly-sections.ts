export interface SectionFilm {
  id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  overview: string | null;
  vote_average: number | null;
}

export interface MonthTheme {
  title: string;
  emoji: string;
  description: string;
  discover: Record<string, string>;
}

export interface DirectorSpotlight {
  name: string;
  years: string;
  description: string;
  tmdbPersonId: number;
}

// ── Grindhouse Corner (permanent, page rotates by month) ──────────────────────

export const GRINDHOUSE: MonthTheme = {
  title: "Grindhouse Corner",
  emoji: "🩸",
  description:
    "Past the beaded curtain, at the back of the store. Films that played double features on 42nd Street and drive-in theaters from here to Bakersfield. Exploitation, B-movies, and beautiful trash from the golden age of getting away with things. The selection rotates. The vibe does not.",
  discover: {
    with_genres: "27|28|80",
    "primary_release_date.gte": "1965-01-01",
    "primary_release_date.lte": "1985-12-31",
    "vote_count.gte": "100",
    "vote_average.gte": "5.5",
    sort_by: "vote_average.desc",
  },
};

// ── Monthly Themes ────────────────────────────────────────────────────────────

export const MONTHLY_THEMES: Record<number, MonthTheme> = {
  1: {
    title: "New Year, Same Dread",
    emoji: "🌑",
    description:
      "January is for reckoning. These films don't offer resolutions — they offer honesty. The decorations are coming down. The year is opening up. Watch these while you still feel like it.",
    discover: {
      with_genres: "18|53",
      "vote_count.gte": "800",
      "vote_average.gte": "7.5",
      sort_by: "vote_average.desc",
    },
  },
  2: {
    title: "Anti-Valentine's",
    emoji: "🥀",
    description:
      "Love films for people who find love films insufferable. Obsession, longing, bad timing, worse decisions. The ones where the feeling is real even when everything else goes wrong.",
    discover: {
      with_genres: "10749|18",
      without_genres: "35",
      "vote_count.gte": "500",
      "vote_average.gte": "7.0",
      sort_by: "vote_average.desc",
    },
  },
  3: {
    title: "The Long Con",
    emoji: "🃏",
    description:
      "Someone is lying to someone. Probably everyone is lying to everyone. The heist will go wrong. You already know this. You're going to watch anyway.",
    discover: {
      with_genres: "80|53",
      "vote_count.gte": "500",
      "vote_average.gte": "7.0",
      sort_by: "vote_average.desc",
    },
  },
  4: {
    title: "Road to Nowhere",
    emoji: "🛣️",
    description:
      "Get in the car. Don't ask where we're going. The destination is the wrong question. These are films about what happens when you leave — and what you find out about yourself when there's nothing but highway.",
    discover: {
      with_genres: "12|18",
      "vote_count.gte": "300",
      "vote_average.gte": "7.0",
      sort_by: "vote_average.desc",
    },
  },
  5: {
    title: "New Hollywood",
    emoji: "🎞️",
    description:
      "1967 to 1980. For about thirteen years, the studios lost control and the directors went feral. This is what they made. It still hasn't been topped.",
    discover: {
      with_genres: "18|80|53",
      "primary_release_date.gte": "1967-01-01",
      "primary_release_date.lte": "1980-12-31",
      "vote_count.gte": "300",
      "vote_average.gte": "7.0",
      sort_by: "vote_average.desc",
    },
  },
  6: {
    title: "Sun & Violence",
    emoji: "☀️",
    description:
      "Hot dust. Long silences. Men who don't talk much and mean everything they say. The western never died — it just stopped wearing hats. These are the ones that still have teeth.",
    discover: {
      with_genres: "37|28",
      "vote_count.gte": "300",
      "vote_average.gte": "7.0",
      sort_by: "vote_average.desc",
    },
  },
  7: {
    title: "Summer of Blood",
    emoji: "🔪",
    description:
      "It's too hot to sleep anyway. Pull the blinds. The golden age of horror made monsters you could believe in — practical effects, genuine dread, and directors who understood that what you don't show is scarier than what you do.",
    discover: {
      with_genres: "27",
      "vote_count.gte": "500",
      "vote_average.gte": "7.0",
      sort_by: "vote_average.desc",
    },
  },
  8: {
    title: "The Underground",
    emoji: "🕶️",
    description:
      "Cult films. Midnight movies. Science fiction that didn't have the budget to hide its ideas. These films found their audience the hard way — word of mouth, late-night screenings, and people who couldn't stop talking about them.",
    discover: {
      with_genres: "878|14",
      "vote_count.gte": "200",
      "vote_average.gte": "7.0",
      sort_by: "vote_average.desc",
    },
  },
  9: {
    title: "City at Night",
    emoji: "🌃",
    description:
      "Neo-noir. Urban paranoia. Neon on wet pavement. The city as character, the night as condition. Nobody's innocent and the good ending isn't on offer. September deserves this.",
    discover: {
      with_genres: "80|53|9648",
      "primary_release_date.gte": "1975-01-01",
      "vote_count.gte": "400",
      "vote_average.gte": "7.0",
      sort_by: "vote_average.desc",
    },
  },
  10: {
    title: "Horror Season",
    emoji: "🎃",
    description:
      "October. You know what to do. We pulled the ones worth your time — films where the horror is a delivery mechanism for something that sticks around long after the credits. The shelf is deep.",
    discover: {
      with_genres: "27",
      "vote_count.gte": "600",
      "vote_average.gte": "7.2",
      sort_by: "vote_average.desc",
    },
  },
  11: {
    title: "The War Room",
    emoji: "📋",
    description:
      "Political thrillers, war films, and the machinery of power. Sometimes the enemy is a foreign nation. Sometimes it's the building you work in. Either way, nobody gets out clean.",
    discover: {
      with_genres: "10752|53|36",
      "vote_count.gte": "500",
      "vote_average.gte": "7.0",
      sort_by: "vote_average.desc",
    },
  },
  12: {
    title: "Dead of Winter",
    emoji: "🧊",
    description:
      "Cold films for the coldest month. Slow burns, remote locations, frozen cities, and the particular loneliness of December. These films take their time. You have it.",
    discover: {
      with_genres: "18|53|9648",
      "vote_count.gte": "400",
      "vote_average.gte": "7.5",
      sort_by: "vote_average.desc",
    },
  },
};

// ── Director Spotlights ───────────────────────────────────────────────────────

export const DIRECTOR_SPOTLIGHTS: Record<number, DirectorSpotlight> = {
  1: {
    name: "David Lynch",
    years: "1977–2006",
    description:
      "Nobody makes films like Lynch. Nobody has ever made films like Lynch. Dream logic, diner coffee, and the violent heart beneath the white picket fence. Start anywhere. There's no wrong door.",
    tmdbPersonId: 5765,
  },
  2: {
    name: "Wong Kar-wai",
    years: "1988–2013",
    description:
      "Every frame looks like a memory you haven't made yet. Wong Kar-wai invented his own grammar of longing — missed connections, unreturned feelings, and the specific pain of almost. February is his month.",
    tmdbPersonId: 12453,
  },
  3: {
    name: "Jean-Pierre Melville",
    years: "1949–1972",
    description:
      "The French director who loved American crime films more than Americans did. Melville stripped the heist movie down to silence and code — men in hats, empty streets, honor as a fatal flaw.",
    tmdbPersonId: 3090,
  },
  4: {
    name: "Agnès Varda",
    years: "1955–2019",
    description:
      "The grandmother of the French New Wave built a cinema of tenderness and rigor. Her films look at people the system ignores and find entire worlds. No one filmed kindness better.",
    tmdbPersonId: 8220,
  },
  5: {
    name: "Sam Peckinpah",
    years: "1961–1983",
    description:
      "Violence as elegy. Peckinpah was furious at the myth of the American West and made films that tore it apart in slow motion — beautiful and brutal and not quite at peace with either.",
    tmdbPersonId: 6158,
  },
  6: {
    name: "Sergio Leone",
    years: "1961–1984",
    description:
      "Leone invented his own West — operatic, cruel, and drenched in Morricone. These films run long and mean every minute. The silence before the gunshot is longer than most films' entire runtime.",
    tmdbPersonId: 4429,
  },
  7: {
    name: "Brian De Palma",
    years: "1966–2012",
    description:
      "Pure cinema. De Palma is shameless in his influences and ruthless with the camera — split screens, slow motion, Hitchcock pushed into something more violent and more absurd. A director's director.",
    tmdbPersonId: 11008,
  },
  8: {
    name: "John Cassavetes",
    years: "1959–1984",
    description:
      "The patron saint of independent film made movies that feel like eavesdropping — improvised, raw, uncomfortably intimate. His actors lived these roles. You can feel it in every frame.",
    tmdbPersonId: 11478,
  },
  9: {
    name: "Sidney Lumet",
    years: "1957–2007",
    description:
      "New York. The law. People under pressure until they crack or hold. Lumet made films about institutions and the humans inside them — angry, moral, and deeply urban. Twelve Angry Men is just the beginning.",
    tmdbPersonId: 4431,
  },
  10: {
    name: "Dario Argento",
    years: "1970–2012",
    description:
      "The master of the giallo. Argento's films are murder as art installation — primary colors, impossible camera angles, scores that tell you something horrible is about to happen. October is his.",
    tmdbPersonId: 45801,
  },
  11: {
    name: "Costa-Gavras",
    years: "1965–2019",
    description:
      "Political cinema with the pulse of a thriller. Costa-Gavras made films about what governments do to people when no one is watching — rigorously researched and absolutely enraging.",
    tmdbPersonId: 10070,
  },
  12: {
    name: "Robert Altman",
    years: "1969–2006",
    description:
      "Ensemble chaos. Overlapping dialogue. Characters who don't know they're in a film. Altman let his movies breathe in ways Hollywood wasn't supposed to allow. The more people on screen, the better he got.",
    tmdbPersonId: 5249,
  },
};
