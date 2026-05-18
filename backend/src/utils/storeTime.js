import { env } from "../config/env.js";

const MINUTE_IN_MS = 60 * 1000;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const pad = (value) => String(value).padStart(2, "0");

function getStoreShiftedDate(value) {
  const date = new Date(value);
  return new Date(date.getTime() + env.storeUtcOffsetMinutes * MINUTE_IN_MS);
}

export function getStoreDateParts(value) {
  const shifted = getStoreShiftedDate(value);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds(),
    milliseconds: shifted.getUTCMilliseconds()
  };
}

export function toStoreDateKey(value) {
  const { year, month, day } = getStoreDateParts(value);
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function combineStoreDateAndTime(dateValue, time) {
  const { year, month, day } = getStoreDateParts(dateValue);
  const [hours, minutes] = time.split(":").map(Number);

  return new Date(
    Date.UTC(year, month, day, hours, minutes, 0, 0) -
      env.storeUtcOffsetMinutes * MINUTE_IN_MS
  );
}

export function startOfStoreDay(value) {
  const { year, month, day } = getStoreDateParts(value);

  return new Date(
    Date.UTC(year, month, day, 0, 0, 0, 0) - env.storeUtcOffsetMinutes * MINUTE_IN_MS
  );
}

export function endOfStoreDay(value) {
  return new Date(startOfStoreDay(value).getTime() + DAY_IN_MS - 1);
}

export function addStoreDays(value, days) {
  const start = startOfStoreDay(value);
  return new Date(start.getTime() + days * DAY_IN_MS);
}
