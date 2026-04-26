/**
 * Fragenpool — einfach erweiterbar: { id, cat, diff, q, choices: [4], a: 0..3 }
 * cat: siehe TRIVIA_CATS (z. B. movies, music, science, history, …)
 * diff: easy | medium | hard
 */

export const TRIVIA_QUESTIONS = [
  // --- tech (easy) ---
  { id: 1, cat: "tech", diff: "easy", q: "Was bedeutet „HTML“?", choices: ["HyperText Markup Language", "High Transfer Markup Line", "Home Tool Markup Layer", "Hyperlink Text Mode Link"], a: 0 },
  { id: 2, cat: "tech", diff: "easy", q: "Welches Betriebssystem hat ein Apfel-Logo?", choices: ["Windows", "Linux", "macOS", "Android"], a: 2 },
  { id: 3, cat: "tech", diff: "easy", q: "1 Byte = ?", choices: ["4 Bit", "8 Bit", "16 Bit", "32 Bit"], a: 1 },
  { id: 4, cat: "tech", diff: "easy", q: "„URL“ steht für…", choices: ["Uniform Resource Locator", "Universal Routing Link", "United Resource List", "User Read Log"], a: 0 },
  { id: 5, cat: "tech", diff: "medium", q: "Welches Protokoll ist verschlüsseltes HTTP?", choices: ["FTP", "SMTP", "HTTPS", "SNMP"], a: 2 },
  { id: 6, cat: "tech", diff: "medium", q: "Git ist primär ein…", choices: ["Texteditor", "Versionskontrollsystem", "Paketmanager", "Datenbank"], a: 1 },
  { id: 7, cat: "tech", diff: "medium", q: "CPU steht für…", choices: ["Central Processing Unit", "Computer Power Utility", "Core Program Unit", "Cached Process Union"], a: 0 },
  { id: 8, cat: "tech", diff: "hard", q: "Big-O von binärer Suche in einem sortierten Array?", choices: ["O(n)", "O(log n)", "O(n²)", "O(1)"], a: 1 },
  { id: 9, cat: "tech", diff: "hard", q: "Welches Paradigma nutzt reine Funktionen ohne Seiteneffekte als Kern?", choices: ["OOP", "Funktionale Programmierung", "Prozedural", "Assembler"], a: 1 },

  // --- nature ---
  { id: 10, cat: "nature", diff: "easy", q: "Photosynthese nutzt vor allem…", choices: ["Sauerstoff", "Kohlendioxid und Licht", "Stickstoff", "Methan"], a: 1 },
  { id: 11, cat: "nature", diff: "easy", q: "Größtes Land der Erde (Fläche)?", choices: ["USA", "China", "Kanada", "Russland"], a: 3 },
  { id: 12, cat: "nature", diff: "medium", q: "Welcher Planet ist der größte im Sonnensystem?", choices: ["Erde", "Saturn", "Jupiter", "Neptun"], a: 2 },
  { id: 13, cat: "nature", diff: "medium", q: "Welches Gas macht den Großteil der Erdatmosphäre aus?", choices: ["Sauerstoff", "Kohlendioxid", "Stickstoff", "Wasserstoff"], a: 2 },
  { id: 14, cat: "nature", diff: "hard", q: "Welcher Baum gilt oft als „lebendes Fossil“ (Ginkgo)?", choices: ["Buche", "Ginkgo", "Eiche", "Fichte"], a: 1 },

  // --- geo ---
  { id: 15, cat: "geo", diff: "easy", q: "Hauptstadt von Frankreich?", choices: ["Lyon", "Marseille", "Paris", "Nantes"], a: 2 },
  { id: 16, cat: "geo", diff: "easy", q: "Welcher Fluss fließt durch Ägypten?", choices: ["Amazonas", "Nil", "Donau", "Ganges"], a: 1 },
  { id: 17, cat: "geo", diff: "medium", q: "Welches Land hat die meisten Einwohner?", choices: ["USA", "Indien", "China", "Indonesien"], a: 1 },
  { id: 18, cat: "geo", diff: "medium", q: "Hauptstadt von Australien?", choices: ["Sydney", "Melbourne", "Canberra", "Perth"], a: 2 },
  { id: 19, cat: "geo", diff: "hard", q: "Kleinster UN-Mitgliedsstaat nach Fläche?", choices: ["Monaco", "Vatikanstadt", "San Marino", "Liechtenstein"], a: 1 },

  // --- history ---
  { id: 20, cat: "history", diff: "easy", q: "Berliner Mauer fiel grob im Jahr…", choices: ["1979", "1989", "1999", "2001"], a: 1 },
  { id: 21, cat: "history", diff: "easy", q: "Wer malte die Mona Lisa?", choices: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"], a: 1 },
  { id: 22, cat: "history", diff: "medium", q: "Erster Mensch auf dem Mond (Apollo 11)?", choices: ["Buzz Aldrin", "Neil Armstrong", "Juri Gagarin", "Alan Shepard"], a: 1 },
  { id: 23, cat: "history", diff: "medium", q: "Französische Revolution begann ungefähr…", choices: ["1689", "1789", "1848", "1914"], a: 1 },
  { id: 24, cat: "history", diff: "hard", q: "Schlacht von Stalingrad endete grob…", choices: ["1940", "1943", "1945", "1950"], a: 1 },

  // --- culture ---
  { id: 25, cat: "culture", diff: "easy", q: "Wie viele Streifen hat die US-Flagge (2020er)?", choices: ["11", "13", "15", "50"], a: 1 },
  { id: 26, cat: "culture", diff: "easy", q: "Harry Potters Eule heißt…", choices: ["Hedwig", "Errol", "Hermes", "Archimedes"], a: 0 },
  { id: 27, cat: "culture", diff: "medium", q: "Oscar für besten Film 2020 (Jahr der Verleihung)?", choices: ["1917", "Parasite", "Joker", "Once Upon a Time…"], a: 1 },
  { id: 28, cat: "culture", diff: "medium", q: "Beatles kommen aus…", choices: ["USA", "Irland", "Liverpool/UK", "Kanada"], a: 2 },
  { id: 29, cat: "culture", diff: "hard", q: "Goethes „Faust“ — welcher Teil erschien zu Lebzeiten Goethes vollständig?", choices: ["Nur Teil 1", "Nur Teil 2", "Beide", "Keiner"], a: 0 },

  // --- sport ---
  { id: 30, cat: "sport", diff: "easy", q: "Wie viele Spieler hat ein Fußballteam auf dem Feld?", choices: ["9", "10", "11", "12"], a: 2 },
  { id: 31, cat: "sport", diff: "easy", q: "Olympische Ringe: wie viele?", choices: ["4", "5", "6", "7"], a: 1 },
  { id: 32, cat: "sport", diff: "medium", q: "Tennis: Grand Slam umfasst genau … Turniere.", choices: ["2", "3", "4", "5"], a: 2 },
  { id: 33, cat: "sport", diff: "medium", q: "Marathon klassisch ≈ wie viele km?", choices: ["21,1", "42,2", "50", "100"], a: 1 },
  { id: 34, cat: "sport", diff: "hard", q: "In welchem Jahr fand die erste FIFA-WM statt?", choices: ["1926", "1930", "1934", "1938"], a: 1 },

  // --- science ---
  { id: 35, cat: "science", diff: "easy", q: "Chemisches Symbol für Wasser?", choices: ["O2", "CO2", "H2O", "NaCl"], a: 2 },
  { id: 36, cat: "science", diff: "easy", q: "Geschwindigkeit des Lichts ≈ (Vakuum)?", choices: ["300 km/s", "300 000 km/s", "30 000 km/s", "3 Mio km/s"], a: 1 },
  { id: 37, cat: "science", diff: "medium", q: "Welche Blutgruppe gilt als Universalspender (RBC)?", choices: ["A", "B", "AB", "0 negativ"], a: 3 },
  { id: 38, cat: "science", diff: "medium", q: "E=mc² — c steht für…", choices: ["Lichtgeschwindigkeit", "Coulomb", "Kühlung", "Konstante der Gravitation"], a: 0 },
  { id: 39, cat: "science", diff: "hard", q: "Avogadro-Konstante grob?", choices: ["6×10²³ mol⁻¹", "9,81 m/s²", "3×10⁸ m/s", "1,6×10⁻¹⁹ C"], a: 0 },

  // more tech
  { id: 40, cat: "tech", diff: "easy", q: "Welche Sprache wird im Browser primär ausgeführt?", choices: ["Python", "JavaScript", "Rust", "C#"], a: 1 },
  { id: 41, cat: "tech", diff: "medium", q: "SQL ist eine Sprache für…", choices: ["Grafik", "Datenbanken", "Audio", "Routing"], a: 1 },
  { id: 42, cat: "tech", diff: "easy", q: "„PDF“ steht für…", choices: ["Portable Document Format", "Public Data File", "Printed Document Form", "Programmable Doc Framework"], a: 0 },

  // more geo
  { id: 43, cat: "geo", diff: "easy", q: "Hauptstadt von Japan?", choices: ["Seoul", "Peking", "Tokio", "Bangkok"], a: 2 },
  { id: 44, cat: "geo", diff: "medium", q: "Längster Fluss der Welt (übliche Angabe)?", choices: ["Amazonas", "Nil", "Jangtse", "Mississippi"], a: 1 },
  { id: 45, cat: "geo", diff: "easy", q: "In welchem Kontinent liegt die Sahara?", choices: ["Asien", "Afrika", "Australien", "Südamerika"], a: 1 },

  // more nature
  { id: 46, cat: "nature", diff: "easy", q: "Welches Säugetier kann fliegen?", choices: ["Pinguin", "Fledermaus", "Strauß", "Krokodil"], a: 1 },
  { id: 47, cat: "nature", diff: "medium", q: "Welcher Teil der Pflanze macht meist die Photosynthese?", choices: ["Wurzel", "Blatt", "Blüte", "Samen"], a: 1 },
  { id: 48, cat: "nature", diff: "hard", q: "Welches Organ produziert Insulin (Hauptort)?", choices: ["Leber", "Bauchspeicheldrüse", "Niere", "Milz"], a: 1 },

  // more history
  { id: 49, cat: "history", diff: "easy", q: "Antike: Kolosseum steht in…", choices: ["Athen", "Rom", "Alexandria", "Karthago"], a: 1 },
  { id: 50, cat: "history", diff: "medium", q: "Erster Weltkrieg begann…", choices: ["1905", "1914", "1939", "1945"], a: 1 },

  // more culture
  { id: 51, cat: "culture", diff: "easy", q: "„May the Force be with you“ — welche Filmreihe?", choices: ["Star Trek", "Star Wars", "Matrix", "Dune"], a: 1 },
  { id: 52, cat: "culture", diff: "medium", q: "Picasso ist bekannt für welche Kunstrichtung (u. a.)?", choices: ["Romantik", "Kubismus", "Barock", "Impressionismus"], a: 1 },

  // more sport
  { id: 53, cat: "sport", diff: "easy", q: "Basketball: Körbe wie hoch (ungefähr NBA)?", choices: ["2,5 m", "3,05 m", "3,5 m", "4 m"], a: 1 },
  { id: 54, cat: "sport", diff: "hard", q: "Tour de France: Hauptdisziplin?", choices: ["Laufen", "Straßen-Radrennen", "Schwimmen", "Skifahren"], a: 1 },

  // more science
  { id: 55, cat: "science", diff: "medium", q: "pH 7 ist…", choices: ["sauer", "neutral", "basisch", "undefiniert"], a: 1 },
  { id: 56, cat: "science", diff: "easy", q: "Größter Planet unseres Sonnensystems?", choices: ["Saturn", "Jupiter", "Uranus", "Erde"], a: 1 },

  // extra variety
  { id: 57, cat: "tech", diff: "hard", q: "Welches Konzept beschreibt „CAP“ in verteilten Systemen (C/A/P)?", choices: ["Nur CPU-Takt", "Konsistenz, Verfügbarkeit, Partitionstoleranz", "Compiler-API-Protocol", "Cache-Allocation-Policy"], a: 1 },
  { id: 58, cat: "geo", diff: "hard", q: "Welcher Staat hat die meisten Zeitzonen (ungefähr)?", choices: ["Russland", "USA", "China", "Kanada"], a: 0 },
  { id: 59, cat: "culture", diff: "easy", q: "Weihnachtslied: „Stille Nacht“ entstand in welchem Land?", choices: ["Deutschland", "Österreich", "Schweiz", "Italien"], a: 1 },
  { id: 60, cat: "history", diff: "hard", q: "Fall der Weströmischen Reichsgrenze traditionell…", choices: ["376 n. Chr.", "476 n. Chr.", "536 n. Chr.", "800 n. Chr."], a: 1 },
  { id: 61, cat: "nature", diff: "easy", q: "Schnellstes Landtier (typisch)?", choices: ["Löwe", "Gepard", "Antilope", "Strauß"], a: 1 },
  { id: 62, cat: "science", diff: "hard", q: "Doppelhelix-Modell der DNA (maßgeblich)?", choices: ["Einstein", "Watson & Crick", "Curie", "Darwin"], a: 1 },
  { id: 63, cat: "sport", diff: "medium", q: "Formel 1: welche Flagge beendet das Rennen?", choices: ["Rot", "Schwarz", "Schwarz-weiß kariert", "Gelb"], a: 2 },
  { id: 64, cat: "tech", diff: "medium", q: "IPv4-Adresse: typische Bitlänge?", choices: ["16", "32", "64", "128"], a: 1 },
  { id: 65, cat: "geo", diff: "medium", q: "Welches Land ist „Land der aufgehenden Sonne“?", choices: ["China", "Korea", "Japan", "Thailand"], a: 2 },
  { id: 66, cat: "culture", diff: "hard", q: "„Don Quijote“ — Autor?", choices: ["Cervantes", "Shakespeare", "Goethe", "Dante"], a: 0 },
  { id: 67, cat: "history", diff: "easy", q: "Mauerbau Berlin begann im Jahr…", choices: ["1953", "1961", "1969", "1975"], a: 1 },
  { id: 68, cat: "nature", diff: "medium", q: "Größter Ozean?", choices: ["Atlantik", "Indik", "Arktis", "Pazifik"], a: 3 },
  { id: 69, cat: "science", diff: "medium", q: "Atomkern besteht vor allem aus…", choices: ["Elektronen", "Protonen und Neutronen", "Photonen", "Quarks allein"], a: 1 },
  { id: 70, cat: "tech", diff: "easy", q: "Was ist ein „Router“ typischerweise?", choices: ["Drucker", "Netzwerkgerät für Weiterleitung", "Festplatte", "Monitor"], a: 1 },

  // --- movies (Filme & Serien) ---
  { id: 71, cat: "movies", diff: "easy", q: "In „Der König der Löwen“ heißt der junge Löwe…", choices: ["Scar", "Simba", "Mufasa", "Timon"], a: 1 },
  { id: 72, cat: "movies", diff: "easy", q: "„Titanic“ (1997) — Regisseur?", choices: ["Steven Spielberg", "James Cameron", "Ridley Scott", "Christopher Nolan"], a: 1 },
  { id: 73, cat: "movies", diff: "medium", q: "Welcher Film gewann den Oscar Bester Film 1995 (US-Verleih)?", choices: ["Pulp Fiction", "Forrest Gump", "The Shawshank Redemption", "Four Weddings"], a: 1 },
  { id: 74, cat: "movies", diff: "medium", q: "Matrix: welche Pille lässt Neo in der „Realität“ aufwachen?", choices: ["Blaue Pille", "Rote Pille", "Grüne Pille", "Gelbe Pille"], a: 1 },
  { id: 75, cat: "movies", diff: "hard", q: "„Citizen Kane“ (1941) — Regisseur?", choices: ["Hitchcock", "Orson Welles", "John Ford", "Billy Wilder"], a: 1 },
  { id: 76, cat: "movies", diff: "easy", q: "Harry Potter: wie heißt die Zauberschule?", choices: ["Camelot", "Hogwarts", "Rivendell", "Xavier"], a: 1 },
  { id: 77, cat: "movies", diff: "medium", q: "Breaking Bad: Beruf von Walter White zu Beginn?", choices: ["Anwalt", "Chemielehrer", "Polizist", "Journalist"], a: 1 },
  { id: 78, cat: "movies", diff: "easy", q: "Disneys erster abendfüllender Animations-Kinofilm (1937)?", choices: ["Cinderella", "Schneewittchen und die sieben Zwerge", "Pinocchio", "Dumbo"], a: 1 },

  // --- music ---
  { id: 79, cat: "music", diff: "easy", q: "Wie viele Töne hat eine Oktave in der westlichen Musik (inkl. Anfangston)?", choices: ["5", "7", "8", "12"], a: 2 },
  { id: 80, cat: "music", diff: "easy", q: "Beethoven ist vor allem bekannt als…", choices: ["Maler", "Komponist", "Dirigent nur", "Schriftsteller"], a: 1 },
  { id: 81, cat: "music", diff: "medium", q: "Welches Instrument hat Tasten und Saiten, aber keine Bogen?", choices: ["Violine", "Klavier", "Trompete", "Oboe"], a: 1 },
  { id: 82, cat: "music", diff: "medium", q: "Michael Jackson wird oft genannt…", choices: ["King of Rock", "King of Pop", "Queen of Soul", "Prince of Funk"], a: 1 },
  { id: 83, cat: "music", diff: "hard", q: "„Die Kunst der Fuge“ — Komponist?", choices: ["Mozart", "Johann Sebastian Bach", "Haydn", "Händel"], a: 1 },
  { id: 84, cat: "music", diff: "easy", q: "Rockband aus Liverpool (klassisch „Fab Four“)?", choices: ["Rolling Stones", "The Beatles", "Queen", "Led Zeppelin"], a: 1 },
  { id: 85, cat: "music", diff: "medium", q: "Noten: „p“ bedimmt typischerweise…", choices: ["laut", "leise (piano)", "schnell", "langsam"], a: 1 },

  // --- literature ---
  { id: 86, cat: "literature", diff: "easy", q: "Wer schrieb „Der kleine Prinz“?", choices: ["Antoine de Saint-Exupéry", "Jules Verne", "Victor Hugo", "Molière"], a: 0 },
  { id: 87, cat: "literature", diff: "easy", q: "„Der Herr der Ringe“ — Autor?", choices: ["C.S. Lewis", "J.R.R. Tolkien", "G.R.R. Martin", "Terry Pratchett"], a: 1 },
  { id: 88, cat: "literature", diff: "medium", q: "„1984“ — Autor?", choices: ["Huxley", "George Orwell", "Bradbury", "Asimov"], a: 1 },
  { id: 89, cat: "literature", diff: "medium", q: "„Faust“ (deutsche Literaturklassiker) — Autor?", choices: ["Schiller", "Goethe", "Lessing", "Kleist"], a: 1 },
  { id: 90, cat: "literature", diff: "hard", q: "„Ulysses“ — Autor?", choices: ["Virginia Woolf", "James Joyce", "Samuel Beckett", "Oscar Wilde"], a: 1 },
  { id: 91, cat: "literature", diff: "easy", q: "Die Brüder Grimm sind bekannt für…", choices: ["Kriminalromane", "Märchensammlungen", "Science-Fiction", "Liebesromane"], a: 1 },

  // --- food ---
  { id: 92, cat: "food", diff: "easy", q: "Hauptzutat von klassischem Guacamole?", choices: ["Tomate", "Avocado", "Mango", "Paprika"], a: 1 },
  { id: 93, cat: "food", diff: "easy", q: "Aus welchem Land stammt Sushi traditionell?", choices: ["China", "Japan", "Korea", "Thailand"], a: 1 },
  { id: 94, cat: "food", diff: "medium", q: "Was macht Sauerteigbrot „sauer“?", choices: ["Essig nur", "Milchsäurebakterien/Hefen", "Zitronensaft", "Salz"], a: 1 },
  { id: 95, cat: "food", diff: "medium", q: "Champagner kommt ursprünglich aus welcher französischen Region?", choices: ["Bordeaux", "Champagne", "Burgund", "Provence"], a: 1 },
  { id: 96, cat: "food", diff: "hard", q: "Umami ist…", choices: ["ein Chili-Öl", "der „fünfte Geschmack“", "ein japanisches Messer", "eine Teesorte"], a: 1 },
  { id: 97, cat: "food", diff: "easy", q: "Welche Zutat ist in klassischem Pesto (grün) zentral?", choices: ["Koriander", "Basilikum", "Petersilie", "Minze"], a: 1 },

  // --- mythology ---
  { id: 98, cat: "mythology", diff: "easy", q: "Griechischer Göttervater auf dem Olymp?", choices: ["Poseidon", "Zeus", "Hades", "Ares"], a: 1 },
  { id: 99, cat: "mythology", diff: "easy", q: "Wer öffnete nach mythologischer Erzählung „Pandoras Büchse“?", choices: ["Athena", "Pandora", "Hera", "Medusa"], a: 1 },
  { id: 100, cat: "mythology", diff: "medium", q: "Nordisch: Welcher Gott hat nur ein Auge und hing an Yggdrasil?", choices: ["Thor", "Odin", "Loki", "Freyja"], a: 1 },
  { id: 101, cat: "mythology", diff: "medium", q: "Wer tötete in der griechischen Mythologie die Gorgone Medusa?", choices: ["Herakles", "Perseus", "Theseus", "Achill"], a: 1 },
  { id: 102, cat: "mythology", diff: "hard", q: "Römischer Name des griechischen Gottes Hermes?", choices: ["Mars", "Mercury (Merkur)", "Vulcan", "Janus"], a: 1 },

  // --- space ---
  { id: 103, cat: "space", diff: "easy", q: "Unser Sonnensystem hat offiziell wie viele Planeten (IAU, Stand klassisch)?", choices: ["7", "8", "9", "10"], a: 1 },
  { id: 104, cat: "space", diff: "easy", q: "Erster Mensch im All?", choices: ["Neil Armstrong", "Juri Gagarin", "Buzz Aldrin", "John Glenn"], a: 1 },
  { id: 105, cat: "space", diff: "medium", q: "Welches Raumfahrzeug brachte Menschen zum Mond (Apollo-Programm)?", choices: ["Space Shuttle", "Saturn V / Apollo", "Soyuz", "Vostok"], a: 1 },
  { id: 106, cat: "space", diff: "medium", q: "Roter Planet unseres Sonnensystems?", choices: ["Venus", "Mars", "Jupiter", "Mercury"], a: 1 },
  { id: 107, cat: "space", diff: "hard", q: "Was ist ein „Lichtjahr“?", choices: ["Zeitspanne", "Entfernung (Lichtweg 1 Jahr)", "Lichtgeschwindigkeit pro Tag", "Masseeinheit"], a: 1 },

  // --- gaming ---
  { id: 108, cat: "gaming", diff: "easy", q: "Welche Firma veröffentlichte „Super Mario Bros.“ (klassisch NES)?", choices: ["Sega", "Nintendo", "Sony", "Atari"], a: 1 },
  { id: 109, cat: "gaming", diff: "easy", q: "Minecraft: welcher Modus ist „kein Überleben, unendlich fliegen“?", choices: ["Hardcore", "Kreativmodus", "Abenteuer", "Extrem"], a: 1 },
  { id: 110, cat: "gaming", diff: "medium", q: "Welches Spiel machte „Battle Royale“ 2017/18 massentauglich (ein Titel)?", choices: ["WoW", "Fortnite", "Sims", "FIFA"], a: 1 },
  { id: 111, cat: "gaming", diff: "medium", q: "Pokémon (Rot/Blau): wie heißt der regionale Professor?", choices: ["Professor Eich", "Professor Lind", "Professor Weide", "Professor Berg"], a: 0 },
  { id: 112, cat: "gaming", diff: "hard", q: "Welches Jahr gilt grob als „Video-Game-Crash“ in den USA?", choices: ["1977", "1983", "1995", "2001"], a: 1 },

  // --- art ---
  { id: 113, cat: "art", diff: "easy", q: "„Die Sternennacht“ — Maler?", choices: ["Picasso", "Vincent van Gogh", "Monet", "Dalí"], a: 1 },
  { id: 114, cat: "art", diff: "easy", q: "Michelangelos David steht in…", choices: ["Rom", "Florenz", "Venedig", "Mailand"], a: 1 },
  { id: 115, cat: "art", diff: "medium", q: "Barock: typisch für Architektur/Malerei?", choices: ["Minimalismus", "bewegte Formen, viel Detail", "nur Graustufen", "nur Fotografie"], a: 1 },
  { id: 116, cat: "art", diff: "medium", q: "Welches Museum in Paris beherbergt die Mona Lisa?", choices: ["Musée d’Orsay", "Louvre", "Centre Pompidou", "Rodin"], a: 1 },
  { id: 117, cat: "art", diff: "hard", q: "„Der Schrei“ — Künstler?", choices: ["Munch", "Klimt", "Kandinsky", "Schiele"], a: 0 },

  // --- language (Sprache & Wörter) ---
  { id: 118, cat: "language", diff: "easy", q: "Was ist ein Synonym?", choices: ["Gegenteil", "Wort mit ähnlicher Bedeutung", "Rechtschreibfehler", "Fremdwort"], a: 1 },
  { id: 119, cat: "language", diff: "easy", q: "„Bonjour“ ist typisch welche Sprache?", choices: ["Spanisch", "Französisch", "Italienisch", "Portugiesisch"], a: 1 },
  { id: 120, cat: "language", diff: "medium", q: "Welcher Satz ist ein Beispiel für eine rhetorische Frage?", choices: ["Ich gehe heim.", "Wer hätte das gedacht?", "Öffne das Fenster.", "2+2=4"], a: 1 },
  { id: 121, cat: "language", diff: "medium", q: "Was misst die „Wortanzahl“ eines Textes?", choices: ["Zeilen", "Wörter", "Buchstaben ohne Leerzeichen", "Absätze"], a: 1 },

  // --- politics (Politik & Gesellschaft) ---
  { id: 122, cat: "politics", diff: "easy", q: "EU-Hauptsitz der Kommission (klassisch)?", choices: ["Straßburg", "Brüssel", "Den Haag", "Genf"], a: 1 },
  { id: 123, cat: "politics", diff: "medium", q: "Was bedeutet „Demokratie“ grob?", choices: ["Herrschaft eines Königs", "Mitbestimmung/Volksherrschaft", "Militärregierung", "Theokratie"], a: 1 },
  { id: 124, cat: "politics", diff: "medium", q: "UNO-Hauptquartier liegt in…", choices: ["Washington", "New York", "Genf", "London"], a: 1 },
  { id: 125, cat: "politics", diff: "hard", q: "Welches Dokument beginnt mit „Wir, das Volk…“ (US-Verfassung, sinngemäß)?", choices: ["Bill of Rights", "US-Verfassung (Preamble)", "Unabhängigkeitserklärung", "Federalist Papers"], a: 1 },

  // --- medicine (Medizin & Körper) ---
  { id: 126, cat: "medicine", diff: "easy", q: "Herz pumpt primär…", choices: ["Luft", "Blut", "Lymphe", "Speichel"], a: 1 },
  { id: 127, cat: "medicine", diff: "easy", q: "Knochenmark produziert vor allem…", choices: ["Hormone", "Blutzellen (u. a.)", "Galle", "Insulin"], a: 1 },
  { id: 128, cat: "medicine", diff: "medium", q: "Was ist ein „Placebo“?", choices: ["starker Schmerzstoff", "Scheinmedikament ohne Wirkstoff", "Antibiotikum", "Impfstoff"], a: 1 },
  { id: 129, cat: "medicine", diff: "hard", q: "Erste erfolgreiche Organtransplantation (Niere, historischer Meilenstein, 1954)?", choices: ["Deutschland", "USA (Zwillinge)", "Russland", "Japan"], a: 1 },

  // --- automotive (Autos & Verkehr) ---
  { id: 130, cat: "automotive", diff: "easy", q: "Was bedeutet die rote Ampel?", choices: ["Anhalten", "Freie Fahrt", "Nur rechts abbiegen", "Fußgängerzone"], a: 0 },
  { id: 131, cat: "automotive", diff: "medium", q: "ABS im Auto hilft vor allem beim…", choices: ["Sparen von Benzin", "Bremsen ohne Blockieren der Räder", "Kofferraum öffnen", "Navigation"], a: 1 },
  { id: 132, cat: "automotive", diff: "medium", q: "Elektroauto: Energie wird typisch gespeichert in…", choices: ["Tank Benzin", "Akku/Batterie", "Druckluft", "Federn"], a: 1 },

  // --- geography extra (Länder & Städte) ---
  { id: 133, cat: "geo", diff: "easy", q: "Hauptstadt von Italien?", choices: ["Mailand", "Rom", "Neapel", "Turin"], a: 1 },
  { id: 134, cat: "geo", diff: "easy", q: "Welcher Kontinent ist der flächenmäßig größte?", choices: ["Afrika", "Asien", "Nordamerika", "Antarktis"], a: 1 },
  { id: 135, cat: "geo", diff: "medium", q: "Welches Land hat drei Landeshauptstädte (Pretoria, Kapstadt, Bloemfontein)?", choices: ["Australien", "Südafrika", "Kanada", "Indien"], a: 1 },

  // --- history extra ---
  { id: 136, cat: "history", diff: "medium", q: "Wann endete der Zweite Weltkrieg in Europa (Kapitulation, Datum grob)?", choices: ["1943", "8./9. Mai 1945", "1947", "1950"], a: 1 },
  { id: 137, cat: "history", diff: "easy", q: "Wer schrieb die „95 Thesen“ (Reformation)?", choices: ["Calvin", "Martin Luther", "Zwingli", "Papst Leo X."], a: 1 },

  // --- science extra ---
  { id: 138, cat: "science", diff: "easy", q: "Schwerkraft auf der Erde ≈ ?", choices: ["9,81 m/s²", "1 m/s²", "100 m/s²", "0 m/s²"], a: 0 },
  { id: 139, cat: "science", diff: "medium", q: "Welches Teilchen trägt negative Ladung?", choices: ["Proton", "Neutron", "Elektron", "Photon"], a: 2 },

  // --- movies extra ---
  { id: 140, cat: "movies", diff: "medium", q: "„Der Pate“ (1972) — Regisseur?", choices: ["Scorsese", "Francis Ford Coppola", "De Palma", "Spielberg"], a: 1 },
  { id: 141, cat: "movies", diff: "easy", q: "Marvel: wie heißt Thors Hammer?", choices: ["Sturmbringer", "Mjölnir", "Gungnir", "Gram"], a: 1 },

  // --- tv (Serien & Streaming) ---
  { id: 142, cat: "tv", diff: "easy", q: "„Friends“ spielt überwiegend in…", choices: ["Los Angeles", "New York", "Chicago", "Boston"], a: 1 },
  { id: 143, cat: "tv", diff: "medium", q: "Game of Thrones: Kontinent der Haupthandlung?", choices: ["Australien", "Westeros (fiktiv)", "Europa", "Mittelerde"], a: 1 },
  { id: 144, cat: "tv", diff: "easy", q: "Die Simpsons leben in…", choices: ["South Park", "Springfield", "Quahog", "Shelbyville"], a: 1 },

  // --- sports extra ---
  { id: 145, cat: "sport", diff: "easy", q: "Beim Fußball zählt ein Tor, wenn der Ball…", choices: ["nur die Mittellinie überquert", "vollständig die Torlinie überquert", "nur den Pfosten berührt", "im Aus war"], a: 1 },
  { id: 146, cat: "sport", diff: "medium", q: "Handball: wie viele Feldspieler (ohne Torwart) typisch?", choices: ["5", "6", "7", "8"], a: 2 },

  // --- nature extra ---
  { id: 147, cat: "nature", diff: "easy", q: "Welches Tier ist ein Vogel?", choices: ["Fledermaus", "Pinguin", "Flughörnchen", "Wal"], a: 1 },
  { id: 148, cat: "nature", diff: "medium", q: "Erdbeben messen wir oft auf der…", choices: ["Beaufort-Skala", "Richter-/Momentenskala", "pH-Skala", "Mohs-Härte"], a: 1 },

  // --- tech extra ---
  { id: 149, cat: "tech", diff: "medium", q: "Was ist Open Source typischerweise?", choices: ["nur kostenpflichtig", "Quellcode oft einsehbar & frei nutzbar (Lizenzabh.)", "nur für Apple", "ohne Internet"], a: 1 },
  { id: 150, cat: "tech", diff: "easy", q: "„Cloud“ in der IT meint grob…", choices: ["nur Wetter", "Dienste/Daten im Netz statt nur lokal", "nur USB-Stick", "Drucker"], a: 1 },

  // --- psychology (leicht allgemein) ---
  { id: 151, cat: "psychology", diff: "easy", q: "Was ist „Stress“ grob?", choices: ["immer krank", "körperliche/psychische Belastungsreaktion", "nur Hunger", "nur Freude"], a: 1 },
  { id: 152, cat: "psychology", diff: "medium", q: "Pavlov und die Klingel — welches Lernprinzip?", choices: ["Klassische Konditionierung", "Operante Konditionierung", "Latentes Lernen", "Soziales Lernen"], a: 0 },

  // --- economics (Wirtschaft leicht) ---
  { id: 153, cat: "economics", diff: "easy", q: "Inflation bedeutet typischerweise…", choices: ["Preise sinken dauerhaft", "Geldwert sinkt, Preise steigen", "Löhne sind null", "keine Steuern"], a: 1 },
  { id: 154, cat: "economics", diff: "medium", q: "BIP steht für…", choices: ["Bundes-Inlands-Produkt", "Bruttoinlandsprodukt", "Betriebs-Internes Programm", "Budget-Index-Prozent"], a: 1 },
];

export const TRIVIA_CATS = [
  { id: "geo", label: "🌍 Geografie & Länder" },
  { id: "history", label: "📜 Geschichte" },
  { id: "science", label: "🔬 Naturwissenschaften" },
  { id: "nature", label: "🌿 Natur & Tiere" },
  { id: "tech", label: "💻 Technik & IT" },
  { id: "movies", label: "🎬 Filme" },
  { id: "tv", label: "📺 Serien & Streaming" },
  { id: "music", label: "🎵 Musik" },
  { id: "literature", label: "📚 Literatur" },
  { id: "culture", label: "🎭 Kultur & Medien" },
  { id: "art", label: "🖼️ Kunst & Architektur" },
  { id: "gaming", label: "🎮 Games & Videospiele" },
  { id: "sport", label: "⚽ Sport" },
  { id: "food", label: "🍕 Essen & Trinken" },
  { id: "space", label: "🚀 Raumfahrt & Astronomie" },
  { id: "mythology", label: "⚡ Mythologie" },
  { id: "language", label: "💬 Sprache & Wörter" },
  { id: "politics", label: "🏛️ Politik & Gesellschaft" },
  { id: "medicine", label: "🩺 Medizin & Körper" },
  { id: "psychology", label: "🧠 Psychologie (leicht)" },
  { id: "economics", label: "💶 Wirtschaft (leicht)" },
  { id: "automotive", label: "🚗 Autos & Verkehr" },
];
