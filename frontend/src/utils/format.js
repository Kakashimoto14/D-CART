export const currency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(Number(value || 0));

export const formatDateTime = (value) =>
  new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
