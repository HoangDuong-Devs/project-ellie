/**
 * Vietnamese Lunar Calendar (Âm lịch) conversion + Vietnamese holidays.
 * Algorithm by Hồ Ngọc Đức — Astronomical Algorithms (Jean Meeus).
 * Adjusted for Vietnam timezone (UTC+7).
 */

const TZ = 7;

function INT(d: number) {
  return Math.floor(d);
}

function jdFromDate(dd: number, mm: number, yy: number) {
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd =
    dd +
    INT((153 * m + 2) / 5) +
    365 * y +
    INT(y / 4) -
    INT(y / 100) +
    INT(y / 400) -
    32045;
  if (jd < 2299161) {
    jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  }
  return jd;
}

function jdToDate(jd: number) {
  let a: number, b: number, c: number;
  if (jd > 2299160) {
    a = jd + 32044;
    b = INT((4 * a + 3) / 146097);
    c = a - INT((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = INT((4 * c + 3) / 1461);
  const e = c - INT((1461 * d) / 4);
  const m = INT((5 * e + 2) / 153);
  const day = e - INT((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * INT(m / 10);
  const year = b * 100 + d - 4800 + INT(m / 10);
  return [day, month, year];
}

function NewMoon(k: number) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let Jd1 =
    2415020.75933 +
    29.53058868 * k +
    0.0001178 * T2 -
    0.000000155 * T3 +
    0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * dr) +
    0.0021 * Math.sin(2 * dr * M);
  C1 -= 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(2 * dr * Mpr);
  C1 -= 0.0004 * Math.sin(3 * dr * Mpr);
  C1 += 0.0104 * Math.sin(2 * dr * F) - 0.0051 * Math.sin((M + Mpr) * dr);
  C1 -=
    0.0074 * Math.sin((M - Mpr) * dr) + 0.0004 * Math.sin((2 * F + M) * dr);
  C1 -=
    0.0004 * Math.sin((2 * F - M) * dr) -
    0.0006 * Math.sin((2 * F + Mpr) * dr);
  C1 +=
    0.001 * Math.sin((2 * F - Mpr) * dr) + 0.0005 * Math.sin((2 * Mpr + M) * dr);
  let deltat: number;
  if (T < -11) {
    deltat =
      0.001 +
      0.000839 * T +
      0.0002261 * T2 -
      0.00000845 * T3 -
      0.000000081 * T * T3;
  } else {
    deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }
  const JdNew = Jd1 + C1 - deltat;
  return JdNew;
}

function SunLongitude(jdn: number) {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL =
    (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL +=
    (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) +
    0.00029 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L = L * dr;
  L = L - Math.PI * 2 * INT(L / (Math.PI * 2));
  return L;
}

function getSunLongitude(dayNumber: number, timeZone: number) {
  return INT((SunLongitude(dayNumber - 0.5 - timeZone / 24) / Math.PI) * 6);
}

function getNewMoonDay(k: number, timeZone: number) {
  return INT(NewMoon(k) + 0.5 + timeZone / 24);
}

function getLunarMonth11(yy: number, timeZone: number) {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone: number) {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  leap: boolean;
}

export function solarToLunar(dd: number, mm: number, yy: number): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, TZ);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, TZ);
  }
  let a11 = getLunarMonth11(yy, TZ);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, TZ);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, TZ);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = INT((monthStart - a11) / 29);
  let lunarLeap = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, TZ);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = true;
      }
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
  return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: lunarLeap };
}

function lunarToSolar(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  lunarLeap: boolean,
): [number, number, number] {
  let a11: number, b11: number;
  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, TZ);
    b11 = getLunarMonth11(lunarYear, TZ);
  } else {
    a11 = getLunarMonth11(lunarYear, TZ);
    b11 = getLunarMonth11(lunarYear + 1, TZ);
  }
  const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = lunarMonth - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, TZ);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) leapMonth += 12;
    if (lunarLeap && lunarMonth !== leapMonth) {
      return [0, 0, 0];
    } else if (lunarLeap || off >= leapOff) {
      off += 1;
    }
  }
  const monthStart = getNewMoonDay(k + off, TZ);
  return jdToDate(monthStart + lunarDay - 1) as [number, number, number];
}

/* --------- Holidays --------- */

export interface HolidayInfo {
  name: string;
  type: "public" | "traditional" | "observance";
}

// Solar (dương lịch) fixed holidays — keyed "MM-DD"
const SOLAR_HOLIDAYS: Record<string, HolidayInfo> = {
  "01-01": { name: "Tết Dương lịch", type: "public" },
  "02-14": { name: "Valentine", type: "observance" },
  "03-08": { name: "Quốc tế Phụ nữ", type: "observance" },
  "04-30": { name: "Giải phóng miền Nam", type: "public" },
  "05-01": { name: "Quốc tế Lao động", type: "public" },
  "06-01": { name: "Quốc tế Thiếu nhi", type: "observance" },
  "09-02": { name: "Quốc khánh", type: "public" },
  "10-20": { name: "Phụ nữ Việt Nam", type: "observance" },
  "11-20": { name: "Nhà giáo Việt Nam", type: "observance" },
  "12-22": { name: "Quân đội Nhân dân", type: "observance" },
  "12-24": { name: "Đêm Giáng sinh", type: "observance" },
  "12-25": { name: "Giáng sinh", type: "observance" },
};

// Lunar fixed holidays — keyed "LM-LD" (lunar month-day)
const LUNAR_HOLIDAYS: Record<string, HolidayInfo> = {
  "1-1": { name: "Mùng 1 Tết", type: "public" },
  "1-2": { name: "Mùng 2 Tết", type: "public" },
  "1-3": { name: "Mùng 3 Tết", type: "public" },
  "1-15": { name: "Tết Nguyên tiêu", type: "traditional" },
  "3-3": { name: "Tết Hàn thực", type: "traditional" },
  "3-10": { name: "Giỗ Tổ Hùng Vương", type: "public" },
  "5-5": { name: "Tết Đoan ngọ", type: "traditional" },
  "7-7": { name: "Thất tịch", type: "observance" },
  "7-15": { name: "Vu Lan", type: "traditional" },
  "8-15": { name: "Tết Trung thu", type: "traditional" },
  "9-9": { name: "Tết Trùng cửu", type: "observance" },
  "10-10": { name: "Tết Thường tân", type: "observance" },
  "12-23": { name: "Ông Công Ông Táo", type: "traditional" },
};

export function getHolidaysForDate(d: Date): HolidayInfo[] {
  const out: HolidayInfo[] = [];
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const solarKey = `${mm}-${dd}`;
  if (SOLAR_HOLIDAYS[solarKey]) out.push(SOLAR_HOLIDAYS[solarKey]);

  const lunar = solarToLunar(d.getDate(), d.getMonth() + 1, d.getFullYear());
  const lunarKey = `${lunar.month}-${lunar.day}`;
  if (LUNAR_HOLIDAYS[lunarKey] && !lunar.leap) out.push(LUNAR_HOLIDAYS[lunarKey]);

  // Giao thừa: ngày 30 (hoặc 29 nếu tháng thiếu) tháng Chạp
  if (lunar.month === 12) {
    // Check if next solar day is lunar 1/1
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const nl = solarToLunar(next.getDate(), next.getMonth() + 1, next.getFullYear());
    if (nl.month === 1 && nl.day === 1) {
      out.push({ name: "Giao thừa", type: "traditional" });
    }
  }

  return out;
}

export function formatLunarShort(l: LunarDate): string {
  // Show day; show "M/L" on day 1 of lunar month
  if (l.day === 1) return `1/${l.month}${l.leap ? "*" : ""}`;
  return String(l.day);
}

export function formatLunarFull(l: LunarDate): string {
  return `Âm lịch: ${l.day}/${l.month}${l.leap ? " (nhuận)" : ""}/${l.year}`;
}

export { lunarToSolar };
