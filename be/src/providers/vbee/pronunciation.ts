/** Spoken form of English names and terms for Vbee's Vietnamese voices, which mispronounce them
 * when handed the original spelling. Applied ONLY to the text sent to Vbee (`prepareNarration`):
 * captions are still aligned against the script's own spelling (`alignCaptionsToNarration`), so
 * the viewer reads "Valentine" while the voice says "va len thai". Keys are matched
 * case-insensitively on whole words; add an entry here when a new English name sounds wrong. */
const PRONUNCIATIONS: Readonly<Record<string, string>> = {
  "funny valentine": "Fan ni Va len thai",
  valentine: "Va len thai",
  d4c: "Đi pho Xi",
  "steel ball run": "Xti Bôn Ran",
  "steel ball": "Xti Bôn",
  "super spin": "Xu pơ Xờ pin",
  "golden spin": "Gôn đần Xờ pin",
  spin: "Xờ pin",
  stand: "Xờ ten",
  "tusk act 4": "Tắc Ách pho",
  tusk: "Tắc",
  "ball breaker": "Bôn Brây cơ",
  "wrecking ball": "Rếch king Bôn",
  scan: "Xờ can",
  "go go zeppeli": "Gô gô Dê pê li",
  "gyro zeppeli": "Gai rô Dê pê li",
  gyro: "Gai rô",
  zeppeli: "Dê pê li",
  "johnny joestar": "Giô ni Giô xta",
  johnny: "Giô ni",
  joestar: "Giô xta",
  jojo: "Giô Giô",
  "nyo-ho-ho": "Ni ô hô hô",
  "diego brando": "Đi ê gô Bran đô",
  "san diego": "San Đi ê gô",
  naples: "Na plơ",
  marco: "Mác cô",
  gregorio: "Gre gô ri ô",
  "julius caesar": "Giu li ớt Xê da",
  "lucy steel": "Lu xi Xti",
  "magent magent": "Ma gen Ma gen",
  wekapipo: "U ê ca pi pô",
  "axl ro": "Ách xồ Rô",
  gettysburg: "Get tis bơ gơ",
  "charles-henri sanson": "Sác Ăng ri Săng xông",
  araki: "A ra ki",
  boomboom: "Bum Bum",
  "b-636": "bê sáu ba sáu",
};

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// One alternation, longest key first, so "Funny Valentine" wins over "Valentine" and a single
// pass can never re-replace its own output. The lookarounds keep "Spinach"/"Standard" intact.
const PRONUNCIATION_PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}])(${Object.keys(PRONUNCIATIONS)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|")})(?![\\p{L}\\p{N}])`,
  "giu",
);

export function applyPronunciations(text: string): string {
  return text.replace(
    PRONUNCIATION_PATTERN,
    (match) => PRONUNCIATIONS[match.toLowerCase()] ?? match,
  );
}
