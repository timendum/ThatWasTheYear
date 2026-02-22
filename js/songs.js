const songLibrary = [
  {a: "The Beatles", t: "I Want to Hold Your Hand", y: 1963},
  {a: "Aretha Franklin", t: "Respect", y: 1967},
  {a: "Led Zeppelin", t: "Stairway to Heaven", y: 1971},
  {a: "ABBA", t: "Dancing Queen", y: 1976},
  {a: "Michael Jackson", t: "Billie Jean", y: 1982},
  {a: "Prince", t: "Purple Rain", y: 1984},
  {a: "Nirvana", t: "Smells Like Teen Spirit", y: 1991},
  {a: "Coolio", t: "Gangsta's Paradise", y: 1995},
  {a: "Britney Spears", t: "...Baby One More Time", y: 1998},
  {a: "Outkast", t: "Hey Ya!", y: 2003},
  {a: "Amy Winehouse", t: "Rehab", y: 2006},
  {a: "Adele", t: "Rolling in the Deep", y: 2010},
  {a: "Daft Punk", t: "Get Lucky", y: 2013},
  {a: "The Weeknd", t: "Blinding Lights", y: 2019},
  {a: "Taylor Swift", t: "Anti-Hero", y: 2022},
  {a: "Billie Eilish", t: "Birds of a Feather", y: 2024},
  {a: "Queen", t: "Bohemian Rhapsody", y: 1975},
  {a: "Eminem", t: "Lose Yourself", y: 2002},
  {a: "Beyoncé", t: "Crazy In Love", y: 2003},
  {a: "Fleetwood Mac", t: "Dreams", y: 1977},
  {a: "Madonna", t: "Like a Virgin", y: 1984
}, {a: "The Killers", t: "Mr. Brightside", y: 2004},
  {a: "Olivia Rodrigo", t: "Drivers License", y: 2021
}, {a: "Bee Gees", t: "Stayin' Alive", y: 1977}, {a: "Bon Jovi", t: "Livin' on a Prayer", y: 1986},
  {a: "Oasis", t: "Wonderwall", y: 1995
}, {a: "Whitney Houston", t: "I Wanna Dance with Somebody", y: 1987},
  {a: "Radiohead", t: "Creep", y: 1992
}, {a: "Rolling Stones", t: "Paint It Black", y: 1966}, {a: "Dua Lipa", t: "Levitating", y: 2020},
  {a: "Eagles", t: "Hotel California", y: 1976
}, {a: "Guns N Roses", t: "Sweet Child O Mine", y: 1987},
  {a: "Sinead O Connor", t: "Nothing Compares 2 U", y: 1990
}, {a: "Spice Girls", t: "Wannabe", y: 1996}, {a: "White Stripes", t: "Seven Nation Army", y: 2003},
  {a: "Rihanna", t: "Umbrella", y: 2007
}, {a: "Lady Gaga", t: "Poker Face", y: 2008},
  {a: "Gotye", t: "Somebody That I Used To Know", y: 2011
}, {a: "Pharrell Williams", t: "Happy", y: 2013}, {a: "Harry Styles", t: "As It Was", y: 2022},
  {a: "Ed Sheeran", t: "Shape of You", y: 2017
},
  {a: "Harry Styles", t: "As It Was", y: 2022
},
  {a: "Townes Van Zandt", t: "Pancho and Lefty", y: 1972
},
  {a: "Lizzo", t: "Truth Hurts", y: 2017
},
  {a: "Harry Nilsson", t: "Without You", y: 1971
},
  {a: "Carly Simon", t: "Youre So Vain", y: 1972
},
  {a: "Cyndi Lauper", t: "Time After Time", y: 1983
},
  {a: "The Pixies", t: "Where Is My Mind?", y: 1988
},
  {a: "Kanye West", t: "Stronger", y: 2007
},
  {a: "Miles Davis", t: "So What", y: 1959
},
  {a: "Bad Bunny", t: "Titi Me Pregunto", y: 2022
},
  {a: "Lil Nas X", t: "Old Town Road", y: 2019
},
  {a: "The Breeders", t: "Cannonball", y: 1993
},
  {a: "The Weeknd", t: "House of Balloons", y: 2011
},
  {a: "Solange", t: "Cranes in the Sky", y: 2016
},
  {a: "Lil Wayne", t: "A Milli", y: 2009
},
  {a: "Azealia Banks", t: "212", y: 2011
},
  {a: "Weezer", t: "Buddy Holly", y: 1994
},
  {a: "The Four Tops", t: "I Cant Help Myself (Sugar Pie", y: 1965
},
  {a: "Lady Gaga", t: "Bad Romance", y: 2009
},
  {a: "Robert Johnson", t: "Cross Road Blues", y: 1937
},
  {a: "Biz Markie", t: "Just a Friend", y: 1989
},
  {a: "Santana", t: "Oye Como Va", y: 1970
},
  {a: "Juvenile feat. Lil Wayne and Mannie Fresh", t: "Back That Azz Up", y: 1998
},
  {a: "The Go-Gos", t: "Our Lips Are Sealed", y: 1981
},
  {a: "Kris Kristofferson", t: "Sunday Mornin Comin Down", y: 1970
},
  {a: "Janet Jackson", t: "Rhythm Nation", y: 1989
},
  {a: "Curtis Mayfield", t: "Move On Up", y: 1970
},
  {a: "Tammy Wynette", t: "Stand by Your Man", y: 1968
},
  {a: "Peter Gabriel", t: "Solsbury Hill", y: 1977
},
  {a: "The Animals", t: "The House of the Rising Sun", y: 1964
},
  {a: "Gladys Knight and the Pips", t: "Midnight Train to Georgia", y: 1973
},
  {a: "Dixie Chicks", t: "Goodbye Earl", y: 2000
},
  {a: "Mazzy Star", t: "Fade Into You", y: 1993
},
  {a: "Nirvana", t: "Come as You Are", y: 1991
},
  {a: "Luther Vandross", t: "Never Too Much", y: 1981
},
  {a: "Daft Punk feat. Pharrell Williams", t: "Get Lucky", y: 2013
},
  {a: "Joni Mitchell", t: "Help Me", y: 1974
},
  {a: "John Lee Hooker", t: "Boom Boom", y: 1962
},
  {a: "Van Morrison", t: "Into the Mystic", y: 1970
},
  {a: "Roy Orbison", t: "Crying", y: 1962
},
  {a: "Steel Pulse", t: "Ku Klux Klan", y: 1978
},
  {a: "Sade", t: "No Ordinary Love", y: 1992
},
  {a: "Beck", t: "Loser", y: 1993
},
  {a: "Bon Jovi", t: "Livin on a Prayer", y: 1986
},
  {a: "Lana Del Rey", t: "A&W", y: 2023
},
  {a: "Jefferson Airplane", t: "White Rabbit", y: 1967
},
  {a: "Sister Nancy", t: "Bam Bam", y: 1982
},
  {a: "Missy Elliot", t: "The Rain (Supa Dupa Fly)", y: 1997
},
  {a: "Toto", t: "Africa", y: 1982
},
  {a: "Migos feat. Lil Uzi Vert", t: "Bad and Boujee", y: 2016
}

];
