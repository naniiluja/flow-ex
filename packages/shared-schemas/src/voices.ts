export interface VoiceOption {
  /** Vbee's own `voiceCode`, passed straight through to `VbeeTtsProvider` (`be/.claude/rules/vbee-tts.md`). */
  code: string;
  /** Display name, as returned by Vbee's own `GET /api/public/v1/voices` (Vietnamese label). */
  name: string;
  gender: "male" | "female";
  /** Vietnamese dialect region the voice speaks in — shown in the picker so the user can match it
   * to their script's setting (a Northern-set story with a Southern voice reads oddly). */
  region: "Hà Nội" | "Huế" | "Sài Gòn";
}

/** A curated subset of Vbee's real `vi-VN` catalog (`packages/shared-schemas` stays a plain
 * data/validation package with no IO, per `../../.claude/rules/architecture.md`, so this is a
 * static snapshot rather than a live API call at runtime). Verified live 2026-09-18 against
 * `GET https://vbee.vn/api/public/v1/voices?voiceOwnership=VBEE&language_code=vi-VN` (31 real
 * voices returned) — every `code`/`name`/`gender` below is copied verbatim from that response,
 * not guessed. Narrowed from 31 down to one representative voice per region+gender combination
 * (plus the two voices this project has already used/tested live) so the picker stays a short,
 * scannable list rather than dumping the whole catalog; `scriptInputSchema`'s `voice` field stays
 * a plain non-empty string (not an enum) so a script naming ANY other real Vbee code — including
 * one not in this shortlist — still validates. Re-verify this list against the live endpoint if
 * Vbee's catalog changes. */
export const VOICE_OPTIONS: VoiceOption[] = [
  {
    code: "hn_female_ngochuyen_full_48k-fhg",
    name: "HN - Ngọc Huyền",
    gender: "female",
    region: "Hà Nội",
  },
  {
    code: "hn_male_thanhlong_talk_48k-fhg",
    name: "HN - Thanh Long",
    gender: "male",
    region: "Hà Nội",
  },
  {
    code: "hue_female_huonggiang_full_48k-fhg",
    name: "Huế - Hương Giang",
    gender: "female",
    region: "Huế",
  },
  {
    code: "hue_male_duyphuong_full_48k-fhg",
    name: "Huế - Duy Phương",
    gender: "male",
    region: "Huế",
  },
  {
    code: "sg_female_thaotrinh_full_48k-fhg",
    name: "SG - Thảo Trinh",
    gender: "female",
    region: "Sài Gòn",
  },
  {
    code: "sg_male_trungkien_vdts_48k-fhg",
    name: "SG - Trung Kiên",
    gender: "male",
    region: "Sài Gòn",
  },
];

export const DEFAULT_VOICE_CODE = "hn_female_ngochuyen_full_48k-fhg";
