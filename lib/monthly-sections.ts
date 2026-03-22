export interface SectionFilm {
  id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  overview: string | null;
  vote_average: number | null;
}

export interface FilmRef {
  title: string;
  year: number;
}

export interface MonthTheme {
  title: string;
  emoji: string;
  description: string;
  films: FilmRef[];
}

export interface DirectorSpotlight {
  name: string;
  years: string;
  description: string;
  films: FilmRef[];
}

// ── Grindhouse Corner — quarterly rotation ────────────────────────────────────

export const GRINDHOUSE_SETS: Record<number, { title: string; emoji: string; description: string; films: FilmRef[] }> = {
  // Q1: Jan–Mar — exploitation classics
  1: {
    title: "Grindhouse Corner",
    emoji: "🩸",
    description:
      "Past the beaded curtain. Films that played double features on 42nd Street and drive-ins from here to Bakersfield. Exploitation, B-movies, and beautiful trash from the golden age of getting away with things.",
    films: [
      { title: "Suspiria", year: 1977 },
      { title: "The Texas Chain Saw Massacre", year: 1974 },
      { title: "Death Race 2000", year: 1975 },
      { title: "Vanishing Point", year: 1971 },
      { title: "Coffy", year: 1973 },
      { title: "The Wicker Man", year: 1973 },
      { title: "Bring Me the Head of Alfredo Garcia", year: 1974 },
      { title: "The Hills Have Eyes", year: 1977 },
    ],
  },
  2: {
    title: "Grindhouse Corner",
    emoji: "🩸",
    description:
      "Past the beaded curtain. Films that played double features on 42nd Street and drive-ins from here to Bakersfield. Exploitation, B-movies, and beautiful trash from the golden age of getting away with things.",
    films: [
      { title: "Faster, Pussycat! Kill! Kill!", year: 1965 },
      { title: "Rolling Thunder", year: 1977 },
      { title: "Dirty Mary Crazy Larry", year: 1974 },
      { title: "Race with the Devil", year: 1975 },
      { title: "Two-Lane Blacktop", year: 1971 },
      { title: "Cockfighter", year: 1974 },
      { title: "Truck Turner", year: 1974 },
      { title: "The Outfit", year: 1973 },
    ],
  },
  3: {
    title: "Grindhouse Corner",
    emoji: "🩸",
    description:
      "Past the beaded curtain. Films that played double features on 42nd Street and drive-ins from here to Bakersfield. Exploitation, B-movies, and beautiful trash from the golden age of getting away with things.",
    films: [
      { title: "Foxy Brown", year: 1974 },
      { title: "Shaft", year: 1971 },
      { title: "Sweet Sweetback's Baadasssss Song", year: 1971 },
      { title: "Black Caesar", year: 1973 },
      { title: "The Mack", year: 1973 },
      { title: "Hit Man", year: 1972 },
      { title: "Slaughter", year: 1972 },
      { title: "Cleopatra Jones", year: 1973 },
    ],
  },
  4: {
    title: "Grindhouse Corner",
    emoji: "🩸",
    description:
      "Past the beaded curtain. Films that played double features on 42nd Street and drive-ins from here to Bakersfield. Exploitation, B-movies, and beautiful trash from the golden age of getting away with things.",
    films: [
      { title: "Deep Red", year: 1975 },
      { title: "The Bird with the Crystal Plumage", year: 1970 },
      { title: "Zombie", year: 1979 },
      { title: "Don't Torture a Duckling", year: 1972 },
      { title: "Bay of Blood", year: 1971 },
      { title: "Don't Look Now", year: 1973 },
      { title: "The Beyond", year: 1981 },
      { title: "City of the Living Dead", year: 1980 },
    ],
  },
};

// Returns the grindhouse set for a given month (quarterly rotation)
export function getGrindhouseSet(month: number) {
  const quarter = Math.ceil(month / 3);
  return GRINDHOUSE_SETS[quarter];
}

// ── Monthly Themes ────────────────────────────────────────────────────────────

export const MONTHLY_THEMES: Record<number, MonthTheme> = {
  1: {
    title: "New Year, Same Dread",
    emoji: "🌑",
    description:
      "January is for reckoning. These films don't offer resolutions — they offer honesty. The decorations are coming down. Watch these while you still feel like it.",
    films: [
      { title: "Persona", year: 1966 },
      { title: "The Seventh Seal", year: 1957 },
      { title: "Scenes from a Marriage", year: 1973 },
      { title: "Melancholia", year: 2011 },
      { title: "The Ice Storm", year: 1997 },
      { title: "Revolutionary Road", year: 2008 },
      { title: "A Separation", year: 2011 },
      { title: "Marriage Story", year: 2019 },
    ],
  },
  2: {
    title: "Anti-Valentine's",
    emoji: "🥀",
    description:
      "Love films for people who find love films insufferable. Obsession, longing, bad timing, worse decisions. The ones where the feeling is real even when everything else goes wrong.",
    films: [
      { title: "In the Mood for Love", year: 2000 },
      { title: "Eternal Sunshine of the Spotless Mind", year: 2004 },
      { title: "Eyes Wide Shut", year: 1999 },
      { title: "Blue Valentine", year: 2010 },
      { title: "Closer", year: 2004 },
      { title: "The Piano", year: 1993 },
      { title: "Lost in Translation", year: 2003 },
      { title: "Punch-Drunk Love", year: 2002 },
    ],
  },
  3: {
    title: "The Long Con",
    emoji: "🃏",
    description:
      "Someone is lying to someone. Probably everyone is lying to everyone. The heist will go wrong. You already know this. You're going to watch anyway.",
    films: [
      { title: "Heat", year: 1995 },
      { title: "Rififi", year: 1955 },
      { title: "Le Cercle Rouge", year: 1970 },
      { title: "The Sting", year: 1973 },
      { title: "Dog Day Afternoon", year: 1975 },
      { title: "Thief", year: 1981 },
      { title: "Inside Man", year: 2006 },
      { title: "Ocean's Eleven", year: 2001 },
    ],
  },
  4: {
    title: "Road to Nowhere",
    emoji: "🛣️",
    description:
      "Get in the car. Don't ask where we're going. The destination is the wrong question. These are films about what you find when there's nothing but highway left.",
    films: [
      { title: "Paris, Texas", year: 1984 },
      { title: "Easy Rider", year: 1969 },
      { title: "Badlands", year: 1973 },
      { title: "Thelma & Louise", year: 1991 },
      { title: "Five Easy Pieces", year: 1970 },
      { title: "Two-Lane Blacktop", year: 1971 },
      { title: "Bonnie and Clyde", year: 1967 },
      { title: "Midnight Cowboy", year: 1969 },
    ],
  },
  5: {
    title: "New Hollywood",
    emoji: "🎞️",
    description:
      "1967 to 1980. For about thirteen years, the studios lost control and the directors went feral. This is what they made. It still hasn't been topped.",
    films: [
      { title: "Chinatown", year: 1974 },
      { title: "Taxi Driver", year: 1976 },
      { title: "Network", year: 1976 },
      { title: "Apocalypse Now", year: 1979 },
      { title: "All the President's Men", year: 1976 },
      { title: "McCabe & Mrs. Miller", year: 1971 },
      { title: "The Conversation", year: 1974 },
      { title: "Night Moves", year: 1975 },
    ],
  },
  6: {
    title: "Sun & Violence",
    emoji: "☀️",
    description:
      "Hot dust. Long silences. Men who don't talk much and mean everything they say. The western never died — it just stopped wearing hats.",
    films: [
      { title: "The Good, the Bad and the Ugly", year: 1966 },
      { title: "Once Upon a Time in the West", year: 1968 },
      { title: "The Wild Bunch", year: 1969 },
      { title: "Pat Garrett and Billy the Kid", year: 1973 },
      { title: "Unforgiven", year: 1992 },
      { title: "No Country for Old Men", year: 2007 },
      { title: "Hell or High Water", year: 2016 },
      { title: "Blood Simple", year: 1984 },
    ],
  },
  7: {
    title: "Summer of Blood",
    emoji: "🔪",
    description:
      "It's too hot to sleep anyway. The golden age of horror made monsters you could believe in — practical effects, genuine dread, directors who knew what you don't show is scarier.",
    films: [
      { title: "Halloween", year: 1978 },
      { title: "Rosemary's Baby", year: 1968 },
      { title: "The Shining", year: 1980 },
      { title: "A Nightmare on Elm Street", year: 1984 },
      { title: "Suspiria", year: 1977 },
      { title: "Don't Look Now", year: 1973 },
      { title: "The Texas Chain Saw Massacre", year: 1974 },
      { title: "Carrie", year: 1976 },
    ],
  },
  8: {
    title: "The Underground",
    emoji: "🕶️",
    description:
      "Cult films. Midnight movies. Science fiction that didn't have the budget to hide its ideas. These films found their audience the hard way — word of mouth, late-night screenings, people who couldn't stop talking about them.",
    films: [
      { title: "Brazil", year: 1985 },
      { title: "Eraserhead", year: 1977 },
      { title: "Videodrome", year: 1983 },
      { title: "Repo Man", year: 1984 },
      { title: "They Live", year: 1988 },
      { title: "THX 1138", year: 1971 },
      { title: "Liquid Sky", year: 1982 },
      { title: "Dark Star", year: 1974 },
    ],
  },
  9: {
    title: "City at Night",
    emoji: "🌃",
    description:
      "Neo-noir. Urban paranoia. Neon on wet pavement. The city as character, the night as condition. Nobody's innocent and the good ending isn't on offer.",
    films: [
      { title: "Chinatown", year: 1974 },
      { title: "The Long Goodbye", year: 1973 },
      { title: "Mulholland Drive", year: 2001 },
      { title: "Se7en", year: 1995 },
      { title: "Drive", year: 2011 },
      { title: "Blade Runner", year: 1982 },
      { title: "Vertigo", year: 1958 },
      { title: "Night Moves", year: 1975 },
    ],
  },
  10: {
    title: "Horror Season",
    emoji: "🎃",
    description:
      "October. You know what to do. We pulled the ones worth your time — films where the horror is a delivery mechanism for something that sticks around long after the credits.",
    films: [
      { title: "Hereditary", year: 2018 },
      { title: "The Shining", year: 1980 },
      { title: "Rosemary's Baby", year: 1968 },
      { title: "Get Out", year: 2017 },
      { title: "The Witch", year: 2015 },
      { title: "Midsommar", year: 2019 },
      { title: "Don't Look Now", year: 1973 },
      { title: "Inland Empire", year: 2006 },
    ],
  },
  11: {
    title: "The War Room",
    emoji: "📋",
    description:
      "Political thrillers, war films, and the machinery of power. Sometimes the enemy is a foreign nation. Sometimes it's the building you work in. Either way, nobody gets out clean.",
    films: [
      { title: "All the President's Men", year: 1976 },
      { title: "Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb", year: 1964 },
      { title: "Z", year: 1969 },
      { title: "Three Days of the Condor", year: 1975 },
      { title: "The Conversation", year: 1974 },
      { title: "Munich", year: 2005 },
      { title: "Tinker Tailor Soldier Spy", year: 2011 },
      { title: "Missing", year: 1982 },
    ],
  },
  12: {
    title: "Dead of Winter",
    emoji: "🧊",
    description:
      "Cold films for the coldest month. Slow burns, remote locations, frozen cities, and the particular loneliness of December. These films take their time. You have it.",
    films: [
      { title: "The Thing", year: 1982 },
      { title: "Fargo", year: 1996 },
      { title: "Let the Right One In", year: 2008 },
      { title: "Winter's Bone", year: 2010 },
      { title: "Prisoners", year: 2013 },
      { title: "McCabe & Mrs. Miller", year: 1971 },
      { title: "The Shining", year: 1980 },
      { title: "Frozen River", year: 2008 },
    ],
  },
};

// ── Director Spotlights ───────────────────────────────────────────────────────

export const DIRECTOR_SPOTLIGHTS: Record<number, DirectorSpotlight> = {
  1: {
    name: "David Lynch",
    years: "1977–2006",
    description:
      "Nobody makes films like Lynch. Nobody has ever made films like Lynch. Dream logic, diner coffee, and the violent heart beneath the white picket fence. Start anywhere. There's no wrong door.",
    films: [
      { title: "Blue Velvet", year: 1986 },
      { title: "Mulholland Drive", year: 2001 },
      { title: "Eraserhead", year: 1977 },
      { title: "The Elephant Man", year: 1980 },
      { title: "Lost Highway", year: 1997 },
      { title: "Wild at Heart", year: 1990 },
    ],
  },
  2: {
    name: "Wong Kar-wai",
    years: "1988–2013",
    description:
      "Every frame looks like a memory you haven't made yet. Wong Kar-wai invented his own grammar of longing — missed connections, unreturned feelings, and the specific pain of almost.",
    films: [
      { title: "In the Mood for Love", year: 2000 },
      { title: "Chungking Express", year: 1994 },
      { title: "Happy Together", year: 1997 },
      { title: "Fallen Angels", year: 1995 },
      { title: "2046", year: 2004 },
      { title: "Days of Being Wild", year: 1990 },
    ],
  },
  3: {
    name: "Jean-Pierre Melville",
    years: "1949–1972",
    description:
      "The French director who loved American crime films more than Americans did. Melville stripped the heist movie down to silence and code — men in hats, empty streets, honor as a fatal flaw.",
    films: [
      { title: "Le Samouraï", year: 1967 },
      { title: "Le Cercle Rouge", year: 1970 },
      { title: "Army of Shadows", year: 1969 },
      { title: "Bob le Flambeur", year: 1956 },
      { title: "Le Doulos", year: 1962 },
      { title: "Un Flic", year: 1972 },
    ],
  },
  4: {
    name: "Agnès Varda",
    years: "1955–2019",
    description:
      "The grandmother of the French New Wave built a cinema of tenderness and rigor. Her films look at people the system ignores and find entire worlds. No one filmed kindness better.",
    films: [
      { title: "Cléo from 5 to 7", year: 1962 },
      { title: "Vagabond", year: 1985 },
      { title: "The Gleaners and I", year: 2000 },
      { title: "Faces Places", year: 2017 },
      { title: "One Sings, the Other Doesn't", year: 1977 },
      { title: "Daguerreotypes", year: 1976 },
    ],
  },
  5: {
    name: "Sam Peckinpah",
    years: "1961–1983",
    description:
      "Violence as elegy. Peckinpah was furious at the myth of the American West and made films that tore it apart in slow motion — beautiful and brutal and not quite at peace with either.",
    films: [
      { title: "The Wild Bunch", year: 1969 },
      { title: "Straw Dogs", year: 1971 },
      { title: "Pat Garrett and Billy the Kid", year: 1973 },
      { title: "Bring Me the Head of Alfredo Garcia", year: 1974 },
      { title: "The Getaway", year: 1972 },
      { title: "Ride the High Country", year: 1962 },
    ],
  },
  6: {
    name: "Sergio Leone",
    years: "1961–1984",
    description:
      "Leone invented his own West — operatic, cruel, and drenched in Morricone. These films run long and mean every minute. The silence before the gunshot is longer than most films' entire runtime.",
    films: [
      { title: "Once Upon a Time in the West", year: 1968 },
      { title: "The Good, the Bad and the Ugly", year: 1966 },
      { title: "Once Upon a Time in America", year: 1984 },
      { title: "A Fistful of Dollars", year: 1964 },
      { title: "For a Few Dollars More", year: 1965 },
      { title: "Duck, You Sucker", year: 1971 },
    ],
  },
  7: {
    name: "Brian De Palma",
    years: "1966–2012",
    description:
      "Pure cinema. De Palma is shameless in his influences and ruthless with the camera — split screens, slow motion, Hitchcock pushed into something more violent and more absurd.",
    films: [
      { title: "Carrie", year: 1976 },
      { title: "Scarface", year: 1983 },
      { title: "Blow Out", year: 1981 },
      { title: "Dressed to Kill", year: 1980 },
      { title: "The Untouchables", year: 1987 },
      { title: "Sisters", year: 1972 },
    ],
  },
  8: {
    name: "John Cassavetes",
    years: "1959–1984",
    description:
      "The patron saint of independent film made movies that feel like eavesdropping — improvised, raw, uncomfortably intimate. His actors lived these roles. You can feel it in every frame.",
    films: [
      { title: "A Woman Under the Influence", year: 1974 },
      { title: "The Killing of a Chinese Bookie", year: 1976 },
      { title: "Faces", year: 1968 },
      { title: "Husbands", year: 1970 },
      { title: "Opening Night", year: 1977 },
      { title: "Shadows", year: 1958 },
    ],
  },
  9: {
    name: "Sidney Lumet",
    years: "1957–2007",
    description:
      "New York. The law. People under pressure until they crack or hold. Lumet made films about institutions and the humans inside them — angry, moral, and deeply urban.",
    films: [
      { title: "12 Angry Men", year: 1957 },
      { title: "Dog Day Afternoon", year: 1975 },
      { title: "Network", year: 1976 },
      { title: "Serpico", year: 1973 },
      { title: "The Verdict", year: 1982 },
      { title: "Prince of the City", year: 1981 },
    ],
  },
  10: {
    name: "Dario Argento",
    years: "1970–2012",
    description:
      "The master of the giallo. Argento's films are murder as art installation — primary colors, impossible camera angles, scores that tell you something horrible is about to happen.",
    films: [
      { title: "Suspiria", year: 1977 },
      { title: "Deep Red", year: 1975 },
      { title: "The Bird with the Crystal Plumage", year: 1970 },
      { title: "Opera", year: 1987 },
      { title: "Tenebrae", year: 1982 },
      { title: "Inferno", year: 1980 },
    ],
  },
  11: {
    name: "Costa-Gavras",
    years: "1965–2019",
    description:
      "Political cinema with the pulse of a thriller. Costa-Gavras made films about what governments do to people when no one is watching — rigorously researched and absolutely enraging.",
    films: [
      { title: "Z", year: 1969 },
      { title: "Missing", year: 1982 },
      { title: "The Confession", year: 1970 },
      { title: "State of Siege", year: 1972 },
      { title: "Music Box", year: 1989 },
      { title: "Special Section", year: 1975 },
    ],
  },
  12: {
    name: "Robert Altman",
    years: "1969–2006",
    description:
      "Ensemble chaos. Overlapping dialogue. Characters who don't know they're in a film. Altman let his movies breathe in ways Hollywood wasn't supposed to allow. The more people on screen, the better he got.",
    films: [
      { title: "Nashville", year: 1975 },
      { title: "McCabe & Mrs. Miller", year: 1971 },
      { title: "The Long Goodbye", year: 1973 },
      { title: "Short Cuts", year: 1993 },
      { title: "Gosford Park", year: 2001 },
      { title: "3 Women", year: 1977 },
    ],
  },
};
