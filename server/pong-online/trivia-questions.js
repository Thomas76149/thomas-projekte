/**
 * Fragenpool — einfach erweiterbar: { id, cat, diff, q, choices: [4], a: 0..3 }
 * cat: tech | nature | geo | history | culture | sport | science
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
];

export const TRIVIA_CATS = [
  { id: "tech", label: "Technik & IT" },
  { id: "nature", label: "Natur & Tiere" },
  { id: "geo", label: "Geografie" },
  { id: "history", label: "Geschichte" },
  { id: "culture", label: "Kultur & Medien" },
  { id: "sport", label: "Sport" },
  { id: "science", label: "Naturwissenschaften" },
];
